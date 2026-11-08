# Third-party software and assets

PaperLoom is distributed under the GNU Affero General Public License version 3.
The RetainPDF foundation retains its MIT notice in `LICENSE-MIT`. Dependencies,
bundled runtimes, fonts, vendored code, and document fixtures retain their own
licenses. This file records the release review; it does not replace those licenses.

The local audit's package/version/license inventory is provided in
[`resources/licenses/COMPONENT_INVENTORY.csv`](resources/licenses/COMPONENT_INVENTORY.csv).
It includes build/development entries as labeled; it is an inventory, not a
substitute for package copyright notices, license texts, or corresponding source.

| Component | License / notice | Release handling |
| --- | --- | --- |
| PaperLoom first-party work | AGPL-3.0-only, root `LICENSE` | Provide complete corresponding source with every network deployment and binary release. |
| RetainPDF foundation | MIT, `LICENSE-MIT` | Preserve the original RetainPDF copyright and permission notice. |
| Electron, Node.js, Chromium | MIT and component-specific notices | Preserve the runtime's `LICENSE` and `LICENSES.chromium.html`; include dependency notices in packages. |
| Python runtime and packages | Python-2.0 and package-specific licenses | Preserve Python's license and installed distribution license files. |
| **PyMuPDF 1.26.5 / MuPDF** | **GNU AGPL-3.0**, as stated by installed package metadata | Official releases use the AGPL route and attach the exact upstream source archive identified in `CORRESPONDING_SOURCE.md`. |
| Typst and its dependencies | Apache-2.0 and component licenses | Include runtime and dependency license texts. |
| Source Han Serif SC | SIL Open Font License 1.1 | See `resources/fonts/README.md` and `LICENSE-OFL-1.1.txt`; distribute those notices with the unmodified fonts. |
| Latin Modern Math | GUST Font License | See `backend/packages/retainpdf2doc/assets/fonts/`; preserve the supplied license and manifest. |
| VisualTeX vendored source | MIT | See `backend/packages/retainpdf2doc/NOTICE.md` and `LICENSE-VISUALTEX`; include these notices with its bundled output. |
| DroidSansFallbackFull.ttf | Apache-2.0, embedded Google 2006 / Ascender notice | See `resources/fonts/NOTICE-DROID.txt` and `resources/licenses/Apache-2.0.txt`; bundled and installed copies have the same verified hash. |
| HTML Table Math 0.1.2 | Third-party Obsidian community plugin | Optional recommendation only; not bundled or installed by PaperLoom. |

The 2026-10-04 inventory includes npm packages and bundled Python's certifi and
pikepdf with MPL licenses, and Rust's
`webpki-roots` certificate data under CDLA-Permissive-2.0. Preserve their applicable
notices and source obligations where required; evaluate the final packaged files,
not only declared application dependencies.

Document fixtures and screenshots require separate permission. A sample's being
publicly readable does not establish redistribution rights. The 14 tracked PDFs,
golden-job extracts, and inherited README gallery need provenance and permission
records before a public source/archive release. Do not remove or replace user
fixtures as part of an audit without an agreed disposition.

See [the release verification report](docs/ops/reports/paperloom-pre-release-20261004.md)
for evidence, unresolved findings, and the current release gates.

On 2026-10-05 the maintainer selected the AGPL distribution route rather than an
Artifex commercial license. Official releases preserve the AGPL text and notices,
attach the complete PaperLoom source and the exact PyMuPDF 1.26.5 source archive,
and document the build inputs. The RetainPDF MIT copyright and permission notice
remain in `LICENSE-MIT`; the distributed PaperLoom work is not presented as
MIT-only.
The official licensing statement is at
https://pymupdf.readthedocs.io/en/latest/about.html#license-and-copyright.

The fixture review found explicit licenses in four PDFs: `cr5c00021-55p.pdf`
(CC-BY-4.0), `d3cs00837a-69p.pdf` (CC-BY-NC-4.0),
`s41524-tibetan-plateau-21p.pdf` and `yakubenko-halogen-lithium-10p.pdf`
(CC-BY-NC-ND-4.0). These terms require attribution and, where applicable,
noncommercial use and unchanged redistribution. Translated or otherwise adapted
extracts are not cleared by an ND source license. Other PDFs and inherited
screenshots remain unresolved; none were removed from the worktree.
