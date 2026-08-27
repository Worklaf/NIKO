// middleware.js — Vercel Edge Middleware
export const config = {
  matcher: ['/', '/track.html', '/NIKO.html'],
};

const FIREBASE_PROJECT_ID = 'niko-music-1d585';
const FIREBASE_API_KEY = 'AIzaSyBzCiSmy714eAS_sDQffBHHhN3HkPniIKk';

// Старый дефолт — для треков без обложки
const TRACK_FALLBACK_COVER = 'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/default-cover.png';
// Новый логотип — ТОЛЬКО для главной страницы
const HOME_OG_COVER = 'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/niko-og-cover.png';

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|Applebot/i;

export default async function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const pathname = url.pathname;

  // === 1. Корень "/" → редирект для людей, OG для ботов ===
  if (pathname === '/') {
    if (BOT_UA.test(ua)) {
      const cacheKey = 'home:root';
      const cache = caches.default;
      const cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        console.log('[MIDDLEWARE] Cache hit for home root');
        return cachedResponse;
      }

      const html = renderHomeHtml(url);
      const response = new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }
    url.pathname = '/NIKO.html';
    return Response.redirect(url, 302);
  }

  // === 2. Определяем страницу и ID трека ===
  let trackId = null;
  let pageType = null;

  if (pathname.includes('track.html')) {
    trackId = url.searchParams.get('id');
    pageType = 'track';
  } else if (pathname.includes('NIKO.html')) {
    trackId = url.searchParams.get('track');
    pageType = 'home';
  }

  // Не боты — пропускаем, Vercel отдаёт обычный HTML
  if (!BOT_UA.test(ua)) {
    return;
  }

  // === 3. Бот на NIKO.html без трека = главная ===
  if (!trackId && pathname.includes('NIKO.html')) {
    const cacheKey = 'home:niko';
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      console.log('[MIDDLEWARE] Cache hit for home niko');
      return cachedResponse;
    }

    const html = renderHomeHtml(url);
    const response = new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  }

  // === 4. Бот без ID на track.html — fallback ===
  if (!trackId) {
    const cacheKey = 'fallback:track';
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      console.log('[MIDDLEWARE] Cache hit for fallback');
      return cachedResponse;
    }

    const fallback = fallbackHtml(url, pageType);
    const response = new Response(fallback, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Кешируем на 1 час чтобы избежать лимитов Firebase
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  }

  // === 5. Бот с ID трека — тащим из Firebase ===
  try {
    const cacheKey = `track:${trackId}`;
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      console.log('[MIDDLEWARE] Cache hit for track', trackId);
      return cachedResponse;
    }

    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracks/${trackId}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(fsUrl);

    if (!res.ok) {
      console.log('[MIDDLEWARE] Firebase 404 for track:', trackId);
      const fallback = fallbackHtml(url, pageType);
      const response = new Response(fallback, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // Кешируем на 1 час чтобы избежать лимитов Firebase
        },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    const doc = await res.json();
    const f = doc.fields || {};

    const title = f.title?.stringValue || '';
    const artist = f.artist?.stringValue || '';
    // ВАЖНО: если у трека нет cover → используем СТАРЫЙ дефолт, не логотип
    const cover = f.cover?.stringValue || TRACK_FALLBACK_COVER;
    const audio = f.audio?.stringValue || '';
    const lyrics = f.lyrics?.stringValue || '';

    const fullTitle = artist ? `${artist} — ${title}` : title;
    const description = lyrics
      ? lyrics.substring(0, 200).replace(/\n/g, ' ') + '...'
      : 'Listen on N1K∅ Music';

    const canonicalUrl = pageType === 'track'
      ? `${url.origin}/track.html?id=${trackId}`
      : `${url.origin}/NIKO.html?track=${trackId}`;

    const html = renderTrackHtml({
      title: fullTitle || 'N1K∅ Music',
      description,
      image: cover,
      audio,
      pageUrl: canonicalUrl,
      redirectUrl: pageType === 'home'
        ? `${url.origin}/NIKO.html?track=${trackId}`
        : `${url.origin}/track.html?id=${trackId}`,
    });

    const response = new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    console.error('[MIDDLEWARE] Error:', e);
    const fallback = fallbackHtml(url, pageType);
    const response = new Response(fallback, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Кешируем на 1 час чтобы избежать лимитов Firebase
      },
    });
    const cacheKey = `track:${trackId}`;
    const cache = caches.default;
    await cache.put(cacheKey, response.clone());
    return response;
  }
}

// ==================== ГЛАВНАЯ СТРАНИЦА ====================
function renderHomeHtml(url) {
  const title = 'N1K∅ — Music Tracks';
  const description = 'Discover amazing music. Listen, share and enjoy your favorite tracks on N1K∅.';
  const image = HOME_OG_COVER;
  const pageUrl = `${url.origin}/`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}NIKO.html">
</head>
<body>
<script>location.replace(${JSON.stringify(pageUrl + 'NIKO.html')});</script>
</body>
</html>`;
}

// ==================== СТРАНИЦА ТРЕКА ====================
function renderTrackHtml({ title, description, image, audio, pageUrl, redirectUrl }) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>${esc(title)} | N1K∅ Music</title>
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(pageUrl)}">
${audio ? `<meta property="og:audio" content="${esc(audio)}">
<meta property="og:audio:type" content="audio/mpeg">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(redirectUrl)}">
</head>
<body>
<script>location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fallbackHtml(url, pageType) {
  const trackId = url.searchParams.get('id') || url.searchParams.get('track');
  const redirectUrl = pageType === 'home' && trackId
    ? `${url.origin}/NIKO.html?track=${trackId}`
    : `${url.origin}/NIKO.html`;

  if (pageType === 'home' && !trackId) {
    return renderHomeHtml(url);
  }

  return renderTrackHtml({
    title: 'N1K∅ Music',
    description: 'Discover amazing music',
    image: TRACK_FALLBACK_COVER,
    audio: '',
    pageUrl: url.href,
    redirectUrl,
  });
}
