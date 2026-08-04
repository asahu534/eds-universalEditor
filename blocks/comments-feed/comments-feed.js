const DEFAULT_ENDPOINT = 'https://jsonplaceholder.typicode.com/comments';
const DEFAULT_LIMIT = 6;

function readConfig(block) {
  const rows = [...block.children];
  const endpoint = rows[0]?.textContent.trim() || DEFAULT_ENDPOINT;
  const limitRaw = parseInt(rows[1]?.textContent.trim(), 10);
  const limit = Number.isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw;
  return { endpoint, limit };
}

function renderSkeleton(list, count) {
  for (let i = 0; i < count; i += 1) {
    const li = document.createElement('li');
    li.className = 'comments-item comments-skeleton';
    li.innerHTML = '<span class="comments-line"></span><span class="comments-line short"></span><span class="comments-line"></span>';
    list.append(li);
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function renderItems(list, items) {
  list.textContent = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'comments-item';

    const name = document.createElement('h3');
    name.className = 'comments-name';
    name.textContent = item.name || '';
    li.append(name);

    if (isValidEmail(item.email)) {
      const email = document.createElement('a');
      email.className = 'comments-email';
      email.href = `mailto:${item.email}`;
      email.textContent = item.email;
      li.append(email);
    }

    const body = document.createElement('p');
    body.className = 'comments-body';
    body.textContent = item.body || '';
    li.append(body);

    list.append(li);
  });
}

function renderMessage(block, message) {
  block.textContent = '';
  const p = document.createElement('p');
  p.className = 'comments-message';
  p.textContent = message;
  block.append(p);
}

export default async function decorate(block) {
  const { endpoint, limit } = readConfig(block);

  block.textContent = '';
  const list = document.createElement('ul');
  list.className = 'comments-list';
  block.append(list);
  renderSkeleton(list, limit);

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data) ? data.slice(0, limit) : [];
    if (!items.length) {
      renderMessage(block, 'No comments to display.');
      return;
    }
    renderItems(list, items);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Comments block failed to load data', error);
    renderMessage(block, 'Unable to load comments right now.');
  }
}
