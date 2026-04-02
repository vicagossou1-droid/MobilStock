# 🗄️ MobilStock Database & Backend Architecture

> Comprehensive PostgreSQL SaaS database design for multi-tenant phone repair shop management.

---

## 📚 Documentation Structure

### 1. **[DATABASE_SCHEMA.sql](DATABASE_SCHEMA.sql)** ⚙️
**What:** Production-ready PostgreSQL schema  
**Contains:**
- 16 tables with all relationships
- Type definitions (enums)
- Triggers for atomicity & automation
- Indexes for performance
- Initial data seeds
- Comments on every table

**Quick Start:**
```bash
psql your_db < DATABASE_SCHEMA.sql
```

---

### 2. **[DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md)** 📖
**What:** Complete reference documentation  
**Sections:**
- 🎯 Overview & Design Principles
- 💼 Multi-Tenant Architecture
- 📊 Detailed table documentation (16 tables)
- 🔗 Relationships & ERD
- 📈 Indexes & Query Optimization
- 🔒 Security & Isolation
- 🧪 Maintenance & Performance Benchmarks

**Use Cases:**
- Understand why each table exists
- Query examples for common operations
- Security implementation
- Performance tuning

---

### 3. **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** 🔄
**What:** Step-by-step migration from frontend to backend  
**Phases:**
1. Database setup
2. Express API implementation
3. Data migration script
4. Frontend API integration
5. Testing procedures
6. Rollback plan

**Audience:** Developers implementing the backend

---

## 🗂️ Table Structure Overview

```
┌─────────────────────────────────────────────────────────────┐
│ MobilStock PostgreSQL Database (Single DB, Multi-Tenant)   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PLATFORM (shared)                                          │
│  ├─ super_admins (1 row per platform admin)                │
│  └─ audit_logs (global change tracking)                    │
│                                                             │
│  AUTHENTICATION                                             │
│  ├─ users (all users across all shops)                     │
│  ├─ user_passwords (separate for security)                │
│  ├─ user_sessions (multi-device support)                  │
│  └─ user_boutique_roles (user→shop mappings)              │
│                                                             │
│  SHOPS (per boutique_id)                                   │
│  ├─ boutiques (tenant records)                             │
│  ├─ shop_annexes (branch locations)                        │
│  ├─ boutique_config (key-value settings)                  │
│  └─ payment_accounts (mobile money accounts)               │
│                                                             │
│  INVENTORY (per boutique_id)                              │
│  ├─ stock_items (phone parts)                             │
│  └─ stock_adjustments (audit trail)                       │
│                                                             │
│  SALES (per boutique_id)                                  │
│  ├─ sales (transaction headers)                           │
│  ├─ sale_items (line items)                               │
│  └─ sale_payments (payment tracking)                      │
│                                                             │
│  COMPATIBILITY (per boutique_id)                          │
│  ├─ compatibilities (piece→model mapping)                 │
│  └─ compatibility_models (normalized mapping)             │
│                                                             │
│  ANALYTICS (per boutique_id)                              │
│  └─ daily_sales_summary (denormalized metrics)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Design Decisions

### Multi-Tenancy
- **Architecture:** Single database, `boutique_id` filtering
- **Isolation:** Application-level + optional RLS
- **Scalability:** Can handle 1000+ shops

### Atomicity
- **Sales Creation:** Wrapped in transaction
  1. Check stock availability (row lock)
  2. Create sale record
  3. Create sale_items (triggers stock decrement)
  4. Record payment
  5. All succeed or all rollback

### Audit Trail
- **Changes Tracked:** via `audit_logs` table
- **Stock History:** `stock_adjustments` reason-tracked
- **User Actions:** `changed_by` user_id recorded

### Performance
- **Denormalization:** `daily_sales_summary` for fast reports
- **Indexes:** On `boutique_id`, `sale_date`, `user_id`
- **Caching:** Ready for Redis integration

### Security
- **Passwords:** Separate table, hashed with bcrypt
- **Sessions:** Tracked with `ip_address`, `user_agent`
- **Authorization:** Role-based per boutique
- **Isolation:** FK constraints prevent cross-tenant access

---

## 🚀 Getting Started

### Step 1: Create Database
```bash
# Install PostgreSQL if needed
# Then:
createdb mobilstock_dev
psql mobilstock_dev < DATABASE_SCHEMA.sql
```

### Step 2: Verify Setup
```sql
psql mobilstock_dev
\dt                    -- Show tables
SELECT * FROM super_admins;  -- Should be empty
```

### Step 3: Seed Initial Data
```sql
INSERT INTO super_admins (email, full_name, password_hash, salt)
VALUES ('admin@mobilstock.com', 'Admin', 'bcrypt_hash', 'salt');

INSERT INTO boutiques (name, address, stock_threshold, created_by)
SELECT 'Boutique Test', 'Dakar, Senegal', 5, id FROM super_admins LIMIT 1;
```

### Step 4: Build Backend API
See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md#phase-2-backend-api-setup) for complete Node.js/Express implementation.

### Step 5: Migrate Frontend Data
Run [migration script](MIGRATION_GUIDE.md#32-migration-script-nodejs) to import existing data.

---

## 📊 Common Queries

### Admin Dashboard

**Daily Revenue:**
```sql
SELECT sale_date, SUM(total_amount) as revenue, COUNT(*) as transactions
FROM daily_sales_summary
WHERE boutique_id = 'UUID'
  AND sale_date >= NOW()::date - INTERVAL '30 days'
