import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from './src/data/menuData';
import { DEFAULT_PANTRY_ID } from './src/data/pantryConfig';

const app = express();
const PORT = 3000;
const BASKET_NAME = 'menu_database';

app.use(express.json({ limit: '10mb' }));

// Universal CORS & caching headers for seamless cross-origin and iframe connectivity
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Database file storage location (persisted directly on disk in data/menu_store.json)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'menu_store.json');

interface MenuDatabase {
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

// In-memory cache for instant query performance
let inMemoryDb: MenuDatabase = { ...DEFAULT_DB };

// Sync to Pantry Cloud JSON in background
async function syncToPantryCloud(payload: MenuDatabase) {
  if (!DEFAULT_PANTRY_ID) return;
  try {
    const res = await fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/${BASKET_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      console.log('[Pantry Cloud] Successfully synced menu to Pantry Cloud.');
    } else {
      console.warn(`[Pantry Cloud] Sync returned status: ${res.status}`);
    }
  } catch (err) {
    console.warn('[Pantry Cloud] Background sync error:', err);
  }
}

// Fetch from Pantry Cloud JSON on startup
async function syncFromPantryCloud() {
  if (!DEFAULT_PANTRY_ID) return;
  try {
    const res = await fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/${BASKET_NAME}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
        inMemoryDb = {
          categories: Array.isArray(data.categories) ? data.categories : inMemoryDb.categories,
          items: Array.isArray(data.items) ? data.items : inMemoryDb.items,
          orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : inMemoryDb.orderPhoneNumber,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        await persistDatabase();
        console.log(`[Pantry Cloud] Loaded ${inMemoryDb.items.length} items & ${inMemoryDb.categories.length} categories from Pantry Cloud.`);
      }
    }
  } catch (err) {
    console.warn('[Pantry Cloud] Initial load error, using disk cache:', err);
  }
}

// Initialize database from disk or seed default menu
function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Read authoritative disk database
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

    // Persist default DB if file does not exist
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    inMemoryDb = { ...DEFAULT_DB };
    console.log('[Database] Initialized default persistent menu database on disk.');
  } catch (err) {
    console.error('[Database] Failed to initialize database file:', err);
    inMemoryDb = { ...DEFAULT_DB };
  }
}

// Persist inMemoryDb to disk safely with atomic rename
async function persistDatabase(): Promise<void> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Error persisting database to disk:', err);
  }
}

// Active Server-Sent Events (SSE) connections for live push updates
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

initDatabase();
syncFromPantryCloud();

// -------------------------------------------------------------
// Database API Endpoints (Authoritative Full-Stack REST API)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'pantry_cloud_plus_file_db',
    pantryId: DEFAULT_PANTRY_ID,
    itemsCount: inMemoryDb.items.length,
    categoriesCount: inMemoryDb.categories.length,
    updatedAt: inMemoryDb.updatedAt,
  });
});

// GET current menu
app.get('/api/menu', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json(inMemoryDb);
});

// POST update menu (atomic full update)
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

    // Write to persistent disk storage
    await persistDatabase();

    // Sync to Pantry Cloud
    syncToPantryCloud(inMemoryDb);

    // Broadcast real-time change to all open screens/devices
    broadcastUpdate();

    return res.json({
      success: true,
      updatedAt,
      categories: inMemoryDb.categories,
      items: inMemoryDb.items,
      orderPhoneNumber: inMemoryDb.orderPhoneNumber,
    });
  } catch (error: any) {
    console.error('[Database] Update error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// DELETE single item
app.delete('/api/menu/items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const initialLen = inMemoryDb.items.length;
    inMemoryDb.items = inMemoryDb.items.filter((item) => item.id !== itemId);
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    syncToPantryCloud(inMemoryDb);
    broadcastUpdate();

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

// DELETE single category (and cascade delete its items)
app.delete('/api/menu/categories/:id', async (req, res) => {
  try {
    const catId = req.params.id;
    inMemoryDb.categories = inMemoryDb.categories.filter((cat) => cat.id !== catId);
    inMemoryDb.items = inMemoryDb.items.filter((item) => item.categoryId !== catId);
    inMemoryDb.updatedAt = new Date().toISOString();

    await persistDatabase();
    syncToPantryCloud(inMemoryDb);
    broadcastUpdate();

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

// POST reset menu back to factory defaults
app.post('/api/menu/reset', async (req, res) => {
  try {
    inMemoryDb = {
      categories: INITIAL_CATEGORIES,
      items: INITIAL_MENU_ITEMS,
      orderPhoneNumber: '09900674112',
      updatedAt: new Date().toISOString(),
    };

    await persistDatabase();
    syncToPantryCloud(inMemoryDb);
    broadcastUpdate();

    return res.json({
      success: true,
      ...inMemoryDb,
    });
  } catch (error: any) {
    console.error('[Database] Reset error:', error);
    return res.status(500).json({ error: error.message || 'Reset error' });
  }
});

// GET real-time SSE stream for live updates across all customer and admin devices
app.get('/api/menu/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state on initial connection
  res.write(`data: ${JSON.stringify(inMemoryDb)}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Production and Dev Vite Middleware Handling
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
