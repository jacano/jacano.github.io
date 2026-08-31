# AGENTS.md — jacano.github.io

Read this before you change code.

## Overview

- Personal site of **Juan Antonio Cano Salado**. Live site is **https://jacano.github.io/**.
- Stack is **Astro** (static) with GitHub Pages. Language is **English only**.
- Main sections are Home, CV (printable), Blog.

## Stack

- **Node** `>=24`, **npm** `>=11` (see `.nvmrc` and `package.json` `engines`). Workflow uses `actions/setup-node@v5` with `node-version: 24`.
- **Astro** `7.2.9`, **@astrojs/rss** `4.0.19`.
- **Config:** `astro.config.mjs` has `site: 'https://jacano.github.io'` and `base: '/'`. Do not change the base.
- **Build:** `output: static`. `dist`, `node_modules`, `.astro` are gitignored. Do not commit `dist`.

## Content

- **Source of truth for CV:** `src/data/cv.json`. It drives Home, CV and Featured projects.
- **Featured projects** are in `src/data/cv.json` `projects` array. Keep descriptions short, one sentence.
- **Blog posts** are in `src/pages/blog/[slug].astro` (`getStaticPaths` + `posts` object) and listed in `src/pages/blog/index.astro`. Keep English only.
- **Site text** follows **Simple English (ASD-STE100)** via https://github.com/AminBlg/SimpleEnglish. Short sentences, active voice, no contractions.

## Deployment

- Workflow is `.github/workflows/deploy.yml` (`Deploy to GitHub Pages`). Push to `main` builds with `npm ci` and `npm run build` and deploys `dist` via `upload-pages-artifact` / `deploy-pages`.
- `build_type` is `workflow` (not `legacy`). Verify with `gh api repos/jacano/jacano.github.io/pages`.

## How to work

- **Develop:**
  ```
  npm install
  npm run dev      # http://localhost:4321/
  npm run build    # 8 pages
  ```
- **Add a featured project:** Edit `src/data/cv.json` `projects` array, then `npm run build` and `git push`.
- **Add a blog post:** Edit `src/pages/blog/[slug].astro` and `src/pages/blog/index.astro`, then `npm run build`.
- **Verify contributions:** Use `gh api search/issues?q=author:jacano+type:pr&per_page=100` — never invent data.
- **Deploy:** `git push` → wait for `Deploy to GitHub Pages` to succeed → `https://jacano.github.io/` is live.
