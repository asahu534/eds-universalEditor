// The /partners page is server-rendered by the Adobe JSON2HTML worker (Mustache + BYOM).
// This block only decorates the ingested rows into cards and adds the photo fallback.

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}

function buildCard(row) {
  const [photoCell, nameCell, titleCell, emailCell] = row.children;
  const name = nameCell?.textContent.trim() || '';
  const title = titleCell?.textContent.trim() || '';
  const email = emailCell?.textContent.trim() || '';

  const item = document.createElement('li');
  item.className = 'partners-item';

  const photo = document.createElement('div');
  photo.className = 'partners-photo';
  const img = photoCell?.querySelector('img');
  if (img) {
    img.classList.add('partners-img');
    img.loading = 'lazy';
    if (!img.getAttribute('alt')) img.setAttribute('alt', name ? `Photo of ${name}` : '');
    photo.append(img);
  } else {
    const fallback = document.createElement('span');
    fallback.className = 'partners-photo-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = photoCell?.textContent.trim() || initials(name);
    photo.append(fallback);
  }

  const body = document.createElement('div');
  body.className = 'partners-body';
  if (name) {
    const h = document.createElement('h3');
    h.className = 'partners-name';
    h.textContent = name;
    body.append(h);
  }
  if (title) {
    const p = document.createElement('p');
    p.className = 'partners-location';
    p.textContent = title;
    body.append(p);
  }
  if (email) {
    const a = document.createElement('a');
    a.className = 'partners-email';
    a.href = `mailto:${email}`;
    a.textContent = email;
    body.append(a);
  }

  item.append(photo, body);
  return item;
}

// 'error' does not bubble, so capture it to swap a broken photo for initials.
function attachImageFallback(list) {
  list.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const wrap = img.closest('.partners-photo');
    if (!wrap) return;
    const seed = (img.getAttribute('alt') || '').replace(/^Photo of /, '');
    img.remove();
    const fallback = document.createElement('span');
    fallback.className = 'partners-photo-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = initials(seed);
    wrap.append(fallback);
  }, true);
}

export default function decorate(block) {
  const rows = [...block.children];
  const list = document.createElement('ul');
  list.className = 'partners-list';
  rows.forEach((row) => list.append(buildCard(row)));
  attachImageFallback(list);
  block.textContent = '';
  block.append(list);
}
