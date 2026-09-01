import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from './src/data/menuData';
import { DEFAULT_PANTRY_ID } from './src/data/pantryConfig';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Universal CORS headers for seamless cross-origin and iframe connectivity
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control');
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

// In-memory cache for sub-millisecond query performance
let inMemoryDb: MenuDatabase = { ...DEFAULT_DB };

// Initialize database from disk or Pantry or seed default menu
async function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Try Pantry Cloud on startup
    if (DEFAULT_PANTRY_ID) {
      try {
        const pantryRes = await fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/menu_database`, {
          headers: { 'Accept': 'application/json' }
        });
        if (pantryRes.ok) {
          const pantryData = await pantryRes.json();
          if (pantryData && (Array.isArray(pantryData.items) || Array.isArray(pantryData.categories))) {
            inMemoryDb = {
              categories: Array.isArray(pantryData.categories) ? pantryData.categories : INITIAL_CATEGORIES,
              items: Array.isArray(pantryData.items) ? pantryData.items : INITIAL_MENU_ITEMS,
              orderPhoneNumber: typeof pantryData.orderPhoneNumber === 'string' ? pantryData.orderPhoneNumber : '09900674112',
              updatedAt: pantryData.updatedAt || new Date().toISOString(),
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
            console.log(`[Database] Synced ${inMemoryDb.items.length} items & ${inMemoryDb.categories.length} categories from Pantry Cloud.`);
            return;
          }
        }
      } catch (pantryErr) {
        console.warn('[Database] Pantry initial fetch note:', pantryErr);
      }
    }

    // 2. Try local disk cache
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
        console.log(`[Database] Loaded ${inMemoryDb.items.length} items & ${inMemoryDb.categories.length} categories from persistent storage.`);
        return;
      }
    }

    // Persist default DB if file does not exist
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    inMemoryDb = { ...DEFAULT_DB };
    console.log('[Database] Initialized default persistent menu database on disk.');
  } catch (err) {
    console.error('[Database] Failed to initialize database file, running in-memory fallback:', err);
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

    // Also sync to Pantry asynchronously
    if (DEFAULT_PANTRY_ID) {
      fetch(`https://getpantry.cloud/apiv1/pantry/${DEFAULT_PANTRY_ID}/basket/menu_database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inMemoryDb),
      }).catch((e) => console.warn('[Database] Pantry sync background note:', e));
    }
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
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

initDatabase();

// -------------------------------------------------------------
// Non-Google Native Database API Endpoints (100% Unrestricted in Iran)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'native_file_db', itemsCount: inMemoryDb.items.length });
});

// GET current menu
app.get('/api/menu', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json(inMemoryDb);
});

// POST update menu
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

    // Asynchronously write to persistent storage
    await persistDatabase();

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
    res.write(': keepalive\n\n');
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
      server: { middlewareMode: true },
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
    console.log(`Digital Menu server running on http://0.0.0.0:${PORT}`);
  });
}

start();
