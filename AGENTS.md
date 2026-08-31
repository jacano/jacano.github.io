# AGENTS.md — jacano.github.io

This file is for agents that work on this repository. It holds all takeaways from the build session 2026-08-31. Read it before you change code.

## 1. Project overview

- This is the personal site of **Juan Antonio Cano Salado** — Head of Engineering at Dedge Security.
- Stack is **Astro** (static) with GitHub Pages. Live site is **https://jacano.github.io/** (user site, base `/`).
- Old project site was `jacano/website` (base `/website`, URL `https://jacano.github.io/website/`). It is now **archived** and read-only. Do not push to it. Source was moved to this repo on 2026-08-31 (`cd5b1f9`). Current work is only in `jacano/jacano.github.io` / `D:\dev\jacano.github.io`.
- Content language is **English only**. Site text follows **ASD-STE100 Simplified Technical English** via https://github.com/AminBlg/SimpleEnglish. Rules are 20 words per instruction, 25 per description, one instruction per sentence, active voice, simple tenses, `can/will/must` only, condition before command, no contractions, one term per concept (`configuration` for build config). Footer shows `Text follows Simple English (ASD-STE100)` with link. README was simplified and does not list the rules.
- Main sections are Home (hero, about, experience, featured projects, Work with Microsoft, blog preview), CV (printable), Blog (5 posts).

## 2. Repository state

- Main repo: `jacano/jacano.github.io` — default branch `main` — has Pages enabled with `build_type: workflow`, `html_url: https://jacano.github.io/`.
- Archived repo: `jacano/website` — `archived: true`, `has_pages: true`, still serves old build at `https://jacano.github.io/website/` but is not updated.
- Local paths on dev machine are `D:\dev\jacano.github.io` (active) and `D:\dev\website` (archived, do not use). Git remote for both is `git@github.com:jacano/...` via SSH (`C:\Program Files\GitHub CLI\gh.exe` auth as `jacano`, key at `%USERPROFILE%\.ssh\id_ed25519`).

## 3. Tech stack and versions

- **Node:** `24.20.0` (latest LTS 2026-08-26), **npm:** `11.19.0`. Local Node was `22.15.0` and caused `EBADENGINE undici@8.10.1 requires >=22.19.0`. Fix was to install Node 24 to `C:\Program Files\nodejs` and add user PATH `C:\Users\jacano\AppData\Local\nodejs`. Enforce with `.nvmrc` (`24`) and `package.json` `engines: { "node": ">=24.0.0", "npm": ">=11.0.0" }`. Workflow uses `actions/setup-node@v5` with `node-version: 24`.
- **Astro:** `7.2.9` (up from `4.16.18`), **@astrojs/rss:** `4.0.19`. No vulnerabilities (`npm audit` → `found 0 vulnerabilities`, `npm outdated` empty).
- **Actions (all latest, Node 24):** `actions/checkout@v5` (was v4), `actions/setup-node@v5` (was v4), `actions/upload-pages-artifact@v5` (was v3/v4), `actions/deploy-pages@v5` (was v4). Old versions triggered `Node.js 20 is deprecated` warnings.
- **Config:** `astro.config.mjs` has `site: 'https://jacano.github.io'` and `base: '/'`. For user site `jacano.github.io` the base must be `/`. Project site used `/website`.
- **Build output:** `output: static`, `dist` is `output` and is gitignored (`node_modules`, `dist`, `.astro` in `.gitignore`). Do not commit `dist`.

## 4. Warnings that were fixed

- **EBADENGINE:** Fixed by Node 24 + `.nvmrc` + `engines`.
- **allowScripts:** `esbuild@0.28.2 (postinstall: node install.js)` caused `npm warn allow-scripts ... not yet covered`. Fix was `npm approve-scripts esbuild` → added `allowScripts: { "esbuild@0.28.2": true }` to `package.json`. After that `npm install` shows no warning.
- **punycode DEP0040:** `(node:2136) [DEP0040] The punycode module is deprecated` from `undici`/`whatwg-url`. Fix is not to patch deps but to suppress via `NODE_OPTIONS=--disable-warning=DEP0040`. Use `cross-env` for Windows: scripts are `cross-env NODE_OPTIONS="--disable-warning=DEP0040 --disable-warning=DEP0169" astro dev/build/preview`.
- **url.parse DEP0169:** `(node:2180) [DEP0169] url.parse() behavior is not standardized` — same fix, add `--disable-warning=DEP0169`. Workflow has top-level `env: NODE_OPTIONS: --disable-warning=DEP0040 --disable-warning=DEP0169` so it covers both `build` and `deploy` jobs (earlier fix only set it on `build`, deploy still warned). `cross-env@10.1.0` is in `devDependencies`.
- **Cache hit:** `Cache hit for: node-cache-...` from `setup-node@v5` with `cache: npm` is not a warning. It means cache restored. No action.
- All warnings are now gone. Latest workflow `33410607232` shows `✓ build 17s ✓ deploy 8s` with no Node 20 or punycode annotations.

