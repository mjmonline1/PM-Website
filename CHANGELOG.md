📜 CHANGELOG - Puzzle Monsters Website
This document tracks all meaningful changes made to the Puzzle Monsters Website project over time.

[1.0] - 2025-04-29
Initial Release

🎉 First public version of the Puzzle Monsters "Coming Soon" website.

Separated project into index.html, style.css, and script.js.

Added full-page background image (images/SD-7772.png).

Centered all content with a semi-transparent content box.

Added a Netlify-friendly contact form (Name and Email fields).

Basic mobile responsiveness added.

Placeholder JavaScript file (script.js) included for future features.

## [All book pages] - 2026-11-22
- sync-books.cjs fills books.json for all 32 live books: copy parsed from the live Amazon listing (data/amazon-snapshot.json), BookNumber/trim from Mongo Books.Catalogue, cover self-hosted from the Amazon image, sample page from the book's own Puzzles.pdf. Entries with "curated": true keep their hand-written copy.
- build-books.cjs now also writes books/index.html (all books with covers) and regenerates the homepage book list + ItemList from books.json.
- Every homepage title now opens its book page; seasonal featured cards link their titles to the book page too.
- Classic Reads copy written by hand (Amazon copy had emoji and an unsourced reader quote).

## [Book pages pilot] - 2026-11-22
- books.json + build-books.cjs (`node build-books.cjs`): one page per book at /books/<slug>/ with own cover, sample page, details, FAQs, Book + BreadcrumbList JSON-LD; rewrites sitemap.xml.
- Pilot: Christmas Word Search, Arsène Lupin Word Search, Movie Quote Cryptograms. Homepage list + ItemList now point at these pages.
- script.js: data-skip="amazon.fr" keeps visitors off stores that don't sell a book (Lupin is not sold in France).

## [SEO pass] - 2026-11-21
- Amazon links: rel="sponsored noopener" (Google affiliate-link rule); Associates disclosure in footer (index + go).
- Keyword title/description; Organization + WebSite JSON-LD; "Who makes these books?" section.
- Background 1.4MB PNG -> 53KB WebP + preload; fixed site.webmanifest paths/name and linked it.
- sitemap lastmod; branded 404.html.

## [1.0.2] - 2025-04-29
### Improved
- Increased size of "P" and "M" letters to better dominate the favicon space.
- Reduced size of decorative stars for a cleaner, more balanced look.