# Greenpan Design

## Auto update (Electron)

This app uses `electron-updater` + GitHub Releases for auto updates. End users will update automatically after you publish a new release.

### Publish a new version (automatic)

1. Commit changes to `main` using Conventional Commits (e.g. `feat:`, `fix:`).
2. Push to GitHub (`git push origin main`).
3. GitHub Actions runs `semantic-release` to auto-tag, create release notes, and publish installers.

### Notes

- The workflow is in `.github/workflows/release.yml`.
- Releases are published to `huydaobk/sanwichpanel_caculation`.
- Auto update runs only for packaged builds (`app.isPackaged`).
