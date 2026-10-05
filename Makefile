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

.PHONY: help install dev build preview check test lint format validate clean publish redeploy status

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
	@echo make publish    validate, commit, push and wait for the deployment
	@echo make redeploy   deploy the current commit again, without a new commit
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

redeploy:
	$(GH) workflow run deploy.yml --repo $(REPO)
	$(NODE) scripts/wait-deploy.mjs --repo $(REPO)

status:
	$(GH) run list --repo $(REPO) --limit 5