## 5. Content and data

- **Source of truth for CV:** `src/data/cv.json`. It drives Home, CV page and Featured projects. It has `name`, `title`, `location: Seville, Andalusia, Spain`, `email: jacanosalado@gmail.com`, `summary`, `about`, `experience` (Dedge 2023-Present, Trax 2021-2023, Open Source 2010-2021), `education: University of Seville`, `skills`, `languages`, `projects`, `microsoftContributions`.
- **Featured projects (8, all original except innosetup-tool which is a fork but highlighted as requested):** `CameraTF` (11★, 8 forks, C#), `innosetup-tool` (NuGet 541 downloads, 6.2.2, Inno Setup, https://www.nuget.org/packages/innosetup-tool), `BulletCS` (1★, C++), `Box2DCS` (C++), `ManagedCrunch` (4★, C++), `ManagedXZLZMA` (1★, C), `PdbRewriter` (C#), `YoloTestSharp` (C#). Added in this session: `innosetup-tool`, `CameraTF`, `BulletCS`. `XamlStyler` (4★) was considered but is a fork so excluded per user request `forget about the ones that I forked`.
- **Blog (5 posts, all in `src/pages/blog/[slug].astro`):**
  - `web3-security-posture-management` (2025-11-15, Web3 Security, 7 min)
  - `c-sharp-interop-nativo` (2025-08-02, C# / C++, 10 min)
  - `head-of-engineering-remoto` (2025-05-20, Leadership, 6 min)
  - `primer-post` (2025-04-10, Personal, 3 min)
  - `realtime-mobile-object-detector-xamarin-android` (2019-07-04, Xamarin · Mobile, 8 min) — republished 2026-08-31 from `https://web.archive.org/web/20240518135953/https://geeks.ms/xamarinteam/2019/07/04/realtime-mobile-object-detector-in-xamarin-android/` (Plain Concepts Xamarin Team). Original author Juan Antonio Cano, code `github.com/jacano/CameraTF`. Archive note preserved. Images removed because Wayback `im_/` URLs were broken (3 images: `Untitled-186x300.png`, `Untitled1-300x234.png`, `giphy.gif` replaced with text). Typos fixed: `com.hardware.camera2` → `android.hardware.camera2`, `a SSD` → `an SSD`, `NetStandard` → `.NET Standard`, `Flatbuffer` → `FlatBuffer`, `Nv21` → `NV21`.
- **Microsoft collaboration (verified, not made up):** Section `Work with Microsoft` on Home, verified via GH API `search/issues?q=author:jacano+type:pr` → `total_count 17`, 13 in Microsoft orgs. GH API commands used:
  ```
  gh api "search/issues?q=author:jacano+type:pr&per_page=100"
  gh api "search/issues?q=author:jacano+org:microsoft+type:pr&per_page=100" # 7
  gh api "search/issues?q=author:jacano+org:dotnet+type:pr&per_page=100" # 4
  gh api "search/issues?q=author:jacano+org:dotnet-architecture+type:pr&per_page=100" # 2
  ```
  Groups are `dotnet/corert` 4 PRs all merged (4725, 4736, 4769, 4776 — CLR/CoreRT, WASM, IL opcodes, tags `arch-wasm`), `microsoft/TailwindTraders-Mobile` 5 merged (12,13,19,44,46), `microsoft/ailab` 2 (15 merged, 14 duplicate closed), `dotnet-architecture/eShopOnContainers` 2 (648 merged, 651 closed). Other 4 are `mono/mono#14354`, `dadhi/DryIoc#73`, `Homebrew#34391`, `#33878`. Data stored in `cv.json` under `microsoftContributions`. Do not invent contributions. Re-verify with GH API if needed. X account `https://x.com/jacano35` (820 posts, 322 followers, joined July 2010) was checked via `webfetch` and search — X requires login, so full history not scrapeable. No long-form article found there beyond the Geeks.ms post.

## 6. Pages and deployment

- **User site `jacano.github.io`:** `gh api repos/jacano/jacano.github.io/pages` → `build_type: workflow`, `html_url: https://jacano.github.io/`, `status: built`. Workflow is `.github/workflows/deploy.yml` with `permissions: contents: read, pages: write, id-token: write`, `concurrency: group: pages`, `env: NODE_OPTIONS: --disable-warning=DEP0040 --disable-warning=DEP0169`, jobs `build` (checkout@v5, setup-node@v5 node 24 cache npm, `npm ci`, `npm run build`, `upload-pages-artifact@v5` path `./dist`) and `deploy` (deploy-pages@v5, environment `github-pages`). Push to `main` triggers deploy. Legacy `pages build and deployment` workflow is gone after switching to `workflow` (earlier both ran and legacy overwrote the site with README).
- **Project site `jacano/website`:** Now archived (`gh api --method PATCH repos/jacano/website -f archived=true` → `archived: true`). Final commit is redirect README. It still has Pages `has_pages: true` at `https://jacano.github.io/website/` but is read-only. Do not use.
- **Local GH CLI:** `C:\Program Files\GitHub CLI\gh.exe` version `2.98.0`, auth as `jacano` via keyring, protocol `ssh` (`git@github.com:jacano/...`), `gh auth status` shows `Logged in to github.com account jacano`.

## 7. How to work on this repo

- **Develop:**
  ```
  cd D:\dev\jacano.github.io
  npm install          # audited 203 packages, 0 vulnerabilities, funding 77
  npm run dev          # http://localhost:4321/
  npm run build        # 8 pages, dist is ignored
  npm run preview
  ```
- **Add a featured project:** Edit `src/data/cv.json` `projects` array (keep Simple English, short sentences). Example entry has `name`, `description` (one sentence, STE), `url`, `lang`. Then `npm run build` and `git push`.
- **Add a blog post:** Edit `src/pages/blog/[slug].astro` — add slug to `getStaticPaths` and object to `posts` with `title`, `date`, `tag`, `read`, `content` (HTML). Also edit `src/pages/blog/index.astro` to list it. Build with `npm run build` (8→9 pages). Keep English only.
- **Add GH-verified contributions:** Use `gh api search/issues?q=author:jacano+type:pr&per_page=100` to get `total_count` and items. Add to `cv.json` `microsoftContributions` and to Home section `Work with Microsoft` in `src/pages/index.astro` if needed. Never make up data.
- **Deploy:** `git add -A && git commit -m "..." && git push` → `gh run list --repo jacano/jacano.github.io --limit 3` → wait for `Deploy to GitHub Pages` `completed success` (about 30s). Then `gh api repos/jacano/jacano.github.io/pages --jq '{html_url, status}'` should be `built`, and `https://jacano.github.io/` shows the site.
- **Do not touch archived repo:** `D:\dev\website` is archived. If you must, read it but do not push. Source of truth is `D:\dev\jacano.github.io`.

## 8. Gotchas

- User site base must stay `/`. Do not change `astro.config.mjs` to `/website` again. Old project site used `/website`, user site uses `/`.
- Do not commit `dist`, `node_modules`, `.astro`. They are gitignored. Pages artifact is built in Actions.
- Do not re-enable `legacy` Pages. Keep `build_type: workflow`. If you see `pages build and deployment` legacy workflow alongside `Deploy to GitHub Pages`, the legacy one will overwrite the site with README rendering.
- SSH key is at `%USERPROFILE%\.ssh\id_ed25519` (copied from `D:\git_keys\.ssh_personal\id_ed25519`). `gh` uses `C:\Windows\System32\OpenSSH\ssh.exe` (`core.sshcommand`).
- X/Twitter history at `https://x.com/jacano35` is behind login and not fully fetchable via `webfetch`. Use Nitter or API if you need deeper history, but the 820 posts are mostly personal.
- All 74 GitHub repos were listed via `gh api users/jacano/repos?per_page=100`. Original repos are 23 (`fork==false`). Top original is `CameraTF` 11★. If user says `forget about the ones that I forked`, filter with `select(.fork==false)`.
