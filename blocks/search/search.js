export default function decorate(block) {
  const placeholder = block.textContent.trim() || 'Search Here...';

  block.innerHTML = `
    <div class="nav-search-wrapper">
      <input
        type="search"
        class="search-input"
        placeholder="${placeholder}"
      />
      <button class="search-btn" aria-label="Search">
        <img src="/icons/search.svg" alt="Search" width="20" height="20">
      </button>
    </div>
  `;

  const navSearchInput = block.querySelector('.nav-search-wrapper .search-input');
  const navSearchButton = block.querySelector('.nav-search-wrapper .search-btn');

  function submitSearch() {
    const navSearchQuery = navSearchInput.value.trim();

    navSearchInput.classList.remove('error');

    // Empty search
    if (!navSearchQuery) {
      navSearchInput.classList.add('error');
      navSearchInput.focus();
      return;
    }

    // Redirect
    window.location.href = `/search.html?q=${encodeURIComponent(navSearchQuery)}`;
  }

  // Search icon click
  navSearchButton.addEventListener('click', submitSearch);

  // Enter key
  navSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  });

  // Remove red border while typing
  navSearchInput.addEventListener('input', () => {
    navSearchInput.classList.remove('error');
  });
}
