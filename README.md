# jacano.dev — Personal website

This is the personal site of **Juan Antonio Cano Salado** — Head of Engineering at Dedge Security.
It uses [Astro](https://astro.build) and GitHub Pages. The live site is at https://jacano.github.io/website

The text follows [ASD-STE100 Simplified Technical English](https://github.com/AminBlg/SimpleEnglish). This makes the documentation clear for all readers.

## Sections

- **Home**: hero, about, experience, open source projects and blog preview.
- **CV**: printable resume. Use the Print button to create a PDF.
- **Blog**: 4 starter articles in HTML. Extend them via `src/pages/blog/[slug].astro` or content collections.

## Data

Edit `src/data/cv.json` to update experience, skills, projects and biography. The file updates all pages.

## Develop

Install dependencies. Then run the site.

```bash
npm install
npm run dev      # http://localhost:4321/website
npm run build    # creates /dist
npm run preview
```

## Deploy

A push to `main` triggers `.github/workflows/deploy.yml`. The workflow builds the site and uploads `dist` to GitHub Pages.

> LinkedIn source: https://www.linkedin.com/in/juanantoniocano/ (private profile — public data is Seville, Dedge Security, 14+ years, University of Seville). Update `cv.json` with your exact timeline for more detail.

## Add a post

Add an entry in `src/pages/blog/[slug].astro`. Update `getStaticPaths` and the `posts` object. Or migrate to `src/content/blog/*.md` with content collections.

## Style guide

The site uses Simplified Technical English (STE):

- Maximum 20 words for instructions, 25 words for descriptions.
- One instruction per sentence. One topic per paragraph. Maximum six sentences per paragraph.
- Active voice. Simple tenses only. Modals are `can`, `will`, `must`.
- Condition before command. No contractions. No `should`, `however`, `therefore`.
- One term for each concept. The term for the build configuration is `configuration`.

## License

MIT © Juan Antonio Cano Salado
