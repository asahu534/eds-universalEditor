/**
 * Decorates the How It Works block.
 * Transforms authored rows into step cards.
 */

export default function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row) => {
    const cols = [...row.children];

    if (cols.length < 4) {
      return;
    }

    row.classList.add('how-it-works-step');

    cols[0].classList.add('step-number');
    cols[1].classList.add('step-icon');
    cols[2].classList.add('step-title');
    cols[3].classList.add('step-description');
  });
}