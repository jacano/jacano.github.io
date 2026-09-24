# AGENTS.md — jacano.github.io

Read this before you change code.

## Overview

- Personal site of **Juan Antonio Cano Salado**. Canonical public URL is **https://jacano.github.io/**.
- Stack is **Astro** (static) with GitHub Pages. Language is **English only**.
- Do not use `jacano.dev` as the site URL or brand unless a custom domain is configured and verified; no custom-domain configuration is currently present in this repository.
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
- Posts tagged `Archive · ...` are historical/re-published content: keep them out of the home-page recent preview and group them under the archive section in the blog index. Tag prefixes are the current editorial convention.
- **Tables carry numbers, so align them.** A data table gets a header row, row labels short enough not to wrap, and numeric columns right aligned through `---:` in the separator line. The explanation belongs in the sentence above or below the table, never inside a cell. The post layout already gives every table a header band, alternating rows, tabular figures and a first column that pins itself on a narrow screen, so a table needs no decoration of its own.
- **Illustrate every article.** Every article should carry at least one diagram, chart, or image that explains its topic: a flow, a comparison, a result chart, an annotated screenshot. Treat the figure as a part of the writing, not as decoration, so make it carry a fact that the prose would take a paragraph to say. A chart that shows numbers must be generated from the data behind them, never typed by hand, so that it cannot drift from the result.
  - Put the file in `public/blog/` and reference it as `/blog/<name>.svg`.
  - Use a vector (`.svg`) for a diagram, a chart, or an infographic: it stays sharp at every size and it is small. Use a raster (`.png`, `.jpg`) for a screenshot or a photograph.
  - Write the alt text as a full sentence that states what the figure shows, including the numbers that matter, because for a reader who cannot see it the alt text is the figure.
- **Site text** follows **Simple English (ASD-STE100)** via https://github.com/AminBlg/SimpleEnglish. Short sentences, active voice, no contractions.
- **Social image:** `public/og-image.png` (1200×630). Use PNG or JPG. Social sites do not show an SVG.
- **Avatar:** `public/avatar.jpg` plus `public/avatar.webp`. The pages use `<picture>`. Keep both files small.
- **Icons:** `public/favicon.svg` plus `public/apple-touch-icon.png` at 180x180. iOS does not take an SVG for the touch icon.

## Print

The CV is read as a PDF most of the time, so `src/pages/cv.astro` is a print
document as well as a page. Four rules keep the export complete and clean.

- **Keep the print layout in one column.** A grid or a flex box that breaks
  across pages loses its content in Chromium, and the reader sees an empty
  page.
- **Never put `break-inside: avoid` on a box that can grow past one page.**
  Chromium then drops the whole box from the PDF. Use it on a short entry, a
  project card or a block of skills, not on a container.
- **Reset the reveal animation for print.** A `.card` sits at `opacity: 0`
  until it scrolls into view, and the print engine never scrolls. The global
  style resets `.fade-in` and a `beforeprint` handler reveals the cards. Keep
  both: the CSS covers a headless export, the handler covers the print dialog.
- **Hide the nav and the footer from the global style.** Astro scopes the
  rules of a page `<style>`, so a rule in `cv.astro` cannot reach an element
  that `Layout.astro` renders.

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
