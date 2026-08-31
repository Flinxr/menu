// Cloudflare Pages Function for /api/menu & /api/menu/reset
// Native Cloudflare KV support with fallback defaults
// 100% Unrestricted, zero Google dependencies, ultra-fast worldwide edge

import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from '../../src/data/menuData';

interface Env {
  // Optional Cloudflare KV Namespace binding named MENU_KV
  MENU_KV?: {
    get: (key: string, type?: 'text' | 'json') => Promise<any>;
    put: (key: string, value: string) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, any>;
}) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control',
};

const DEFAULT_MENU_PAYLOAD = {
  categories: INITIAL_CATEGORIES,
  items: INITIAL_MENU_ITEMS,
  orderPhoneNumber: '09900674112',
  updatedAt: new Date().toISOString(),
};

// In-worker memory cache for instant hot reads
let memoryCache: any = null;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (env.MENU_KV) {
      const kvData = await env.MENU_KV.get('menu_database_main', 'json');
      if (kvData && (kvData.categories || kvData.items)) {
        memoryCache = kvData;
        return new Response(JSON.stringify(kvData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            ...CORS_HEADERS,
          },
        });
      }
    }

    if (memoryCache) {
      return new Response(JSON.stringify(memoryCache), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...CORS_HEADERS,
        },
      });
    }

    return new Response(JSON.stringify(DEFAULT_MENU_PAYLOAD), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Pages edge error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const payload = (await request.json()) as any;
    const updatedAt = new Date().toISOString();

    let current = memoryCache || DEFAULT_MENU_PAYLOAD;
    if (env.MENU_KV) {
      const existing = await env.MENU_KV.get('menu_database_main', 'json');
      if (existing) current = existing;
    }

    const updatedData = {
      categories: Array.isArray(payload.categories) ? payload.categories : current.categories,
      items: Array.isArray(payload.items) ? payload.items : current.items,
      orderPhoneNumber: typeof payload.orderPhoneNumber === 'string' ? payload.orderPhoneNumber : (current.orderPhoneNumber || '09900674112'),
      updatedAt,
    };

    memoryCache = updatedData;

    if (env.MENU_KV) {
      await env.MENU_KV.put('menu_database_main', JSON.stringify(updatedData));
    }

    return new Response(JSON.stringify({ success: true, ...updatedData }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update menu' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
};
