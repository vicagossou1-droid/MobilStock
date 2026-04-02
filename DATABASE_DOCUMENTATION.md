# MobilStock Database Architecture

## Table of Contents

1. [Overview](#overview)
2. [Multi-Tenant Design](#multi-tenant-design)
3. [Table Documentation](#table-documentation)
4. [Relationships & Constraints](#relationships--constraints)
5. [Indexes Strategy](#indexes-strategy)
6. [Transactions & Atomicity](#transactions--atomicity)
7. [Security & Isolation](#security--isolation)
8. [Migration Guide](#migration-guide)

---

## Overview

This PostgreSQL schema supports a **SaaS platform** serving multiple phone repair shops (boutiques). Each shop is a tenant with its own isolated data, users, and inventory.

### Key Design Principles

- **Multi-Tenancy:** `boutique_id` on all customer-facing tables
- **Role-Based Access:** 5 roles (super_admin, proprietaire, gerant, vendeur, technicien)
- **Audit Trail:** Full change tracking via triggers + `audit_logs` table
- **Soft Deletes:** `deleted_at` column; records never permanently deleted
- **Atomicity:** Sales transactions with automatic stock decrement
- **Scalability:** Denormalized metrics (daily_sales_summary) for fast reporting

---

## Multi-Tenant Design

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ Platform (postgres DB)                                      │
├─────────────────────────────────────────────────────────────┤
│  Shared:                          Tenant-Isolated:          │
│  ├─ super_admins                  ├─ boutiques              │
│  ├─ users                         ├─ stock_items            │
│  └─ user_sessions                 ├─ sales                  │
│                                   ├─ sale_items             │
│                                   ├─ compatibilities        │
│                                   ├─ payment_accounts       │
│                                   └─ audit_logs             │
└─────────────────────────────────────────────────────────────┘
```

### Key Points

- **Single Database:** All shops use same PostgreSQL instance
- **Isolation:** Queries filter by `boutique_id` (no separate DBs)
- **Users Table:** Shared; each user can belong to multiple shops via `user_boutique_roles`
- **Data Access:** Application enforces `WHERE boutique_id = :current_boutique_id`

---

## Table Documentation

### 1. **super_admins**

Platform-level administrators (not shop-specific).

```sql
super_admins
├─ id (UUID)
├─ email (unique)
├─ full_name
├─ password_hash
├─ salt
├─ is_active
├─ created_at, updated_at, deleted_at
```

**Purpose:** Account for platform maintainers (can manage all shops).

**Usage:**
```sql
SELECT * FROM super_admins WHERE email = 'admin@mobilstock.com';
```

---

### 2. **boutiques**

Shop/Tenant records.

```sql
boutiques
├─ id (UUID, PRIMARY KEY)
├─ name (VARCHAR)
├─ address, city
├─ latitude, longitude
├─ stock_threshold (INT, default=5)
├─ logo_url
├─ created_by (FK → super_admins)
├─ subscription_tier ('free' | 'basic' | 'pro' | 'enterprise')
├─ is_active
├─ created_at, updated_at, deleted_at
```

**Purpose:** Each boutique is a tenant; isolates all customer data.

**Query Examples:**
```sql
-- Get all active shops
SELECT * FROM boutiques WHERE is_active = true AND deleted_at IS NULL;

-- Get high-value customers
SELECT * FROM boutiques WHERE subscription_tier IN ('pro', 'enterprise');
```

---

### 3. **shop_annexes**

Branch locations for a boutique.

```sql
shop_annexes
├─ id (UUID)
├─ boutique_id (FK)
├─ name (VARCHAR)
├─ address
├─ manager_name
├─ phone
├─ created_at, updated_at, deleted_at
```

**Purpose:** Support multi-location shops (e.g., same owner, different addresses).

---

### 4. **users**

Application users (shared across all shops).

```sql
users
├─ id (UUID)
├─ email (unique)
├─ full_name
├─ avatar_url
├─ is_active
├─ is_super_admin (boolean)
├─ created_at, updated_at, deleted_at
```

**Purpose:** Central user registry. Roles assigned per-shop via `user_boutique_roles`.

**Key Point:** User can be 'vendeur' at Shop A, 'gerant' at Shop B.

---

### 5. **user_passwords**

Password credentials (separate table for security).

```sql
user_passwords
├─ id (UUID)
├─ user_id (FK, unique)
├─ password_hash
├─ salt
├─ reset_token
├─ reset_expires_at
├─ created_at, updated_at
```

**Purpose:** 
- Separate from user table (can be archived/deleted independently)
- Supports password reset flow

**Query:**
```sql
-- Validate login
SELECT u.id, u.email, up.password_hash
FROM users u
JOIN user_passwords up ON u.id = up.user_id
WHERE u.email = 'fatou@boutique.com' AND up.password_hash = hash;
```

---

### 6. **user_boutique_roles**

Maps users to shops with specific roles (multi-tenant relationship).

```sql
user_boutique_roles
├─ id (UUID)
├─ user_id (FK)
├─ boutique_id (FK)
├─ role (user_role enum: proprietaire | gerant | vendeur | technicien | super_admin)
├─ is_active
├─ sales_count (denormalized; updated via trigger)
├─ created_at, updated_at, deleted_at
└─ UNIQUE(user_id, boutique_id)
```

**Purpose:** Define user roles per shop.

**Examples:**
```sql
-- Get Fatou's roles across all shops
SELECT ubr.boutique_id, b.name, ubr.role, ubr.sales_count
FROM user_boutique_roles ubr
JOIN boutiques b ON ubr.boutique_id = b.id
WHERE ubr.user_id = '...' AND ubr.deleted_at IS NULL
ORDER BY b.name;

-- Get all vendors in Shop A
SELECT u.email, u.full_name
FROM user_boutique_roles ubr
JOIN users u ON ubr.user_id = u.id
WHERE ubr.boutique_id = '...' AND ubr.role = 'vendeur' AND ubr.deleted_at IS NULL;

-- Restrict by minimum role (Gerant+ can access)
SELECT ... WHERE role IN ('proprietaire', 'gerant');
```

---

### 7. **user_sessions**

Multi-device session tracking.

```sql
user_sessions
├─ id (UUID)
├─ user_id (FK)
├─ token (unique, 500 chars)
├─ ip_address (INET)
├─ user_agent
├─ expires_at
├─ created_at
```

**Purpose:**
- Support multiple concurrent sessions
- Track device/IP for security
- Cleanup expired tokens

**Query:**
```sql
-- Cleanup expired sessions (run daily)
DELETE FROM user_sessions WHERE expires_at < NOW();

-- Revoke all sessions for a user (logout everywhere)
DELETE FROM user_sessions WHERE user_id = '...';
```

---

### 8. **stock_items**

Inventory pieces.

```sql
stock_items
├─ id (UUID)
├─ boutique_id (FK)
├─ brand (VARCHAR: Apple, Samsung, etc.)
├─ series (VARCHAR: iPhone, Galaxy S, etc.)
├─ model (VARCHAR: iPhone 13, S21)
├─ part_type (VARCHAR: Écran, Batterie, etc.)
├─ name (VARCHAR: Écran LCD, Batterie 4000mAh)
├─ sku (VARCHAR, optional)
├─ price_client (DECIMAL)
├─ price_technician (DECIMAL)
├─ quantity_on_hand (INT)
├─ location_code (VARCHAR: A1-03, B2-01)
├─ created_at, updated_at, deleted_at
```

**Purpose:** Product inventory for a shop.

**Key Features:**
- Dual pricing (client vs technician)
- Soft delete (historical tracking)
- Location tracking for physical warehouse

**Indexes:**
```
- (boutique_id, sku)
- (boutique_id, model)
```

**Queries:**
```sql
-- Get low-stock items
SELECT * FROM stock_items
WHERE boutique_id = '...'
  AND quantity_on_hand <= (SELECT stock_threshold FROM boutiques WHERE id = '...')
  AND deleted_at IS NULL;

-- Get stock value
SELECT SUM(quantity_on_hand * price_client) as total_value
FROM stock_items
WHERE boutique_id = '...' AND deleted_at IS NULL;
```

---

### 9. **stock_adjustments**

Audit trail for inventory changes.

```sql
stock_adjustments
├─ id (UUID)
├─ stock_item_id (FK)
├─ boutique_id (FK)
├─ quantity_delta (INT: +10, -5, etc.)
├─ reason (enum: initial_stock|purchase|sale|adjustment|damage|loss|return)
├─ notes (TEXT)
├─ changed_by (FK → users, nullable)
├─ created_at
```

**Purpose:**
- Full inventory audit trail
- Explains every quantity change
- Regulatory compliance

**Queries:**
```sql
-- Get adjustment history for a stock item
SELECT * FROM stock_adjustments
WHERE stock_item_id = '...'
ORDER BY created_at DESC;

-- Find all damage/loss adjustments
SELECT * FROM stock_adjustments
WHERE boutique_id = '...' AND reason IN ('damage', 'loss')
ORDER BY created_at DESC;
```

---

### 10. **sales**

Sales transactions header (summary).

```sql
sales
├─ id (UUID)
├─ boutique_id (FK)
├─ sale_number (VARCHAR: 2025-00001, humanized reference)
├─ sale_type (enum: catalogue | libre)
├─ client_type (enum: simple | technicien)
├─ vendor_id (FK → users, RESTRICT on delete)
├─ total_amount (DECIMAL)
├─ sale_date (TIMESTAMP)
├─ created_at, updated_at, deleted_at
```

**Purpose:** Transaction header. Line items stored in `sale_items` (normalized).

**Key Points:**
- `vendor_id` is FK (cannot delete vendor without orphaning sales)
- `total_amount` = SUM(sale_items.subtotal)
- Automatic decrement of stock via trigger

**Queries:**
```sql
-- Get today's sales
SELECT * FROM sales
WHERE boutique_id = '...'
  AND DATE(sale_date) = TODAY()
  AND deleted_at IS NULL;

-- Get sales by vendor (month)
SELECT vendor_id, COUNT(*) as sale_count, SUM(total_amount) as revenue
FROM sales
WHERE boutique_id = '...'
  AND EXTRACT(YEAR FROM sale_date) = 2025
  AND EXTRACT(MONTH FROM sale_date) = 3
  AND deleted_at IS NULL
GROUP BY vendor_id;
```

**Trigger Alert:** `tr_update_sales_count` increments `user_boutique_roles.sales_count` on INSERT.

---

### 11. **sale_items**

Line items (products sold in a transaction).

```sql
sale_items
├─ id (UUID)
├─ sale_id (FK)
├─ stock_item_id (FK)
├─ quantity (INT, CHECK > 0)
├─ unit_price (DECIMAL: price at time of sale)
├─ subtotal (GENERATED: quantity * unit_price)
├─ created_at
```

**Purpose:** Normalize sales data; track exactly which items sold.

**Key Features:**
- `unit_price` captured at time of sale (historical accuracy)
- `subtotal` auto-calculated
- Prevents sale from being deleted if item is referenced elsewhere
- **Trigger:** `tr_decrement_stock` automatically decrements `stock_items.quantity_on_hand`

**Queries:**
```sql
-- Get detailed sale with items
SELECT s.id, s.sale_date, s.total_amount,
       si.name, sai.quantity, sai.unit_price, sai.subtotal
FROM sales s
JOIN sale_items sai ON s.id = sai.sale_id
JOIN stock_items si ON sai.stock_item_id = si.id
WHERE s.id = '...';

-- Most popular items (this month)
SELECT si.name, COUNT(*) as times_sold, SUM(sai.quantity) as qty_sold
FROM sale_items sai
JOIN stock_items si ON sai.stock_item_id = si.id
JOIN sales s ON sai.sale_id = s.id
WHERE s.boutique_id = '...'
  AND DATE_TRUNC('month', s.sale_date) = DATE_TRUNC('month', NOW())
GROUP BY si.id, si.name
ORDER BY qty_sold DESC;
```

**Transaction Atomicity:**
```python
# Backend pseudocode
BEGIN TRANSACTION;
  1. Check stock availability: SELECT quantity_on_hand FROM stock_items WHERE id = X FOR UPDATE;
  2. Create sale: INSERT INTO sales (...);
  3. Create sale_items: INSERT INTO sale_items (...);  -- Trigger auto-decrements stock
  4. Create payment record: INSERT INTO sale_payments (...);
COMMIT;  # All succeed or all rollback
```

---

### 12. **sale_payments**

Payment tracking (cash vs mobile).

```sql
sale_payments
├─ id (UUID)
├─ sale_id (FK)
├─ payment_method (enum: cash | mobile)
├─ operator (enum: Mixx | Flooz | custom)
├─ reference_number (VARCHAR: transaction ID)
├─ amount (DECIMAL)
├─ created_at
```

**Purpose:** Track how sale was paid.

**Queries:**
```sql
-- Daily payment summary
SELECT payment_method, SUM(amount) as total
FROM sale_payments sp
JOIN sales s ON sp.sale_id = s.id
WHERE s.boutique_id = '...' AND DATE(s.sale_date) = TODAY()
GROUP BY payment_method;

-- Mobile operator reconciliation
SELECT operator, COUNT(*) as transactions, SUM(amount) as total
FROM sale_payments
WHERE payment_method = 'mobile'
GROUP BY operator;
```

---

### 13. **payment_accounts**

Mobile money & bank account management.

```sql
payment_accounts
├─ id (UUID)
├─ boutique_id (FK)
├─ operator (enum: Mixx | Flooz | custom)
├─ account_number (VARCHAR)
├─ account_holder_name (VARCHAR)
├─ account_type (VARCHAR: personnel | commercial)
├─ is_active
├─ created_at, updated_at, deleted_at
└─ UNIQUE(boutique_id, operator, account_number)
```

**Purpose:** Shop's payment accounts.

**Usage:**
```sql
-- Get active payment accounts
SELECT * FROM payment_accounts
WHERE boutique_id = '...'
  AND is_active = true
  AND (operator = 'custom' OR operator IN ('Mixx', 'Flooz'));
```

---

### 14. **compatibilities**

Compatible parts mapping (e.g., generic LCD screen works with iPhone 11/12/13).

```sql
compatibilities
├─ id (UUID)
├─ boutique_id (FK)
├─ piece_name (VARCHAR: Écran LCD Générique Type A)
├─ piece_type (VARCHAR: Écran, Batterie, etc., optional)
├─ supported_models (TEXT[] array: ["iPhone 11", "iPhone 12", "iPhone 13"])
├─ created_at, updated_at, deleted_at
└─ UNIQUE(boutique_id, piece_name)
```

**Purpose:** Suggest compatible parts during sales (e.g., user searches "iPhone 12" → show compatible screens).

**Key Features:**
- `supported_models` as array (denormalized for speed)
- Optional: Use `compatibility_models` table if many models per piece

**Queries:**
```sql
-- Find compatible pieces for model
SELECT * FROM compatibilities
WHERE boutique_id = '...'
  AND supported_models @> ARRAY['iPhone 12']::TEXT[]
  AND deleted_at IS NULL;

-- Search by piece name
SELECT * FROM compatibilities
WHERE boutique_id = '...'
  AND LOWER(piece_name) ILIKE '%écran%'
  AND deleted_at IS NULL;
```

---

### 15. **audit_logs**

Full change audit trail (compliance).

```sql
audit_logs
├─ id (UUID)
├─ boutique_id (FK, nullable)
├─ entity_type (VARCHAR: stock_item | sale | user | payment_account)
├─ entity_id (UUID)
├─ action (VARCHAR: CREATE | UPDATE | DELETE)
├─ old_values (JSONB: previous state)
├─ new_values (JSONB: new state)
├─ changed_by (FK → users, nullable)
├─ created_at
```

**Purpose:** Full audit trail for compliance & debugging.

**Triggers populate this:**
- `audit_stock_changes()` → logs stock_item changes
- Can add more triggers for other entities

**Queries:**
```sql
-- See all changes to a stock item
SELECT * FROM audit_logs
WHERE entity_type = 'stock_item' AND entity_id = '...'
ORDER BY created_at DESC;

-- Who changed what, when
SELECT changed_by, entity_type, action, created_at, new_values
FROM audit_logs
WHERE boutique_id = '...'
ORDER BY created_at DESC
LIMIT 50;

-- Compliance: All changes in date range
SELECT * FROM audit_logs
WHERE boutique_id = '...'
  AND created_at BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY created_at DESC;
```

---

### 16. **daily_sales_summary**

Denormalized metrics for fast reporting (updated via trigger).

```sql
daily_sales_summary
├─ id (UUID)
├─ boutique_id (FK)
├─ sale_date (DATE)
├─ total_sales (INT: number of transactions)
├─ total_amount (DECIMAL)
├─ cash_amount (DECIMAL)
├─ mobile_amount (DECIMAL)
├─ items_sold (INT)
├─ created_at, updated_at
└─ UNIQUE(boutique_id, sale_date)
```

**Purpose:** Fast dashboard queries (instead of re-aggregating sales table).

**Updated By:** `tr_update_daily_summary` trigger on sales INSERT.

**Query Example:**
```sql
-- Dashboard: Sales for last 30 days
SELECT sale_date, total_sales, total_amount, cash_amount, mobile_amount
FROM daily_sales_summary
WHERE boutique_id = '...'
  AND sale_date >= TODAY() - INTERVAL '30 days'
ORDER BY sale_date ASC;
```

---

## Relationships & Constraints

### Entity Relationship Diagram (ERD)

```
┌────────────────────┐
│   super_admins     │
└─────────┬──────────┘
          │ created_by
          ↓
┌─────────────────────┐              ┌──────────────────┐
│    boutiques        │◄─────────────►│  shop_annexes    │
└─────────┬───────────┘    1:N       └──────────────────┘
          │ boutique_id
          ├─────────────────────┐
          │                     │
          ↓                     ↓
┌──────────────────┐    ┌──────────────────┐
│  stock_items     │    │ payment_accounts │
│   - quantity_on ├────→│ stock_adjusts    │
│   - prices      │     └──────────────────┘
└────────┬─────────┘
         │ stock_item_id
         ↓
┌──────────────────┐
│  sale_items      │
│  - unit_price    │
│  - quantity      │
│  - subtotal      │
└────────┬─────────┘
         │ sale_id
         ↓
┌──────────────────┐     ┌──────────────────┐
│     sales        │────→│  sale_payments   │
│  - total_amount  │     │  - cash/mobile   │
│  - vendor_id  ────────→└──────────────────┘
└─────────────────┘  (FK to users)

┌──────────────────┐
│     users        │
├──────────────────┤
│  - email         │
│  - role          │
└─────────────────┬┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌─────────────────────┐  ┌──────────────────┐
│ user_boutique_roles │  │ user_passwords   │
│  - role per shop    │  │ - hash, salt     │
│  - sales_count      │  └──────────────────┘
└─────────────────────┘

       compatibilities  (shared by boutique)
       audit_logs       (global change history)
```

### Key Foreign Keys

| Table | FK Column | References | ON DELETE | Purpose |
|-------|-----------|------------|-----------|---------|
| boutiques | created_by | super_admins.id | CASCADE | Audit creation |
| stock_items | boutique_id | boutiques.id | CASCADE | Tenant isolation |
| sales | vendor_id | users.id | RESTRICT | Prevent orphan sales |
| sale_items | stock_item_id | stock_items.id | RESTRICT | Prevent history loss |
| user_boutique_roles | user_id | users.id | CASCADE | Clean up roles on user delete |
| user_boutique_roles | boutique_id | boutiques.id | CASCADE | Clean up roles on shop delete |
| user_passwords | user_id | users.id | CASCADE | 1:1 relationship |
| user_sessions | user_id | users.id | CASCADE | Clean up sessions |
| payment_accounts | boutique_id | boutiques.id | CASCADE | Tenant isolation |

---

## Indexes Strategy

### Indexes Defined

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| users | idx_users_email | BTree | Login queries |
| users | idx_users_active | BTree | Filter active users |
| stock_items | idx_stock_boutique | BTree | Tenant queries |
| stock_items | idx_stock_active | BTree + WHERE | Exclude deleted |
| sales | idx_sales_date_range | BTree | Date-range reports |
| sales | idx_sales_vendor | BTree | Vendor analytics |
| sale_items | idx_sale_items_sale | BTree | Detail queries |
| audit_logs | idx_audit_date | BTree | Compliance reports |
| payment_accounts | idx_accounts_boutique | BTree | Tenant queries |
| daily_sales_summary | idx_summary_date | BTree | Dashboard |

### Query Optimization

```sql
-- SLOW (full table scan)
SELECT * FROM stock_items WHERE boutique_id = 'X';

-- FAST (uses index)
SELECT * FROM stock_items WHERE boutique_id = 'X' AND deleted_at IS NULL;

-- Use composite indexes
SELECT * FROM sales
WHERE boutique_id = 'X'
  AND DATE_TRUNC('month', sale_date) = '2025-03-01'
  -- Uses idx_sales_date_range
```

---

## Transactions & Atomicity

### Sale Creation Flow (Atomic)

```sql
BEGIN TRANSACTION;
  -- Step 1: Verify stock availability
  SELECT quantity_on_hand FROM stock_items
  WHERE id = 'ITEM_ID' FOR UPDATE;  -- Row-level lock
  
  IF quantity_on_hand < requested_qty THEN
    ROLLBACK;  -- Out of stock
    RAISE ERROR 'Insufficient stock';
  END IF;

  -- Step 2: Create sale
  INSERT INTO sales (boutique_id, vendor_id, total_amount, sale_date)
  VALUES ('SHOP_ID', 'VENDOR_ID', 125000, NOW())
  RETURNING id;  -- Get sale_id

  -- Step 3: Create line items (triggers auto-decrement stock)
  INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price)
  VALUES ('SALE_ID', 'ITEM_ID', 2, 45000);
  -- Trigger tr_decrement_stock fires here

  -- Step 4: Record payment
  INSERT INTO sale_payments (sale_id, payment_method, amount)
  VALUES ('SALE_ID', 'cash', 125000);

COMMIT;  -- All succeed
-- If any step fails → ROLLBACK (stock not decremented, no partial sale)
```

### Conflict Scenarios Handled

| Scenario | Handling |
|----------|----------|
| Out of stock | Row lock waits; if qty insufficient, rollback |
| Concurrent sales | Row-level locks prevent oversell |
| Payment system down | Transaction rolls back; no partial sale |
| Vendor deleted mid-sale | FK constraint prevents deletion |

---

## Security & Isolation

### Multi-Tenant Isolation

```typescript
// Backend pseudocode (Node.js/Express)

// Middleware: Verify boutique access
async function requireBoutiqueAccess(req, res, next) {
  const { boutique_id } = req.params;
  const user_id = req.user.id;  // From JWT
  
  const role = await db.query(`
    SELECT role FROM user_boutique_roles
    WHERE user_id = $1 AND boutique_id = $2 AND deleted_at IS NULL
  `, [user_id, boutique_id]);
  
  if (!role) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.boutique_id = boutique_id;  // Set for query filters
  next();
}

// Query isolation
async function getStockItems(boutique_id) {
  return db.query(`
    SELECT * FROM stock_items
    WHERE boutique_id = $1 AND deleted_at IS NULL
  `, [boutique_id]);  // Always filter by boutique_id
}
```

### Row-Level Security (Optional, Advanced)

```sql
-- Enable RLS
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their boutique's stock
CREATE POLICY boutique_isolation ON stock_items
  USING (
    boutique_id = current_setting('app.current_boutique_id')::uuid
  );

-- Set context before queries
SET app.current_boutique_id = 'BOUTIQUE_UUID';
SELECT * FROM stock_items;  -- Automatically filtered by policy
```

### Password Hashing

```python
# Backend: Use bcrypt or Argon2
import bcrypt

password = "secure_password_123"
salt = bcrypt.gensalt(rounds=12)
hash = bcrypt.hashpw(password.encode(), salt)

# Store in DB
INSERT INTO user_passwords (user_id, password_hash, salt)
VALUES (user_id, hash.decode(), salt.decode());

# Verify on login
stored_hash = SELECT password_hash FROM user_passwords WHERE user_id = X;
if bcrypt.checkpw(password.encode(), stored_hash.encode()):
  # Login successful
```

---

## Migration Guide

### Phase 1: Initial Setup

1. **Create PostgreSQL database**
   ```bash
   createdb mobilstock_production
   psql mobilstock_production < DATABASE_SCHEMA.sql
   ```

2. **Verify schema**
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

3. **Seed initial data**
   ```sql
   INSERT INTO super_admins (...) VALUES (...);
   INSERT INTO boutiques (...) VALUES (...);
   ```

### Phase 2: Data Migration (from Frontend In-Memory)

```python
# Pseudocode: Migrate from frontend Zustand store

def migrate():
    # 1. Create boutique
    boutique = db.create_boutique(
        name="Boutique Amadou",
        address="123 Rue Principale",
        created_by="super_admin_id"
    )

    # 2. Create users
    for user in frontend_data['users']:
        db_user = db.create_user(email=user.email, full_name=user.nom)
        db.create_password(user_id=db_user.id, password_hash=TEMP_HASH)
        db.assign_role(
            user_id=db_user.id,
            boutique_id=boutique.id,
            role=user.role
        )

    # 3. Migrate stock
    for item in frontend_data['stock']:
        db.create_stock_item(
            boutique_id=boutique.id,
            brand=item.marque,
            model=item.modele,
            quantity_on_hand=item.quantite,
            price_client=item.prixClient
        )

    # 4. Migrate sales (IMPORTANT: normalize Sale.items)
    for sale in frontend_data['sales']:
        db_sale = db.create_sale(
            boutique_id=boutique.id,
            vendor_id=db_user_id,  # Map vendor name → user_id
            total_amount=sale.montant,
            sale_date=sale.date
        )
        
        # Create sale_items (normalize from pieces string)
        for stock_item in parse_pieces(sale.pieces):  # Custom parser
            db.create_sale_item(
                sale_id=db_sale.id,
                stock_item_id=stock_item.id,
                quantity=stock_item.qty,
                unit_price=stock_item.price
            )

    print("Migration complete")
```

---

## Maintenance

### Regular Tasks

```sql
-- Cleanup expired sessions (run hourly)
DELETE FROM user_sessions WHERE expires_at < NOW();

-- Archive old audit logs (run monthly)
-- (Keep 2 years, move older to audit_archive table)
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

-- Verify referential integrity
SELECT * FROM stock_adjustments WHERE stock_item_id NOT IN (SELECT id FROM stock_items);

-- Check daily_sales_summary consistency
SELECT boutique_id, sale_date
FROM daily_sales_summary
WHERE total_amount != (
  SELECT SUM(total_amount) FROM sales
  WHERE DATE(sale_date) = daily_sales_summary.sale_date
  GROUP BY DATE(sale_date)
);
```

---

## Performance Benchmarks

### Expected Query Times (sample sizes)

| Query | Data Size | Time |
|-------|-----------|------|
| Get stock for boutique (100 items) | 1000 items | <10ms |
| Get sales (30 days) | 10k sales | <50ms |
| Daily summary report | 365 rows | <5ms |
| Audit trail (1 year) | 100k logs | <200ms |

---

## Conclusion

This schema is:

**Scalable:** Handles multi-tenant SaaS growth  
**Secure:** Role-based, isolated by boutique_id  
**Auditable:** Full change tracking  
**Atomic:** Transactions prevent data corruption  
**Fast:** Strategic indexes & denormalization  
**Simple:** 17 tables; clear relationships  

Ready for production deployment.
