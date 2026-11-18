# Matriz inicial de requisitos

| ID | Prioridad | Requisito | Área | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| AUTH-01 | P0 | Registrarse e iniciar sesión con email | Auth | Un usuario válido puede entrar y cerrar sesión | Pendiente |
| HOME-01 | P0 | Crear un hogar | Hogar | El creador queda como `owner` y recibe categorías iniciales | Pendiente |
| HOME-02 | P0 | Unirse mediante código | Hogar | Un segundo usuario entra y ve el mismo hogar | Pendiente |
| HOME-03 | P0 | Aislar datos por hogar | Seguridad | Un usuario no puede leer ni modificar datos de otro hogar | Pendiente de verificación |
| TASK-01 | P0 | Crear, editar y eliminar tareas | Tareas | Se guardan título, prioridad, estado y fecha opcional | Pendiente |
| TASK-02 | P0 | Cambiar estado y registrar finalización | Tareas | `completed_at` se completa al pasar a `done` | Pendiente |
| SHOP-01 | P0 | Gestionar listas de compra | Compras | Un hogar puede crear, archivar y consultar listas | Pendiente |
| SHOP-02 | P0 | Gestionar artículos | Compras | Se puede marcar artículo, cantidad, unidad y precio estimado | Pendiente |
| EXP-01 | P0 | Registrar gastos | Finanzas | Un miembro registra importe, fecha, categoría y pagador | Pendiente |
| EXP-02 | P0 | Relacionar gastos con compras | Finanzas | Un gasto puede enlazarse opcionalmente con una lista | Pendiente |
| CAL-01 | P0 | Gestionar eventos | Calendario | Se crean eventos con inicio, fin y opción de día completo | Pendiente |
| CAL-02 | P0 | Mostrar tareas fechadas | Calendario | Las tareas con `due_date` aparecen en la vista de calendario | Pendiente |
| MEAL-01 | P0 | Planificar comidas manualmente | Comidas | Existe una entrada por día y tipo de comida | Pendiente |
| SEC-01 | P0 | Aplicar RLS en todas las tablas | Seguridad | Las consultas se filtran por pertenencia al hogar | Pendiente de verificación |
| UX-01 | P0 | Interfaz responsive | UX | Las vistas principales funcionan en móvil y escritorio | Pendiente |
| DEP-01 | P0 | Desplegar la aplicación | Entrega | La aplicación está disponible en Vercel con variables configuradas | Pendiente |
| PWA-01 | P1 | Instalar como PWA | Plataforma | La web puede instalarse desde un navegador compatible | Pendiente |
| REC-01 | P1 | Recetas con ingredientes | Comidas | Una receta permite ingredientes estructurados | Fuera de P0 |
| BUD-01 | P1 | Presupuestos por categoría | Finanzas | Se puede comparar gasto real con presupuesto | Fuera de P0 |
| SUP-01 | P1 | Comparar supermercados | Compras | Se comparan precios por producto y establecimiento | Fuera de P0 |

Esta matriz debe ampliarse con los 28 requisitos funcionales y 10 no funcionales definitivos antes del cierre del SRS.
