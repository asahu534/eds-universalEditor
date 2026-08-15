# Partners → Adobe JSON2HTML + Mustache (BYOM) Migration

This document records the decisions and the exact changes made to move the Partners feature
from a **client-side runtime-fetch block** to a **server-rendered `/partners` page** built with
Adobe's official **JSON2HTML for Edge Delivery Services** worker + a **Mustache** template
(delivered via **BYOM — Bring Your Own Markup**).

Reference: https://www.aem.live/developer/json2html and https://www.aem.live/developer/byom

---

## 1. Goal

Deliver the partners grid as a standalone `/partners` page rendered at preview/publish time,
instead of fetching + templating in the visitor's browser. This is cleaner and faster, and
removes the third-party client-side templating/sanitization from the partners path.

---

## 2. Architecture: before vs after

| | Before | After |
| --- | --- | --- |
| Unit | UE-authorable block | Standalone `/partners` page |
| Render time | Runtime, in browser | Preview/publish (Adobe edge worker) |
| Templating | `json2html.min.js` (client) | Mustache template (server) |
| Sanitization | DOMPurify (client) | Mustache auto-escaping (server) |
| Data source | Same `team-proxy` action | Same `team-proxy` action |
| Data freshness | Live per page load | Snapshot at publish |

Flow after migration:

```
/partners preview  ->  JSON2HTML worker  ->  fetch team-proxy JSON  ->  render Mustache
                       (overlay)              (AppBuilder action)        template (BYOM HTML)
                                                                              |
                                                          EDS ingests + publishes the page
                                                                              |
                                                          partners.js decorates rows -> cards
```

---

## 3. Decisions made

1. **Reuse the existing `team-proxy` AppBuilder action** as the JSON endpoint. No new backend.
2. **Enriched the action's response shape** with `hasPhoto`, `initials`, and `alt` so the
   **logic-less** Mustache template needs no computation (Mustache cannot compute initials or
   test for a missing photo cleanly otherwise). This is backward compatible — only new fields
   were added.
3. **Mustache template outputs idiomatic EDS block markup** (sections + a `partners` block with
   rows/cells), not final card HTML. This is the safest BYOM format (BYOM strips `span`, data
   attributes, and inline styles; block/row/cell semantics survive ingestion).
4. **`partners.js` is now a pure decorator** — it reads the ingested rows and builds the card
   DOM the CSS expects. It no longer fetches, and no longer loads `json2html` or `DOMPurify`.
5. **Kept `partners.css` unchanged** — the decorated DOM uses the same class names.
6. **Removed `scripts/json2html.min.js`** — it was used only by the partners block.
7. **Kept `scripts/dompurify.min.js`** — it is still used by `scripts/editor-support.js`
   (Universal Editor RTE), so it must not be deleted.
8. **Sanitization** is handled by Mustache's default `{{ }}` HTML-escaping on the server. No
   client-side sanitizer is needed on the partners path.
9. **Config values** (org/site/branch) were taken from `fstab.yaml`:
   `asahu534` / `eds-universaleditor` / `main`.

---

## 4. Files changed / added / removed

### Changed
- `appbuilder/actions/generic/index.js` (the `team-proxy` action)
  - Added an `initials()` helper.
  - `shapePerson()` now also returns `hasPhoto`, `initials`, and `alt`.
  - Updated the header comment to describe the JSON2HTML/Mustache consumer.
- `eds-universalEditor/blocks/partners/partners.js`
  - Rewritten as a decorator: reads the 4 cells per row (photo, name, title, email) and
    builds the `partners-list` / `partners-item` card structure.
  - Removed the runtime `fetch`, the `json2html` template, the `DOMPurify` sanitize call, and
    the `loadScript` imports.
  - Kept the captured `error` listener that swaps a broken photo for initials.

### Added
- `eds-universalEditor/templates/partners.html`
  - The Mustache template. Emits a full HTML document (BYOM format) with an `<h2>` heading and
    the `partners` block. Iterates `{{#results}}`, uses `{{#hasPhoto}}` / `{{^hasPhoto}}` for
    the photo-vs-initials cell.
- `eds-universalEditor/tools/json2html/partners-config.json`
  - The configuration array POSTed to the JSON2HTML worker (path → endpoint → template).
- `eds-universalEditor/tools/json2html/overlay.snippet.json`
  - The `overlay` block to add to the site's content-source config (config service).

### Removed
- `eds-universalEditor/scripts/json2html.min.js` (unused after migration).

### Intentionally NOT changed
- `eds-universalEditor/blocks/partners/partners.css` — still valid.
- `eds-universalEditor/blocks/partners/_partners.json` — the UE model still exists, but the
  `/partners` page is BYOM-generated, not authored in the Universal Editor, so its
  `endpoint` / `heading` / `limit` fields are no longer used for that page. Left in place to
  avoid touching the `build:json` glob; see "Follow-ups".

---

## 5. One-time setup to go live (requires an AEM admin token)

These steps cannot be run from the repo — they require an authenticated call with your admin
token. Substitute `<ADMIN_TOKEN>`.

Org / Site / Branch: `asahu534` / `eds-universaleditor` / `main`

1. **Publish the code** so the worker can fetch the template at
   `/templates/partners.html` (preview/publish the branch).

2. **Add the overlay** to the site content-source config (contents in
   `tools/json2html/overlay.snippet.json`):
   ```
   overlay:
     url:  https://json2html.adobeaem.workers.dev/asahu534/eds-universaleditor/main
     type: markup
   ```

3. **POST the worker config** (contents in `tools/json2html/partners-config.json`):
   ```
   curl -X POST \
     https://json2html.adobeaem.workers.dev/config/asahu534/eds-universaleditor/main \
     -H "Authorization: token <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     --data @eds-universalEditor/tools/json2html/partners-config.json
   ```

4. **Preview `/partners`** on the `.aem.page` domain. The worker fetches the `team-proxy`
   JSON, renders the Mustache template, EDS ingests the images, and `partners.js` decorates
   the cards.

To change how many partners show, edit `?results=N` in `partners-config.json` (max 50) and
re-POST the config.

---

## 6. Security notes

- Output is HTML-escaped by Mustache's `{{ }}` on the server; no client sanitizer needed here.
- The `team-proxy` action stays public (`require-adobe-auth: false`) and calls a public API —
  no secrets involved in this flow.
- Photo URLs come from `randomuser.me` (public) and are ingested by EDS at preview.

---

## 7. Follow-ups (optional)

- If the `partners` block will never be hand-authored again, its UE model
  (`blocks/partners/_partners.json`) and the fields inside can be removed and `npm run build:json`
  re-run. Left as-is for now to keep scope tight.
- `docs/PARTNERS-BLOCK.md` describes the previous client-side design and is superseded by this
  document.
