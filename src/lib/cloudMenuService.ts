import { CategoryInfo, MenuItem } from '../types';

export interface CloudMenuPayload {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber: string;
  updatedAt?: string;
}

/**
 * Fetch menu data directly from the server database (/api/menu).
 * No localStorage caching or client-side fallbacks.
 * Uses query timestamp to bypass any browser cache.
 */
export async function fetchMenuFromCloud(): Promise<CloudMenuPayload> {
  const response = await fetch(`/api/menu?_t=${Date.now()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`خطا در ارتباط با دیتابیس سرور (کد خطا: ${response.status})`);
  }

  const data = await response.json();
  if (!data || (!Array.isArray(data.items) && !Array.isArray(data.categories))) {
    throw new Error('فرمت اطلاعات دریافتی از دیتابیس نامعتبر است');
  }

  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    items: Array.isArray(data.items) ? data.items : [],
    orderPhoneNumber: typeof data.orderPhoneNumber === 'string' ? data.orderPhoneNumber : '09900674112',
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Saves entire menu payload directly to the server database.
 */
export async function saveMenuToCloud(payload: {
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber?: string;
}): Promise<CloudMenuPayload> {
  const response = await fetch('/api/menu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`خطا در ذخیره‌سازی روی سرور (کد خطا: ${response.status})`);
  }

  const result = await response.json();
  return {
    categories: Array.isArray(result.categories) ? result.categories : payload.categories,
    items: Array.isArray(result.items) ? result.items : payload.items,
    orderPhoneNumber: result.orderPhoneNumber || payload.orderPhoneNumber || '09900674112',
    updatedAt: result.updatedAt || new Date().toISOString(),
  };
}

/**
 * Delete a single item directly on the server database
 */
export async function deleteItemOnCloud(itemId: string): Promise<CloudMenuPayload> {
  const response = await fetch(`/api/menu/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`خطا در حذف آیتم از سرور (کد خطا: ${response.status})`);
  }

  const result = await response.json();
  return {
    categories: result.categories || [],
    items: result.items || [],
    orderPhoneNumber: result.orderPhoneNumber || '09900674112',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete a category and its cascade items directly on the server database
 */
export async function deleteCategoryOnCloud(categoryId: string): Promise<CloudMenuPayload> {
  const response = await fetch(`/api/menu/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`خطا در حذف دسته‌بندی از سرور (کد خطا: ${response.status})`);
  }

  const result = await response.json();
  return {
    categories: result.categories || [],
    items: result.items || [],
    orderPhoneNumber: result.orderPhoneNumber || '09900674112',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resets the entire menu to default factory settings directly on the server.
 */
export async function resetMenuOnCloud(): Promise<CloudMenuPayload> {
  const response = await fetch('/api/menu/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`خطا در بازنشانی دیتابیس روی سرور (کد خطا: ${response.status})`);
  }

  const result = await response.json();
  return {
    categories: result.categories || [],
    items: result.items || [],
    orderPhoneNumber: result.orderPhoneNumber || '09900674112',
    updatedAt: result.updatedAt || new Date().toISOString(),
  };
}

/**
 * Subscribes to authoritative real-time updates directly via Server-Sent Events (SSE).
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
          }, 8000);
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
