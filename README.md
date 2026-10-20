# TeX Suite

A local desktop editor for LaTeX manuscripts and Beamer presentations. Edit visually or in source, compile with a local TeX engine, and preview the PDF.

**An open-source side project for TeX enthusiasts, vibe coded with OpenAI Codex.** Found a bug, missing feature, awkward workflow, or broken template? [Put it in GitHub Issues](https://github.com/feeka/tex-suite/issues/new) so we can fix it together.

<img src="docs/icons/manuscript.svg" width="22" alt=""> **Manuscripts** · <img src="docs/icons/slides.svg" width="22" alt=""> **Beamer slides** · <img src="docs/icons/local.svg" width="22" alt=""> **Local projects** · <img src="docs/icons/issues.svg" width="22" alt=""> **Open feedback**

## Download

Use the [download page](https://feeka.github.io/tex-suite/) or [GitHub Releases](https://github.com/feeka/tex-suite/releases) for installers. Version 0.3.2 provides Windows x64, macOS Intel and Apple silicon, and Linux x64 and ARM64 builds through the [release workflow](.github/workflows/desktop-build.yml). The installers are unsigned. Windows x64 has been built and tested locally; macOS and Linux builds require their native GitHub runners and have not been verified on this machine.

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

## Files and templates

Projects autosave as `.texsuite` files. **File location** beside the save status shows the full path and selects the file in the system file manager. PDF, LaTeX, Word, and portable project exports use the location chosen in their Save dialogs.

Journal formats use real LaTeX classes. Publisher and university class files are installed or downloaded as needed, not bundled in this repository. Check current submission instructions before using a journal template. Institutional logos are omitted.

## License

The app source is [MIT licensed](LICENSE). Bundled TeX Gyre fonts use the separate [GUST Font License](assets/GUST-FONT-LICENSE.txt). Library notices are in [THIRD-PARTY.txt](THIRD-PARTY.txt) and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
