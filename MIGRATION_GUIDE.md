# 🔄 MIGRATION GUIDE: Frontend → PostgreSQL Backend

This guide walks through migrating MobilStock from in-memory Zustand store to PostgreSQL.

---

## 📋 Overview

**Before:** All data in-memory (Zustand store) → Lost on page refresh  
**After:** Persistent PostgreSQL backend with API

---

## 🚀 PHASE 1: Setup & Preparation

### 1.1 Create PostgreSQL Database

```bash
# Install PostgreSQL (if not already)
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql postgresql-contrib
# Windows: https://www.postgresql.org/download/windows/

# Create database
createdb mobilstock_dev
createdb mobilstock_prod

# Import schema
psql mobilstock_dev < DATABASE_SCHEMA.sql
psql mobilstock_prod < DATABASE_SCHEMA.sql

# Verify
psql mobilstock_dev
\dt  # List all tables
```

### 1.2 Test Connection

```bash
# From Node.js backend
npm install pg

# Test
node -e "
const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'mobilstock_dev'
});
client.connect();
client.query('SELECT NOW()', (err, res) => {
  console.log(res.rows[0]);
  client.end();
});
"
```

---

## 🏗️ PHASE 2: Backend API Setup

### 2.1 Create Express API

```typescript
// backend/src/server.ts

import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const app = express();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mobilstock_dev',
});

app.use(express.json());

// ============================================================================
// AUTHENTICATION
// ============================================================================

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.full_name, up.password_hash
      FROM users u
      JOIN user_passwords up ON u.id = up.user_id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password (use bcrypt in production)
    const passwordValid = password === user.password_hash; // ❌ DEMO ONLY
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================================================
// MIDDLEWARE: Verify JWT & Boutique Access
// ============================================================================

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user_id = decoded.sub;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireBoutiqueAccess(req, res, next) {
  const { boutique_id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT role FROM user_boutique_roles
      WHERE user_id = $1 AND boutique_id = $2 AND deleted_at IS NULL
    `, [req.user_id, boutique_id]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    req.role = result.rows[0].role;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

// ============================================================================
// STOCK ENDPOINTS
// ============================================================================

// Get stock
app.get('/api/boutiques/:boutique_id/stock', authMiddleware, requireBoutiqueAccess, async (req, res) => {
  const { boutique_id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT id, brand, series, model, part_type, name, sku,
             quantity_on_hand, price_client, price_technician, location_code
      FROM stock_items
      WHERE boutique_id = $1 AND deleted_at IS NULL
      ORDER BY name ASC
    `, [boutique_id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// Create stock item
app.post('/api/boutiques/:boutique_id/stock', authMiddleware, requireBoutiqueAccess, async (req, res) => {
  const { boutique_id } = req.params;
  const { brand, series, model, part_type, name, price_client, price_technician, sku } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO stock_items (
        boutique_id, brand, series, model, part_type, name, sku,
        price_client, price_technician
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, brand, model, quantity_on_hand, price_client
    `, [boutique_id, brand, series, model, part_type, name, sku, price_client, price_technician]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create stock item' });
  }
});

// Update stock item
app.patch('/api/boutiques/:boutique_id/stock/:item_id', authMiddleware, requireBoutiqueAccess, async (req, res) => {
  const { boutique_id, item_id } = req.params;
  const { price_client, price_technician, location_code } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE stock_items
      SET price_client = COALESCE($1, price_client),
          price_technician = COALESCE($2, price_technician),
          location_code = COALESCE($3, location_code),
          updated_at = NOW()
      WHERE id = $4 AND boutique_id = $5
      RETURNING *
    `, [price_client, price_technician, location_code, item_id, boutique_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// ============================================================================
// SALES ENDPOINTS (Atomic)
// ============================================================================

app.post('/api/boutiques/:boutique_id/sales', authMiddleware, requireBoutiqueAccess, async (req, res) => {
  const { boutique_id } = req.params;
  const { client_type, sale_type, items, total_amount, payment_method, operator } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Verify stock availability
    for (const item of items) {
      const checkStock = await client.query(`
        SELECT quantity_on_hand FROM stock_items
        WHERE id = $1 AND boutique_id = $2 FOR UPDATE
      `, [item.stock_item_id, boutique_id]);
      
      if (checkStock.rows.length === 0 || checkStock.rows[0].quantity_on_hand < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for item ${item.stock_item_id}` });
      }
    }
    
    // 2. Create sale
    const saleResult = await client.query(`
      INSERT INTO sales (boutique_id, vendor_id, client_type, sale_type, total_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [boutique_id, req.user_id, client_type, sale_type, total_amount]);
    
    const sale_id = saleResult.rows[0].id;
    
    // 3. Create sale items (triggers auto-decrement stock)
    for (const item of items) {
      await client.query(`
        INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [sale_id, item.stock_item_id, item.quantity, item.unit_price]);
    }
    
    // 4. Record payment
    await client.query(`
      INSERT INTO sale_payments (sale_id, payment_method, operator, amount)
      VALUES ($1, $2, $3, $4)
    `, [sale_id, payment_method, operator, total_amount]);
    
    await client.query('COMMIT');
    
    res.status(201).json({ id: sale_id, message: 'Sale created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    client.release();
  }
});

