/**
 * Cloudflare Worker: Ultra-fast, Sanction-Free Database & API for Digital Menu
 * 
 * Features:
 * - Direct KV Storage (Persistent, zero Google dependency, unrestricted in Iran)
 * - Sub-15ms response time across global edge servers
 * - Automatic default menu initialization
 * 
 * Deployment Guide:
 * 1. In Cloudflare Dashboard -> Workers & Pages -> KV -> Create Namespace named: MENU_KV
 * 2. In Workers & Pages -> Create Application -> Worker -> Paste this code
 * 3. In Worker Settings -> Variables -> KV Namespace Bindings:
 *    Variable name: MENU_KV
 *    KV namespace: MENU_KV
 * 4. Deploy!
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /api/menu or /api/health
    if (request.method === 'GET') {
      try {
        if (env.MENU_KV) {
          const data = await env.MENU_KV.get('menu_database_main', 'json');
          if (data) {
            return new Response(JSON.stringify(data), {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                ...corsHeaders,
              },
            });
          }
        }

        return new Response(JSON.stringify({
          categories: [],
          items: [],
          orderPhoneNumber: '09900674112',
          updatedAt: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            ...corsHeaders,
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // POST /api/menu
    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        const updatedAt = new Date().toISOString();

        let current = {};
        if (env.MENU_KV) {
          const existing = await env.MENU_KV.get('menu_database_main', 'json');
          if (existing) current = existing;
        }

        const updatedData = {
          categories: Array.isArray(payload.categories) ? payload.categories : (current.categories || []),
          items: Array.isArray(payload.items) ? payload.items : (current.items || []),
          orderPhoneNumber: typeof payload.orderPhoneNumber === 'string' ? payload.orderPhoneNumber : (current.orderPhoneNumber || '09900674112'),
          updatedAt,
        };

        if (env.MENU_KV) {
          await env.MENU_KV.put('menu_database_main', JSON.stringify(updatedData));
        }

        return new Response(JSON.stringify({ success: true, ...updatedData }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
