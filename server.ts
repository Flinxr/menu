import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from './src/data/menuData';
import { DEFAULT_PANTRY_ID } from './src/data/pantryConfig';

const app = express();
const PORT = 3000;
const BASKET_NAME = 'menu_database';

app.use(express.json({ limit: '20mb' }));

// Universal CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Persistent disk storage location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'menu_store.json');

export interface MenuDatabase {
  categories: any[];
  items: any[];
  orderPhoneNumber: string;
  updatedAt: string;
}

const DEFAULT_DB: MenuDatabase = {
  categories: INITIAL_CATEGORIES,
  items: INITIAL_MENU_ITEMS,
  orderPhoneNumber: '09900674112',
  updatedAt: new Date().toISOString(),
};

// In-memory single source of truth
let inMemoryDb: MenuDatabase = { ...DEFAULT_DB };

// Debounce timer for Pantry Cloud sync to prevent rate-limit 429
let pantrySyncTimeout: NodeJS.Timeout | null = null;
let isPantrySyncing = false;

function schedulePantrySync() {
  if (!DEFAULT_PANTRY_ID) return;
  if (pantrySyncTimeout) {
    clearTimeout(pantrySyncTimeout);
  }
  pantrySyncTimeout = setTimeout(async () => {
    if (isPantrySyncing) {
      // reschedule if busy
      schedulePantrySync();
      return;
    }
    isPantrySyncing = true;
    try {
      const payloadToSync = {
        categories: inMemoryDb.categories,
        items: inMemoryDb.items,
        orderPhoneNumber: inMemoryDb.orderPhoneNumber,
        updatedAt: inMemoryDb.updatedAt,
      };
      const res = await fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/${BASKET_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadToSync),
      });
      if (res.ok) {
        console.log(`[Pantry Cloud] Successfully synced ${payloadToSync.items.length} items to Pantry Cloud.`);
      } else {
        const txt = await res.text().catch(() => '');
        console.warn(`[Pantry Cloud] Sync returned status ${res.status}:`, txt.slice(0, 100));
      }
    } catch (err) {
      console.warn('[Pantry Cloud] Background sync network error:', err);
    } finally {
      isPantrySyncing = false;
    }
  }, 400); // 400ms debounce
}

// Initial sync from disk or Pantry Cloud on server start
async function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. First priority: Check local disk storage
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
        inMemoryDb = {
          categories: parsed.categories,
          items: parsed.items,
          orderPhoneNumber: typeof parsed.orderPhoneNumber === 'string' ? parsed.orderPhoneNumber : '09900674112',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        console.log(`[Database] Loaded ${inMemoryDb.items.length} items & ${inMemoryDb.categories.length} categories from disk.`);
        return;
      }
    }

    // 2. Second priority: Try loading from Pantry Cloud
    if (DEFAULT_PANTRY_ID) {
      try {
        const res = await fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/${BASKET_NAME}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
            inMemoryDb = {
              categories: Array.isArray(data.categories) ? data.categories : INITIAL_CATEGORIES,
              items: Array.isArray(data.items) ? data.items : INITIAL_MENU_ITEMS,
              orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            await persistDatabase();
            console.log(`[Database] Seeded from Pantry Cloud: ${inMemoryDb.items.length} items.`);
            return;
          }
        }
      } catch (pantryErr) {
        console.warn('[Database] Pantry initial fetch error:', pantryErr);
      }
    }

    // 3. Fallback: Initialize default seed data
    inMemoryDb = { ...DEFAULT_DB };
    await persistDatabase();
    schedulePantrySync();
    console.log('[Database] Seeded initial default menu data on disk and Pantry.');
  } catch (err) {
    console.error('[Database] Storage init error:', err);
    inMemoryDb = { ...DEFAULT_DB };
  }
}

// Persist inMemoryDb atomically to disk
async function persistDatabase(): Promise<void> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Disk write error:', err);
  }
}

// Server-Sent Events (SSE) active subscriber pool
const sseClients: Set<Response> = new Set();

function broadcastUpdate() {
  const payload = JSON.stringify(inMemoryDb);
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

initStorage();

// -------------------------------------------------------------
// Database API Endpoints (Authoritative Full-Stack REST API)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'pantry_cloud_plus_disk',
    pantryId: DEFAULT_PANTRY_ID,
    itemsCount: inMemoryDb.items.length,
    categoriesCount: inMemoryDb.categories.length,
    updatedAt: inMemoryDb.updatedAt,
  });
});

// GET current authoritative menu
app.get('/api/menu', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json(inMemoryDb);
});

