export default function decorate(block) {

  const parentLink = block.querySelector('a');
  const currentPath = window.location.pathname;
  const currentSegments = currentPath.split('/').filter(Boolean);
  const currentTitle = currentSegments.at(-1)?.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Home';
  const hasParent = currentSegments.length > 1;

  let parentPublicPath = '';
  let parentTitle = '';

  if (hasParent) {
    parentPublicPath = `/${currentSegments.slice(0, -1).join('/')}`;
    parentTitle = currentSegments.at(-2)?.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Parent';
  }

  block.textContent = '';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const navList = document.createElement('ol');

  if (currentTitle && currentTitle !== 'Home') {
    const navListHomeItem = document.createElement('li');
    const navListHomeLink = document.createElement('a');
    navListHomeLink.href = '/';
    navListHomeLink.textContent = 'Home';

    navListHomeItem.append(navListHomeLink);
    navList.append(navListHomeItem);
  }

  if (hasParent && parentLink) {
    const navListParentItem = document.createElement('li');
    const navListParentLink = document.createElement('a');

    navListParentLink.href = parentPublicPath;
    navListParentLink.textContent = parentTitle;
    
    navListParentItem.append(navListParentLink);
    navList.append(navListParentItem);
  }

  const navListCurrentItem = document.createElement('li');
  navListCurrentItem.textContent = currentTitle;
  navListCurrentItem.setAttribute('aria-current', 'page');
  navList.append(navListCurrentItem);

  if (currentTitle && currentTitle !== 'Home') {
    nav.append(navList);
    block.append(nav);
  }
}
