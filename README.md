# jacano.dev — Personal website

Personal site of **Juan Antonio Cano Salado** — Software Engineer. Blog, CV and projects.
It uses [Astro](https://astro.build) and GitHub Pages at https://jacano.github.io/

## Sections

- **Home**: hero, about, experience, open source projects and blog preview.
- **CV**: printable resume. Use the Print button to create a PDF.
- **Blog**: 6 articles in Markdown via content collections (`src/content/blog/*.md`). Search, tag filter, RSS at `/rss.xml`, prev/next navigation.

## Data

Edit `src/data/cv.json` to update experience, skills, projects and biography. The file updates all pages.

## Develop

Install dependencies. Then run the site.

```bash
npm install
npm run dev      # http://localhost:4321/
npm run build    # creates /dist (10 pages + rss.xml + sitemaps)
npm run preview
```

Needs Node `>=24` and npm `>=11` (see `.nvmrc`).

## Deploy

A push to `main` triggers `.github/workflows/deploy.yml`. The workflow builds the site and uploads `dist` to GitHub Pages.

## Add a post

Create `src/content/blog/<slug>.md` with frontmatter (`title`, `date`, `tag`, `excerpt`, `read`). The schema lives in `src/content.config.ts`. Home preview, blog list, RSS and sitemap pick the post up automatically. Slugs must stay English-only.

## License

MIT © Juan Antonio Cano Salado
