import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'stats-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'stats-item';
    moveInstrumentation(row, li);

    const [valueCell, labelCell] = row.children;
    const value = document.createElement('span');
    value.className = 'stats-value';
    value.textContent = valueCell?.textContent.trim() || '';
    li.append(value);

    const labelText = labelCell?.textContent.trim();
    if (labelText) {
      const label = document.createElement('span');
      label.className = 'stats-label';
      label.textContent = labelText;
      li.append(label);
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
}