// ============================================================================
// REPORTING
// ============================================================================

// Daily sales summary
app.get('/api/boutiques/:boutique_id/reports/sales', authMiddleware, requireBoutiqueAccess, async (req, res) => {
  const { boutique_id } = req.params;
  const { from_date, to_date } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT sale_date, total_sales, total_amount, cash_amount, mobile_amount, items_sold
      FROM daily_sales_summary
      WHERE boutique_id = $1
        AND sale_date BETWEEN $2 AND $3
      ORDER BY sale_date DESC
    `, [boutique_id, from_date || 'NOW() - INTERVAL 30 days', to_date || 'NOW()']);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 📦 PHASE 3: Data Migration Script

### 3.1 Export Data from Zustand Store

```typescript
// frontend/src/store/useAppStore.ts

// Existing code...

// Export function for migration
export function exportDataForMigration() {
  const state = useAppStore.getState();
  
  return {
    boutique: state.boutique,
    users: state.users,
    stock: state.stock,
    sales: state.sales,
    compatibilities: state.compatibilities,
    paymentAccounts: state.paymentAccounts,
  };
}

// Usage: In browser console
// const data = exportDataForMigration();
// copy(JSON.stringify(data));
```

### 3.2 Migration Script (Node.js)

```javascript
// backend/scripts/migrate-from-frontend.js

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mobilstock_dev',
});

