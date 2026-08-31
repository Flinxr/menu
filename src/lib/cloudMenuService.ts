import { CategoryInfo, MenuItem } from '../types';
import { DEFAULT_PANTRY_ID } from '../data/pantryConfig';

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

// Helper to get Pantry storage configuration (from localStorage, URL param, or hardcoded DEFAULT_PANTRY_ID)
export function getCustomStorageConfig(): { pantryId: string } {
  if (typeof window === 'undefined') return { pantryId: sanitizePantryId(DEFAULT_PANTRY_ID) };
  
  // 1. Check if URL has ?pantry=... (useful for QR codes or instant setup on any device)
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

// Helper to get local cached data (instant offline/fast hydration)
export function getLocalCachedMenu(): CloudMenuPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.categories || parsed.items)) {
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
 * Fetch menu data from Pantry.cloud or local cache:
 * 1. Custom Pantry.cloud basket (if pantryId configured)
 * 2. Local/Hosted Server API (/api/menu)
 * 3. Local cached data (if pure static frontend)
 */
export async function fetchMenuFromCloud(): Promise<CloudMenuPayload | null> {
  const { pantryId } = getCustomStorageConfig();
  const cached = getLocalCachedMenu();

  let fetchedPayload: CloudMenuPayload | null = null;

  // 1. Pantry Cloud (Free, Zero-binding REST storage, 100% unblocked)
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
          fetchedPayload = {
            categories: Array.isArray(data.categories) ? data.categories : [],
            items: Array.isArray(data.items) ? data.items : [],
            orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn('Pantry fetch failed:', e);
    }
  }

  // 2. Local/Hosted Server API (/api/menu) if running and pantry didn't return
  if (!fetchedPayload) {
    try {
      const response = await fetch('/api/menu', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && (Array.isArray(data.items) || Array.isArray(data.categories))) {
          fetchedPayload = {
            categories: Array.isArray(data.categories) ? data.categories : [],
            items: Array.isArray(data.items) ? data.items : [],
            orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        }
      }
    } catch {
      // Expected on pure static host
    }
  }

  // If we fetched new data from remote, verify against local cache timestamp
  if (fetchedPayload) {
    if (cached && cached.updatedAt && fetchedPayload.updatedAt) {
      const localTime = new Date(cached.updatedAt).getTime();
      const remoteTime = new Date(fetchedPayload.updatedAt).getTime();
      // If local cache is newer (within 1 minute) due to recent local edit/delete, preserve local
      if (localTime > remoteTime) {
        return cached;
      }
    }
    setLocalCachedMenu(fetchedPayload);
    return fetchedPayload;
  }

  // 3. LocalStorage Fallback
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Helper to post to Pantry with retry on 429
 */
async function postToPantry(pantryId: string, payload: CloudMenuPayload, retries = 2): Promise<boolean> {
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
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
    } catch (e) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
    }
  }
  return false;
}

/**
 * Saves entire menu or updates fields to Pantry.cloud & local cache.
 */
export async function saveMenuToCloud(payload: Partial<CloudMenuPayload>): Promise<void> {
  const { pantryId } = getCustomStorageConfig();
  const current = getLocalCachedMenu();

  const updatedPayload: CloudMenuPayload = {
    categories: payload.categories !== undefined ? payload.categories : (current?.categories || []),
    items: payload.items !== undefined ? payload.items : (current?.items || []),
    orderPhoneNumber: payload.orderPhoneNumber !== undefined ? payload.orderPhoneNumber : (current?.orderPhoneNumber || '09900674112'),
    updatedAt: new Date().toISOString(),
  };

  // Always update local cache immediately for instant UI responsiveness
  setLocalCachedMenu(updatedPayload);

  const savePromises: Promise<any>[] = [];

  // 1. Save to Pantry Cloud if configured
  if (pantryId) {
    savePromises.push(postToPantry(pantryId, updatedPayload));
  }

  // 2. Save to Server Database (/api/menu) if backend server is running
  savePromises.push(
    fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => {})
  );

  await Promise.allSettled(savePromises);
}

/**
 * Resets the entire menu to default.
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const { pantryId } = getCustomStorageConfig();

  const defaultData: CloudMenuPayload = {
    categories: [],
    items: [],
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };

  setLocalCachedMenu(defaultData);

  const promises: Promise<any>[] = [];

  if (pantryId) {
    const pantryUrl = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/menu_database`;
    promises.push(
      fetch(pantryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultData),
      }).catch((e) => console.warn('Pantry reset error:', e))
    );
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
          if (data && (data.items || data.categories)) {
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
          }, 10000);
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
