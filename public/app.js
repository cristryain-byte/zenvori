const API_URL = 'https://graphql.anilist.co';

const grid = document.getElementById('anime-grid');
const searchInput = document.getElementById('anime-search');
const searchButton = document.getElementById('search-button');
const searchStatus = document.getElementById('search-status');
const searchToggle = document.getElementById('search-toggle');

let currentGenre = '';
let requestNumber = 0;

const query = `
  query ($search: String, $genre: String, $page: Int) {
    Page(page: $page, perPage: 12) {
      media(
        search: $search,
        genre: $genre,
        type: ANIME,
        sort: POPULARITY_DESC,
        isAdult: false
      ) {
        id
        title {
          english
          romaji
        }
        coverImage {
          large
          color
        }
        averageScore
        episodes
        seasonYear
        genres
        siteUrl
      }
    }
  }
`;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function showMessage(message) {
  grid.innerHTML = `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function renderAnime(animeList) {
  if (!animeList.length) {
    showMessage('No anime found. Try another title or genre.');
    return;
  }

  grid.innerHTML = animeList.map(anime => {
    const title = anime.title.english || anime.title.romaji || 'Untitled anime';
    const year = anime.seasonYear || 'Year unknown';
    const episodes = anime.episodes ?? 'Unknown';
    const score = anime.averageScore
      ? `${(anime.averageScore / 10).toFixed(1)} / 10`
      : 'Not rated';
    const genres = (anime.genres || []).slice(0, 2);

    return `
      <article class="anime-card">
        <a href="/anime.html?id=${anime.id}"
           aria-label="View details for ${escapeHTML(title)}">
          <img
            class="anime-poster"
            src="${escapeHTML(anime.coverImage.large)}"
            alt="Poster for ${escapeHTML(title)}"
            loading="lazy"
            referrerpolicy="no-referrer"
          >
        </a>
        <div class="anime-info">
          <div class="anime-title">${escapeHTML(title)}</div>
          <div class="anime-meta">
            <span>${escapeHTML(String(year))}</span>
            <span class="anime-score">★ ${escapeHTML(score)}</span>
          </div>
          <div class="anime-meta">
            <span>${escapeHTML(String(episodes))} episodes</span>
          </div>
          <div class="anime-genres">
            ${genres.map(genre =>
              `<span class="anime-tag">${escapeHTML(genre)}</span>`
            ).join('')}
          </div>
          <a class="anime-tag"
             href="/anime.html?id=${anime.id}"
             style="display:inline-block;margin-top:12px">
            View details ↗
          </a>
        </div>
      </article>
    `;
  }).join('');
}

async function loadAnime() {
  const thisRequest = ++requestNumber;
  const search = searchInput.value.trim();

  grid.innerHTML = `
    <div class="loading-card">
      <span class="loading-orb"></span>
      <p>Exploring anime worlds...</p>
    </div>
  `;
  searchStatus.textContent = 'Connecting to the anime universe...';
  searchButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          search: search || null,
          genre: currentGenre || null,
          page: 1
        }
      })
    });

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? 'Too many requests. Wait a little and try again.'
          : `The catalog returned an error (${response.status}).`
      );
    }

    const result = await response.json();

    if (result.errors?.length) {
      throw new Error('The anime catalog could not complete this request.');
    }

    if (thisRequest !== requestNumber) return;

    const animeList = result.data?.Page?.media || [];
    renderAnime(animeList);

    searchStatus.textContent = search
      ? `Results for "${search}" · ${animeList.length} shown`
      : currentGenre
        ? `Exploring ${currentGenre} anime`
        : 'Popular anime picked for your next adventure.';
  } catch (error) {
    if (thisRequest !== requestNumber) return;

    showMessage(
      'Could not load anime right now. Check your internet connection and try again.'
    );
    searchStatus.textContent = 'The catalog is temporarily unavailable.';
    console.error('Zenvori catalog error:', error.message);
  } finally {
    if (thisRequest === requestNumber) {
      searchButton.disabled = false;
    }
  }
}

searchButton.addEventListener('click', loadAnime);

searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') loadAnime();
});

searchToggle.addEventListener('click', () => {
  searchInput.focus();
  document.getElementById('trending').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
});

document.querySelectorAll('.genre-chip').forEach(button => {
  button.addEventListener('click', () => {
    const selected = button.dataset.genre;
    currentGenre = currentGenre === selected ? '' : selected;

    document.querySelectorAll('.genre-chip').forEach(chip => {
      chip.classList.toggle(
        'selected',
        chip.dataset.genre === currentGenre
      );
      chip.setAttribute(
        'aria-pressed',
        String(chip.dataset.genre === currentGenre)
      );
    });

    loadAnime();
    document.getElementById('trending').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
});

loadAnime();
