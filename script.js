// Send each visitor to their own Amazon storefront.
// KDP reuses the SAME ASIN across marketplaces, so only the domain needs swapping.
//
// ponytail: timezone, not an IP-geolocation API. No network call, no API key, no third party
// that can go down and take every buy button with it. It IS a guess — a traveller or VPN user
// gets the wrong store — so unknown zones fall back to a default that is known to work, and
// every link in the HTML is already a working URL if this script never runs at all.
//
// Paperback and Kindle do NOT cover the same countries. Verified by fetching /dp/<asin>
// on each storefront, 2026-07-22:
//   paperback OK: com co.uk ie de fr ca com.au es it nl co.jp se pl
//   kindle    OK: co.uk de fr com.au es it nl co.jp
//   kindle  DEAD: com ca se pl ie   <- incl. .com, hence the .co.uk default for ebooks
// Routing a visitor to a store that lacks the book is worse than not routing at all, so a
// store is only used when that format is confirmed present there.
//
// The kindle branch is DORMANT right now — no data-kindle links are on the page. It is kept
// for the Classic Reads titles, which return alongside the Charles Dickens word search.
//
// Every href already carries ?tag=thepuzzlemons-20 (Amazon Associates, US marketplace only).
// This rewrite only swaps the hostname — the query string, tag included, rides along
// untouched. On a non-.com storefront the tag is simply not the store's own tracking ID,
// so the link works but earns nothing there yet. Add a store->tag map here once accounts
// for other marketplaces exist (see OneLink note in project memory).
(function () {
  var TZ_STORE = {
    'Europe/Dublin': 'amazon.ie',
    'Europe/London': 'amazon.co.uk',
    'Europe/Berlin': 'amazon.de', 'Europe/Vienna': 'amazon.de', 'Europe/Zurich': 'amazon.de',
    'Europe/Paris': 'amazon.fr',
    'Europe/Madrid': 'amazon.es', 'Atlantic/Canary': 'amazon.es',
    'Europe/Rome': 'amazon.it',
    'Europe/Amsterdam': 'amazon.nl',
    'Europe/Stockholm': 'amazon.se',
    'Europe/Warsaw': 'amazon.pl',
    'Asia/Tokyo': 'amazon.co.jp',
    'America/Toronto': 'amazon.ca', 'America/Vancouver': 'amazon.ca',
    'America/Edmonton': 'amazon.ca', 'America/Winnipeg': 'amazon.ca',
    'America/Halifax': 'amazon.ca', 'America/St_Johns': 'amazon.ca'
  };

  var KINDLE_OK = { 'amazon.co.uk': 1, 'amazon.de': 1, 'amazon.fr': 1, 'amazon.com.au': 1,
                    'amazon.es': 1, 'amazon.it': 1, 'amazon.nl': 1, 'amazon.co.jp': 1 };

  var DEFAULT_PAPERBACK = 'amazon.com';
  var DEFAULT_KINDLE = 'amazon.co.uk';

  function localStore() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TZ_STORE[tz]) return TZ_STORE[tz];
      if (tz && tz.indexOf('Australia/') === 0) return 'amazon.com.au';
    } catch (e) { /* old browser: fall through */ }
    return null;
  }

  function localise() {
    var here = localStore();
    var links = document.querySelectorAll('a[href*="/dp/"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var kindle = a.hasAttribute('data-kindle');
      var target = here;
      if (!target || (kindle && !KINDLE_OK[target])) target = kindle ? DEFAULT_KINDLE : DEFAULT_PAPERBACK;
      a.href = a.href.replace(/www\.amazon\.[a-z.]+\//, 'www.' + target + '/');
    }
  }

  // Seasonal "Featured now" box — owner asked 2026-10-31 for the homepage to surface
  // whatever's in-season (e.g. the Halloween books in October) instead of one static
  // card that goes stale. One line per window; add/edit here, no other file to touch.
  // ponytail: flat array + a date-range check, not a CMS. Add a line here per season.
  var SEASONAL_FEATURES = [
    { label: 'Featured this month 🎃', from: [10, 10], to: [10, 31], books: [
        { asin: 'B0HJFSNV6G', title: 'Halloween Word Search', blurb: '99 spooky puzzles — witches, folklore and haunted places, one per page.' },
        { asin: 'B0HGHFFQT5', title: 'Classic Horror Movies Word Search', blurb: '99 puzzles from the classics that started it all.' }
      ] },
    { label: 'Featured this month 🎄', from: [12, 1], to: [12, 26], books: [
        { asin: 'B0HPW6XMLN', title: 'Christmas Word Search', blurb: '99 festive puzzles — traditions from around the world, a fun fact on every page.' },
        { asin: 'B0HPW7WM12', title: 'Charles Dickens Word Search', blurb: '99 puzzles for classic literature fans — novels, characters & Victorian London.' }
      ] },
    { label: 'Featured this month 🏖', from: [6, 1], to: [8, 31], books: [
        { asin: 'B0HFDJ8T3Y', title: 'A Day at the Beach', blurb: 'Large print — sun, sand and surf, 99 puzzles.' }
      ] }
  ];

  function inWindow(m, d, from, to) {
    return (m > from[0] || (m === from[0] && d >= from[1])) &&
           (m < to[0]   || (m === to[0]   && d <= to[1]));
  }

  function renderFeatured() {
    var el = document.getElementById('featured');
    if (!el) return;
    var now = new Date();
    var m = now.getMonth() + 1, d = now.getDate();
    var season = null;
    for (var i = 0; i < SEASONAL_FEATURES.length; i++) {
      if (inWindow(m, d, SEASONAL_FEATURES[i].from, SEASONAL_FEATURES[i].to)) { season = SEASONAL_FEATURES[i]; break; }
    }
    if (!season) return; // no window matches today — keep the hand-written fallback card

    var cards = season.books.map(function (b) {
      return '<div class="feature-card">' +
        '<h3>' + b.title + '</h3><p>' + b.blurb + '</p>' +
        '<a class="btn-primary" href="https://www.amazon.com/dp/' + b.asin + '?tag=thepuzzlemons-20" target="_blank" rel="noopener">Buy on Amazon</a>' +
        '</div>';
    }).join('');
    el.innerHTML = '<p class="eyebrow">' + season.label + '</p><div class="feature-grid">' + cards + '</div>';
  }

  function init() { renderFeatured(); localise(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
