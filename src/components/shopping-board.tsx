"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { itemTotalCents } from "@/lib/utils/shopping-calculations";
import { AddFab, AppNav } from "@/components/app-nav";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { getHouseholds } from "@/lib/services/households";
import { centsToAmount, getExpenseForShoppingList } from "@/lib/services/expenses";
import {
  archiveShoppingList,
  createShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  listShoppingItems,
  listShoppingLists,
  renameShoppingList,
  toggleShoppingItem,
  translateShoppingError,
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
  const [linkedExpenseId, setLinkedExpenseId] = useState<string | null>(null);
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
  const selectedItems = useMemo(() => { const checked = items.filter((item) => item.is_checked); return checked.length ? checked : items; }, [items]);
  const estimatedTotalCents = useMemo(() => selectedItems.reduce((total, item) => total + itemTotalCents(item.quantity, item.estimated_price), 0), [selectedItems]);
  const expenseLink = selectedList ? `/expenses?new=1&list=${encodeURIComponent(selectedList.id)}&description=${encodeURIComponent(`Compra: ${selectedList.name}`)}&amount=${encodeURIComponent(centsToAmount(estimatedTotalCents))}&category=${encodeURIComponent("Alimentación")}` : "/expenses";

  async function loadLists(preferredListId?: string | null) {
    const [{ data: households, error: householdError }] = await Promise.all([getHouseholds()]);
    if (householdError) { setError("No se han podido cargar las listas del hogar."); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }
    setHousehold(active);

    const { data: rows, error: listError } = await listShoppingLists(active.id, includeArchived);
    if (listError) { setError(translateShoppingError(listError.message)); setLoading(false); return; }
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
    const [{ data: rows, error: itemError }, { data: linkedExpense, error: linkedExpenseError }] = await Promise.all([listShoppingItems(listId), getExpenseForShoppingList(listId)]);
    if (itemError) setError(translateShoppingError(itemError.message));
    if (linkedExpenseError) setError("No se ha podido comprobar si la lista ya tiene un gasto.");
    setLinkedExpenseId(linkedExpense?.id ?? null);
    setItems((rows ?? []) as ShoppingItem[]);
  }

  useEffect(() => { void loadLists(); }, [includeArchived, router]);
  useEffect(() => { void loadItems(selectedListId); }, [selectedListId]);
  useEffect(() => {
    if (!household?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`shopping-${household.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_lists", filter: `household_id=eq.${household.id}` }, () => void loadLists(selectedListId))
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${household.id}` }, () => void loadItems(selectedListId))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household?.id, selectedListId, includeArchived]);

  async function handleCreateList(event: FormEvent) {
    event.preventDefault();
    if (!household || !listName.trim()) return;
    setSaving(true); setError(null);
    const { data, error: createError } = await createShoppingList(household.id, listName);
    if (createError) setError(translateShoppingError(createError.message));
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
    if (createError) setError(translateShoppingError(createError.message));
    else { setItemName(""); setQuantity("1"); setUnit(""); setEstimatedPrice(""); await loadItems(selectedList.id); }
    setSaving(false);
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!selectedList || !editingName.trim()) return;
    setSaving(true); setError(null);
    const { error: renameError } = await renameShoppingList(selectedList.id, editingName);
    if (renameError) setError(translateShoppingError(renameError.message));
    else { setEditingName(""); await loadLists(selectedList.id); }
    setSaving(false);
  }

  async function handleArchive() {
    if (!selectedList) return;
    const action = selectedList.is_archived ? "reactivar" : "archivar";
    if (!window.confirm(`¿Quieres ${action} la lista «${selectedList.name}»?`)) return;
    setSaving(true); setError(null);
    const { error: archiveError } = await archiveShoppingList(selectedList.id, !selectedList.is_archived);
    if (archiveError) setError(translateShoppingError(archiveError.message));
    else await loadLists(null);
    setSaving(false);
  }

  async function handleToggle(item: ShoppingItem) {
    setError(null);
    const { error: updateError } = await toggleShoppingItem(item.id, !item.is_checked);
    if (updateError) setError(translateShoppingError(updateError.message)); else await loadItems(selectedListId);
  }

  async function handleDelete(item: ShoppingItem) {
    if (!window.confirm(`¿Eliminar «${item.name}» de la lista?`)) return;
    const { error: deleteError } = await deleteShoppingItem(item.id);
    if (deleteError) setError(translateShoppingError(deleteError.message)); else setItems((current) => current.filter((row) => row.id !== item.id));
  }

  if (loading) return <><AppNav /><PageSkeleton label="Cargando compras…" /></>;
  const orderedItems = [...items].sort((a, b) => Number(a.is_checked) - Number(b.is_checked));
  const allChecked = items.length > 0 && pendingCount === 0;

  return <><AppNav /><main className="shell page shopping-page">
    <PageHeader eyebrow={household?.name ?? "Tu hogar"} title="Lista de compras" description="Organiza la compra y marca lo que ya está en el carrito." action={<Link className="button button-primary" href={selectedList && !selectedList.is_archived ? "#shopping-item" : "#shopping-list-name"}>{selectedList && !selectedList.is_archived ? "Añadir artículo" : "Nueva lista"}</Link>} />
    {error && <div className="form-error shopping-error" role="alert">{error}</div>}
    <div className="shopping-layout">
      <aside className="panel shopping-sidebar">
        <div className="panel-header"><div><h2>Mis listas</h2><p className="muted" style={{ marginBottom: 0 }}>{lists.length} listas visibles.</p></div></div>
        <form className="inline-form" onSubmit={handleCreateList}><input id="shopping-list-name" aria-label="Nombre de la nueva lista" maxLength={100} value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Nueva lista" /><button className="button button-primary" disabled={saving || !listName.trim()}>Crear</button></form>
        <label className="checkbox switch-label"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /><span aria-hidden="true">✓</span><em>Mostrar archivadas</em></label>
        {lists.length === 0 ? <p className="muted shopping-list-hint">Crea una lista para añadir artículos.</p> : <nav className="shopping-list-nav" aria-label="Listas de compras">{lists.map((list) => <button type="button" key={list.id} aria-pressed={list.id === selectedListId} className={`shopping-list-link ${list.id === selectedListId ? "active" : ""} ${list.is_archived ? "archived" : ""}`} onClick={() => setSelectedListId(list.id)}><span>{list.name}</span><small>{list.is_archived ? "Archivada" : "Abrir"}</small></button>)}</nav>}
      </aside>
      <section className="panel shopping-content">
        {!selectedList ? <EmptyState title="Crea tu primera lista" description="Empieza con la compra semanal o una lista para el mercado." action={<Link className="button button-secondary" href="#shopping-list-name">Crear una lista</Link>} /> : <>
          <div className="panel-header shopping-title"><div><h2>{selectedList.name}</h2></div><div className="shopping-title-actions"><button className="button button-quiet" type="button" onClick={() => setEditingName(selectedList.name)}>Renombrar</button><button className="button button-quiet" type="button" onClick={() => void handleArchive()} disabled={saving}>{selectedList.is_archived ? "Reactivar" : "Archivar"}</button></div></div>
          <div className="shopping-progress">
            <div><span>{items.length - pendingCount} de {items.length} artículos marcados</span><strong>{formatPrice(estimatedTotalCents / 100)} <small>estimados</small></strong></div>
            <progress max={items.length || 1} value={items.length - pendingCount} aria-label="Progreso de la compra" />
          </div>
          {editingName && <form className="inline-form rename-form" onSubmit={handleRename}><input aria-label="Nuevo nombre de la lista" maxLength={100} value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button className="button button-primary" disabled={saving}>Guardar</button><button className="button button-quiet" type="button" onClick={() => setEditingName("")}>Cancelar</button></form>}
          {selectedList.is_archived && <div className="archive-notice">Esta lista está archivada. Reactívala para añadir o modificar artículos.</div>}
          <form className="shopping-item-form" onSubmit={handleCreateItem}><div className="field"><label htmlFor="shopping-item">Artículo</label><input id="shopping-item" required maxLength={150} disabled={selectedList.is_archived} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Ej. Leche" /></div><div className="form-row"><div className="field"><label htmlFor="shopping-quantity">Cantidad</label><input id="shopping-quantity" type="number" min="0.01" step="0.01" disabled={selectedList.is_archived} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="field"><label htmlFor="shopping-unit">Unidad</label><input id="shopping-unit" maxLength={30} disabled={selectedList.is_archived} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="uds., kg…" /></div></div><div className="field"><label htmlFor="shopping-price">Precio unitario estimado (€)</label><input id="shopping-price" type="number" min="0" step="0.01" disabled={selectedList.is_archived} value={estimatedPrice} onChange={(event) => setEstimatedPrice(event.target.value)} placeholder="Opcional" /></div><button className="button button-primary" disabled={saving || selectedList.is_archived || !itemName.trim()}>{saving ? "Guardando…" : "Añadir artículo"}</button></form>
          <div className="shopping-expense-link">{linkedExpenseId ? <><span className="badge badge-success">Gasto registrado</span><Link className="link" href={`/expenses?expense=${linkedExpenseId}`}>Ver gasto</Link></> : <Link className={`button button-${allChecked && estimatedTotalCents > 0 ? "primary" : "secondary"} ${estimatedTotalCents <= 0 ? "disabled-link" : ""}`} aria-disabled={estimatedTotalCents <= 0} href={estimatedTotalCents > 0 ? expenseLink : "#shopping-price"}><Receipt size={16} /> Registrar como gasto</Link>}</div>
          {items.length === 0 ? <EmptyState title="Esta lista está vacía" description={selectedList.is_archived ? "Reactiva la lista para añadir artículos." : "Añade el primer artículo para empezar la compra."} action={selectedList.is_archived ? undefined : <Link className="button button-secondary" href="#shopping-item">Añadir artículo</Link>} /> : <div className="shopping-items">{orderedItems.map((item) => <article className={`shopping-item ${item.is_checked ? "checked" : ""}`} key={item.id}><label className="shopping-check"><input type="checkbox" aria-label={`Marcar ${item.name}`} checked={item.is_checked} onChange={() => void handleToggle(item)} /><span className="checkmark" aria-hidden="true">✓</span></label><div className="shopping-item-main"><strong>{item.name}</strong><span>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span></div><span className="shopping-price">{item.estimated_price == null ? "Sin estimar" : formatPrice(itemTotalCents(item.quantity, item.estimated_price) / 100)}</span><button className="button button-quiet delete-button" type="button" onClick={() => void handleDelete(item)}>Eliminar</button></article>)}</div>}
        </>}
      </section>
    </div><AddFab href="#shopping-item" />
  </main></>;
}
