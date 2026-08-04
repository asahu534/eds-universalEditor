# Block Library

This document catalogs the blocks in this project and categorizes each by its Universal Editor authoring pattern.

## The four canonical patterns

- **Standalone** — a single instance with one flat model of fields; no repeatable children.
- **Collection** — a parent container plus a filter permitting repeatable **child items**, each with its own model.
- **Configuration** — behavior/layout driven by option fields (select/multiselect) whose values become CSS classes or variants.
- **Auto-blocked** — created programmatically in JavaScript from plain content; not (or not only) inserted via the Universal Editor component picker.

Most blocks have a **primary pattern** plus **secondary traits** (e.g. a Standalone block that also exposes a Configuration variant). Two blocks (`comments`, `articles-list`) are Configuration-shaped but functionally **dynamic/data-driven**.

## Summary

| Block         | Primary pattern | Secondary traits |
|---------------|---|---|
| hero          | Standalone | + Auto-blocked (hybrid) |
| cta           | Standalone | + Configuration (Default/Centered) |
| testimonial   | Standalone | — |
| fragment      | Standalone (structural reference) | — |
| cards         | Collection (→ card) | — |
| features      | Collection (→ feature) | — |
| stats         | Collection (→ stat) | — |
| columns       | Configuration (Layout select) | + contains `column` children |
| comments      | Configuration (Grid/List) | + dynamic (REST fetch) |
| articles-list | Configuration (sort) | + dynamic (query-index.json) |
| embed         | Auto-blocked (pure) | — (no model, not in UE picker) |

## Grouped by pattern

**Standalone**
- `hero` (also Auto-blocked — hybrid)
- `cta` (also Configuration variant)
- `testimonial`
- `fragment` (structural reference)

**Collection**
- `cards` (→ card)
- `features` (→ feature)
- `stats` (→ stat)

**Configuration**
- `columns` (Layout select; also contains `column` children)
- `comments` (Grid/List select; dynamic REST)
- `articles-list` (sort select; dynamic, index-driven)
- `cta` carries a Configuration variant on top of Standalone

**Auto-blocked**
- `embed` (pure — no model, not author-inserted)
- `hero` (hybrid — authorable model **and** an auto-block path)

## Per-block detail

### hero — Standalone (+ Auto-blocked)
Fields: `image`, `imageAlt`, `eyebrow`, `text` (richtext), `button` (link), `buttonText`.
Also constructed automatically by `buildHeroBlock()` in `scripts/scripts.js` when a page leads with a `<picture>` followed by an `<h1>` — the hybrid auto-block path.

### cta — Standalone (+ Configuration)
Fields: `eyebrow`, `text` (richtext heading & body), `button` (link), `buttonText`, `classes` (select: Default / Centered).

### testimonial — Standalone
Fields: `quote` (richtext), `photo` (reference), `photoAlt`, `author`, `role`.

### fragment — Standalone (structural reference)
Field: `reference` (aem-content). Includes another document's content on the page rather than authoring a content unit directly.

### cards — Collection
Parent `cards` + repeatable item `card`. Item fields: `image` (reference), `text` (richtext). Filter: `cards → [card]`.

### features — Collection
Parent `features` + repeatable item `feature`. Item fields: `icon` (reference), `iconAlt`, `text` (richtext title & description). Filter: `features → [feature]`. Rendered as an icon-led benefit list.

### stats — Collection
Parent `stats` + repeatable item `stat`. Item fields: `value`, `label`. Filter: `stats → [stat]`. Rendered as a responsive metrics grid.

### columns — Configuration (+ container)
Fields: `columns`, `rows`, `classes` (select: Equal width / Wide left / Wide right). Filters: `columns → [column]`, `column → [text, image, button, title]`. Layout variant drives the desktop grid.

### comments — Configuration (dynamic)
Fields: `endpoint` (public REST API URL, CORS-enabled), `limit`, `classes` (select: Grid / List). Fetches a JSON array at runtime (client-side) and renders name / email / body per item, with skeleton and error states.

### articles-list — Configuration (dynamic, index-driven)
Fields: `pathPrefix`, `sort` (select: Newest first / Title A–Z), `limit`. Reads `/query-index.json` at runtime, filters published pages by path prefix, and renders auto-updating cards (title / description / image). Self-updates as pages are published.

Note: the block's `id`/`model` is `pagelist` while its rendered class / folder is `articles-list` (from the block `name` "Page List"). See the maintenance note on the block-name → folder convention.

### embed — Auto-blocked (pure)
No `_embed.json` model — not in the Universal Editor picker. Created only by `buildEmbedBlocks()` in `scripts/scripts.js`, which detects a bare YouTube/Vimeo URL (a standalone link whose text equals its href) and wraps it into an `embed` block. `blocks/embed/embed.js` parses the URL and renders a lightweight facade (thumbnail + play button), loading the heavy iframe only on click for performance.

## Nuances

- **hero is a hybrid** — Standalone by model, Auto-blocked by construction. The model powers authored heroes; `buildHeroBlock()` promotes plain picture+H1 content into a hero on delivery.
- **columns is dual** — Configuration (Layout select) plus a container of `column` children (core-boilerplate containment).
- **comments and articles-list are Configuration-shaped but dynamic** — their defining trait is runtime data (external REST / the site index). "Configuration" is the closest canonical label; "dynamic/data-driven" is the accurate functional description. No server-side code is involved — data is fetched client-side.
- **embed is the pure Auto-blocked example** — it has no model and cannot be inserted from the picker; it materializes on the delivered page from plain content. Auto-blocking is a delivery-time transform, so it does not appear as a block in the Universal Editor authoring canvas.
- **fragment is structural** — Standalone-shaped, but its purpose is content inclusion, not a content unit.

## Maintenance notes

- **Adding/removing a block:** create/delete the block's `blocks/<name>/_<name>.json` partial and (for section-insertable blocks) update the section filter in `models/_section.json`. The aggregated root files (`component-definition.json`, `component-models.json`, `component-filters.json`) are **generated** — never hand-edit them.
- **Generation:** `npm run build:json` merges every `blocks/*/_*.json` partial (via globs in `models/_component-*.json`) into the root files. A husky pre-commit hook (`.husky/pre-commit.mjs`) runs `build:json` automatically and re-stages the generated files whenever a `_*.json` partial is committed.
- **Block-name → folder convention:** the block `name` in the definition becomes the rendered CSS class (lowercased, non-alphanumerics → hyphen), and EDS loads the block's code from `/blocks/<class>/<class>.js`. The folder and file names must match that class (e.g. `name: "Page List"` → `../blocks/articles-list/articles-list.js`).
