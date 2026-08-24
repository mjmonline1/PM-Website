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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', localise);
  else localise();
})();
