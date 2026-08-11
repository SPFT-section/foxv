# Fox-V

WTR-Lab style novel reading site — flat cards, dark navbar, rail/ranking/recent updates, community requests, folders, follows, and Google Translate in 14 languages.

## Deploy (Render Blueprint)

`render.yaml` defines one full-stack web service:

- `foxv` — Node/Express web service (free plan) serving both the frontend (`public/`) and the API (`server.js`)
- `foxv-db` — free Postgres, wired via `DATABASE_URL`

The frontend calls `/api/...` on the same origin and falls back to localStorage / direct browser translation when the API is unreachable.

## Run locally

```sh
# frontend only
python3 -m http.server 8000

# API
npm install
DATABASE_URL=postgres://... node server.js
```

## Structure

- `public/index.html` — Library: rail, continue reading, filters, requests, ranking
- `public/novel.html` — novel detail + chapter list
- `public/reader.html` — reader with customization + translation
- `public/about.html` — about
- `public/js/` — data, icons, common (theme/storage/PWA), db (sync), library, reader, novel, translate
- `public/sw.js` — service worker (offline cache)
- `server.js` — Express API: `/health`, `/api/progress/:uid`, `/api/translate`
