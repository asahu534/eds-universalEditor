export default function decorate(block) {
  const items = [...block.children];

  if (!items.length) return;

  const tabList = document.createElement('div');
  tabList.className = 'tabs-list';

  const panels = document.createElement('div');
  panels.className = 'tabs-panels';

  items.forEach((item, index) => {
    const [title, content] = item.children;

    const button = document.createElement('button');
    button.className = 'tabs-button';
    button.textContent = title.textContent;

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.append(...content.childNodes);

    if (index === 0) {
      button.classList.add('active');
      panel.classList.add('active');
    }

    button.addEventListener('click', () => {
      tabList
        .querySelectorAll('.tabs-button')
        .forEach((btn) => btn.classList.remove('active'));

      panels
        .querySelectorAll('.tabs-panel')
        .forEach((tabPanel) => tabPanel.classList.remove('active'));

      button.classList.add('active');
      panel.classList.add('active');
    });

    tabList.append(button);
    panels.append(panel);
  });

  block.replaceChildren(tabList, panels);
}