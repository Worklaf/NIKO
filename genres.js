/* =========================================================================
   genres.js — общий разбор жанров для index.html и track.html
   -------------------------------------------------------------------------
   Подключать ПЕРВЫМ, до остального кода:
       <script src="genres.js"></script>

   Логика мягкая: из промпта берутся только те теги, в которых есть корень
   настоящего жанра, и сохраняется их ПОЛНОЕ название.

     "Dark Melodic Phonk"    -> жанр "Dark Melodic Phonk" (родитель Phonk)
     "Phonk Eastern Fusion"  -> жанр "Phonk Eastern Fusion" (Phonk + World)
     "Cyberpunk Cinematic"   -> жанр "Cyberpunk Cinematic" (родитель Cinematic)
     "115 Bpm" / "Mood: ..." / "Phonk Cowbells" / "Heavy 808 Bass" -> выброшено
   ========================================================================= */

function normalizeGenre(genre) {
  if (!genre) return '';
  return String(genre)
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

/* 1. Явный мусор: темп, размер такта, служебные подписи промпта */
const GENRE_JUNK = [
  /\d+\s*bpm/i,
  /^\d+(\.\d+)?$/,
  /^\d+\s*\/\s*\d+/,
  /\b(bpm|tempo|takt)\b/i,
  /^(mood|energy|atmosphere|vibe|instrumentation|instruments|production|mixing|master|mastering|structure|arrangement|vocal style|vocals|voice|lyrics direction|lyrics|language|theme|themes|key|tonality|style guide|reference|prompt)\s*:/i,
  /^themes?\s+of\b/i,
  /→|->/,
];

/* 2. Слова про звук, инструменты и вокал — это не жанр */
const GENRE_NOISE = /\b(cowbell|cowbells|808s?|bass|basses|sub|kick|snare|hat|hats|drums?|percussion|strings?|guitars?|oud|sitar|piano|keys|pads?|synths?|fx|glitch|riffs?|melody|melodies|hook|hooks|vocal|vocals|voice|voices|phrasing|consonants|adlibs?|ambience|reverb|delay|stereo|mixing|master|mastering|tone|drops?|build[\s-]?up|breakdown|intro|outro|bridge|verse|verses|chorus|lyrics?|attitude|energy|mood|theme|themes|atmosphere|texture|sound|sounds|sfx|width|loudness)\b/i;

/* 3. Исключения: настоящие жанры с «шумными» словами в названии */
const GENRE_STRONG = /\bdrum\s?(and|n|&)\s?bass\b|\bdnb\b|\bbass\s?house\b|\bbassline\b|\bjungle\b|\bvocal\s?trance\b|\bvocal\s?house\b/i;

/* 4. Корни жанров: regex -> родительский жанр. Дописывать можно свободно. */
const GENRE_ROOTS = [
  [/phonk/i,                              'Phonk'],
  [/\bdrill\b/i,                          'Drill'],
  [/\btrap\b/i,                           'Trap'],
  [/\bgrime\b/i,                          'Grime'],
  [/\brap\b|hip[\s-]?hop|boom\s?bap/i,    'Hip-Hop'],
  [/\bhyperpop\b/i,                       'Hyperpop'],
  [/\bk[\s-]?pop\b/i,                     'K-Pop'],
  [/\bpop\b/i,                            'Pop'],
  [/\bmetal\b|metalcore/i,                'Metal'],
  [/\bpunk\b/i,                           'Punk'],
  [/\bgrunge\b/i,                         'Grunge'],
  [/\bemo\b/i,                            'Emo'],
  [/\brock\b|rockabilly/i,                'Rock'],
  [/\bindie\b|\balt\b|alternative/i,      'Alternative'],
  [/\bblues\b/i,                          'Blues'],
  [/\bjazz\b|bebop|\bswing\b/i,           'Jazz'],
  [/\bsoul\b|\br&?n?b\b|motown/i,         'Soul & RnB'],
  [/\bfunk\b/i,                           'Funk'],
  [/\bdisco\b/i,                          'Disco'],
  [/\bgospel\b/i,                         'Gospel'],
  [/\bcountry\b|bluegrass/i,              'Country'],
  [/\bfolk\b/i,                           'Folk'],
  [/\bballad\b/i,                         'Ballad'],
  [/\bacoustic\b|unplugged/i,             'Acoustic'],
  [/\bclassic(al)?\b|orchestral?|symphon/i, 'Classical'],
  [/cinematic|soundtrack|\bscore\b|\bepic\b|trailer/i, 'Cinematic'],
  [/\bhouse\b/i,                          'House'],
  [/\btechno\b/i,                         'Techno'],
  [/\btrance\b/i,                         'Trance'],
  [/dub\s?step/i,                         'Dubstep'],
  [/\bdnb\b|drum\s?(and|n|&)\s?bass|\bjungle\b/i, 'Drum & Bass'],
  [/hardstyle|hardcore|\bgabber\b/i,      'Hard Dance'],
  [/\bedm\b|electro\w*|\bsynth[\s-]?pop\b|\bidm\b/i, 'Electronic'],
  [/industrial/i,                         'Industrial'],
  [/\bambient\b/i,                        'Ambient'],
  [/lo[\s-]?fi|lofi/i,                    'Lo-Fi'],
  [/\bchill(out|hop|step)?\b/i,           'Chillout'],
  [/vapor\s?wave|synth\s?wave|retro\s?wave|outrun|darksynth/i, 'Synthwave'],
[/neo[-\s]?baile/i,                      'Neo-Baile'],
[/dark\s?romantic/i,                     'Dark Romantic'],
[/romantic/i,                            'Romantic'],
[/ritual\s?trap/i,                       'Ritual Trap'],
[/\britual\b/i,                           'Ritual'],
  [/\breggaeton\b/i,                      'Reggaeton'],
  [/\breggae\b|\bska\b/i,                 'Reggae'],
  [/\blatin\b|salsa|bossa|samba|tango|flamenco/i, 'Latin'],
  [/afro(beat|beats|house)?\b/i,          'Afrobeat'],
  [/\beastern\b|oriental|arabic|balkan|turkish|\bethnic\b|\bworld\b|desert/i, 'World'],
  [/\bexperimental\b|\bavant/i,           'Experimental'],
  [/\bmeme\b|\bparody\b|\bcomedy\b/i,     'Meme & Comedy'],
];

const GENRE_LABELS   = new Map();  // key -> красивое название
const GENRE_PARENTS  = new Map();  // key подстиля -> [key родителей]
const GENRE_CHILDREN = new Map();  // key родителя -> Set(key подстилей)
const GENRE_DROPPED  = new Set();  // что выброшено (для отладки)

function titleCaseGenre(raw) {
  return String(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .map(w => w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-'))
    .join(' ');
}

/* Разбор строки жанров трека:
   { subs: [{key,label,parents:[key]}], keys: [все ключи для фильтра] } */
function parseTrackGenres(rawGenreString) {
  const subs = [];
  const keys = new Set();
  if (!rawGenreString) return { subs: subs, keys: [] };

  String(rawGenreString).split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(tag => {
    const clean = tag.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;

    if (GENRE_JUNK.some(re => re.test(clean))) { GENRE_DROPPED.add(tag); return; }
    if (GENRE_NOISE.test(clean) && !GENRE_STRONG.test(clean)) { GENRE_DROPPED.add(tag); return; }

    const parents = [];
    GENRE_ROOTS.forEach(([re, parentLabel]) => {
      if (re.test(clean)) {
        const pKey = normalizeGenre(parentLabel);
        GENRE_LABELS.set(pKey, parentLabel);
        if (parents.indexOf(pKey) === -1) parents.push(pKey);
      }
    });

    if (!parents.length) { GENRE_DROPPED.add(tag); return; }

    const label = titleCaseGenre(clean);
    const key = normalizeGenre(label);
    GENRE_LABELS.set(key, label);

    const known = GENRE_PARENTS.get(key) || [];
    parents.forEach(p => { if (known.indexOf(p) === -1) known.push(p); });
    GENRE_PARENTS.set(key, known);

    parents.forEach(p => {
      if (!GENRE_CHILDREN.has(p)) GENRE_CHILDREN.set(p, new Set());
      GENRE_CHILDREN.get(p).add(key);
      keys.add(p);
    });

    keys.add(key);
    subs.push({ key: key, label: label, parents: parents });
  });

  return { subs: subs, keys: Array.from(keys) };
}

/* Для filterTracks(): все ключи трека (подстили + родительские жанры) */
function canonicalGenres(rawGenreString) {
  return parseTrackGenres(rawGenreString).keys;
}

/* Для карточки трека и страницы трека: только полные названия подстилей */
function getTrackGenreLabels(rawGenreString) {
  const seen = new Set();
  const out = [];
  parseTrackGenres(rawGenreString).subs.forEach(s => {
    if (!seen.has(s.key)) { seen.add(s.key); out.push(s.label); }
  });
  return out;
}

function getGenreDisplayName(rawGenre) {
  if (!rawGenre) return '';
  const key = normalizeGenre(rawGenre);
  if (GENRE_LABELS.has(key)) return GENRE_LABELS.get(key);
  return titleCaseGenre(rawGenre);
}

window.normalizeGenre = normalizeGenre;
window.parseTrackGenres = parseTrackGenres;
window.canonicalGenres = canonicalGenres;
window.getTrackGenreLabels = getTrackGenreLabels;
window.getGenreDisplayName = getGenreDisplayName;
window.GENRE_LABELS = GENRE_LABELS;
window.GENRE_PARENTS = GENRE_PARENTS;
window.GENRE_CHILDREN = GENRE_CHILDREN;
window.GENRE_DROPPED = GENRE_DROPPED;
