export default function decorate(block) {
  [...block.children].forEach((ele) => {
    ele.classList.add('accordion-content');
    const title = ele.children[0];
    title.classList.add('accordion-title');
    const plusIcon = document.createElement('img');
    plusIcon.src = '../../icons/plus.svg';
    plusIcon.classList.add('accordion-icon');
    title.appendChild(plusIcon);
    const content = ele.children[1];
    content.classList.add('accordion-body');
    content.style.display = 'none';
  });

  const titles = block.querySelectorAll('.accordion-title');
  titles.forEach((title) => {
    title.addEventListener('click', () => {
      const content = title.nextElementSibling;
      const isOpen = content.style.display === 'block';
      content.style.display = isOpen ? 'none' : 'block';
      const icon = title.querySelector('.accordion-icon');
      icon.src = isOpen ? '../../icons/plus.svg' : '../../icons/minus.svg';
    });
  });
}
