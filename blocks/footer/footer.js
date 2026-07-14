import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  block.textContent = '';

  const footer = document.createElement('div');
  footer.classList.add('footer-container');

  const footerNav = document.createElement('div');
  footerNav.classList.add('footer-nav')

  const footerCopyright = document.createElement('div');
  footerCopyright.classList.add('footer-copyright');

  const sections = [...fragment.children];

  if (sections[0]) {
    footerNav.append(sections[0]);
  }
  if (sections[1]) {
    footerCopyright.append(sections[1]);
  }

  const wrapper = footerNav.querySelector('.default-content-wrapper');
  if (wrapper) {
    const children = [...wrapper.children];

    wrapper.innerHTML = '';
    for (let i = 0; i < children.length; i += 2) {
      const column = document.createElement('div');
      column.classList.add('footer-column');
      column.append(children[i]);
      if (children[i + 1]) {
        column.append(children[i + 1]);
      }
      wrapper.append(column);
    }
  }

  footer.append(footerNav, footerCopyright);
  block.append(footer);
}
