export default function decorate(block) {
  block.innerHTML = `
    <div class="search-wrapper">
      <input
        type="search"
        class="search-input"
        placeholder="Search..."
      />
      <button class="search-btn">
        🔍
      </button>
    </div>
  `;
}