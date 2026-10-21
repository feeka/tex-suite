# TeX Suite

A local desktop editor for LaTeX manuscripts and Beamer presentations. Work visually or edit LaTeX source, then compile and preview a PDF.

**[Download from version tags](https://github.com/feeka/tex-suite/tags)** · **[Report a problem or request a feature](https://github.com/feeka/tex-suite/issues/new)**

Open the newest tag, then its **Release** and choose the installer for your system under **Assets**. The “Source code” archives are not installers. Windows x64 is tested locally. Linux x64 and ARM64 packages are built on native runners but need hands-on testing.

**macOS:** The v0.3.7 DMGs are unsigned and unnotarized. A user has confirmed that macOS rejects the Apple silicon app as damaged. Do not use those Mac downloads. Future Mac releases must pass Developer ID signing, Apple notarization, and Gatekeeper checks before publication.

## Current scope

- **Beamer:** Edit slides visually or in LaTeX source; add text, lists, images, shapes, tables, notes, formulas, and references to labeled slides or equations. Compile and preview the resulting PDF.
- **Manuscripts:** Write in a flowing editor or LaTeX source; add inline and displayed formulas, label headings/figures/equations, and insert cross-references alongside tables, images, and figure groups.
- **Files:** Projects autosave locally as `.texsuite` files. **File location** in the editor shows where a project is saved. Export source or PDF separately.

## Still lacking

- The visual canvas is not an exact preview of TeX typesetting. Formula controls show their LaTeX source; check the compiled PDF for typeset math, final placement, and pagination.
- Advanced LaTeX and Beamer features, including overlays, custom commands, bibliography workflows, and complex page layouts, require source editing. The visual controls do not cover all of LaTeX or Microsoft Office.
- Journal and university templates cover only a limited set. A template does not guarantee compliance with current submission rules, and required TeX packages may need to be installed.
- Word export keeps formula source and reference labels as text, not native Word equations or live cross-reference fields.
- There is no real-time collaboration or cloud sync. Keep copies of important projects yourself.
- Linux installers still need hands-on user testing. Please report failures with the operating system, template, and relevant compiler log.

A local TeX distribution is needed to compile. TeX Suite can detect an existing installation or set up TinyTeX; first-time setup and missing packages may need internet access.

TeX Suite is an **open-source side project for TeX enthusiasts, vibe coded with OpenAI Codex**. Please put bugs, confusing behavior, and feature requests in [Issues](https://github.com/feeka/tex-suite/issues) so we can work through them together.

Source code is [MIT licensed](LICENSE). Bundled TeX Gyre fonts use the [GUST Font License](assets/GUST-FONT-LICENSE.txt); other notices are in [THIRD-PARTY.txt](THIRD-PARTY.txt) and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
