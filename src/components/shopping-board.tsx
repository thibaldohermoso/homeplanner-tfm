"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFab, AppNav } from "@/components/app-nav";
import { getHouseholds } from "@/lib/services/households";
import {
  archiveShoppingList,
  createShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  listShoppingItems,
  listShoppingLists,
  renameShoppingList,
  toggleShoppingItem,
  type ShoppingItem,
  type ShoppingList,
} from "@/lib/services/shopping";

type Household = { id: string; name: string };

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function formatPrice(value: number | null) {
  return value == null ? "Sin estimar" : currency.format(value);
}

export function ShoppingBoard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [listName, setListName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null;
  const pendingCount = useMemo(() => items.filter((item) => !item.is_checked).length, [items]);
  const estimatedTotal = useMemo(
    () => items.reduce((total, item) => total + (item.estimated_price ?? 0) * Number(item.quantity), 0),
    [items],
  );

  async function loadLists(preferredListId?: string | null) {
    const [{ data: households, error: householdError }] = await Promise.all([getHouseholds()]);
    if (householdError) { setError(householdError.message); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }
    setHousehold(active);

    const { data: rows, error: listError } = await listShoppingLists(active.id, includeArchived);
    if (listError) { setError(listError.message); setLoading(false); return; }
    const nextLists = (rows ?? []) as ShoppingList[];
    setLists(nextLists);
    setSelectedListId((current) => {
      const requested = preferredListId ?? current;
      return nextLists.some((list) => list.id === requested) ? requested : nextLists[0]?.id ?? null;
    });
    setLoading(false);
  }

  async function loadItems(listId: string | null) {
    if (!listId) { setItems([]); return; }
    const { data: rows, error: itemError } = await listShoppingItems(listId);
    if (itemError) setError(itemError.message);
    setItems((rows ?? []) as ShoppingItem[]);
  }

  useEffect(() => { void loadLists(); }, [includeArchived, router]);
  useEffect(() => { void loadItems(selectedListId); }, [selectedListId]);

  async function handleCreateList(event: FormEvent) {
    event.preventDefault();
    if (!household || !listName.trim()) return;
    setSaving(true); setError(null);
    const { data, error: createError } = await createShoppingList(household.id, listName);
    if (createError) setError(createError.message);
    else { setListName(""); await loadLists(data?.id); }
    setSaving(false);
  }

  async function handleCreateItem(event: FormEvent) {
    event.preventDefault();
    if (!household || !selectedList || selectedList.is_archived || !itemName.trim()) return;
    const parsedQuantity = Number(quantity.replace(",", "."));
    const parsedPrice = estimatedPrice.trim() ? Number(estimatedPrice.replace(",", ".")) : null;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || (parsedPrice != null && (!Number.isFinite(parsedPrice) || parsedPrice < 0))) {
      setError("Indica una cantidad válida y un precio estimado igual o mayor que cero.");
      return;
    }
    setSaving(true); setError(null);
    const { error: createError } = await createShoppingItem({ householdId: household.id, listId: selectedList.id, name: itemName, quantity: parsedQuantity, unit, estimatedPrice: parsedPrice });
    if (createError) setError(createError.message);
    else { setItemName(""); setQuantity("1"); setUnit(""); setEstimatedPrice(""); await loadItems(selectedList.id); }
    setSaving(false);
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!selectedList || !editingName.trim()) return;
    setSaving(true); setError(null);
    const { error: renameError } = await renameShoppingList(selectedList.id, editingName);
    if (renameError) setError(renameError.message);
    else { setEditingName(""); await loadLists(selectedList.id); }
    setSaving(false);
  }

  async function handleArchive() {
    if (!selectedList) return;
    const action = selectedList.is_archived ? "reactivar" : "archivar";
    if (!window.confirm(`¿Quieres ${action} la lista «${selectedList.name}»?`)) return;
    setSaving(true); setError(null);
    const { error: archiveError } = await archiveShoppingList(selectedList.id, !selectedList.is_archived);
    if (archiveError) setError(archiveError.message);
    else await loadLists(null);
    setSaving(false);
  }

  async function handleToggle(item: ShoppingItem) {
    setError(null);
    const { error: updateError } = await toggleShoppingItem(item.id, !item.is_checked);
    if (updateError) setError(updateError.message); else await loadItems(selectedListId);
  }

  async function handleDelete(item: ShoppingItem) {
    if (!window.confirm(`¿Eliminar «${item.name}» de la lista?`)) return;
    const { error: deleteError } = await deleteShoppingItem(item.id);
    if (deleteError) setError(deleteError.message); else setItems((current) => current.filter((row) => row.id !== item.id));
  }

  if (loading) return <main className="loading">Cargando compras…</main>;

  return <><AppNav /><main className="shell page shopping-page">
    <div className="page-header"><div><p className="eyebrow">{household?.name ?? "Tu hogar"}</p><h1>Lista de compras</h1><p className="muted">Coordina la compra del hogar y marca lo que ya está en el carrito.</p></div><Link className="button button-secondary" href="/dashboard">Volver al inicio</Link></div>
    {error && <div className="form-error shopping-error" role="alert">{error}</div>}
    <div className="shopping-layout">
      <aside className="panel shopping-sidebar">
        <div className="panel-header"><div><h2>Mis listas</h2><p className="muted" style={{ marginBottom: 0 }}>{lists.length} listas visibles.</p></div></div>
        <form className="inline-form" onSubmit={handleCreateList}><input aria-label="Nombre de la nueva lista" maxLength={100} value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Nueva lista" /><button className="button button-primary" disabled={saving || !listName.trim()}>Crear</button></form>
        <label className="checkbox switch-label"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /><span aria-hidden="true">✓</span><em>Mostrar archivadas</em></label>
        {lists.length === 0 ? <div className="empty">Todavía no tienes listas.</div> : <nav className="shopping-list-nav" aria-label="Listas de compras">{lists.map((list) => <button type="button" key={list.id} className={`shopping-list-link ${list.id === selectedListId ? "active" : ""} ${list.is_archived ? "archived" : ""}`} onClick={() => setSelectedListId(list.id)}><span>{list.name}</span><small>{list.is_archived ? "Archivada" : "Abrir"}</small></button>)}</nav>}
      </aside>
      <section className="panel shopping-content">
        {!selectedList ? <div className="empty-state"><strong>Crea tu primera lista</strong><span>Por ejemplo: compra semanal, supermercado o mercado.</span></div> : <>
          <div className="panel-header shopping-title"><div><h2>{selectedList.name}</h2><p className="muted" style={{ marginBottom: 0 }}>{pendingCount} pendientes · Total estimado {formatPrice(estimatedTotal)}</p></div><div className="shopping-title-actions"><button className="button button-quiet" type="button" onClick={() => setEditingName(selectedList.name)}>Renombrar</button><button className="button button-quiet" type="button" onClick={() => void handleArchive()} disabled={saving}>{selectedList.is_archived ? "Reactivar" : "Archivar"}</button></div></div>
          {editingName && <form className="inline-form rename-form" onSubmit={handleRename}><input aria-label="Nuevo nombre de la lista" maxLength={100} value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button className="button button-primary" disabled={saving}>Guardar</button><button className="button button-quiet" type="button" onClick={() => setEditingName("")}>Cancelar</button></form>}
          {selectedList.is_archived && <div className="archive-notice">Esta lista está archivada. Reactívala para añadir o modificar artículos.</div>}
          <form className="shopping-item-form" onSubmit={handleCreateItem}><div className="field"><label htmlFor="shopping-item">Artículo</label><input id="shopping-item" required maxLength={150} disabled={selectedList.is_archived} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Ej. Leche" /></div><div className="form-row"><div className="field"><label htmlFor="shopping-quantity">Cantidad</label><input id="shopping-quantity" type="number" min="0.01" step="0.01" disabled={selectedList.is_archived} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="field"><label htmlFor="shopping-unit">Unidad</label><input id="shopping-unit" maxLength={30} disabled={selectedList.is_archived} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="uds., kg…" /></div></div><div className="field"><label htmlFor="shopping-price">Precio unitario estimado (€)</label><input id="shopping-price" type="number" min="0" step="0.01" disabled={selectedList.is_archived} value={estimatedPrice} onChange={(event) => setEstimatedPrice(event.target.value)} placeholder="Opcional" /></div><button className="button button-primary" disabled={saving || selectedList.is_archived || !itemName.trim()}>{saving ? "Guardando…" : "Añadir artículo"}</button></form>
          {items.length === 0 ? <div className="empty shopping-empty">Esta lista está vacía. Añade el primer artículo.</div> : <div className="shopping-items">{items.map((item) => <article className={`shopping-item ${item.is_checked ? "checked" : ""}`} key={item.id}><label className="shopping-check"><input type="checkbox" checked={item.is_checked} onChange={() => void handleToggle(item)} /><span className="checkmark" aria-hidden="true">✓</span></label><div className="shopping-item-main"><strong>{item.name}</strong><span>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span></div><span className="shopping-price">{item.estimated_price == null ? "" : formatPrice(Number(item.estimated_price) * Number(item.quantity))}</span><button className="button button-quiet delete-button" type="button" onClick={() => void handleDelete(item)}>Eliminar</button></article>)}</div>}
        </>}
      </section>
    </div><AddFab href="#shopping-item" />
  </main></>;
}
