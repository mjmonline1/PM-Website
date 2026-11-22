// Fills books.json for every book on the site. Run: node sync-books.cjs  (then node build-books.cjs)
//
// The book LIST below is hand-kept: one line per live title, in homepage order. Everything else
// is filled in from three sources, and a field already present in books.json is never overwritten
// (so hand-written copy, like the three pilot pages, stays as written):
//   - data/amazon-snapshot.json: live Amazon title, description and cover URL per ASIN. Refresh it
//     with Playwright (scrape #productTitle, #bookDescription_feature_div, #landingImage per /dp/ASIN).
//     ponytail: a snapshot file, not a live scrape here; Amazon blocks plain fetch, and listings rarely change.
//   - Mongo Books.Catalogue (localhost): BookNumber, trim size, production folder.
//   - The book's own Puzzles.pdf in C:\Books: the "Look inside" sample page (pdftoppm + ffmpeg).
// New book = add a LIST line, add its ASIN to the snapshot, run both scripts.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { MongoClient } = require('C:/Code/javascript/PuzzleWizard/node_modules/mongodb');

const root = __dirname, imgDir = path.join(root, 'images', 'books');
// [asin, slug, title, collection, type, blurb, extra]
const LIST = [
  ['B0H9VBRNNT', 'puzzle-dublin', 'Puzzle Dublin', 'Puzzle Cities', 'wordsearch', '99 Dublin word searches'],
  ['B0HBLNWNBC', 'puzzle-london', 'Puzzle London', 'Puzzle Cities', 'wordsearch', '99 London word searches'],
  ['B0HBLNLLMW', 'puzzle-paris', 'Puzzle Paris', 'Puzzle Cities', 'wordsearch', '99 Paris word searches'],
  ['B0HBLQFQV2', 'puzzle-new-york', 'Puzzle New York', 'Puzzle Cities', 'wordsearch', '99 New York word searches'],
  ['B0HBWSYD9Z', 'puzzle-belfast', 'Puzzle Belfast', 'Puzzle Cities', 'wordsearch', '99 Belfast word searches'],
  ['B0HBM4KJB2', 'puzzle-bruges', 'Puzzle Bruges', 'Puzzle Cities', 'wordsearch', '99 Bruges word searches'],
  ['B0H9NL8SHX', 'around-the-world-in-eighty-days-word-search', 'Around the World in Eighty Days Word Search', 'Word Search', 'wordsearch', "99 puzzles from Jules Verne's classic"],
  ['B0HDSP32R7', '70s-tv-word-search', '70s TV Word Search', 'Word Search', 'wordsearch', 'Large print — 99 puzzles for grown-up kids of the 70s'],
  ['B0HFDJ8T3Y', 'day-at-the-beach-word-search', 'A Day at the Beach Word Search', 'Word Search', 'wordsearch', 'Large print — sun, sand and surf, 99 puzzles'],
  ['B0HDNG852W', 'memory-and-calm-word-search', 'Memory and Calm Word Search', 'Word Search', 'wordsearch', 'Large print — 99 gentle EASY puzzles for seniors'],
  ['B0HGHFFQT5', 'classic-horror-movies-word-search', 'Classic Horror Movies Word Search', 'Word Search', 'wordsearch', '99 puzzles from the classics that started it all'],
  ['B0HJFSNV6G', 'halloween-word-search', 'Halloween Word Search', 'Word Search', 'wordsearch', '99 spooky puzzles — witches, folklore and haunted places'],
  ['B0HPW6XMLN', 'christmas-word-search', 'Christmas Word Search', 'Word Search', 'wordsearch', '99 festive puzzles — traditions from around the world, a fun fact on every page'],
  ['B0HPW7WM12', 'charles-dickens-word-search', 'Charles Dickens Word Search', 'Word Search', 'wordsearch', '99 puzzles for classic literature fans — novels, characters & Victorian London'],
  ['B0HQ5HJX9C', 'guy-fawkes-night-word-search', 'Guy Fawkes Night Word Search', 'Word Search', 'wordsearch', '99 puzzles for Bonfire Night — Gunpowder Plot, fireworks and tradition'],
  ['B0HQCPVSMY', 'robots-word-search', 'Robots Word Search', 'Word Search', 'wordsearch', '99 puzzles for robot fans — robotics, AI and automation', { pdf: 'C:/Books/WordSearch/Robots/Book1/Dev/Output/Puzzles.pdf' }],
  ['B0HR7R21T9', 'murder-at-the-village-fete', 'Murder at the Village Fete', 'Word Search', 'mystery', 'A cozy mystery word search — read the story, solve 50 puzzles, catch the killer', { samplePage: 3, metaTitle: 'Murder at the Village Fete: Cozy Mystery Word Search Book' }],
  ['B0HSCDYNKJ', 'arsene-lupin-word-search', 'Arsène Lupin Word Search', 'Word Search', 'wordsearch', "99 puzzles from the gentleman-burglar's original adventures"],
  ['B0D3CRSTXP', 'connections-puzzle-game-book', 'Connections Puzzle Game Book', 'Connections', 'connections', '4 groups of 4, one common link', { subtitle: 'Volume 1', sample: false }],
  ['B0D7WGWVT1', 'connections-volume-2', 'Connections Volume 2', 'Connections', 'connections', 'Large print — 4 groups of 4', { subtitle: 'Large Print: 4 Groups of 4 Words with a Common Link', sample: false, metaTitle: 'Large Print Connections Puzzle Book Vol 2 | The Puzzle Monsters' }],
  ['B0G1HGQ6S2', 'connections-volume-3', 'Connections Volume 3', 'Connections', 'connections', '4 groups of 4, one common link', { subtitle: '4 Groups of 4 Words with a Common Link', sample: false, metaTitle: 'Connections Puzzle Book Vol 3 | The Puzzle Monsters' }],
  ['B0GDY63GMK', 'connections-volume-4', 'Connections Volume 4', 'Connections', 'connections', '4 groups of 4, one common link', { subtitle: '4 Groups of 4 Words with a Common Link', sample: false, metaTitle: 'Connections Puzzle Book Vol 4 | The Puzzle Monsters' }],
  ['B0HM7TRGX7', 'large-print-sudoku', 'Large Print Sudoku', 'Sudoku', 'sudoku', 'Large print — 99 bold, easy puzzles, one per page', { samplePage: 1 }],
  ['B0HGF22DL5', 'codewords-puzzle-book', 'Codewords Puzzle Book', 'Codewords', 'codewords', '99 codeword puzzles with starter clues'],
  ['B0HS7T9D2Q', 'movie-quote-cryptograms', 'Movie Quote Cryptograms', 'Cryptograms', 'cryptograms', 'Large print — 99 iconic film lines to decode, 6 cipher styles'],
  ['B0H9Z269FB', 'dublin-city-locations', 'Dublin: City Locations', 'City Guides', 'cityguide', 'A pocket guide to the real Dublin places behind the puzzles', { sample: false, subtitle: '99 Places That Made Dublin', metaTitle: 'Dublin City Locations: Pocket Guide Book | The Puzzle Monsters',
    metaDescription: "A pocket guide to 99 Dublin places, from Trinity College to the Forty Foot: what each one is, why it matters, and the detail worth remembering. 4 x 6 in." }],
  ['B0DP1P2J9C', 'a-christmas-carol-annotated', 'A Christmas Carol', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost'],
  ['B0D5CMBCKL', 'great-expectations-annotated', 'Great Expectations', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost', { kindle: true }],
  ['B0DPSYJPB5', 'the-chimes-annotated', 'The Chimes', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost', { kindle: true }],
  ['B0DPVN9MPH', 'the-cricket-on-the-hearth-annotated', 'The Cricket on the Hearth', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost', { kindle: true }],
  ['B0DPXTZFHM', 'the-battle-of-life-annotated', 'The Battle of Life', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost', { kindle: true }],
  ['B0DQ4VKBBG', 'the-haunted-man-annotated', 'The Haunted Man', 'Classic Reads', 'classic', 'Annotated classic — every reference explained, nothing lost', { kindle: true }]
];

// Classic Reads: written here, not parsed. Their Amazon copy has emoji and a reader quote we
// can't stand behind, so the page says only what the listing and the story support.
const CLASSIC = {
  'B0DP1P2J9C': { subtitle: 'Annotated, with Original Illustrations from the 1843 Edition',
    intro: ['Ebenezer Scrooge hates Christmas, until three ghosts take him through his past, present and future. Dickens first published this short ghost story in 1843, and it has been read every December since.',
      'This annotated edition adds notes that explain the Victorian world behind the story, so the jokes, the money and the customs all make sense.'],
    highlights: ['Literary comments', 'Explanations of the historical context', 'Study question guide', 'Original illustrations from the 1843 edition'] },
  'B0D5CMBCKL': { subtitle: 'Annotated Edition',
    intro: ['Pip, a young orphan, meets an escaped convict on the marshes and is invited to the strange Satis House of Miss Havisham. When a secret benefactor gives him the chance to become a gentleman, everything he thought he wanted begins to change.',
      'Dickens first published Great Expectations in 1861. This is an annotated Kindle edition of the complete novel.'],
    highlights: ['The complete novel by Charles Dickens', 'Annotated edition', 'Kindle eBook'] },
  'B0DPSYJPB5': { subtitle: 'Annotated: A Goblin Story of Some Bells That Rang an Old Year Out and a New Year In',
    intro: ['On New Year\'s Eve, Trotty Veck, a poor London messenger, is shown a vision by the goblins of the church bells. Dickens wrote The Chimes in 1844 as his second Christmas book, after A Christmas Carol.',
      'This annotated edition helps you follow the story and the world it was written for.'],
    highlights: ['Introduction', 'Overview', 'Cast of characters', 'Study question guide'] },
  'B0DPVN9MPH': { subtitle: 'Annotated: A Fairy Tale of Home',
    intro: ['John Peerybingle the carrier, his young wife Dot and the cricket that chirps on their hearth face a test of love and trust in this short Christmas book from 1845.',
      'This annotated edition explains the history behind the story.'],
    highlights: ['Literary comments', 'Explanations of the historical context', 'Study question guide'] },
  'B0DPXTZFHM': { subtitle: 'Annotated: A Love Story',
    intro: ['In an English country village, two sisters, Grace and Marion, face a choice that tests the bond between them. The Battle of Life was the fourth of Dickens\'s Christmas books, published in 1846.',
      'This annotated edition explains the history behind the story.'],
    highlights: ['Literary comments', 'Explanations of the historical context', 'Study question guide'] },
  'B0DQ4VKBBG': { subtitle: 'The Haunted Man and the Ghost\'s Bargain, Annotated',
    intro: ['Redlaw, a chemistry professor haunted by painful memories, is offered a gift by a ghost: the power to forget. The bargain costs him more than he expected. This was the last of Dickens\'s five Christmas books, published in 1848.',
      'An annotated Kindle edition of the complete novella.'],
    highlights: ['The complete novella by Charles Dickens', 'Annotated edition', 'Kindle eBook'] }
};

// FAQs that teach the puzzle type. Book-specific answers are added from its own listing below.
const TYPE_FAQ = {
  wordsearch: [['How do I solve a word search?', 'Find each word from the list hidden in the grid and circle it. Words run in straight lines. Harder puzzles use bigger grids and longer words.']],
  mystery: [['How does the mystery work?', 'Read a short scene, then solve five word searches. Every grid hides one extra clue word that is not on the word list. Find it, note it in the case notebook, and cross off a suspect.'],
    ['Is the ending fair?', 'Yes. Every clue you need is on the page, and the solutions at the back mark the hidden clue words.']],
  connections: [['How does a Connections puzzle work?', 'Each puzzle gives you 16 words. Sort them into 4 groups of 4, where each group shares a hidden link.'],
    ['Are the answers included?', 'Yes. There is a full answer key at the back.']],
  sudoku: [['How do you play sudoku?', 'Fill the grid so that every row, every column and every 3 x 3 box contains the numbers 1 to 9 exactly once.'],
    ['Do I ever have to guess?', 'No. Every puzzle has exactly one solution, and you can reach it by logic alone.']],
  codewords: [['What is a codeword puzzle?', 'It looks like a crossword with no clues. Every letter has been swapped for a number from 1 to 26. A few starter letters are given, and you work out the rest from the words they make.']],
  cityguide: [['How big is it?', 'It is a true pocket book, 4 x 6 inches, so it fits in a coat pocket.'],
    ['Is there a puzzle book to go with it?', 'Yes. Puzzle Dublin has 99 word searches with a true Dublin fact on every page.']],
  classic: [['What does annotated mean?', 'The book includes extra notes alongside the story, such as explanations of the history and customs that a modern reader might not know.'],
    ['Who wrote it?', 'Charles Dickens. The text is his complete original story.']]
};

const dec = s => String(s || '').replace(/&amp;/g, '&').replace(/\u00a0/g, ' ').trim();
const dash = s => s.replace(/ - /g, ' – ');
const stop = s => /[.!?]$/.test(s) ? s : s + '.';
const isGift = l => /^(The|A) (perfect|calm)/.test(l);

// "<keyword phrase> | The Puzzle Monsters", e.g. "Large Print 70s TV Word Search Book".
function metaTitle(title, type, hl) {
  let kw = title;
  if (type === 'wordsearch' && !/word search/i.test(kw)) kw += ' Word Search';
  if (type !== 'classic' && !/book/i.test(kw)) kw += ' Book';
  if (type === 'classic') kw += ' (Annotated)';
  if (hl.some(h => /large[- ]print|16pt/i.test(h)) && !/large print/i.test(kw)) kw = 'Large Print ' + kw;
  return (kw + ' | The Puzzle Monsters').length <= 65 ? kw + ' | The Puzzle Monsters' : kw;
}

// Amazon description -> headline, intro paragraphs, "Inside this book" bullets, closing lines.
function parse(desc) {
  const lines = dec(desc).split('\n').map(l => l.trim()).filter(Boolean);
  const head = lines[0];
  const at = lines.findIndex(l => /^inside this book:?$/i.test(l));
  if (at < 0) return { head, intro: lines.slice(1, 3), highlights: [], outro: [] };
  const intro = lines.slice(1, at);
  const highlights = []; let i = at + 1;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^(The|A) (perfect|calm)|^Makers Warning|^Volume \d|^Part of /.test(l) || /[.!?]$/.test(l) && l.length > 90) break;
    highlights.push(l);
  }
  return { head, intro, highlights, outro: lines.slice(i) };
}

function bookFaqs(type, hl) {
  const faqs = [...(TYPE_FAQ[type] || [])];
  if (['wordsearch', 'codewords'].includes(type)) {
    const lp = hl.find(h => /large[- ]print|16pt/i.test(h));
    if (lp) faqs.push(['Is it large print?', `Yes: ${lp.replace(/ - /, ', ').replace(/^./, c => c.toLowerCase())}.`]);
    const lvl = hl.find(h => /difficulty levels|33 easy/i.test(h));
    if (lvl) faqs.push(['How hard are the puzzles?', `There are three levels: ${(lvl.match(/33 easy, 33 medium, 33 hard/i) || ['easy, medium and hard'])[0]}.`]);
    else if (hl.some(h => /\beasy\b/i.test(h))) faqs.push(['How hard are the puzzles?', 'Every puzzle is EASY difficulty, with no difficulty ramp.']);
  }
  if (!['connections', 'classic', 'cityguide', 'mystery'].includes(type) && hl.some(h => /solutions|answer key/i.test(h)))
    faqs.push(['Are the answers included?', 'Yes. Full solutions are at the back.']);
  return faqs;
}

function format(trim, kindle, type) {
  if (kindle) return 'Kindle eBook';
  if (type === 'classic') return 'Paperback';
  if (/4x6/.test(trim || '')) return 'Pocket paperback, 4 x 6 in';
  return 'Paperback, 8.5 x 11 in';
}

const dims = f => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);

(async () => {
  const snap = JSON.parse(fs.readFileSync(path.join(root, 'data', 'amazon-snapshot.json'), 'utf8'));
  const prev = fs.existsSync(path.join(root, 'books.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'books.json'), 'utf8')) : [];
  const c = await MongoClient.connect('mongodb://localhost:27017');
  const cat = await c.db('Books').collection('Catalogue').find({}).toArray();
  await c.close();
  fs.mkdirSync(imgDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pmbooks-'));
  const out = [], warn = [];

  for (const [asin, slug, title, collection, type, blurb, extra = {}] of LIST) {
    const old = prev.find(b => b.slug === slug) || {};
    const a = snap[asin] || {}; if (!a.d) warn.push(`${slug}: no Amazon snapshot`);
    const m = cat.find(x => JSON.stringify(x).includes(asin)); if (!m) warn.push(`${slug}: ASIN not found in Mongo Books.Catalogue`);
    const p = parse(a.d);
    const cl = CLASSIC[asin];
    const amzTitle = dec(a.t);
    const autoSub = dash(amzTitle.split(' | ')[0].replace(/\s*\([^)]*\)\s*$/, '').split(': ').slice(1).join(': '));
    const b = {
      slug, asin, title, collection, type, blurb,
      ...(extra.kindle ? { kindle: true } : {}),
      subtitle: extra.subtitle || (cl && cl.subtitle) || autoSub || title,
      intro: cl ? cl.intro : p.intro.map(dash),
      highlights: cl ? cl.highlights : p.highlights.map(dash),
      closing: cl ? undefined : p.outro.filter(l => !isGift(l)).map(l => stop(dash(l))).join(' ') || undefined,
      suits: cl ? undefined : p.outro.filter(isGift).map(l => stop(dash(l)))[0],
      format: format(m && m.trimSize, extra.kindle, type),
      bookNumber: m ? m.BookNumber : undefined,
      faqs: bookFaqs(type, cl ? cl.highlights : p.highlights)
    };
    const head = dash(extra.metaDescription || (cl ? cl.intro[0] : `${stop(p.head)} ${p.intro[0] || ''}`));
    b.metaTitle = extra.metaTitle || metaTitle(title, type, b.highlights);
    b.metaDescription = head.length <= 158 ? head : head.slice(0, 155).replace(/\s+\S*$/, '') + '…';

    // Cover: the live Amazon cover (your artwork), self-hosted as WebP, 600px tall.
    const coverFile = path.join(imgDir, `${slug}-cover.webp`);
    if (!fs.existsSync(coverFile)) {
      if (!a.img) warn.push(`${slug}: no cover URL`);
      else {
        const jpg = path.join(tmp, `${slug}.jpg`);
        fs.writeFileSync(jpg, Buffer.from(await (await fetch(a.img)).arrayBuffer()));
        execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', jpg, '-vf', 'scale=-2:600', '-c:v', 'libwebp', '-quality', '80', coverFile]);
      }
    }
    if (fs.existsSync(coverFile)) [b.coverW, b.coverH] = dims(coverFile);

    // Sample: one puzzle page from the book's own Puzzles.pdf.
    const sampleFile = path.join(imgDir, `${slug}-sample.webp`);
    if (extra.sample !== false && type !== 'classic' && !old.curated) {
      const dir = m && m.pipeline && m.pipeline.paths && m.pipeline.paths.devHomeDir;
      const pdf = extra.pdf || (dir && path.join(dir, 'Output', 'Puzzles.pdf'));
      if (fs.existsSync(sampleFile) || (pdf && fs.existsSync(pdf))) {
        if (!fs.existsSync(sampleFile)) {
          const pg = String(extra.samplePage || 2), base = path.join(tmp, `${slug}-s`);
          execFileSync('pdftoppm', ['-r', '100', '-png', '-f', pg, '-l', pg, '-singlefile', pdf, base]);
          execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', base + '.png', '-c:v', 'libwebp', '-quality', '75', sampleFile]);
        }
        b.sample = { img: `${slug}-sample.webp`, alt: `Sample page from ${title}`, caption: `Puzzle 1 from ${title}, exactly as printed in the book.` };
      } else warn.push(`${slug}: no interior PDF for a sample page`);
    }

    // A book marked "curated": true in books.json keeps its hand-written fields; the rest is regenerated.
    // Images already rendered are kept either way (delete the file to re-render it).
    const keep = old.curated ? old : (old.sample && !b.sample ? { sample: old.sample } : {});
    const merged = { ...b, ...keep };
    for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
    out.push(merged);
  }

  fs.writeFileSync(path.join(root, 'books.json'), JSON.stringify(out, null, 2) + '\n');
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`books.json: ${out.length} books`);
  warn.forEach(w => console.log('WARN', w));
})();