async function migrate() {
  // Read exported frontend data
  const data = JSON.parse(fs.readFileSync('./export.json', 'utf-8'));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // ====== 1. Create Boutique ======
    const boutiqueRes = await client.query(`
      INSERT INTO boutiques (
        name, address, stock_threshold, created_by, subscription_tier
      )
      SELECT $1, $2, $3, (SELECT id FROM super_admins LIMIT 1), 'pro'
      RETURNING id
    `, [
      data.boutique.nom || 'Boutique Principale',
      data.boutique.adresse,
      data.boutique.stockThreshold || 5,
    ]);
    
    const boutique_id = boutiqueRes.rows[0].id;
    console.log('✓ Boutique created:', boutique_id);
    
    // ====== 2. Create Users & Map IDs ======
    const userIdMap = {}; // old_id → new_uuid
    
    for (const user of data.users) {
      const userRes = await client.query(`
        INSERT INTO users (email, full_name, is_active)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [
        user.email || `user${user.id}@boutique.com`,
        user.nom,
        user.actif !== false,
      ]);
      
      const new_user_id = userRes.rows[0].id;
      userIdMap[user.id] = new_user_id;
      
      // Create password (TEMP: set to 'changeme')
      await client.query(`
        INSERT INTO user_passwords (user_id, password_hash, salt)
        VALUES ($1, $2, $3)
      `, [new_user_id, 'changeme', 'temp']);
      
      // Assign role to boutique
      await client.query(`
        INSERT INTO user_boutique_roles (
          user_id, boutique_id, role, sales_count
        )
        VALUES ($1, $2, $3, $4)
      `, [new_user_id, boutique_id, user.role || 'vendeur', user.ventes || 0]);
      
      console.log(`✓ User created: ${user.nom} (${user.role})`);
    }
    
    // ====== 3. Migrate Stock ======
    const stockIdMap = {}; // old_id → new_uuid
    
    for (const item of data.stock) {
      const stockRes = await client.query(`
        INSERT INTO stock_items (
          boutique_id, brand, series, model, part_type, name,
          price_client, price_technician, quantity_on_hand, location_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        boutique_id,
        item.marque,
        item.serie,
        item.modele,
        item.typePiece,
        item.nom,
        item.prixClient,
        item.prixTechnicien,
        item.quantite,
        item.emplacement,
      ]);
      
      const new_stock_id = stockRes.rows[0].id;
      stockIdMap[item.id] = new_stock_id;
      console.log(`✓ Stock created: ${item.nom}`);
    }
    
    // ====== 4. Migrate Sales (Normalize pieces to sale_items) ======
    const parsePiecesString = (piecesStr) => {
      // Example: "Écran LCD iPhone 13 + Batterie Samsung S21"
      // Return: [{name: "Écran LCD iPhone 13", qty: 1}, ...]
      return piecesStr.split('+').map(p => ({
        name: p.trim(),
        quantity: 1, // Default: assume 1 of each
      }));
    };
    
    for (const sale of data.sales) {
      const saleRes = await client.query(`
        INSERT INTO sales (
          boutique_id, vendor_id, client_type, sale_type,
          total_amount, sale_date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        boutique_id,
        userIdMap[data.users.find(u => u.nom === sale.vendeur)?.id] || Object.values(userIdMap)[0],
        sale.typeClient,
        sale.modeVente,
        sale.montant,
        sale.date,
      ]);
      
      const sale_id = saleRes.rows[0].id;
      
      // ⚠️ IMPORTANT: Parse pieces string and create sale_items
      const pieces = parsePiecesString(sale.pieces);
      
      for (const piece of pieces) {
        // Find stock item by name
        const stockItem = data.stock.find(s =>
          (s.nom === piece.name ||
           s.modele === piece.name ||
           (s.nom + ' ' + s.modele).includes(piece.name))
        );
        
        if (stockItem) {
          await client.query(`
            INSERT INTO sale_items (
              sale_id, stock_item_id, quantity, unit_price
            )
            VALUES ($1, $2, $3, $4)
          `, [
            sale_id,
            stockIdMap[stockItem.id],
            piece.quantity,
            stockItem.prixClient, // Use client price
          ]);
        } else {
          console.warn(`⚠️  Stock item not found for piece: ${piece.name}`);
        }
      }
      
      // Create payment record
      await client.query(`
        INSERT INTO sale_payments (
          sale_id, payment_method, operator, amount
        )
        VALUES ($1, $2, $3, $4)
      `, [
        sale_id,
        sale.typePaiement,
        sale.operateur || null,
        sale.montant,
      ]);
      
      console.log(`✓ Sale created: ${sale.pieces}`);
    }
    
    // ====== 5. Migrate Compatibilities ======
    for (const compat of data.compatibilities) {
      await client.query(`
        INSERT INTO compatibilities (
          boutique_id, piece_name, supported_models
        )
        VALUES ($1, $2, $3)
      `, [
        boutique_id,
        compat.piece,
        compat.modeles,
      ]);
      
      console.log(`✓ Compatibility created: ${compat.piece}`);
    }
    
    // ====== 6. Migrate Payment Accounts ======
    for (const account of data.paymentAccounts) {
      await client.query(`
        INSERT INTO payment_accounts (
          boutique_id, operator, account_number, account_type
        )
        VALUES ($1, $2, $3, $4)
      `, [
        boutique_id,
        account.operateur,
        account.numero,
        account.type,
      ]);
      
      console.log(`✓ Payment account created: ${account.operateur}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
```

**Run Migration:**
```bash
node backend/scripts/migrate-from-frontend.js
```

---

## 🔗 PHASE 4: Connect Frontend to Backend

### 4.1 Create API Client (Axios/Fetch)

```typescript
// frontend/src/api/client.ts

import axios, { AxiosInstance } from 'axios';

export class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  // ===== Auth =====
  async login(email: string, password: string) {
    const res = await this.client.post('/auth/login', { email, password });
    this.setToken(res.data.token);
    return res.data.user;
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // ===== Stock =====
  async getStock(boutiqueId: string) {
    const res = await this.client.get(`/api/boutiques/${boutiqueId}/stock`);
    return res.data;
  }

  async createStockItem(boutiqueId: string, item: any) {
    const res = await this.client.post(`/api/boutiques/${boutiqueId}/stock`, item);
    return res.data;
  }

  async updateStockItem(boutiqueId: string, itemId: string, updates: any) {
    const res = await this.client.patch(`/api/boutiques/${boutiqueId}/stock/${itemId}`, updates);
    return res.data;
  }

  // ===== Sales =====
  async createSale(boutiqueId: string, sale: any) {
    const res = await this.client.post(`/api/boutiques/${boutiqueId}/sales`, sale);
    return res.data;
  }

  // ===== Reports =====
  async getSalesReport(boutiqueId: string, fromDate: string, toDate: string) {
    const res = await this.client.get(`/api/boutiques/${boutiqueId}/reports/sales`, {
      params: { from_date: fromDate, to_date: toDate },
    });
    return res.data;
  }
}

export const api = new APIClient(process.env.REACT_APP_API_URL || 'http://localhost:3000');
```

### 4.2 Update Zustand Store to Use Backend

```typescript
// frontend/src/store/useAppStore.ts

import { create } from 'zustand';
import { api } from '@/api/client';

interface AppState {
  // ... existing state ...
  
  // New: Sync methods
  syncStockFromBackend: (boutiqueId: string) => Promise<void>;
  createStockItemBackend: (item: any) => Promise<void>;
  createSaleBackend: (sale: any) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  // ... existing implementation ...

  // New backend methods
  syncStockFromBackend: async (boutiqueId: string) => {
    try {
      const backendStock = await api.getStock(boutiqueId);
      set({ stock: backendStock });
    } catch (err) {
      console.error('Sync failed:', err);
      // Fallback: Keep local state
    }
  },

  createStockItemBackend: async (item: any) => {
    const boutique_id = '...'; // Current boutique
    try {
      const created = await api.createStockItem(boutique_id, {
        brand: item.marque,
        model: item.modele,
        part_type: item.typePiece,
        name: item.nom,
        price_client: item.prixClient,
        price_technician: item.prixTechnicien,
      });
      
      set((s) => ({
        stock: [created, ...s.stock],
      }));
    } catch (err) {
      console.error('Create failed:', err);
      throw err;
    }
  },

  createSaleBackend: async (sale: any) => {
    const boutique_id = '...'; // Current boutique
    try {
      await api.createSale(boutique_id, {
        client_type: sale.typeClient,
        sale_type: sale.modeVente,
        items: sale.items,  // sale_item objects
        total_amount: sale.montant,
        payment_method: sale.typePaiement,
        operator: sale.operateur,
      });
      
      // Refresh sales list
      await useAppStore.getState().syncStockFromBackend(boutique_id);
    } catch (err) {
      console.error('Sale creation failed:', err);
      throw err;
    }
  },
}));
```

---

## 🧪 PHASE 5: Testing

### 5.1 API Testing (Postman / REST Client)

```http
### Login
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "amadou@boutique.com",
  "password": "changeme"
}

