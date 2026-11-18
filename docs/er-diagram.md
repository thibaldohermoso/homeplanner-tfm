# Diagrama entidad relación

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : has
  PROFILES ||--o{ HOUSEHOLD_MEMBERS : joins
  HOUSEHOLDS ||--o{ HOUSEHOLD_MEMBERS : contains
  HOUSEHOLDS ||--o{ TASKS : owns
  HOUSEHOLDS ||--o{ EVENTS : owns
  HOUSEHOLDS ||--o{ SHOPPING_LISTS : owns
  SHOPPING_LISTS ||--o{ SHOPPING_ITEMS : contains
  HOUSEHOLDS ||--o{ EXPENSE_CATEGORIES : defines
  HOUSEHOLDS ||--o{ EXPENSES : owns
  EXPENSE_CATEGORIES ||--o{ EXPENSES : classifies
  SHOPPING_LISTS ||--o{ EXPENSES : originates
  HOUSEHOLDS ||--o{ MEAL_PLANS : owns
  PROFILES ||--o{ TASKS : assigned
  TASKS ||--o{ EVENTS : linked

  AUTH_USERS { uuid id PK }
  PROFILES { uuid id PK, text display_name }
  HOUSEHOLDS { uuid id PK, text name, text invite_code UK, uuid created_by FK }
  HOUSEHOLD_MEMBERS { uuid household_id PK, uuid user_id PK, enum role }
  TASKS { uuid id PK, uuid household_id FK, text title, enum status, enum priority, date due_date }
  EVENTS { uuid id PK, uuid household_id FK, text title, timestamptz starts_at, uuid task_id FK }
  SHOPPING_LISTS { uuid id PK, uuid household_id FK, text name, boolean is_archived }
  SHOPPING_ITEMS { uuid id PK, uuid household_id FK, uuid list_id FK, text name, numeric quantity, boolean is_checked }
  EXPENSE_CATEGORIES { uuid id PK, uuid household_id FK, text name }
  EXPENSES { uuid id PK, uuid household_id FK, uuid category_id FK, numeric amount, date spent_on }
  MEAL_PLANS { uuid id PK, uuid household_id FK, date plan_date, enum meal_type, text title }
```

## Decisiones pendientes

- Reforzar con restricciones las relaciones entre hogar y claves foráneas secundarias.
- Decidir la política para el último propietario de un hogar.
- Confirmar si comidas y listas requieren Realtime en P0.
