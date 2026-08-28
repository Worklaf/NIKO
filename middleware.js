// ==================== CONFIG ====================
export const config = {
  matcher: ['/', '/track.html', '/NIKO.html'],
};

const FIREBASE_PROJECT_ID = 'niko-music-1d585';
const FIREBASE_API_KEY = 'AIzaSyBzCiSmy714eAS_sDQffBHHhN3HkPniIKk';

const TRACK_FALLBACK_COVER =
  'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/default-cover.png';

const HOME_OG_COVER =
  'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/niko-og-cover.png';

// Боты + Messenger-группы (обычный UA)
const BOT_OR_MESSENGER = /facebookexternalhit|Facebot|WhatsApp|TelegramBot|Slackbot|Discordbot|LinkedInBot|Pinterest|SkypeUriPreview|vkShare|Applebot|Messenger/i;


// ==================== SAFE URL ====================
function safeUrl(u) {
  if (!u) return u;
  try {
    return new URL(u).href;
  } catch {
    return u;
  }
}


// ==================== MAIN MIDDLEWARE ====================
export default async function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const pathname = url.pathname;

  const isBot = BOT_OR_MESSENGER.test(ua);

  // ==================== ROOT "/" ====================
  if (pathname === '/') {
    if (isBot) {
      return new Response(renderHomeHtml(url), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    // Люди → отдаём реальный сайт без redirect
    return fetch(new URL('/NIKO.html', url));
  }

  // ==================== TRACK PAGE ====================
  if (pathname.includes('track.html')) {
    const trackId = url.searchParams.get('id');

    if (!trackId) {
      return new Response(renderTrackFallback(url), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    if (!isBot) {
      return fetch(url); // обычный сайт
    }

    // Бот → OG‑HTML
    return await renderTrackFromFirebase(trackId, url);
  }

  // ==================== NIKO.html ====================
  if (pathname.includes('NIKO.html')) {
    const trackId = url.searchParams.get('track');

    if (!trackId) {
      if (isBot) {
        return new Response(renderHomeHtml(url), {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
      return fetch(url);
    }

    if (!isBot) {
      return fetch(url);
    }

    return await renderTrackFromFirebase(trackId, url);
  }

  return fetch(url);
}


// ==================== HOME OG PAGE ====================
function renderHomeHtml(url) {
  const title = 'N1K∅ — Music Tracks';
  const description = 'Discover amazing music. Listen, share and enjoy your favorite tracks on N1K∅.';
  const image = HOME_OG_COVER;

  return `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>

<meta property="og:type" content="website">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="N1K∅ Music logo">
<meta property="og:url" content="${url.origin}/">

<meta property="fb:app_id" content="854560431074113">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>

<body>
<h1>N1K∅ Music</h1>
<p>Discover amazing music</p>
</body>
</html>`;
}


// ==================== TRACK OG PAGE ====================
async function renderTrackFromFirebase(trackId, url) {
  const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracks/${trackId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(fsUrl);

  if (!res.ok) {
    return new Response(renderTrackFallback(url), {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  const doc = await res.json();
  const f = doc.fields || {};

  const title = (f.artist?.stringValue || '') + ' — ' + (f.title?.stringValue || '');
  const description = f.lyrics?.stringValue
    ? f.lyrics.stringValue.substring(0, 200).replace(/\n/g, ' ') + '...'
    : 'Listen on N1K∅ Music';

  const image = safeUrl(f.cover?.stringValue || TRACK_FALLBACK_COVER);
  const audio = safeUrl(f.audio?.stringValue || '');

  const pageUrl = `${url.origin}/track.html?id=${trackId}`;

  return new Response(renderTrackHtml(title, description, image, audio, pageUrl), {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}


// ==================== TRACK OG HTML ====================
function renderTrackHtml(title, description, image, audio, pageUrl) {
  return `
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>${title}</title>

<meta property="og:type" content="music.song">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${pageUrl}">

${audio ? `
<meta property="og:audio" content="${audio}">
<meta property="og:audio:type" content="audio/mpeg">
` : ''}

<meta property="fb:app_id" content="854560431074113">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>

<body></body>
</html>`;
}


// ==================== FALLBACK ====================
function renderTrackFallback(url) {
  return renderTrackHtml(
    'N1K∅ Music',
    'Discover amazing music',
    TRACK_FALLBACK_COVER,
    '',
    url.href
  );
}
