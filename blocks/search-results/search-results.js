import { createOptimizedPicture } from '../../scripts/aem.js';

const INDEX_PATH = '/query-index.json';
const RESERVED = ['/nav', '/footer'];

// relevance weights (keywords-first)
const WEIGHT = { keywords: 5, title: 3, description: 1 };

function getQuery() {
  return (new URLSearchParams(window.location.search).get('q') || '').trim();
}

function scoreRow(row, terms) {
  const fields = {
    keywords: (row.keywords || '').toLowerCase(),
    title: (row.title || '').toLowerCase(),
    description: (row.description || '').toLowerCase(),
  };
  let score = 0;
  terms.forEach((term) => {
    Object.entries(WEIGHT).forEach(([field, weight]) => {
      if (fields[field].includes(term)) score += weight;
    });
  });
  return score;
}

function renderCard(row) {
  const li = document.createElement('li');
  li.className = 'search-results-item';

  const link = document.createElement('a');
  link.className = 'search-results-link';
  link.href = row.path;

  if (row.image) {
    const picture = createOptimizedPicture(row.image, row.title || '', false, [{ width: '400' }]);
    const media = document.createElement('div');
    media.className = 'search-results-image';
    media.append(picture);
    link.append(media);
  }

  const body = document.createElement('div');
  body.className = 'search-results-body';

  const title = document.createElement('h3');
  title.className = 'search-results-title';
  title.textContent = row.title || row.path;
  body.append(title);

  if (row.description) {
    const desc = document.createElement('p');
    desc.className = 'search-results-desc';
    desc.textContent = row.description;
    body.append(desc);
  }

  link.append(body);
  li.append(link);
  return li;
}

function renderMessage(container, message) {
  const p = document.createElement('p');
  p.className = 'search-results-message';
  p.textContent = message;
  container.append(p);
}

export default async function decorate(block) {
  const heading = block.textContent.trim() || 'Search Results';
  const query = getQuery();

  block.textContent = '';

  const header = document.createElement('div');
  header.className = 'search-results-header';
  block.append(header);

  if (!query) {
    renderMessage(header, 'Enter a search term to see results.');
    return;
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  try {
    const response = await fetch(INDEX_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rows = Array.isArray(json.data) ? json.data : [];

    const currentPath = window.location.pathname;
    const scored = rows
      .filter((row) => row.path
        && !RESERVED.includes(row.path)
        && row.path !== currentPath
        && row.robots !== 'noindex')
      .map((row) => ({ row, score: scoreRow(row, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const title = document.createElement('h2');
    title.className = 'search-results-heading';
    title.textContent = heading;
    header.append(title);

    const count = document.createElement('p');
    count.className = 'search-results-count';
    count.textContent = `${scored.length} result${scored.length === 1 ? '' : 's'} for “${query}”`;
    header.append(count);

    if (!scored.length) {
      renderMessage(block, `No results found for “${query}”.`);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'search-results-list';
    scored.forEach((entry) => list.append(renderCard(entry.row)));
    block.append(list);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search Results failed to load the index', error);
    renderMessage(block, 'Unable to load search results right now.');
  }
}
