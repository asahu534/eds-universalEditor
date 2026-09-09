export default function decorate(block) {
  console.log('Breadcrumbs block loaded');

  block.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>Breadcrumbs</li>
      </ol>
    </nav>
  `;
}
