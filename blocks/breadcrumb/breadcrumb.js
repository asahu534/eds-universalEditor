export default function decorate(block) {
  console.log('Breadcrumb block loaded');

  block.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>Breadcrumb</li>
      </ol>
    </nav>
  `;
}
