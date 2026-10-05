# Every command this site needs, in one place.
#
# The GitHub workflow runs `make install` and `make validate`, so the checks that
# publish https://jacano.github.io/ are the same ones you run here. Nothing about
# the build, the checks or the deployment lives only in the workflow file.
#
#     make help
#
# The tools are the ones `package.json` asks for: Node 24 and npm 11.

NODE    ?= node
NPM     ?= npm
GH      ?= gh
REPO    ?= jacano/jacano.github.io
BRANCH  ?= main
MESSAGE ?=

.DEFAULT_GOAL := validate

.PHONY: help install dev build preview check test lint format validate clean publish deploy watch status

help:
	@echo make install    install the dependencies from the lock file
	@echo make dev        run the site locally, with hot reload
	@echo make build      build the static site into dist/
	@echo make preview    build, then serve dist/ the way the host serves it
	@echo make check      types and Astro diagnostics
	@echo make test       the unit tests
	@echo make lint       check the formatting
	@echo make format     write the formatting
	@echo make validate   check, test, lint and build: exactly what the workflow runs
	@echo make clean      remove the caches and the build output
	@echo make publish    validate, commit and push. It does not wait for anything
	@echo make deploy     publish the site now: triggers the workflow and returns
	@echo make watch      follow the deployment until it ends
	@echo make status     the last deployments and how they ended
	@echo make publish MESSAGE=what changed        the subject of the commit

install:
	$(NPM) ci

dev:
	$(NPM) run dev

build:
	$(NPM) run build

preview: build
	$(NPM) run preview

check:
	$(NPM) run check

test:
	$(NPM) run test

lint:
	$(NPM) run format:check

format:
	$(NPM) run format

# The four checks the workflow runs, in the same order.
validate: check test lint build

# The caches matter: Astro reuses the content store and the rendered Markdown in
# .astro and node_modules/.astro, and a stale cache hides a change in a plugin.
clean:
	$(NODE) -e "for (const p of ['dist', '.astro', 'node_modules/.astro']) require('node:fs').rmSync(p, { recursive: true, force: true })"

publish: validate
	$(NODE) scripts/publish.mjs --repo $(REPO) --branch $(BRANCH) --message "$(MESSAGE)"

# The site is published when you say so, not when you push. This triggers the
# workflow and returns; `make watch` is there for when you want to see it land.
deploy:
	$(GH) workflow run deploy.yml --repo $(REPO)
	@echo "deployment started. make watch to follow it, make status for the result"

watch:
	$(NODE) scripts/wait-deploy.mjs --repo $(REPO)

status:
	$(GH) run list --repo $(REPO) --limit 5