// POST update menu (full atomic save)
app.post('/api/menu', async (req, res) => {
  try {
    const payload = req.body || {};
    const updatedAt = new Date().toISOString();

    if (payload.categories && Array.isArray(payload.categories)) {
      inMemoryDb.categories = payload.categories;
    }
    if (payload.items && Array.isArray(payload.items)) {
      inMemoryDb.items = payload.items;
    }
    if (typeof payload.orderPhoneNumber === 'string') {
      inMemoryDb.orderPhoneNumber = payload.orderPhoneNumber;
    }
    inMemoryDb.updatedAt = updatedAt;

    // 1. Write to persistent disk
    await persistDatabase();

    // 2. Broadcast immediately to all connected browsers
    broadcastUpdate();

    // 3. Debounced sync to Pantry Cloud
    schedulePantrySync();

    return res.json({
      success: true,
      updatedAt,
      categories: inMemoryDb.categories,
      items: inMemoryDb.items,
      orderPhoneNumber: inMemoryDb.orderPhoneNumber,
    });
  } catch (error: any) {
    console.error('[Database] POST /api/menu error:', error);
    return res.status(500).json({ error: error.message || 'Server update error' });
  }
});

// POST add or edit a single item
app.post('/api/menu/item', async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id || !item.name) {
      return res.status(400).json({ error: 'اطلاعات غذا معتبر نیست' });
    }

    const existingIndex = inMemoryDb.items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      inMemoryDb.items[existingIndex] = item;
    } else {
      inMemoryDb.items.unshift(item);
    }
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    broadcastUpdate();
    schedulePantrySync();

    return res.json({
      success: true,
      item,
      items: inMemoryDb.items,
      categories: inMemoryDb.categories,
    });
  } catch (error: any) {
    console.error('[Database] Item save error:', error);
    return res.status(500).json({ error: error.message || 'Item save error' });
  }
});

// DELETE single item
app.delete('/api/menu/item/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const initialLen = inMemoryDb.items.length;
    inMemoryDb.items = inMemoryDb.items.filter((item) => item.id !== itemId);
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    broadcastUpdate();
    schedulePantrySync();

    return res.json({
      success: true,
      deleted: initialLen !== inMemoryDb.items.length,
      items: inMemoryDb.items,
      categories: inMemoryDb.categories,
    });
  } catch (error: any) {
    console.error('[Database] Delete item error:', error);
    return res.status(500).json({ error: error.message || 'Delete item error' });
  }
});

// POST add or edit category
app.post('/api/menu/category', async (req, res) => {
  try {
    const category = req.body;
    if (!category || !category.id || !category.title) {
      return res.status(400).json({ error: 'اطلاعات دسته‌بندی معتبر نیست' });
    }

    const existingIndex = inMemoryDb.categories.findIndex((c) => c.id === category.id);
    if (existingIndex >= 0) {
      inMemoryDb.categories[existingIndex] = category;
    } else {
      inMemoryDb.categories.push(category);
    }
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    broadcastUpdate();
    schedulePantrySync();

    return res.json({
      success: true,
      category,
      items: inMemoryDb.items,
      categories: inMemoryDb.categories,
    });
  } catch (error: any) {
    console.error('[Database] Category save error:', error);
    return res.status(500).json({ error: error.message || 'Category save error' });
  }
});

// DELETE category (and cascade delete its items)
app.delete('/api/menu/category/:id', async (req, res) => {
  try {
    const catId = req.params.id;
    inMemoryDb.categories = inMemoryDb.categories.filter((cat) => cat.id !== catId);
    inMemoryDb.items = inMemoryDb.items.filter((item) => item.categoryId !== catId);
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    broadcastUpdate();
    schedulePantrySync();

    return res.json({
      success: true,
      items: inMemoryDb.items,
      categories: inMemoryDb.categories,
    });
  } catch (error: any) {
    console.error('[Database] Delete category error:', error);
    return res.status(500).json({ error: error.message || 'Delete category error' });
  }
});

// POST reset menu back to initial demo dataset
app.post('/api/menu/reset', async (req, res) => {
  try {
    inMemoryDb = {
      categories: INITIAL_CATEGORIES,
      items: INITIAL_MENU_ITEMS,
      orderPhoneNumber: '09900674112',
      updatedAt: new Date().toISOString(),
    };

    await persistDatabase();
    broadcastUpdate();
    schedulePantrySync();

    return res.json({
      success: true,
      ...inMemoryDb,
    });
  } catch (error: any) {
    console.error('[Database] Reset error:', error);
    return res.status(500).json({ error: error.message || 'Reset error' });
  }
});

// Real-time Server-Sent Events (SSE) connection
app.get('/api/menu/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current authoritative state on connect
  res.write(`data: ${JSON.stringify(inMemoryDb)}\n\n`);

  sseClients.add(res);

  // Heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Vite & Static Asset Handling
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Digital Menu server running on http://0.0.0.0:${PORT} with Pantry Cloud ID: ${DEFAULT_PANTRY_ID}`);
  });
}

start();
