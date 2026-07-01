export default function decorate(block) {
  const rows = [...block.children];
  const picture = block.querySelector('picture');
  const heading = block.querySelector('h1, h2, h3');
  const link = block.querySelector('a[href]');

  // auto-blocked hero: a single cell already holds the picture + heading
  if (rows.length <= 1) {
    if (picture) {
      const wrapper = picture.closest('div');
      if (wrapper) wrapper.className = 'hero-bg';
    }
    return;
  }

  // classify each authored row by its content
  let eyebrowRow;
  let buttonLabel;
  rows.forEach((row) => {
    const hasPicture = row.querySelector('picture');
    const hasHeading = row.querySelector('h1, h2, h3, h4');
    const hasLink = row.querySelector('a[href]');
    const text = row.textContent.trim();
    if (hasPicture || hasHeading || hasLink) return;
    if (!text) return;
    // a plain-text row: first one is the eyebrow, a later duplicate is the button label
    if (!eyebrowRow) eyebrowRow = text;
    else buttonLabel = text;
  });

  block.textContent = '';

  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.append(picture);
    block.append(bg);
  }

  const content = document.createElement('div');
  content.className = 'hero-content';

  if (eyebrowRow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = eyebrowRow;
    content.append(eyebrow);
  }

  if (heading) {
    content.append(heading);
    // keep any sibling paragraphs that followed the heading in the same cell
    let next = heading.nextElementSibling;
    while (next) {
      const following = next.nextElementSibling;
      if (next.tagName === 'P' && !next.querySelector('a')) content.append(next);
      next = following;
    }
  }

  if (link) {
    if (buttonLabel) link.textContent = buttonLabel;
    link.classList.add('button', 'primary');
    const p = document.createElement('p');
    p.className = 'button-wrapper';
    p.append(link);
    content.append(p);
  }

  block.append(content);
}
