# Greenpan Design

## CI/CD quick path

This repo now follows an **internal-release-first** path:

1. **CI** (`.github/workflows/ci.yml`) runs production build + regression on pushes, PRs, and manual dispatch.
2. **Internal release bundle** (`.github/workflows/internal-release.yml`) can be run manually to upload a ready-to-review artifact bundle built from the current repo state.
3. **Semantic release** (`.github/workflows/release.yml`) remains available for GitHub Releases / auto-update publishing, but now also gates on build + regression first.

### Local preflight

```bash
npm ci
npm run ci:check
```

This is the fastest local check before opening a PR or preparing an internal handoff.

If you want to inspect the current lint backlog as well, run:

```bash
npm run ci:check:full
```

## Auto update (Electron)

This app uses `electron-updater` + GitHub Releases for auto updates. End users will update automatically after you publish a new release.

### Publish a new version (automatic)

1. Commit changes to `main` using Conventional Commits (e.g. `feat:`, `fix:`).
2. Push to GitHub (`git push origin main`).
3. GitHub Actions runs the semantic-release workflow, verifies build/regression, builds installers, creates a GitHub Release, and uploads assets.

### Notes

- CI workflow: `.github/workflows/ci.yml`
- Internal release bundle workflow: `.github/workflows/internal-release.yml`
- Publish workflow: `.github/workflows/release.yml`
- Releases are published to `huydaobk/sanwichpanel_caculation`.
- Only `feat:` / `fix:` / `feat!:` commits trigger a semantic release.
- Auto update runs only for packaged builds (`app.isPackaged`).

## Internal release handoff

For internal releases, export and keep the paired JSON artifacts together:

- **Snapshot package** (`snapshot-project` or `snapshot-compare-set`) for later form reload / handoff.
- **Result package** (`result-package-project` or `result-package-compare-set`) for audit / review.

Both artifacts now carry a shared `internalReleaseTrack`, `internalReleaseStamp`, and `internalReleaseBundleLabel` so an internal handoff can verify that the snapshot and result package belong to the same release-stamped bundle without unpacking the whole app.

Recommended internal-release handoff bundle:

1. Export snapshot JSON.
2. Export result package JSON from the same reviewed state.
3. Deliver both files together and verify the `internalReleaseBundleLabel` matches in both artifacts.
4. If compare mode is used, keep the compare-set snapshot/result pair together as one handoff bundle.

### Internal release docs in this repo

- `docs/release/internal-release-checklist.md` — pre-release sanity/build/regression gate + artifact pairing checks.
- `docs/release/handoff-checklist.md` — what must be included and explicitly stated when handing an internal bundle to reviewer/tester.
- `docs/release/release-note-template.md` — fill-in template for short internal release notes.
- `docs/release/example-release-note.md` — ready-made example showing the expected level of detail/wording.

Suggested minimal flow: run the internal release checklist, export the paired snapshot/result artifacts from the same reviewed state, write a short release note using the template/example, then hand off the bundle using the handoff checklist.

## Internal bundle workflow usage

### CI only

Use this when you only want repo health feedback:

- Trigger `.github/workflows/ci.yml`
- Expect: `npm run build` + `npm run test:regression`
- Artifact: `web-dist`

### Internal release bundle

Use this when you need a downloadable package for internal review/handoff without creating a public GitHub Release:

- Trigger `.github/workflows/internal-release.yml`
- Optional input: `bundle_name`
- Optional input: `include_release_dir=true` if you want the workflow to attempt `npm run dist` as best effort
- Expected uploaded artifact: `internal-release-<bundle_name>`

Bundle contents are intentionally conservative by default:

- `dist/` web production build
- `docs-release/` release/handoff checklists
- checked-in demo bundles already present under `internal-release/` (if any)
- optional `release/` packaged output only when packaging succeeds in the workflow environment

### Semantic release

Use this only when you intentionally want GitHub Releases + auto-update assets:

- Trigger `.github/workflows/release.yml` or push qualifying commits to `main`
- Workflow now verifies build/regression before `semantic-release`
- This is the repo's publish path, not the default internal review path
