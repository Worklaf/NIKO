// middleware.js — Vercel Edge Middleware
// Отдаёт ботам (Facebook/Telegram/WhatsApp/Twitter) статичный HTML
// с правильными OG-тегами под конкретный трек.
// Обычным пользователям пропускает track.html как есть.

export const config = {
  matcher: ['/track.html', '/NIKO.html'],
};

const FIREBASE_PROJECT_ID = 'niko-music-1d585';
const FIREBASE_API_KEY = 'AIzaSyBzCiSmy714eAS_sDQffBHHhN3HkPniIKk';
const DEFAULT_COVER = 'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/default-cover.png';

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|Applebot/i;

export default async function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const pathname = url.pathname;
  
  console.log('[MIDDLEWARE] Request:', pathname, 'UA:', ua.substring(0, 50));
  
  // Определяем ID трека в зависимости от страницы
  let trackId = null;
  if (pathname.includes('track.html')) {
    trackId = url.searchParams.get('id');
  } else if (pathname.includes('NIKO.html')) {
    trackId = url.searchParams.get('track');
  }
  
  console.log('[MIDDLEWARE] Track ID:', trackId, 'Is bot:', BOT_UA.test(ua));

  // Пропускаем обычных пользователей и запросы без ID — как есть
if (!BOT_UA.test(ua) || !trackId) {

  // Если это NIKO.html — всё равно отдаём OG-теги
  if (pathname.includes('NIKO.html') && trackId) {
    const html = renderHtml({
      title: 'N1K∅ Music',
      description: 'Listen on N1K∅ Music',
      image: DEFAULT_COVER,
      audio: '',
      pageUrl: url.href,
    });

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return;
}


  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracks/${trackId}?key=${FIREBASE_API_KEY}`;
    console.log('[MIDDLEWARE] Fetching Firebase:', fsUrl);
    const res = await fetch(fsUrl);
    console.log('[MIDDLEWARE] Firebase response:', res.status);

    if (!res.ok) {
      console.log('[MIDDLEWARE] Firebase failed, using fallback');
      return new Response(fallbackHtml(url), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    const doc = await res.json();
    const f = doc.fields || {};
    
    console.log('[MIDDLEWARE] Track data:', {
      title: f.title?.stringValue,
      artist: f.artist?.stringValue,
      cover: f.cover?.stringValue?.substring(0, 50)
    });

    const title = f.title?.stringValue || '';
    const artist = f.artist?.stringValue || '';
    const cover = f.cover?.stringValue || DEFAULT_COVER;
    const audio = f.audio?.stringValue || '';
    const lyrics = f.lyrics?.stringValue || '';

    const fullTitle = artist ? `${artist} — ${title}` : title;
    const description = lyrics
      ? lyrics.substring(0, 200).replace(/\n/g, ' ') + '...'
      : 'Listen on N1K∅ Music';

    const html = renderHtml({
      title: fullTitle || 'N1K∅ Music',
      description,
      image: cover,
      audio,
      pageUrl: url.href,
    });

    console.log('[MIDDLEWARE] Returning HTML with OG tags');
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    return new Response(fallbackHtml(url), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml({ title, description, image, audio, pageUrl }) {
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
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}">
</head>
<body>
<script>location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;
}

function fallbackHtml(url) {
  return renderHtml({
    title: 'N1K∅ Music',
    description: 'Discover amazing music',
    image: DEFAULT_COVER,
    audio: '',
    pageUrl: url.href,
  });
}
