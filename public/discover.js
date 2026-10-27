const API_URL = 'https://graphql.anilist.co';

const grid = document.getElementById('discover-grid');
const searchInput = document.getElementById('discover-search');
const sortSelect = document.getElementById('sort-select');
const genreContainer = document.getElementById('discover-genres');
const statusText = document.getElementById('discover-status');
const resultsTitle = document.getElementById('results-title');
const resultsCount = document.getElementById('results-count');
const loadMoreButton = document.getElementById('load-more');

let selectedGenre = '';
let currentPage = 1;
let totalPages = 1;
let requestNumber = 0;
let debounceTimer;

const escapeHTML = (value = '') =>
  String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

function getTitle(anime) {
  return anime.title.english || anime.title.romaji || 'Untitled anime';
}

function animeCard(anime) {
  const title = getTitle(anime);
  const image = anime.coverImage?.large || '';
  const safeImage = /^https:\/\/s[0-9]\.anilist\.co\//i.test(image)
    ? image
    : '';

  return `
    <article class="discover-card">
      <a class="discover-poster-link"
         href="/anime.html?id=${anime.id}"
         aria-label="View ${escapeHTML(title)} details">
        <img class="discover-poster"
             src="${escapeHTML(safeImage)}"
             alt="${escapeHTML(title)} poster"
             loading="lazy">
        <span class="discover-score">
          ${anime.averageScore ? `★ ${anime.averageScore}%` : 'Unrated'}
        </span>
      </a>
      <div class="discover-card-info">
        <a class="discover-card-title"
           href="/anime.html?id=${anime.id}">
          ${escapeHTML(title)}
        </a>
        <div class="discover-card-meta">
          <span>${anime.seasonYear || 'Year unknown'}</span>
          <span>${anime.episodes || '?'} eps</span>
        </div>
        <div class="discover-card-genres">
          ${(anime.genres || []).slice(0, 3).map(escapeHTML).join(' · ')}
        </div>
      </div>
    </article>
  `;
}

const query = `
  query (
    $page: Int,
    $search: String,
    $genre: String,
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: 20) {
      pageInfo {
        currentPage
        lastPage
        hasNextPage
      }
      media(
        type: ANIME,
        isAdult: false,
        search: $search,
        genre: $genre,
        sort: $sort
      ) {
        id
        title {
          english
          romaji
        }
        coverImage {
          large
        }
        averageScore
        episodes
        seasonYear
        genres
      }
    }
  }
`;

async function loadAnime({ append = false } = {}) {
  const thisRequest = ++requestNumber;

  if (!append) {
    currentPage = 1;
    grid.innerHTML = '';
    resultsCount.textContent = '';
  }

  statusText.textContent = append
    ? 'Loading more anime...'
    : 'Discovering anime worlds...';

  loadMoreButton.disabled = true;
  loadMoreButton.hidden = true;

  const variables = {
    page: currentPage,
    search: searchInput.value.trim() || null,
    genre: selectedGenre || null,
    sort: [sortSelect.value]
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`AniList returned status ${response.status}`);
    }

    const result = await response.json();

    if (thisRequest !== requestNumber) return;

    if (result.errors?.length) {
      throw new Error(result.errors[0].message || 'AniList query failed');
    }

    const page = result.data.Page;
    const animeList = page.media;

    totalPages = page.pageInfo.lastPage;

    if (!animeList.length && !append) {
      statusText.textContent = 'No anime found. Try another title or genre.';
      resultsTitle.textContent = 'No results';
      return;
    }

    if (animeList.length) {
      const cards = animeList.map(animeCard).join('');

      if (append) {
        grid.insertAdjacentHTML('beforeend', cards);
      } else {
        grid.innerHTML = cards;
      }
    }

    const totalShown = grid.children.length;
    statusText.textContent = '';
    resultsTitle.textContent = variables.search
      ? `Results for "${variables.search}"`
      : selectedGenre
        ? `${selectedGenre} anime`
        : sortSelect.value === 'TRENDING_DESC'
          ? 'Trending anime'
          : sortSelect.value === 'SCORE_DESC'
            ? 'Highest rated anime'
            : sortSelect.value === 'START_DATE_DESC'
              ? 'Newest anime'
              : 'Popular anime';

    resultsCount.textContent = `${totalShown} shown`;
    loadMoreButton.hidden = !page.pageInfo.hasNextPage;
  } catch (error) {
    if (thisRequest !== requestNumber) return;

    statusText.textContent =
      'Could not load anime. Check your internet connection and try again.';
    console.error('Zenvori Discover error:', error);
  } finally {
    if (thisRequest === requestNumber) {
      loadMoreButton.disabled = false;
    }
  }
}

genreContainer.addEventListener('click', event => {
  const button = event.target.closest('[data-genre]');
  if (!button) return;

  selectedGenre = button.dataset.genre || '';

  genreContainer.querySelectorAll('[data-genre]').forEach(chip => {
    const active = chip === button;
    chip.classList.toggle('selected', active);
    chip.setAttribute('aria-pressed', String(active));
  });

  loadAnime();
});

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadAnime(), 350);
});

sortSelect.addEventListener('change', () => loadAnime());

loadMoreButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadAnime({ append: true });
  }
});

loadAnime();
