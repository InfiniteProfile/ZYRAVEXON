# ZYRAVEXON
Static, dependency-free site: `index.html`, `style.css`, `script.js`.

## Deploy (GitHub Pages)
Put the three files in a repo, then Settings → Pages → deploy from branch (root).

## Routing
Hash URLs, `index.html#/p/<ID>`. They survive refresh on any static host and accept IDs of any length.

## Architecture
- IDs are exact decimal strings; stepping uses BigInt, never Number.
- `profile(id)` derives name, colours, avatar and bio from a hash of the ID (deterministic).
- Feed: virtualized rows near the viewport, driven by a scroll listener plus a 1 s recovery timer. No end state.
- Name search scans IDs 1–30,000 only. Exact ID search reaches any profile directly.

## Limitations
- Names can collide; the ID is the unique identity.
- Not tested on real devices, slow networks or very long IDs. No offline caching.
