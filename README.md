# jacano.dev — Personal website

This is the personal site of **Juan Antonio Cano Salado** — Head of Engineering at Dedge Security.
It uses [Astro](https://astro.build) and GitHub Pages. The live site is at https://jacano.github.io/

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
npm run dev      # http://localhost:4321/
npm run build    # creates /dist
npm run preview
```

## Deploy

A push to `main` triggers `.github/workflows/deploy.yml`. The workflow builds the site and uploads `dist` to GitHub Pages.

## Add a post

Add an entry in `src/pages/blog/[slug].astro`. Update `getStaticPaths` and the `posts` object. Or migrate to `src/content/blog/*.md` with content collections.

## License

MIT © Juan Antonio Cano Salado
