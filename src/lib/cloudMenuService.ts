import { CategoryInfo, MenuItem } from '../types';
import { DEFAULT_PANTRY_ID } from '../data/pantryConfig';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from '../data/menuData';

export interface CloudMenuPayload {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_CACHE_KEY = 'digital_menu_cached_data_v3';
const PANTRY_ID_KEY = 'digital_menu_pantry_id';

/**
 * Sanitizes any raw input (extracts UUID even if full URL is pasted)
 */
export function sanitizePantryId(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  const match = cleaned.match(/pantry\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return cleaned.replace(/^['"\s/]+|['"\s/]+$/g, '').trim();
}

// Helper to get Pantry storage configuration
export function getCustomStorageConfig(): { pantryId: string } {
  if (typeof window === 'undefined') return { pantryId: sanitizePantryId(DEFAULT_PANTRY_ID) };
  
  // 1. Check if URL has ?pantry=...
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const queryPantry = urlParams.get('pantry') || urlParams.get('pantryId');
    if (queryPantry) {
      const sanitized = sanitizePantryId(queryPantry);
      if (sanitized) {
        localStorage.setItem(PANTRY_ID_KEY, sanitized);
        return { pantryId: sanitized };
      }
    }
  } catch (e) {
    // ignore
  }

  // 2. Check localStorage
  const raw = localStorage.getItem(PANTRY_ID_KEY) || '';
  const sanitized = sanitizePantryId(raw);
  if (sanitized) {
    return { pantryId: sanitized };
  }

  // 3. Fallback to global DEFAULT_PANTRY_ID if defined in code
  return {
    pantryId: sanitizePantryId(DEFAULT_PANTRY_ID),
  };
}

export function setCustomStorageConfig(config: { pantryId?: string }): void {
  if (typeof window === 'undefined') return;
  if (config.pantryId !== undefined) {
    const cleaned = sanitizePantryId(config.pantryId);
    if (cleaned) {
      localStorage.setItem(PANTRY_ID_KEY, cleaned);
    } else {
      localStorage.removeItem(PANTRY_ID_KEY);
    }
  }
}

// Helper to get local cached data
export function getLocalCachedMenu(): CloudMenuPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (Array.isArray(parsed.categories) || Array.isArray(parsed.items))) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read local menu cache:', e);
  }
  return null;
}

// Helper to save local cached data
export function setLocalCachedMenu(data: CloudMenuPayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to set local menu cache:', e);
  }
}

/**
 * Fetch menu data from database:
 * 1. Hosted Server API (/api/menu) - Authoritative Primary Source
 * 2. Pantry.cloud basket (realtime cloud fallback)
 * 3. Local cached data (offline fallback)
 */
export async function fetchMenuFromCloud(): Promise<CloudMenuPayload | null> {
  const { pantryId } = getCustomStorageConfig();

  // 1. Primary Source of Truth: Hosted Server API (/api/menu)
  try {
    const response = await fetch('/api/menu', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
        const payload: CloudMenuPayload = {
          categories: Array.isArray(data.categories) ? data.categories : [],
          items: Array.isArray(data.items) ? data.items : [],
          orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        setLocalCachedMenu(payload);
        return payload;
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Secondary Fallback: Pantry Cloud
  if (pantryId) {
    try {
      const pantryUrl = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/menu_database`;
      const res = await fetch(pantryUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
          const payload: CloudMenuPayload = {
            categories: Array.isArray(data.categories) ? data.categories : [],
            items: Array.isArray(data.items) ? data.items : [],
            orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
          setLocalCachedMenu(payload);
          return payload;
        }
      }
    } catch (e) {
      console.warn('Pantry fallback fetch note:', e);
    }
  }

  // 3. LocalStorage Fallback
  const cached = getLocalCachedMenu();
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Helper to post to Pantry with retry
 */
async function postToPantry(pantryId: string, payload: CloudMenuPayload, retries = 1): Promise<boolean> {
  const pantryUrl = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/menu_database`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(pantryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Saves entire menu or updates fields to Server Database & local cache & Pantry.cloud.
 */
export async function saveMenuToCloud(payload: Partial<CloudMenuPayload>): Promise<CloudMenuPayload> {
  const { pantryId } = getCustomStorageConfig();
  const current = getLocalCachedMenu();

  const updatedPayload: CloudMenuPayload = {
    categories: payload.categories !== undefined ? payload.categories : (current?.categories || []),
    items: payload.items !== undefined ? payload.items : (current?.items || []),
    orderPhoneNumber: payload.orderPhoneNumber !== undefined ? payload.orderPhoneNumber : (current?.orderPhoneNumber || '09900674112'),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update local cache immediately
  setLocalCachedMenu(updatedPayload);

  // 2. Save directly to Authoritative Server Database (/api/menu)
  try {
    await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    });
  } catch (e) {
    console.warn('Direct server save note:', e);
  }

  // 3. Sync to Pantry Cloud in the background
  if (pantryId) {
    postToPantry(pantryId, updatedPayload).catch(() => {});
  }

  return updatedPayload;
}

/**
 * Delete a single item on the cloud server
 */
export async function deleteItemOnCloud(itemId: string): Promise<void> {
  try {
    await fetch(`/api/menu/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Server item delete endpoint note:', e);
  }
}

/**
 * Delete a category and its cascading items on the cloud server
 */
export async function deleteCategoryOnCloud(categoryId: string): Promise<void> {
  try {
    await fetch(`/api/menu/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Server category delete endpoint note:', e);
  }
}

/**
 * Resets the entire menu to default factory settings across cloud and local.
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const { pantryId } = getCustomStorageConfig();

  const defaultData: CloudMenuPayload = {
    categories: INITIAL_CATEGORIES,
    items: INITIAL_MENU_ITEMS,
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };

  setLocalCachedMenu(defaultData);

  const promises: Promise<any>[] = [];

  if (pantryId) {
    promises.push(postToPantry(pantryId, defaultData));
  }

  promises.push(
    fetch('/api/menu/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => {})
  );

  await Promise.allSettled(promises);
  return defaultData;
}

/**
 * Subscribes to real-time updates via Server-Sent Events (SSE) stream or fallback.
 */
export function subscribeToCloudMenu(
  onUpdate: (data: CloudMenuPayload) => void,
  onError?: (err: any) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let retryTimer: any = null;

  const connectSSE = () => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource('/api/menu/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
            const payload: CloudMenuPayload = {
              categories: Array.isArray(data.categories) ? data.categories : [],
              items: Array.isArray(data.items) ? data.items : [],
              orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
              updatedAt: data.updatedAt,
            };
            setLocalCachedMenu(payload);
            onUpdate(payload);
          }
        } catch (e) {
          console.warn('SSE message parse error:', e);
        }
      };

      eventSource.onerror = (err) => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed) {
          retryTimer = setTimeout(() => {
            if (!isClosed) connectSSE();
          }, 15000);
        }
        if (onError) onError(err);
      };
    } catch (err) {
      if (onError) onError(err);
    }
  };

  connectSSE();

  return () => {
    isClosed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