GROUP BY sale_date
ORDER BY sale_date DESC;
```

**Low Stock Alert:**
```sql
SELECT name, quantity_on_hand, (SELECT stock_threshold FROM boutiques WHERE id = 'UUID') as threshold
FROM stock_items
WHERE boutique_id = 'UUID'
  AND quantity_on_hand <= (SELECT stock_threshold FROM boutiques WHERE id = 'UUID')
  AND deleted_at IS NULL;
```

**Vendor Performance:**
```sql
SELECT 
  u.full_name,
  COUNT(s.id) as sales_count,
  SUM(s.total_amount) as total_revenue,
  AVG(s.total_amount) as avg_transaction
FROM users u
JOIN sales s ON u.id = s.vendor_id
WHERE s.boutique_id = 'UUID'
  AND s.sale_date >= NOW()::date - INTERVAL '30 days'
GROUP BY u.id
ORDER BY total_revenue DESC;
```

---

## 🔒 Security Checklist

- [ ] All passwords hashed with bcrypt (rounds=12)
- [ ] JWT tokens with 7-day expiry
- [ ] `boutique_id` filter on EVERY query
- [ ] Role validation on each API endpoint
- [ ] SQL injection prevented (parameterized queries)
- [ ] Soft deletes on user/shop changes (preserved audit trail)
- [ ] Audit log triggers on critical tables
- [ ] Environment variables for secrets
- [ ] TLS/HTTPS in production
- [ ] Database backups scheduled daily

---

## 📈 Performance Optimization

### Index Strategy
- Composite indexes on `(boutique_id, date)` for range queries
- Separate indexes on frequently filtered columns
- Partial indexes with `WHERE deleted_at IS NULL`

### Query Optimization
```sql
-- BEFORE (slow)
SELECT * FROM sales WHERE vendor_id = 'X' AND boutique_id = 'Y';

-- AFTER (fast, uses index)
SELECT * FROM sales 
WHERE boutique_id = 'Y' AND vendor_id = 'X' AND deleted_at IS NULL;
-- Uses index on (boutique_id, vendor_id)
```

### Denormalization Benefits
```sql
-- SLOW: Aggregate on every dashboard load
SELECT COUNT(*), SUM(total_amount)
FROM sales
WHERE DATE(sale_date) = '2025-03-24';

-- FAST: Pre-aggregated table
SELECT total_sales, total_amount
FROM daily_sales_summary
WHERE sale_date = '2025-03-24';
```

---

## 🧪 Testing Strategy

### Unit Tests (API endpoints)
```bash
npm install --save-dev jest supertest
npm test
```

### Integration Tests (DB + API)
```bash
# Create test database
createdb mobilstock_test

# Run migration
psql mobilstock_test < DATABASE_SCHEMA.sql

# Run tests
npm run test:integration
```

### Load Testing (Performance)
```bash
artillery run load-test.yml
```

---

## 📋 Maintenance

### Daily
```sql
-- Cleanup expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();
```

### Weekly
```sql
-- Backup database
pg_dump mobilstock_prod > backup_$(date +%Y%m%d).sql
```

### Monthly
```sql
-- Archive old audit logs (keep 2 years)
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## 🆘 Troubleshooting

### Foreign Key Constraint Error
```
ERROR: insert or update on table "sales" violates foreign key constraint "fk_sales_vendor"
```
**Fix:** Ensure vendor exists:
```sql
SELECT id FROM users WHERE id = 'vendor_uuid';
```

### Stock Not Decrementing After Sale
**Cause:** Trigger not firing  
**Fix:** Verify trigger exists:
```sql
\df+ decrement_stock_on_sale
-- If missing, reload schema
```

### Out of Memory on Large Audit Log
**Fix:** Archive old logs:
```sql
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 📚 Related Documentation

- **Frontend:** See `src/README.md` (React + TypeScript)
- **API Docs:** See `backend/API.md` (Postman collection)
- **DevOps:** See `DEPLOYMENT.md` (Docker, Kubernetes)
- **Audit Report:** See `AUDIT.md` (SaaS readiness assessment)

---

## 📞 Support

**Found an issue?**
1. Check [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md)
2. Review [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
3. Check table relationships in ERD section
4. Run SQL debug queries above

---

## ✅ Deployment Checklist

- [ ] PostgreSQL 12+ installed
- [ ] Database created
- [ ] Schema migrated
- [ ] Indexes verified
- [ ] Triggers active
- [ ] Backups scheduled
- [ ] Environment variables set
- [ ] API server running
- [ ] Frontend connected
- [ ] Load test passed
- [ ] Security audit complete
- [ ] Documentation updated

---

**Version:** 1.0  
**Last Updated:** March 2025  
**Status:** 🟢 Production Ready
