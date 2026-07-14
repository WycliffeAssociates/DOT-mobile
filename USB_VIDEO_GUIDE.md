# USB Video Guide

This guide explains how to prepare a USB drive so DOT Mobile can read or copy videos from it.

---

## Folder structure

```
/                                    ← root of the USB drive (or any sub-folder you select)
└── {language-folder}/               ← one folder per language (see table below)
    └── {BOOK}/                      ← 3-letter book code, e.g. MAT, MRK, JHN
        ├── 1.mp4
        ├── 2.mp4
        └── ...
```

**Example:**

```
/
├── benin-new-testament/
│   ├── MAT/
│   │   ├── 1.mp4
│   │   ├── 2.mp4
│   │   └── ...
│   ├── MRK/
│   │   └── 1.mp4
│   └── REV/
│       └── 22.mp4
└── ghana-new-testament/
    └── MAT/
        └── 1.mp4
```

---

## Language folder names

Each language folder can use **either** the slug name or the IETF language code — the app recognises both.

| Language | Slug (option 1) | IETF code (option 2) |
|---|---|---|
| Benin | `benin-new-testament` | `ase-x-beninsl` |
| Ghana | `ghana-new-testament` | `gse` |
| Côte d'Ivoire | `cote-d'ivoire-new-testament` | `ase-x-cotedivosl` |
| Togo | `togo-new-testament` | `ase-x-togolesesl` |
| Malawi | `malawi-new-testament` | `lws` |
| Tanzania | `tanzania-new-testament` | `tza` |
| Cameroon | `cameroon-new-testament` | `ase-x-camanglosl` |
| DRC (French) | `congo-french-nt` | `ase-x-drcfrnch` |
| DRC (Swahili) | `ase-x-bukavusl` | `ase-x-bukavusl` |
| Marathi | `marathi-nt` | `ins-x-marathsl` |
| Brazil | `brazil-nt` | `bzs` |
| Paraguay | `pys-nt` | `pys` |
| Malayalam | `ins-x-keralasl` | `ins-x-keralasl` |
| Mozambique | `mozambique-new-testament` | `mzy` |

---

## Book folder names

Use the standard 3-letter USFM book code. **Uppercase and lowercase are both accepted** — `MAT`, `mat`, and `Mat` all work.

### New Testament book codes

| Book | Code | Book | Code |
|---|---|---|---|
| Matthew | `MAT` | 1 Timothy | `1TI` |
| Mark | `MRK` | 2 Timothy | `2TI` |
| Luke | `LUK` | Titus | `TIT` |
| John | `JHN` | Philemon | `PHM` |
| Acts | `ACT` | Hebrews | `HEB` |
| Romans | `ROM` | James | `JAS` |
| 1 Corinthians | `1CO` | 1 Peter | `1PE` |
| 2 Corinthians | `2CO` | 2 Peter | `2PE` |
| Galatians | `GAL` | 1 John | `1JN` |
| Ephesians | `EPH` | 2 John | `2JN` |
| Philippians | `PHP` | 3 John | `3JN` |
| Colossians | `COL` | Jude | `JUD` |
| 1 Thessalonians | `1TH` | Revelation | `REV` |
| 2 Thessalonians | `2TH` | | |

---

## Video files

- Format: `.mp4`
- File name: the chapter number only — `1.mp4`, `2.mp4`, `28.mp4`, etc.
- No leading zeros needed.

---

## How to use

1. Plug the USB drive into the device.
   - **Android:** the app detects the drive automatically and prompts you.
   - **iOS:** tap the USB icon (top-left of the home screen) to open the folder picker manually.
2. Select the root folder on the USB drive (or whichever folder contains the language sub-folders).
3. The app lists the languages it found. Tap **OK** or check "Copy videos to device" if you want to save them for offline use without the drive.

### Copying videos to the device

When you choose to copy, you can select individual languages, books, or chapters before tapping **Copy**. Copied videos are stored in the app's private storage and remain available after the drive is removed.
