// middleware.js — с поддержкой OG для главной страницы
export const config = {
  matcher: ['/', '/track.html', '/NIKO.html'],
};

const FIREBASE_PROJECT_ID = 'niko-music-1d585';
const FIREBASE_API_KEY = 'AIzaSyBzCiSmy714eAS_sDQffBHHhN3HkPniIKk';
const DEFAULT_COVER = 'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/niko-og-cover.png';

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|Applebot/i;

export default async function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const pathname = url.pathname;

  console.log('[MIDDLEWARE] Request:', pathname, 'UA:', ua.substring(0, 50));

  // === 1. Корень сайта "/" — редирект для людей, OG для ботов ===
  if (pathname === '/') {
    if (BOT_UA.test(ua)) {
      return new Response(renderHomeHtml(url), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    // Обычных юзеров редиректим на NIKO.html
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

  // Не боты — пропускаем, Vercel отдаст обычный HTML/JS
  if (!BOT_UA.test(ua)) {
    return;
  }

  // === 3. Бот на NIKO.html без трека = главная страница ===
  if (!trackId && pathname.includes('NIKO.html')) {
    return new Response(renderHomeHtml(url), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // === 4. Бот без ID на track.html — fallback ===
  if (!trackId) {
    return new Response(fallbackHtml(url, pageType), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // === 5. Бот с ID трека — тащим данные из Firebase ===
  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracks/${trackId}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(fsUrl);

    if (!res.ok) {
      return new Response(fallbackHtml(url, pageType), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    const doc = await res.json();
    const f = doc.fields || {};

    const title = f.title?.stringValue || '';
    const artist = f.artist?.stringValue || '';
    const cover = f.cover?.stringValue || DEFAULT_COVER;
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

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    console.error('[MIDDLEWARE] Error:', e);
    return new Response(fallbackHtml(url, pageType), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}

// ==================== OG для ГЛАВНОЙ страницы ====================
function renderHomeHtml(url) {
  const title = 'N1K∅ — Music Tracks';
  const description = 'Discover amazing music. Listen, share and enjoy your favorite tracks on N1K∅.';
  const image = DEFAULT_COVER; // ← сюда можно подставить прямую ссылку на логотип, если он отличается от обложки
  const pageUrl = `${url.origin}/`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@niko_music">
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

// ==================== OG для ТРЕКА ====================
function renderTrackHtml({ title, description, image, audio, pageUrl, redirectUrl }) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${esc(title)} | N1K∅ Music</title>
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(pageUrl)}">
${audio ? `<meta property="og:audio" content="${esc(audio)}">
<meta property="og:audio:type" content="audio/mpeg">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@niko_music">
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

  // Если это NIKO.html без трека — показываем OG главной
  if (pageType === 'home' && !trackId) {
    return renderHomeHtml(url);
  }

  return renderTrackHtml({
    title: 'N1K∅ Music',
    description: 'Discover amazing music',
    image: DEFAULT_COVER,
    audio: '',
    pageUrl: url.href,
    redirectUrl,
  });
}
