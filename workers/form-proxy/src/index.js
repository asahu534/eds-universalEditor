/**
 * Form-proxy Worker — the "middleman" for protected form submissions.
 *
 * Flow:
 *   Browser (contact-form block)  →  THIS Worker  →  external API
 *
 * The Worker holds the secret credentials (never the browser), exchanges them
 * for a short-lived access token, then calls the protected API on the user's
 * behalf and returns a clean success/error response.
 *
 * ── PLACEHOLDER MODE ─────────────────────────────────────────────────────
 * Out of the box this runs against a built-in fake auth server + fake API
 * (see the `PLACEHOLDER` block below) so you can deploy and test the whole
 * flow WITHOUT any real credentials. When you're ready for a real API:
 *   1. Set real secrets:  wrangler secret put CLIENT_ID
 *                         wrangler secret put CLIENT_SECRET
 *   2. Set AUTH_URL / API_URL in wrangler.toml (or as vars).
 *   3. Set USE_PLACEHOLDER = "false" in wrangler.toml.
 */

// Only these origins may call the Worker. Lock these to your site (+ localhost for dev).
const ALLOWED_ORIGINS = [
  /^https:\/\/[a-z0-9-]+--eds-universaleditor--asahu534\.aem\.(page|live)$/,
  /^http:\/\/localhost:3000$/,
];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.some((re) => re.test(origin));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Step 2: token exchange. Swap the long-lived secret for a short-lived token.
 * In placeholder mode we just mint a fake token so no real auth server is hit.
 */
async function getAccessToken(env) {
  if (env.USE_PLACEHOLDER !== 'false') {
    return `placeholder-token-${env.CLIENT_ID || 'demo'}`;
  }

  // Static-token APIs (a pre-issued Bearer token) skip the OAuth exchange.
  if (env.API_TOKEN) {
    return env.API_TOKEN;
  }

  const res = await fetch(env.AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Step 3: call the protected API with the token.
 * In placeholder mode we simulate a successful API that just echoes an id.
 */
async function callApi(env, token, payload) {
  if (env.USE_PLACEHOLDER !== 'false') {
    // Simulated protected API response.
    return { ok: true, id: `demo-${Date.now()}` };
  }

  const res = await fetch(env.API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API call failed: HTTP ${res.status}`);
  // Upstream may not return an id; fall back so the browser still gets a ref.
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data.id || data.timestamp || `ref-${Date.now()}` };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Step 1: guardrails
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, origin);
    }
    if (!isAllowedOrigin(origin)) {
      return json({ ok: false, error: 'Forbidden' }, 403, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400, origin);
    }

    const name = (payload.name || '').toString().trim();
    const email = (payload.email || '').toString().trim();
    const message = (payload.message || '').toString().trim();

    if (!name || !message || !isValidEmail(email)) {
      return json({ ok: false, error: 'Missing or invalid fields' }, 400, origin);
    }

    try {
      // Step 2 + 3: token exchange, then call the protected API.
      const token = await getAccessToken(env);
      const result = await callApi(env, token, { name, email, message });

      // Step 4: clean response — never leak the token or upstream internals.
      return json({ ok: true, id: result.id }, 200, origin);
    } catch (err) {
      // Log server-side; return a generic message to the browser.
      // eslint-disable-next-line no-console
      console.error(err);
      return json({ ok: false, error: 'Upstream request failed' }, 502, origin);
    }
  },
};
