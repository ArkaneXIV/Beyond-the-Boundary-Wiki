# BTB Wiki

A dark, "System"-themed worldbuilding wiki — Markdown + [MkDocs Material],
deployed to GitHub Pages. Authored locally and published by pushing to `main`.

Aesthetic: glowing translucent cyan panels, corner-bracket frames, and
window-chrome title bars, inspired by manhwa "System" interfaces.

## Features

- Full-text search, navigation sidebar, dark mode
- Cross-linking, tags, and folder-based categories
- Mermaid diagrams, admonitions/callouts, tables
- Five custom "System" callout flavors: `system`, `profile`, `scenario`, `reward`, `penalty`
- Embedded images with lightbox zoom
- A custom fictional calendar driven by a JSON file
- A local GUI editor with live preview and one-click deploy

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
```

## Local development

Live-reload preview in the browser:

```bash
mkdocs serve
```

Strict build (validates links — same check CI runs):

```bash
mkdocs build --strict
```

## The editor GUI

A local Flask app for editing pages and the calendar, with a live System-themed
preview and a commit/push button.

```bash
python editor/app.py
```

This spawns `mkdocs serve` for the preview, opens `http://127.0.0.1:5000/`, and
lets you:

- create new pages (category + title + tags),
- edit any page or the calendar JSON (Ctrl/Cmd+S to save),
- preview live in the right-hand panel,
- **Deploy** — builds and publishes to `gh-pages` (and backs up source to `main`).

Localhost only — it has no authentication; do not expose it to a network.

## Authoring

See the in-wiki **Style Guide** (`docs/style-guide.md`) for the full feature
reference. Content lives under `docs/`:

```
docs/characters/  docs/locations/  docs/factions-lore/  docs/items-bestiary/
```

Each page may start with front matter for tags:

```yaml
---
tags:
  - character
---
```

Cross-link with relative Markdown links: `[X](../locations/x.md)`.

## Calendar

The calendar at `docs/calendar.md` renders from `docs/assets/data/calendar.json`.
Schema (months/days/weekdays/eras are all arbitrary; `month`/`day` are 1-based):

```json
{
  "calendarName": "The World Calendar",
  "weekdays": ["Sol", "Lun", "Ter", "Mer", "Jov", "Ven", "Sab"],
  "months": [{ "name": "Frostwane", "days": 30 }],
  "eras": [{ "name": "System Era", "abbr": "SE", "startYear": 1 }],
  "events": [
    { "era": "SE", "year": 1, "month": 1, "day": 1,
      "title": "The First Scenario", "type": "scenario",
      "link": "../items-bestiary/example-scenario/",
      "desc": "The System awakens." }
  ]
}
```

Each month begins on the first weekday (a fixed calendar). Event days glow and
show a popover on hover/focus with a link to the related record.

## Deployment

The site is published to the `gh-pages` branch and served by GitHub Pages
(Settings → Pages → Source: branch `gh-pages` / root — already configured).

Deploy any time with:

```bash
mkdocs gh-deploy --force
```

…or click **Deploy** in the editor GUI, which does the same and also commits the
source to `main`.

**Optional — push-to-deploy via GitHub Actions.** The workflow at
`.github/workflows/deploy.yml` (kept on disk, not yet pushed) makes every push to
`main` auto-deploy. To enable it, grant your `gh` token the `workflow` scope once,
then push it:

```bash
gh auth refresh -h github.com -s workflow
git add .github/workflows/deploy.yml
git commit -m "Add deploy workflow"
git push
```

Live site: <https://ArkaneXIV.github.io/Beyond-the-Boundary-Wiki/>

[MkDocs Material]: https://squidfunk.github.io/mkdocs-material/
