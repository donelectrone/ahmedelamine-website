# Class Maestro

Static web app (no server, no account). All records stay in the teacher's browser.
Publish the whole folder over HTTPS (GitHub Pages, Netlify, Cloudflare Pages ...). Opening index.html from disk works, but the offline mode and the install button need HTTPS.

    index.html  style.css  fonts.css  app.js  i18n.js  sw.js  manifest.webmanifest
    programmes/   the curricula (see programmes/README.md)
    programmes.js generated from programmes/ (node tools/programmes.js --build)
    fonts/        self-hosted fonts, SIL Open Font License
    icons/        PNG icons rendered from icon.svg

## Before every release

1. Programme changed? `node tools/programmes.js --against <published copy>` then `--build`.
2. Added, renamed or removed a file the app needs offline? Add it to `FILES` in `sw.js` and bump `CACHE`.
3. Changed how data is stored? Bump `APP_VER` in `app.js`. On first launch each device then keeps an untouched copy of its data under `teacher-toolkit.v1.pre-<old version>` before anything else runs.

## Calendar rules built into the app

- Trimester dates (Calendar tab) default to Sep-Dec, Jan-Mar, Apr-Jun and are editable. The year mark is the average of the trimester marks that have results. Check this against the official rule before launch.
- A day off (single day or range) has no sessions: the pacer stays idle, nothing is counted as taught, and the lesson moves to the class's next session. Adding a day off for days already counted takes the latest lesson back.
- Results dated before the first trimester start belong to the previous school year and are left out of marks (never deleted). "Start a new school year" sets new dates and puts classes back at lesson 1.

## Updates reach teachers

App files and programmes are fetched network-first (3 second limit), so the next time a teacher opens the app online they get the new version; offline they get the saved one.
