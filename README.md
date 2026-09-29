# jacano.github.io — Personal website

Personal site of **Juan Antonio Cano Salado** — Software Engineer. Blog, CV and projects.
It uses [Astro](https://astro.build) and GitHub Pages at https://jacano.github.io/. This is the canonical public URL; the repository does not configure a custom domain.

## Sections

- **Home**: hero, about, experience, open source projects and blog preview.
- **CV**: printable resume. Use the Print button to create a PDF.
- **Blog**: articles in Markdown via content collections (`src/content/blog/*.md`). Search, tag filter, RSS at `/rss.xml`, prev/next navigation.

## Data

Edit `src/data/cv.json` to update experience, skills, projects and biography. The file updates all pages. The counts that a service owns (stars, forks, NuGet downloads) come from `npm run sync:stats`, which reads GitHub and NuGet and rewrites the file.

## Develop

Install dependencies. Then run the site.

```bash
npm install
npm run dev           # http://localhost:4321/
npm run check         # astro check (types and Astro diagnostics)
npm test              # vitest: the helpers and the figure reader
npm run format:check  # prettier; npm run format writes
npm run build         # creates /dist (pages + rss.xml + sitemaps)
npm run preview
npm run sync:stats    # refresh the numbers of the CV from the APIs
```

Needs Node `>=24` and npm `>=11` (see `.nvmrc`).

Fonts are downloaded at build time and served from this site, so a visitor makes no request to a third party. The figures of an article get their width and height from the file itself, which the build reads.

## Deploy

A push to `main` triggers `.github/workflows/deploy.yml`. The workflow builds the site and uploads `dist` to GitHub Pages.

## Add a post

Create `src/content/blog/<slug>.md` with frontmatter (`title`, `date`, `tag`, `excerpt`). The schema lives in `src/content.config.ts`. Home preview, blog list, RSS and sitemap pick the post up automatically. Slugs must stay English-only. The reading time comes from the words of the post, so you do not set it by hand.

## License

MIT. See the LICENSE file.
