/*
 * Content Fragment Block
 * Renders a referenced AEM Content Fragment and instruments it as an
 * editable reference for the Universal Editor ("Open in CF Editor").
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

/**
 * Extracts the authored Content Fragment path from the block.
 * The `cf-reference` (aem-content-fragment) field arrives as a link or plain text.
 * @param {Element} block
 * @returns {string} the fragment path (JCR path), or '' if none
 */
function getFragmentPath(block) {
  const link = block.querySelector('a[href]');
  const raw = (link ? link.getAttribute('href') : block.textContent).trim();
  if (!raw) return '';
  // normalise to a JCR path: strip origin + any .html/.plain.html/.model.json suffixes
  try {
    const { pathname } = new URL(raw, window.location.href);
    return pathname.replace(/(\.plain)?\.html$/, '').replace(/\.model\.json$/, '');
  } catch (e) {
    return raw.replace(/(\.plain)?\.html$/, '');
  }
}

/**
 * Marks the block as an editable Content Fragment reference so the Universal
 * Editor shows "Open in CF Editor". The reference resource is the fragment's
 * own path expressed as an AEM connection URN.
 * @param {Element} block
 * @param {string} fragmentPath JCR path of the referenced fragment
 */
function instrumentReference(block, fragmentPath) {
  if (!fragmentPath) return;
  block.setAttribute('data-aue-type', 'reference');
  block.setAttribute('data-aue-resource', `urn:aemconnection:${fragmentPath}`);
  block.setAttribute('data-aue-label', 'Content Fragment');
  block.setAttribute('data-aue-prop', 'cf-reference');
}

export default async function decorate(block) {
  const path = getFragmentPath(block);

  // instrument as an editable CF reference (enables "Open in CF Editor")
  instrumentReference(block, path);

  // render the referenced content (document-style include, if resolvable)
  const fragment = await loadFragment(path);
  if (fragment) {
    const content = document.createElement('div');
    content.className = 'content-fragment-content';
    content.append(...fragment.childNodes);
    block.replaceChildren(content);
  }
}
