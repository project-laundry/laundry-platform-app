# NooraCare Dashboard Specifications

**Related Documentation:** See [ENTITIES.md](./ENTITIES.md) for database schema and [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for workflows.

---

## Admin Driver Dashboard

**Description:** Admin logs into platform to manage pickup and delivery operations.

**Order Views by Status:**

- **Pending Pickup:** `status = 'pickup_scheduled'`
- **In Transit to Cleaner:** `status = 'picked_up'`
- **Ready for Collection:** `status = 'ready_for_delivery'`
- **Out for Delivery:** `status = 'out_for_delivery'`

**Actions:**

- Transition orders through workflow statuses
- View order details and customer addresses

**Note:** In MVP, admins handle all driver operations manually via this dashboard.

---

## Cleaner Dashboard

**Description:** Cleaners access their dashboard to manage assigned orders and availability settings.

### Order Views

**1. Active Orders** (`status = 'in_cleaning'`)

Orders currently being cleaned. These are the cleaner's primary work items.

**Displayed Fields:**
- Order number
- Customer name
- Delivery date (deadline)
- Special instructions:
  - `needs_ironing` (boolean)
  - `delicate_items_count` (integer)
  - `extra_kg` (integer)

**Actions:**
- **Mark as Ready** - Transitions order to `ready_for_delivery`, sets `ready_for_delivery_at` timestamp
- **Decline** - Triggers reassignment (see Decline Order flow below)

---

**2. Upcoming Orders** (`status = 'pickup_scheduled'`)

Orders assigned to the cleaner but not yet picked up. Allows planning workload.

**Displayed Fields:**
- Order number
- Customer name
- Scheduled pickup date
- Special instructions (same as above)

**Actions:**
- **Decline** - Triggers reassignment before pickup occurs

---

### Actions

**Mark Order as Ready**

- Transitions order status: `in_cleaning` → `ready_for_delivery`
- Sets `Order.ready_for_delivery_at = now()`
- Notifies admin that order is ready for driver collection

**Decline Order**

- Adds cleaner ID to `Order.declined_by_cleaner_ids`
- Requires reason input (stored for admin review)
- System finds next available cleaner using matching criteria:
  - Same city as customer
  - `verification_status = 'approved'`
  - `is_accepting_orders = true`
  - `weekly_schedule` includes pickup weekday
  - Not in `declined_by_cleaner_ids`
- If no cleaner available, order status → `pending_assignment` for manual resolution

---

### Settings

**Toggle Availability** (`is_accepting_orders`)

- Switch to enable/disable receiving new order assignments
- When `false`: Cleaner receives no new assignments (vacation mode)
- Existing assigned orders remain with cleaner
- Default: `true`

**Edit Weekly Schedule** (`weekly_schedule`)

- Toggle individual weekdays on/off
- Format: `{"mon": true, "tue": true, "wed": false, ...}`
- Affects future order assignments only
- Orders can only be assigned if cleaner's schedule includes the pickup weekday

---

## Customer Dashboard

*To be documented when implemented.*
