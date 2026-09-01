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
const BASKET_NAME = 'menu_database';

/**
 * Get active Pantry ID (from LocalStorage or pre-configured default)
 */
export function getActivePantryId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_PANTRY_ID;
}

/**
 * Save new Pantry ID
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

  if (!res.ok && res.status !== 404) {
    throw new Error(`خطا در ارتباط با Pantry Cloud (کد: ${res.status})`);
  }

  const latency = Math.round(performance.now() - start);
  let count = 0;
  if (res.ok) {
    try {
      const data = await res.json();
      count = Array.isArray(data.items) ? data.items.length : 0;
    } catch {
      // ignore
    }
  }

  return { success: true, latency, count };
}

/**
 * Fetch menu data from Pantry Cloud JSON with multi-layered fallback.
 * 100% Uncensored, Sanction-Free, Works inside Iran without VPN.
 */
export async function fetchMenuFromCloud(): Promise<CloudMenuPayload> {
  const pantryId = getActivePantryId();

  // 1. Try Pantry Cloud directly
  if (pantryId) {
    try {
      const pantryRes = await fetch(
        `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/${BASKET_NAME}?_t=${Date.now()}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      if (pantryRes.ok) {
        const data = await pantryRes.json();
        if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
          const payload: CloudMenuPayload = {
            categories: Array.isArray(data.categories) ? data.categories : [],
            items: Array.isArray(data.items) ? data.items : [],
            orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
            updatedAt: data.updatedAt || new Date().toISOString(),
          };

          // Background sync to server API
          fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(() => {});

          return payload;
        }
      } else if (pantryRes.status === 404) {
        // Basket not initialized yet, initialize it
        const defaultPayload: CloudMenuPayload = {
          categories: INITIAL_CATEGORIES,
          items: INITIAL_MENU_ITEMS,
          orderPhoneNumber: '09900674112',
          updatedAt: new Date().toISOString(),
        };
        saveMenuToCloud(defaultPayload).catch(() => {});
        return defaultPayload;
      }
    } catch (pantryErr) {
      console.warn('Pantry direct fetch error, trying local server fallback:', pantryErr);
    }
  }

  // 2. Fallback to Local/Edge Server API (/api/menu)
  try {
    const serverRes = await fetch(`/api/menu?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
        return {
          categories: Array.isArray(data.categories) ? data.categories : [],
          items: Array.isArray(data.items) ? data.items : [],
          orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (serverErr) {
    console.warn('Local server fetch fallback warning:', serverErr);
  }

  // 3. Fallback to initial default data
  return {
    categories: INITIAL_CATEGORIES,
    items: INITIAL_MENU_ITEMS,
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Saves entire menu payload directly to Pantry Cloud JSON and syncs to server
 */
export async function saveMenuToCloud(payload: {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber?: string;
}): Promise<CloudMenuPayload> {
  const pantryId = getActivePantryId();
  const finalPayload: CloudMenuPayload = {
    categories: payload.categories,
    items: payload.items,
    orderPhoneNumber: payload.orderPhoneNumber || '09900674112',
    updatedAt: new Date().toISOString(),
  };

  let savedToPantry = false;

  // 1. Direct Save to Pantry Cloud
  if (pantryId) {
    try {
      const pantryRes = await fetch(
        `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/${BASKET_NAME}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(finalPayload),
        }
      );
      if (pantryRes.ok) {
        savedToPantry = true;
      }
    } catch (pantryErr) {
      console.warn('Pantry save error:', pantryErr);
    }
  }

  // 2. Dual Save to Server API (/api/menu)
  try {
    await fetch('/api/menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });
  } catch (serverErr) {
    console.warn('Server sync error:', serverErr);
  }

  return finalPayload;
}

/**
 * Delete a single item directly on cloud
 */
export async function deleteItemOnCloud(itemId: string): Promise<CloudMenuPayload> {
  const current = await fetchMenuFromCloud();
  const filteredItems = current.items.filter((item) => item.id !== itemId);
  return await saveMenuToCloud({
    categories: current.categories,
    items: filteredItems,
    orderPhoneNumber: current.orderPhoneNumber,
  });
}

/**
 * Delete a category and its cascade items directly on cloud
 */
export async function deleteCategoryOnCloud(categoryId: string): Promise<CloudMenuPayload> {
  const current = await fetchMenuFromCloud();
  const filteredCategories = current.categories.filter((cat) => cat.id !== categoryId);
  const filteredItems = current.items.filter((item) => item.categoryId !== categoryId);
  return await saveMenuToCloud({
    categories: filteredCategories,
    items: filteredItems,
    orderPhoneNumber: current.orderPhoneNumber,
  });
}

/**
 * Resets the entire menu to default factory settings directly on Pantry Cloud
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const defaultPayload: CloudMenuPayload = {
    categories: INITIAL_CATEGORIES,
    items: INITIAL_MENU_ITEMS,
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };
  return await saveMenuToCloud(defaultPayload);
}

/**
 * Subscribes to live updates via SSE stream and background Pantry polling.
 */
export function subscribeToCloudMenu(
  onUpdate: (data: CloudMenuPayload) => void,
  onError?: (err: any) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let pollInterval: any = null;

  // 1. SSE Connection for instant push from local/edge server
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/menu/events');
      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const data = JSON.parse(event.data);
          if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
            const payload: CloudMenuPayload = {
              categories: Array.isArray(data.categories) ? data.categories : [],
              items: Array.isArray(data.items) ? data.items : [],
              orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
              updatedAt: data.updatedAt,
            };
            onUpdate(payload);
          }
        } catch {
          // ignore keepalive parse error
        }
      };
      eventSource.onerror = (err) => {
        // SSE non-fatal error, poll will back it up
      };
    } catch (e) {
      // SSE not available
    }
  }

  // 2. Periodic Pantry Cloud polling (every 15 seconds)
  pollInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      const data = await fetchMenuFromCloud();
      if (!isClosed && data) {
        onUpdate(data);
      }
    } catch (err) {
      if (onError && !isClosed) onError(err);
    }
  }, 15000);

  return () => {
    isClosed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) {
      eventSource.close();
    }
  };
}
