export default function decorate(block) {
  const rows = [...block.children];
  const [eyebrowRow, textRow, linkRow, linkTextRow] = rows;

  block.textContent = '';

  const content = document.createElement('div');
  content.className = 'cta-content';

  const eyebrowText = eyebrowRow?.textContent.trim();
  if (eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'cta-eyebrow';
    eyebrow.textContent = eyebrowText;
    content.append(eyebrow);
  }

  if (textRow && textRow.textContent.trim()) {
    const body = document.createElement('div');
    body.className = 'cta-body';
    while (textRow.firstElementChild) body.append(textRow.firstElementChild);
    content.append(body);
  }

  const linkAnchor = linkRow?.querySelector('a');
  const buttonLabel = linkTextRow?.textContent.trim();
  if (linkAnchor) {
    const actions = document.createElement('p');
    actions.className = 'cta-actions button-wrapper';
    linkAnchor.classList.add('button', 'primary');
    if (buttonLabel) linkAnchor.textContent = buttonLabel;
    actions.append(linkAnchor);
    content.append(actions);
  }

  block.append(content);
}
