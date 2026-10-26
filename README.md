# Erata — erataofficial.art

A single-page artist site for **Erata** (Yiğit Erata) — discography, selected works, and the world around **Ợ / Circle In The Flow**.

The deliverable is a static, dependency-free website with a SoundCloud-backed player. No build step is required.

---

## Preview

From this directory:

```bash
python3 -m http.server 4173
```

Open **http://127.0.0.1:4173/**.

The player needs an internet connection and access to SoundCloud. Without JavaScript, every play control falls back to its SoundCloud/Spotify link.

---

## What is included

```text
index.html                   One-page site
404.html                     Custom not-found page
PROPOSAL.md                  Research, rationale, launch plan, open questions
README.md                    This file
preview.jpg                  Reference screenshot — desktop
preview-mobile.jpg           Reference screenshot — mobile

assets/
  css/main.css               Design system and responsive layout
  js/data.js                 Discography content (20 releases)
  js/app.js                  Header state, filters, feature selector, player
  fonts/                     Self-hosted Inter Tight, Instrument Serif, DM Mono
  img/                       Portrait, banner, covers, logo, favicons, social card

site.webmanifest             PWA metadata
robots.txt                   Crawler rules
sitemap.xml                  Sitemap
favicon.ico                  Browser favicon
_headers                     Security and cache headers for static hosts
_redirects                   www → apex redirect
```

---

## Design and content at a glance

- **Masthead:** the supplied Ợ mark, centred and enlarged, with the five-link navigation directly beneath it and no wordmark.
- **Hero:** the portrait inside a circle with a dot beneath it — the Ợ mark completed by the artist.
- **Listen:** five featured releases with a custom SoundCloud player. SoundCloud is only contacted after a play action.
- **Portfolio:** six selected works across remix, album, EP, compilation, and label releases.
- **Index:** 20 release-level entries, 31 SoundCloud uploads, 2020–2026.
- **World:** Yiğit Erata’s extended biography — Circle In The Flow, Artosm, the Ankara origin, and the artist’s own language.
- **Contact:** direct email and official profiles.
- **No analytics, no advertising, no trackers, no stock imagery.**

The full research and proposal are in [PROPOSAL.md](PROPOSAL.md).

---

## Editing the discography

The current prototype is intentionally hand-rendered HTML so the catalogue works without JavaScript and is crawlable.

When adding a release:

1. Add the release object to `assets/js/data.js`.
2. Add the corresponding row to the disco list in `index.html` (`#disco-list`).
3. Add the row to the correct filter group:
   - `longform` — albums and EPs
   - `single` — singles and standalone tracks
   - `remix` — remixes
   - `other` — compilations, dubplates, scores
4. Update the counts in:
   - the filter buttons;
   - the index intro copy (“Twenty releases…”);
   - the filter status (handled automatically after filtering).
5. Add cover art in two sizes:
   - `assets/img/covers/<slug>-900.webp`
   - `assets/img/covers/<slug>-480.webp`
6. If the release should appear in the featured player, add its `id` to `ERATA.featured` and add a release tab to `index.html`.

If updates become frequent, the sensible next step is a small CMS or a build script that generates the index rows from a single content file. The current split between `data.js` and `index.html` is deliberate for no-JS resilience, not a long-term editorial system.

---

## Audio behaviour

- The site uses the official SoundCloud Widget API.
- The iframe is created only after the visitor presses a play control.
- No API keys or private credentials are stored in the site.
- Audio is streamed by SoundCloud; it is not downloaded or re-hosted. Once the widget is loaded, SoundCloud's own privacy/cookie policy applies inside the embed.
- If the widget cannot load, the play controls remain links to SoundCloud.
- The player supports play/pause, previous/next, seek, close, and a live elapsed time.

---

## Assets and rights

The portrait, banner, and cover artwork were pulled from Erata's public SoundCloud profile and used as **proposal/prototype assets**. They remain © Erata.

Before public launch:

- confirm permission to use the portrait and artwork;
- confirm the preferred pronouns and final biography;
- confirm release formats, dates, label credits, and download status;
- replace any artwork that the artist does not want used.

The Ợ mark is the artist-supplied symbol, converted into a transparent CSS mask at `assets/img/logo-mark.png`. The original supplied file is not included in the deployed site.

---

## Deploy

The site is host-agnostic. It has been prepared for a static host such as **Cloudflare Pages** or **Netlify**.

### Cloudflare Pages / Netlify

- Build command: none
- Output directory: `/` (publish the repository root)
- `_headers` provides basic security and cache headers.
- `_redirects` sends `www` to the apex domain.

### Domain notes

`erataofficial.art` currently serves a Squarespace “Coming Soon” page. Do not change nameservers or DNS until the existing MX/TXT records for `info@erataofficial.art` have been exported and recreated. Keep the old site live until email and the new domain have been verified.

See section 09 of [PROPOSAL.md](PROPOSAL.md) for the full launch sequence.

---

## Quality checks performed

- Responsive layout checked at 1440, 1280, 1024, 900, 768, and 390 px widths.
- No horizontal overflow.
- No broken local assets.
- Filters and featured-release switching tested.
- SoundCloud playback tested end-to-end in Chromium, including with the production CSP headers.
- Persistent navigation tested at desktop and mobile widths.
- No-JavaScript rendering tested.
- No uncaught JavaScript exceptions.
- Contrast adjusted for AA normal text.
- Automated axe-core 4.10.2 scan: no violations on desktop, mobile, open player, or the 404 page.
- `prefers-reduced-motion` supported.

A full cross-browser and axe/Lighthouse audit is recommended before launch.

---

## Notes

- The current copy uses the artist’s confirmed he/him pronouns from the extended biography supplied for this update.
- The site avoids third-party artist biographies and search-engine conflations with another artist named Erata.
- The `_headers` CSP includes `'unsafe-inline'` for the inline bootstrap/JSON-LD and inline style delays. This can be tightened with hashes in production.
- The site has no analytics installed.
