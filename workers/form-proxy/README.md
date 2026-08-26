# form-proxy Worker

The "middleman" for protected form submissions. The browser sends form data
here; this Worker holds the secret credentials, exchanges them for a
short-lived token, calls the protected API, and returns a clean result.

```
contact-form block (browser)  →  form-proxy Worker  →  external API
        no secrets                holds the secret
```

## Placeholder mode (default)

Ships with a built-in fake auth server + fake API so you can run the whole
flow with **no real credentials**. `USE_PLACEHOLDER = "true"` in
`wrangler.toml` controls this.

## Run / deploy

```bash
cd workers/form-proxy
npm install
npm run dev        # local test at http://localhost:8787
npm run deploy     # deploy → https://form-proxy.<you>.workers.dev
```

You need a (free) Cloudflare account and to be logged in (`wrangler login`).

## Switch to a real API

1. Set secrets (values never go in Git):
   ```bash
   wrangler secret put CLIENT_ID
   wrangler secret put CLIENT_SECRET
   ```
2. In `wrangler.toml`, set `AUTH_URL`, `API_URL`, and `USE_PLACEHOLDER = "false"`.
3. Redeploy.

## Wire the form to it

In `blocks/contact-form/contact-form.js`, set `DEFAULT_ENDPOINT` to your
deployed Worker URL (or set it in the block's first row).

Also update `ALLOWED_ORIGIN` in `src/index.js` to your site's origin so only
your site can call the Worker.