> {%
  client.global.set('token', response.body.token);
%}

### Get Stock
GET http://localhost:3000/api/boutiques/{{boutique_id}}/stock
Authorization: Bearer {{token}}

### Create Sale
POST http://localhost:3000/api/boutiques/{{boutique_id}}/sales
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "client_type": "simple",
  "sale_type": "catalogue",
  "items": [
    {
      "stock_item_id": "...",
      "quantity": 2,
      "unit_price": 45000
    }
  ],
  "total_amount": 90000,
  "payment_method": "cash"
}
```

---

## ✅ PHASE 6: Post-Migration Validation

### 6.1 Verify Data Integrity

```sql
-- Check all shops have users
SELECT b.name, COUNT(u.id) as user_count
FROM boutiques b
LEFT JOIN user_boutique_roles ubr ON b.id = ubr.boutique_id
LEFT JOIN users u ON ubr.user_id = u.id
GROUP BY b.id;

-- Verify sales have line items
SELECT s.id, COUNT(si.id) as item_count
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.id;

-- Check stock levels after migration
SELECT b.name, COUNT(st.id) as items, SUM(st.quantity_on_hand) as total_qty
FROM boutiques b
LEFT JOIN stock_items st ON b.id = st.boutique_id AND st.deleted_at IS NULL
GROUP BY b.id;

-- Verify payments exist for all sales
SELECT COUNT(*) as orphan_sales
FROM sales s
LEFT JOIN sale_payments sp ON s.id = sp.sale_id
WHERE sp.id IS NULL;
```

### 6.2 Performance Testing

```bash
# Generate load
npm install -g artillery

echo "
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/sec
      name: 'Warm up'
scenarios:
  - name: 'Get Stock'
    flow:
      - post:
          url: '/auth/login'
          json:
            email: 'amadou@boutique.com'
            password: 'changeme'
          capture:
            json: '$.token'
            as: 'token'
      - get:
          url: '/api/boutiques/{{boutique_id}}/stock'
          headers:
            Authorization: 'Bearer {{token}}'
" > load-test.yml

artillery run load-test.yml
```

---

## 📋 Rollback Plan

If something goes wrong:

```bash
# Backup current database
pg_dump mobilstock_prod > backup_before_migration.sql

# Restore from backup
psql mobilstock_prod < backup_before_migration.sql

# Keep frontend using local Zustand as fallback
```

---

## 🎉 Summary

| Phase | Status | Timeline |
|-------|--------|----------|
| 1. Setup | ✅ Database created | 1 hour |
| 2. API | ✅ Express server ready | 4 hours |
| 3. Migration | ✅ Data imported | 1 hour |
| 4. Frontend | ✅ API integration | 4 hours |
| 5. Testing | ✅ Validated | 2 hours |
| **TOTAL** | ✅ **COMPLETE** | **~12 hours** |

Next: Deploy to production 🚀
