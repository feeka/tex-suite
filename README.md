# TeX Suite

[Website and downloads](https://feeka.github.io/tex-suite/) · [v0.3.2 release](https://github.com/feeka/tex-suite/releases/tag/v0.3.2) · [Report a problem or request a feature](https://github.com/feeka/tex-suite/issues/new)

A local desktop editor for LaTeX manuscripts and Beamer presentations. Edit visually or in source, compile with a local TeX engine, and preview the PDF.

TeX Suite is an **open-source side project for TeX enthusiasts, vibe coded with OpenAI Codex**. Put bugs, confusing behavior, template requests, and feature ideas in [GitHub Issues](https://github.com/feeka/tex-suite/issues); we can work through them together.

## What it does

- **Manuscripts:** Write in visual, split, or LaTeX mode. Add tables and figures; arrange figure panels side by side, in a grid, or one below another, and set their widths.
- **Presentations:** Edit Beamer slides visually or in LaTeX and compile a PDF. Start from built-in layouts or use a university theme's source.
- **Local files:** Autosave editable `.texsuite` projects, see their exact location, and export LaTeX source or a compiled PDF. LaTeX controls the final typeset layout.

## Download

Get an installer from the [TeX Suite website](https://feeka.github.io/tex-suite/) or [GitHub Releases](https://github.com/feeka/tex-suite/releases/tag/v0.3.2). Version 0.3.2 has Windows x64, macOS Intel and Apple silicon, and Linux x64 and ARM64 builds. The installers are unsigned. Windows x64 has been tested locally; the macOS and Linux builds were produced on native GitHub runners but not tested on this machine.

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
