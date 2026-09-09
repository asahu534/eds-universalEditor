export default function decorate(block) {
  block.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>Breadcrumb</li>
      </ol>
    </nav>
  `;
}
