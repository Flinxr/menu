import { CategoryInfo, MenuItem } from '../types';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from '../data/menuData';
import { DEFAULT_PANTRY_ID } from '../data/pantryConfig';

export interface CloudMenuPayload {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber: string;
  updatedAt?: string;
}

const PANTRY_STORAGE_KEY = 'menu_pantry_cloud_id';
const LOCAL_STORAGE_KEY = 'restaurant_menu_cache_v4';
const BASKET_NAME = 'menu_database';

// In-memory cache holding the current client-side state
let memoryCache: CloudMenuPayload | null = null;

// Read local persistent cache
export function getLocalCache(): CloudMenuPayload | null {
  if (typeof window === 'undefined') return memoryCache;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (Array.isArray(parsed.items) || Array.isArray(parsed.categories))) {
        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : INITIAL_CATEGORIES,
          items: Array.isArray(parsed.items) ? parsed.items : INITIAL_MENU_ITEMS,
          orderPhoneNumber: typeof parsed.orderPhoneNumber === 'string' ? parsed.orderPhoneNumber : '09900674112',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore
  }
  return memoryCache;
}

// Write local persistent cache
export function setLocalCache(payload: CloudMenuPayload): void {
  memoryCache = { ...payload };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Get active Pantry ID (from localStorage or default config)
 */
export function getActivePantryId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_PANTRY_ID;
}

/**
 * Set and persist custom Pantry ID
 */
export function setActivePantryId(id: string): void {
  if (typeof window !== 'undefined') {
    if (id && id.trim()) {
      localStorage.setItem(PANTRY_STORAGE_KEY, id.trim());
    } else {
      localStorage.removeItem(PANTRY_STORAGE_KEY);
    }
  }
}

// -------------------------------------------------------------
// Pantry Cloud Queue & Rate-Limit Safe Synchronizer
// -------------------------------------------------------------

let pendingPayloadToSave: CloudMenuPayload | null = null;
let saveDebounceTimer: any = null;
let isSavingToPantry = false;
let retryTimer: any = null;

/**
 * Safe parser for Pantry API responses to handle rate limit text
 */
async function parsePantryResponse(res: Response): Promise<{ ok: boolean; data?: any; rateLimited?: boolean }> {
  try {
    const text = await res.text();
    if (res.status === 429 || text.includes('Pantry is a free service') || text.includes('requests have been limited')) {
      return { ok: false, rateLimited: true };
    }
    if (!res.ok) {
      return { ok: false, rateLimited: false };
    }
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch {
    return { ok: false, rateLimited: false };
  }
}

/**
 * Process the background save queue directly to Pantry Cloud
 */
async function processSaveQueue(): Promise<void> {
  if (!pendingPayloadToSave || isSavingToPantry) return;

  const pantryId = getActivePantryId();
  if (!pantryId) return;

  const payloadToSend = { ...pendingPayloadToSave };
  isSavingToPantry = true;

  try {
    const url = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/${BASKET_NAME}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    const parsed = await parsePantryResponse(res);

    if (parsed.ok) {
      // Successfully saved to Pantry!
      if (pendingPayloadToSave === payloadToSend) {
        pendingPayloadToSave = null;
      }
      isSavingToPantry = false;
    } else if (parsed.rateLimited) {
      // Pantry rate limit hit - retry after 2.5s
      isSavingToPantry = false;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        processSaveQueue();
      }, 2500);
    } else {
      isSavingToPantry = false;
    }
  } catch (networkErr) {
    isSavingToPantry = false;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      processSaveQueue();
    }, 3000);
  }
}

/**
 * Schedule saving payload to Pantry Cloud with instant local persistence
 */
function schedulePantrySave(payload: CloudMenuPayload): void {
  // 1. Instant local persistence (optimistic UI)
  setLocalCache(payload);

  // 2. Queue for Pantry Cloud
  pendingPayloadToSave = payload;

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    processSaveQueue();
  }, 350);
}

// -------------------------------------------------------------
// Core Public Menu Operations (100% Client-Side / Cloudflare Pages Compatible)
// -------------------------------------------------------------

/**
 * Fetch menu data directly from Pantry Cloud with intelligent caching.
 * NEVER resets or destroys your data on network errors or rate limits!
 */
