import { createOptimizedPicture } from '../../scripts/aem.js';

const INDEX_PATH = '/query-index.json';
const DEFAULT_LIMIT = 6;
const RESERVED = ['/nav', '/footer'];

function readConfig(block) {
  const rows = [...block.children];
  const pathPrefix = rows[0]?.textContent.trim() || '/';
  const sort = rows[1]?.textContent.trim() || 'newest';
  const limitRaw = parseInt(rows[2]?.textContent.trim(), 10);
  const limit = Number.isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw;
  return { pathPrefix, sort, limit };
}

function sortItems(items, sort) {
  if (sort === 'title') {
    return items.sort((a, b) => (a.title || a.path).localeCompare(b.title || b.path));
  }
  return items.sort((a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0));
}

function renderCard(item) {
  const li = document.createElement('li');
  li.className = 'page-list-item';

  const link = document.createElement('a');
  link.className = 'page-list-link';
  link.href = item.path;

  if (item.image) {
    const picture = createOptimizedPicture(item.image, item.title || '', false, [{ width: '750' }]);
    const media = document.createElement('div');
    media.className = 'page-list-image';
    media.append(picture);
    link.append(media);
  }

  const bodyEl = document.createElement('div');
  bodyEl.className = 'page-list-body';

  const title = document.createElement('h3');
  title.className = 'page-list-title';
  title.textContent = item.title || item.path;
  bodyEl.append(title);

  if (item.description) {
    const desc = document.createElement('p');
    desc.className = 'page-list-desc';
    desc.textContent = item.description;
    bodyEl.append(desc);
  }

  link.append(bodyEl);
  li.append(link);
  return li;
}

function renderMessage(block, message) {
  block.textContent = '';
  const p = document.createElement('p');
  p.className = 'page-list-message';
  p.textContent = message;
  block.append(p);
}

export default async function decorate(block) {
  const { pathPrefix, sort, limit } = readConfig(block);
  const currentPath = window.location.pathname;

  block.textContent = '';

  try {
    const response = await fetch(INDEX_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rows = Array.isArray(json.data) ? json.data : [];

    let items = rows.filter((row) => row.path
      && row.path.startsWith(pathPrefix)
      && row.path !== currentPath
      && !RESERVED.includes(row.path)
      && row.robots !== 'noindex');

    items = sortItems(items, sort).slice(0, limit);

    if (!items.length) {
      renderMessage(block, 'No pages found.');
      return;
    }

    const list = document.createElement('ul');
    list.className = 'page-list-list';
    items.forEach((item) => list.append(renderCard(item)));
    block.append(list);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Page List failed to load the index', error);
    renderMessage(block, 'Unable to load pages right now.');
  }
}
