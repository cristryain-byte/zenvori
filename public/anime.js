const API_URL = 'https://graphql.anilist.co';
const container = document.getElementById('anime-detail');

const params = new URLSearchParams(window.location.search);
const animeId = Number(params.get('id'));

const detailQuery = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        english
        romaji
        native
      }
      coverImage {
        large
        extraLarge
      }
      bannerImage
      description(asHtml: false)
      averageScore
      episodes
      duration
      seasonYear
      format
      status
      genres
      siteUrl
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
`;

function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function safeImageURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function cleanDescription(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, '')
    .replace(/<\/?em>/gi, '')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?strong>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function stat(value, label) {
  return `
    <div class="detail-stat">
      <strong>${safeText(value)}</strong>
      <span>${safeText(label)}</span>
    </div>
  `;
}

function renderDetail(anime) {
  const title = anime.title.english || anime.title.romaji || 'Anime details';
  const poster = safeImageURL(
    anime.coverImage.extraLarge || anime.coverImage.large || ''
  );
  const banner = safeImageURL(anime.bannerImage || '');
  const description = cleanDescription(anime.description || '');
  const score = anime.averageScore
    ? `${(anime.averageScore / 10).toFixed(1)}/10`
    : 'N/A';
  const episodes = anime.episodes ?? 'N/A';
  const year = anime.seasonYear || 'N/A';
  const format = anime.format || 'Anime';
  const studio = anime.studios.nodes.map(item => item.name).join(', ');

  document.title = `${title} — Zenvori`;

  container.innerHTML = `
    <section class="detail-hero">
      ${banner ? `
        <img class="detail-backdrop"
          src="${safeText(banner)}" alt="" aria-hidden="true">
      ` : ''}
      <div class="detail-overlay"></div>

      <div class="detail-hero-content">
        <img class="detail-poster"
          src="${safeText(poster)}"
          alt="Poster for ${safeText(title)}">

        <div class="detail-copy">
          <span class="eyebrow">EXPLORE THIS WORLD</span>
          <h1>${safeText(title)}</h1>
          <div class="detail-native-title">
            ${safeText(anime.title.native || anime.title.romaji || '')}
          </div>

          <div class="detail-stats">
            ${stat(score, 'Rating')}
            ${stat(episodes, 'Episodes')}
            ${stat(year, 'Year')}
            ${stat(format, 'Format')}
          </div>

          ${studio ? `
            <p class="detail-native-title">
              Studio: ${safeText(studio)}
            </p>
          ` : ''}

          <div class="detail-tags">
            ${(anime.genres || []).map(genre =>
              `<span class="detail-tag">${safeText(genre)}</span>`
            ).join('')}
          </div>
        </div>

        <div class="detail-description">
          <h2>About this anime</h2>
          <p>${safeText(description || 'No synopsis is available for this title yet.')}</p>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <span class="eyebrow">YOUR NEXT ADVENTURE</span>
      <h2>Where to watch</h2>
      <p>
        Streaming availability depends on your country and may change.
        Check the official listing for information about this anime.
      </p>
      <a class="viewing-link"
        href="${safeText(anime.siteUrl)}"
        target="_blank" rel="noopener noreferrer">
        View official listing <span>↗</span>
      </a>
      <p>
        This listing is provided by AniList. It is not a guarantee that
        a streaming service is available in your region.
      </p>
    </section>
  `;
}

async function loadDetail() {
  if (!Number.isSafeInteger(animeId) || animeId <= 0) {
    container.innerHTML = `
      <section class="detail-error">
        <h1>Which anime?</h1>
        <p>Open an anime from the Zenvori homepage to see its details.</p>
        <a class="primary-btn" href="/">Back to discovery ↗</a>
      </section>
    `;
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: detailQuery,
        variables: { id: animeId }
      })
    });

    if (!response.ok) {
      throw new Error(`Catalog response: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors?.length || !result.data?.Media) {
      throw new Error('Anime details were unavailable.');
    }

    renderDetail(result.data.Media);
  } catch (error) {
    console.error('Zenvori detail error:', error.message);
    container.innerHTML = `
      <section class="detail-error">
        <h1>Couldn't load this anime</h1>
        <p>Check your internet connection and try again.</p>
        <a class="primary-btn" href="/">Back to discovery ↗</a>
      </section>
    `;
  }
}

loadDetail();
