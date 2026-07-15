import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const rows = [...block.children];
  const [quoteRow, photoRow, , authorRow, roleRow] = rows;

  block.textContent = '';

  const figure = document.createElement('figure');
  figure.className = 'testimonial-figure';

  if (quoteRow && quoteRow.textContent.trim()) {
    const quote = document.createElement('blockquote');
    quote.className = 'testimonial-quote';
    while (quoteRow.firstElementChild) quote.append(quoteRow.firstElementChild);
    figure.append(quote);
  }

  const caption = document.createElement('figcaption');
  caption.className = 'testimonial-author';

  const img = photoRow?.querySelector('img');
  if (img) {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '120' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    const photo = document.createElement('div');
    photo.className = 'testimonial-photo';
    photo.append(optimizedPic);
    caption.append(photo);
  }

  const meta = document.createElement('div');
  meta.className = 'testimonial-meta';
  const authorName = authorRow?.textContent.trim();
  const roleName = roleRow?.textContent.trim();
  if (authorName) {
    const name = document.createElement('span');
    name.className = 'testimonial-name';
    name.textContent = authorName;
    meta.append(name);
  }
  if (roleName) {
    const role = document.createElement('span');
    role.className = 'testimonial-role';
    role.textContent = roleName;
    meta.append(role);
  }
  if (meta.children.length) caption.append(meta);
  if (caption.children.length) figure.append(caption);

  block.append(figure);
}
