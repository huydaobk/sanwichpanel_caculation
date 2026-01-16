# Greenpan Design

## Auto update (Electron)

This app uses `electron-updater` + GitHub Releases for auto updates. End users will update automatically after you publish a new release.

### Publish a new version

1. Update `version` in `package.json`.
2. Create a git tag and push it:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
3. GitHub Actions will build and publish the installer automatically.

### Notes

- The workflow is in `.github/workflows/release.yml`.
- Releases are published to `huydaobk/sanwichpanel_caculation`.
- Auto update runs only for packaged builds (`app.isPackaged`).
