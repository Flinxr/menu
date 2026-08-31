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
        const payload: CloudMenuPayload = {
          categories: Array.isArray(data.categories) ? data.categories : [],
          items: Array.isArray(data.items) ? data.items : [],
          orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
          updatedAt: data.updatedAt,
        };
        setLocalCachedMenu(payload);
        return payload;
      }
    } catch (e) {
      console.warn('Pantry fetch failed, falling back:', e);
    }
  }

  // 2. Local/Hosted Server API (/api/menu) if running
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
      const payload: CloudMenuPayload = {
        categories: Array.isArray(data.categories) ? data.categories : [],
        items: Array.isArray(data.items) ? data.items : [],
        orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
        updatedAt: data.updatedAt,
      };

      setLocalCachedMenu(payload);
      return payload;
    }
  } catch {
    // Expected on pure static host
  }

  // 3. LocalStorage Fallback
  const cached = getLocalCachedMenu();
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Saves entire menu or updates fields to Pantry.cloud & local cache.
 */
export async function saveMenuToCloud(payload: Partial<CloudMenuPayload>): Promise<void> {
  const { pantryId } = getCustomStorageConfig();
  const current = getLocalCachedMenu();

  const updatedPayload: CloudMenuPayload = {
    categories: payload.categories || current?.categories || [],
    items: payload.items || current?.items || [],
    orderPhoneNumber: payload.orderPhoneNumber || current?.orderPhoneNumber || '09900674112',
    updatedAt: new Date().toISOString(),
  };

  // Always update local cache immediately for instant UI responsiveness
  setLocalCachedMenu(updatedPayload);

  // 1. Save to Pantry Cloud if configured
  if (pantryId) {
    try {
      const pantryUrl = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/menu_database`;
      const res = await fetch(pantryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });
      if (res.ok) return;
    } catch (e) {
      console.warn('Pantry save failed:', e);
    }
  }

  // 2. Save to Server Database (/api/menu) if available
  try {
    const response = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.categories && result.items) {
        setLocalCachedMenu(result);
      }
    }
  } catch {
    // Saved to local client cache
  }
}

/**
 * Resets the entire menu to default.
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const { pantryId } = getCustomStorageConfig();

  // Try server reset
  try {
    const response = await fetch('/api/menu/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const payload: CloudMenuPayload = {
        categories: Array.isArray(data.categories) ? data.categories : [],
        items: Array.isArray(data.items) ? data.items : [],
        orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
        updatedAt: data.updatedAt,
      };
      setLocalCachedMenu(payload);
      return payload;
    }
  } catch {
    // Fallback for static host
  }

  // Reset local cache
  const defaultData: CloudMenuPayload = {
    categories: [],
    items: [],
    orderPhoneNumber: '09900674112',
    updatedAt: new Date().toISOString(),
  };
  setLocalCachedMenu(defaultData);
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
