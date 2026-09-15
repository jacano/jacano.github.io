# AGENTS.md — jacano.github.io

Read this before you change code.

## Overview

- Personal site of **Juan Antonio Cano Salado**. Live site is **https://jacano.github.io/**.
- Stack is **Astro** (static) with GitHub Pages. Language is **English only**.
- Main sections are Home, CV (printable), Blog.

## Stack

- **Node** `>=24`, **npm** `>=11` (see `.nvmrc` and `package.json` `engines`). Workflow uses `actions/setup-node@v5` with `node-version: 24`.
- **Astro** `^7.3.1`, **@astrojs/rss** `^4.0.19`.
- **Config:** `astro.config.mjs` has `site: 'https://jacano.github.io'` and `base: '/'`. Do not change the base.
- **Build:** `output: static`. `dist`, `node_modules`, `.astro` are gitignored. Do not commit `dist`.

## Content

- **Source of truth for CV:** `src/data/cv.json`. It drives Home, CV and Featured projects.
- **Featured projects** are in `src/data/cv.json` `projects` array. Keep descriptions short, one sentence.
- **Blog posts** are Markdown files in `src/content/blog/*.md` (a content collection). The home preview, the blog list, `rss.xml` and the sitemap read them. Keep English only.
- **Site text** follows **Simple English (ASD-STE100)** via https://github.com/AminBlg/SimpleEnglish. Short sentences, active voice, no contractions.
- **Social image:** `public/og-image.png` (1200×630). Use PNG or JPG. Social sites do not show an SVG.
- **Avatar:** `public/avatar.jpg` plus `public/avatar.webp`. The pages use `<picture>`. Keep both files small.
- **Icons:** `public/favicon.svg` plus `public/apple-touch-icon.png` at 180x180. iOS does not take an SVG for the touch icon.

## Commits

Use Conventional Commits. Keep the subject in one line. Add a body only when it
helps.

```
type(scope): short description
```

- Type: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`,
  `build`, `style` or `revert`.
- The scope is optional. Use it for one part, for example `blog` or `seo`.
- Write the description in the imperative and in the lowercase. Do not end it
  with a period. Keep the subject under 72 characters.
- Add `!` after the type or the scope for a breaking change.

Examples:

```
feat(blog): add the article on real electricity use
fix(blog): add space between the tag and the date
fix(seo): use a PNG social image
perf: compress the avatar
docs: fix the agent guide
```

## Deployment

- Workflow is `.github/workflows/deploy.yml` (`Deploy to GitHub Pages`). Push to `main` builds with `npm ci` and `npm run build` and deploys `dist` via `upload-pages-artifact` / `deploy-pages`.
- `build_type` is `workflow` (not `legacy`). Verify with `gh api repos/jacano/jacano.github.io/pages`.

## How to work

- **Develop:**
  ```
  npm install
  npm run dev      # http://localhost:4321/
  npm run check    # astro check
  npm run build
  ```
- **Add a featured project:** Edit `src/data/cv.json` `projects` array, then `npm run build` and `git push`.
- **Add a blog post:** Edit `src/pages/blog/[slug].astro` and `src/pages/blog/index.astro`, then `npm run build`.
- **Before you push:** run `npm run check` and `npm run build` in the local folder. Do not wait for the deploy workflow to find a build error.
- **Verify contributions:** Use `gh api search/issues?q=author:jacano+type:pr&per_page=100` — never invent data.
- **Deploy:** `git push` → wait for `Deploy to GitHub Pages` to succeed → `https://jacano.github.io/` is live.
