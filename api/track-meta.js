// Vercel Edge Function — генерирует HTML с правильными метатегами для Facebook
export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('id');
  
  if (!trackId) {
    return new Response('No track ID', { status: 400 });
  }

  // Firebase REST API — публичный endpoint, не требует авторизации
  const FIREBASE_PROJECT_ID = 'niko-music-1d585';
  
  try {
    const fbUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracks/${trackId}`;
    const fbRes = await fetch(fbUrl);
    
    if (!fbRes.ok) {
      // Трек не найден — редирект на обычную страницу
      const baseUrl = url.origin;
      return Response.redirect(`${baseUrl}/track.html?id=${trackId}`, 302);
    }
    
    const data = await fbRes.json();
    const fields = data.fields || {};
    
    // Извлекаем данные трека
    const track = {
      id: trackId,
      title: fields.title?.stringValue || 'Unknown Track',
      artist: fields.artist?.stringValue || '',
      cover: fields.cover?.stringValue || 'https://pub-6f797b2842b7491297940c7f3f51e92f.r2.dev/NIKO_music/default-cover.png',
      audio: fields.audio?.stringValue || '',
      lyrics: fields.lyrics?.stringValue || '',
      duration: fields.duration?.stringValue || ''
    };
    
    const displayTitle = track.artist ? `${track.artist} — ${track.title}` : track.title;
    const baseUrl = url.origin;
    const shareUrl = `${baseUrl}/track.html?id=${trackId}`;
    const description = track.lyrics 
      ? track.lyrics.substring(0, 200).replace(/"/g, '&quot;') + '...' 
      : 'Listen on N1K∅ Music';
    
    // Генерируем HTML с правильными метатегами
    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${displayTitle} | N1K∅ Music</title>

<!-- Open Graph / Facebook -->
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="N1K∅ Music">
<meta property="og:title" content="${displayTitle.replace(/"/g, '&quot;')}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${track.cover}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${shareUrl}">
<meta property="og:audio" content="${track.audio}">
<meta property="og:audio:type" content="audio/mpeg">
<meta property="music:duration" content="${track.duration}">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${displayTitle.replace(/"/g, '&quot;')}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${track.cover}">

<!-- Редирект на полную страницу для обычных пользователей -->
<meta http-equiv="refresh" content="0;url=${shareUrl}">
<style>
  body { 
    background: #0a0a0f; 
    color: #eaeaf2; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    min-height: 100vh; 
    margin: 0; 
    text-align: center;
  }
  .track-cover { 
    width: 280px; 
    height: 280px; 
    border-radius: 16px; 
    object-fit: cover; 
    box-shadow: 0 20px 60px rgba(0,0,0,0.5); 
    margin-bottom: 24px; 
  }
  .track-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .track-artist { font-size: 16px; color: #bfc3d6; margin-bottom: 24px; }
  .play-btn { 
    background: linear-gradient(90deg, #ff4da6, #ff7a4d); 
    color: white; 
    border: none; 
    padding: 16px 48px; 
    border-radius: 50px; 
    font-size: 16px; 
    font-weight: 700; 
    cursor: pointer; 
    text-decoration: none; 
    display: inline-block; 
  }
</style>
</head>
<body>
  <img class="track-cover" src="${track.cover}" alt="${displayTitle}">
  <div class="track-title">${track.title}</div>
  <div class="track-artist">${track.artist || 'N1K∅ Music'}</div>
  <a class="play-btn" href="${shareUrl}">▶ Play on N1K∅</a>
</body>
</html>`;

    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (e) {
    console.error('Error:', e);
    const baseUrl = url.origin;
    return Response.redirect(`${baseUrl}/track.html?id=${trackId}`, 302);
  }
}
