# TeX Suite

A local desktop editor for LaTeX manuscripts and Beamer presentations. Edit visually or in source, compile with a local TeX engine, and preview the PDF.

## Download

Use the repository’s **Releases** page for installers. Version 0.3.2 provides Windows x64, macOS Intel and Apple silicon, and Linux x64 and ARM64 builds through the [release workflow](.github/workflows/desktop-build.yml). The installers are unsigned. Windows x64 has been built and tested locally; macOS and Linux builds require their native GitHub runners and have not been verified on this machine.

The [landing page source](docs/index.html) is published through [GitHub Pages](.github/workflows/pages.yml) and links directly to the release files.

## Build and run

Requires Node.js 22 or later and npm.

```sh
npm ci
npm test
npm run build
npm start
```

Build an installer on the matching operating system:

| System | Command | Output |
| --- | --- | --- |
| Windows x64 | `npm run dist:win` | `.exe` |
| macOS Intel + Apple silicon | `npm run dist:mac` | `.dmg` |
| Linux, host architecture | `npm run dist:linux` | `.AppImage`, `.deb` |

Output is written to `release-v032/`. A LaTeX distribution is required to compile documents; the app detects one or can set up TinyTeX. Initial setup and missing packages require internet access.

## Publish a release

Push this folder as the repository root, then push tag `v0.3.2`. The [release workflow](.github/workflows/desktop-build.yml) checks the tag against `package.json`, builds on five native runners, verifies all seven files, and attaches them with SHA-256 checksums to one GitHub Release. A manual workflow run builds downloadable Actions artifacts without publishing a release.

For a new GitHub repository, replace `OWNER/REPO` and run:

```sh
git init -b main
git add .
git commit -m "TeX Suite 0.3.2"
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
git tag v0.3.2
git push origin v0.3.2
```

For the website, enable **GitHub Pages → GitHub Actions** in the repository settings. The [Pages workflow](.github/workflows/pages.yml) deploys the matching landing page from `main`; its download links work after the release is published. To preview the site locally, run `node scripts/build-site.mjs owner/repository` and open `site/index.html`.

## Files and templates

Projects autosave as `.texsuite` files. **File location** beside the save status shows the full path and selects the file in the system file manager. PDF, LaTeX, Word, and portable project exports use the location chosen in their Save dialogs.

Journal formats use real LaTeX classes. Publisher and university class files are installed or downloaded as needed, not bundled in this repository. Check current submission instructions before using a journal template. Institutional logos are omitted.

## License

The app source is [MIT licensed](LICENSE). Bundled TeX Gyre fonts use the separate [GUST Font License](assets/GUST-FONT-LICENSE.txt). Library notices are in [THIRD-PARTY.txt](THIRD-PARTY.txt) and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
