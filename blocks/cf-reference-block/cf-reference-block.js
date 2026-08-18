/*
 * CF Reference Block
 * Accepts a content fragment path via the UE model field (aem-content-fragment)
 * and instruments the block so the Universal Editor can open the referenced
 * fragment for in-place editing. If the fragment is resolvable, it will be
 * rendered inline.
 */

// eslint-disable-next-line import/no-cycle
import { decorateMain } from '../../scripts/scripts.js';
import { loadSections } from '../../scripts/aem.js';

function normalizePath(raw) {
  if (!raw) return '';
  try {
    const { pathname } = new URL(raw, window.location.href);
    return pathname.replace(/(\.plain)?\.html$/, '').replace(/\.model\.json$/, '');
  } catch (e) {
    return raw.replace(/(\.plain)?\.html$/, '');
  }
}

function extractPath(block) {
  // Prefer a data attribute (authoring via UE may inject it), then a link, then text
  const data = block.getAttribute('data-cf-path');
  if (data) return normalizePath(data.trim());
  const link = block.querySelector('a[href]');
  if (link) return normalizePath(link.getAttribute('href').trim());
  const text = block.textContent && block.textContent.trim();
  return normalizePath(text || '');
}

function instrumentForUE(block, path) {
  if (!path) return;
  block.setAttribute('data-aue-type', 'reference');
  block.setAttribute('data-aue-resource', `urn:aemconnection:${path}`);
  block.setAttribute('data-aue-prop', 'cf-reference');
  block.setAttribute('data-aue-label', 'Content Fragment');
}

async function fetchFragment(path) {
  if (!path || !path.startsWith('/')) return null;
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const container = document.createElement('div');
    container.innerHTML = html;

    // Fix media URLs that start with ./media_
    container.querySelectorAll('[src^="./media_"]').forEach((el) => {
      const attr = el.getAttribute('src');
      el.src = new URL(attr, new URL(path, window.location)).href;
    });
    container.querySelectorAll('[srcset^="./media_"]').forEach((el) => {
      const attr = el.getAttribute('srcset');
      el.srcset = new URL(attr, new URL(path, window.location)).href;
    });

    // Decorate and return
    decorateMain(container);
    await loadSections(container);
    return container;
  } catch (e) {
    return null;
  }
}

export default async function decorate(block) {
  const path = extractPath(block);

  // Instrument block so UE shows "Open in CF Editor"
  instrumentForUE(block, path);

  // If the fragment resolves, render it inline
  const frag = await fetchFragment(path);
  if (frag) {
    const out = document.createElement('div');
    out.className = 'cf-reference-block-content';
    out.append(...frag.childNodes);
    block.replaceChildren(out);
  }
}