export async function fetchMenuFromCloud(): Promise<CloudMenuPayload> {
  const pantryId = getActivePantryId();
  const cached = getLocalCache();

  if (!pantryId) {
    return cached || {
      categories: INITIAL_CATEGORIES,
      items: INITIAL_MENU_ITEMS,
      orderPhoneNumber: '09900674112',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const url = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/${BASKET_NAME}?_t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const parsed = await parsePantryResponse(res);

    if (parsed.ok && parsed.data) {
      const data = parsed.data;
      if (Array.isArray(data.items) || Array.isArray(data.categories)) {
        const payload: CloudMenuPayload = {
          categories: Array.isArray(data.categories) ? data.categories : (cached?.categories || INITIAL_CATEGORIES),
          items: Array.isArray(data.items) ? data.items : (cached?.items || INITIAL_MENU_ITEMS),
          orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : (cached?.orderPhoneNumber || '09900674112'),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        setLocalCache(payload);
        return payload;
      }
    } else if (res.status === 404) {
      // Basket doesn't exist yet on Pantry, seed it with current cache or defaults
      const seedPayload: CloudMenuPayload = cached || {
        categories: INITIAL_CATEGORIES,
        items: INITIAL_MENU_ITEMS,
        orderPhoneNumber: '09900674112',
        updatedAt: new Date().toISOString(),
      };
      schedulePantrySave(seedPayload);
      return seedPayload;
    }
  } catch (err) {
    console.warn('[Pantry Cloud] Fetch error, using local cached menu:', err);
  }

  // Safe fallback to local cache (Never erase user data!)
  if (cached && (cached.items.length > 0 || cached.categories.length > 0)) {
    return cached;
  }

  const defaultPayload: CloudMenuPayload = {
    categories: INITIAL_CATEGORIES,
    items: INITIAL_MENU_ITEMS,
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };
  setLocalCache(defaultPayload);
  return defaultPayload;
}

/**
 * Save entire menu payload directly to Pantry Cloud and local cache
 */
export async function saveMenuToCloud(payload: {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber?: string;
}): Promise<CloudMenuPayload> {
  const finalPayload: CloudMenuPayload = {
    categories: payload.categories,
    items: payload.items,
    orderPhoneNumber: payload.orderPhoneNumber || '09900674112',
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(finalPayload);
  return finalPayload;
}

/**
 * Add or edit a single item directly
 */
export async function saveItemToCloud(item: MenuItem, isNew: boolean): Promise<MenuItem[]> {
  const current = getLocalCache() || await fetchMenuFromCloud();
  let nextItems: MenuItem[];

  if (isNew) {
    nextItems = [item, ...current.items.filter((i) => i.id !== item.id)];
  } else {
    nextItems = current.items.map((i) => (i.id === item.id ? item : i));
  }

  const nextPayload: CloudMenuPayload = {
    ...current,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(nextPayload);
  return nextItems;
}

/**
 * Delete a single item directly
 */
export async function deleteItemOnCloud(itemId: string): Promise<MenuItem[]> {
  const current = getLocalCache() || await fetchMenuFromCloud();
  const nextItems = current.items.filter((item) => item.id !== itemId);

  const nextPayload: CloudMenuPayload = {
    ...current,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(nextPayload);
  return nextItems;
}

/**
 * Add or edit a category directly
 */
export async function saveCategoryToCloud(category: CategoryInfo, isNew: boolean): Promise<CategoryInfo[]> {
  const current = getLocalCache() || await fetchMenuFromCloud();
  let nextCats: CategoryInfo[];

  if (isNew) {
    nextCats = [...current.categories.filter((c) => c.id !== category.id), category];
  } else {
    nextCats = current.categories.map((c) => (c.id === category.id ? category : c));
  }

  const nextPayload: CloudMenuPayload = {
    ...current,
    categories: nextCats,
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(nextPayload);
  return nextCats;
}

/**
 * Delete a category and all its cascade items directly
 */
export async function deleteCategoryOnCloud(categoryId: string): Promise<{ categories: CategoryInfo[]; items: MenuItem[] }> {
  const current = getLocalCache() || await fetchMenuFromCloud();
  const nextCats = current.categories.filter((cat) => cat.id !== categoryId);
  const nextItems = current.items.filter((item) => item.categoryId !== categoryId);

  const nextPayload: CloudMenuPayload = {
    ...current,
    categories: nextCats,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(nextPayload);
  return { categories: nextCats, items: nextItems };
}

/**
 * Reset menu back to initial demo dataset
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const defaultPayload: CloudMenuPayload = {
    categories: INITIAL_CATEGORIES,
    items: INITIAL_MENU_ITEMS,
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };

  schedulePantrySave(defaultPayload);
  return defaultPayload;
}

/**
 * Test latency and connection to Pantry Cloud
 */
export async function testPantryConnection(customId?: string): Promise<{ success: boolean; latency: number; count: number }> {
  const pantryId = customId || getActivePantryId();
  const start = performance.now();
  const res = await fetch(`https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/${BASKET_NAME}?_t=${Date.now()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const parsed = await parsePantryResponse(res);
  const latency = Math.round(performance.now() - start);

  if (parsed.ok && parsed.data) {
    const count = Array.isArray(parsed.data.items) ? parsed.data.items.length : 0;
    return { success: true, latency, count };
  }

  if (parsed.rateLimited) {
    return { success: true, latency, count: getLocalCache()?.items.length || 0 };
  }

  if (res.status === 404) {
    return { success: true, latency, count: 0 };
  }

  throw new Error(`خطا در ارتباط با Pantry Cloud (کد: ${res.status})`);
}
