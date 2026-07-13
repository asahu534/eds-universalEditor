import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isHeading = (el) => /^H[1-6]$/.test(el.tagName);

/**
 * Groups authored content into link columns (each heading + following elements)
 * and an optional bottom bar (content with no headings, e.g. copyright/social).
 * Falls back to the raw stacked content when no headings are authored.
 * @param {Element} footer The footer content container
 */
function buildColumns(footer) {
  // each authored section becomes either columns (if it has headings) or the bottom bar
  const wrappers = footer.querySelectorAll('.default-content-wrapper');
  const sections = wrappers.length ? [...wrappers] : [footer];
  const hasAnyHeading = sections.some((s) => [...s.children].some(isHeading));

  // no heading groups anywhere → keep the stacked content unchanged (resilient fallback)
  if (!hasAnyHeading) return;

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Footer');
  const columns = document.createElement('div');
  columns.className = 'footer-columns';
  nav.append(columns);

  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  sections.forEach((section) => {
    const nodes = [...section.children];
    const sectionHasHeading = nodes.some(isHeading);
    if (sectionHasHeading) {
      let current = null;
      nodes.forEach((el) => {
        if (isHeading(el)) {
          current = document.createElement('div');
          current.className = 'footer-column';
          current.append(el);
          columns.append(current);
        } else if (current) {
          current.append(el);
        }
      });
    } else {
      // a heading-less section is the bottom bar (copyright / social)
      nodes.forEach((el) => bottom.append(el));
    }
  });

  footer.textContent = '';
  footer.append(nav);
  if (bottom.children.length) footer.append(bottom);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  buildColumns(footer);

  block.append(footer);
}
