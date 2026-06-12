"""
Local editor GUI for the BTB Wiki.

Run:  python editor/app.py
Opens a browser editor that edits Markdown + the calendar JSON in place,
shows a live MkDocs preview (spawned automatically), and commits/pushes
to deploy. Localhost only — no auth, not for public exposure.
"""
from __future__ import annotations

import atexit
import json
import subprocess
import sys
import webbrowser
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for

# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS = REPO_ROOT / "docs"
MKDOCS_YML = REPO_ROOT / "mkdocs.yml"
CALENDAR_JSON = DOCS / "assets" / "data" / "calendar.json"

EDITOR_PORT = 5000
MKDOCS_PORT = 8000

CATEGORIES = {
    "characters": "Characters",
    "locations": "Locations",
    "factions-lore": "Factions & Lore",
    "items-bestiary": "Items & Bestiary",
}

app = Flask(__name__)


@app.context_processor
def inject_globals():
    return {"preview_root": PREVIEW_BASE}


# ---- helpers --------------------------------------------------------------
def base_path() -> str:
    """Path component of site_url, e.g. '/BTB-wiki/'. Falls back to '/'.

    Read the site_url line directly — mkdocs.yml uses !!python/name tags that
    a plain yaml.safe_load can't construct.
    """
    url = ""
    for line in MKDOCS_YML.read_text(encoding="utf-8").splitlines():
        if line.startswith("site_url:"):
            url = line.split(":", 1)[1].strip().strip("'\"")
            break
    if "://" in url and "/" in url.split("://", 1)[1]:
        path = "/" + url.split("://", 1)[1].split("/", 1)[1]
    else:
        path = "/"
    return path if path.endswith("/") else path + "/"


PREVIEW_BASE = f"http://127.0.0.1:{MKDOCS_PORT}{base_path()}"


def safe_doc(relpath: str) -> Path:
    """Resolve a docs-relative path, refusing anything outside docs/."""
    target = (DOCS / relpath).resolve()
    if DOCS not in target.parents and target != DOCS:
        abort(400, "Path escapes docs/")
    return target


def list_pages() -> list[dict]:
    pages = []
    for p in sorted(DOCS.rglob("*.md")):
        rel = p.relative_to(DOCS).as_posix()
        pages.append({"path": rel, "name": rel})
    return pages


def preview_url(relpath: str) -> str:
    rel = relpath[:-3] if relpath.endswith(".md") else relpath  # strip .md
    if rel == "index":
        return PREVIEW_BASE
    if rel.endswith("/index"):
        return PREVIEW_BASE + rel[: -len("index")]
    return PREVIEW_BASE + rel + "/"


def run_git(args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True
    )
    return proc.returncode, (proc.stdout + proc.stderr).strip()


# ---- routes ---------------------------------------------------------------
@app.route("/")
def index():
    return render_template(
        "index.html", pages=list_pages(), categories=CATEGORIES
    )


@app.route("/edit/<path:relpath>")
def edit(relpath):
    target = safe_doc(relpath)
    if not target.exists():
        abort(404)
    return render_template(
        "edit.html",
        relpath=relpath,
        content=target.read_text(encoding="utf-8"),
        preview=preview_url(relpath),
    )


@app.route("/save", methods=["POST"])
def save():
    data = request.get_json(force=True)
    target = safe_doc(data["relpath"])
    target.write_text(data["content"], encoding="utf-8")
    return jsonify(ok=True)


@app.route("/new", methods=["POST"])
def new_page():
    category = request.form["category"]
    title = request.form["title"].strip()
    tags = [t.strip() for t in request.form.get("tags", "").split(",") if t.strip()]
    if category not in CATEGORIES:
        abort(400, "Unknown category")
    slug = "".join(c if c.isalnum() else "-" for c in title.lower()).strip("-")
    relpath = f"{category}/{slug}.md"
    target = safe_doc(relpath)
    if target.exists():
        abort(400, "Page already exists")
    fm = ""
    if tags:
        fm = "---\ntags:\n" + "".join(f"  - {t}\n" for t in tags) + "---\n\n"
    target.write_text(f"{fm}# {title}\n\nWrite the page here.\n", encoding="utf-8")
    return redirect(url_for("edit", relpath=relpath))


@app.route("/calendar")
def calendar():
    return render_template(
        "calendar.html",
        content=CALENDAR_JSON.read_text(encoding="utf-8"),
        preview=PREVIEW_BASE + "calendar/",
    )


@app.route("/save-calendar", methods=["POST"])
def save_calendar():
    raw = request.get_json(force=True)["content"]
    try:
        json.loads(raw)  # validate
    except json.JSONDecodeError as e:
        return jsonify(ok=False, error=f"Invalid JSON: {e}"), 400
    CALENDAR_JSON.write_text(raw, encoding="utf-8")
    return jsonify(ok=True)


@app.route("/deploy", methods=["POST"])
def deploy():
    message = request.get_json(force=True).get("message", "").strip() or "Update wiki"
    code, add_out = run_git(["add", "-A"])
    if code != 0:
        return jsonify(ok=False, log=add_out), 500
    code, commit_out = run_git(["commit", "-m", message])
    if code != 0 and "nothing to commit" in commit_out:
        return jsonify(ok=False, log="Nothing to commit."), 200
    code, push_out = run_git(["push"])
    ok = code == 0
    return jsonify(ok=ok, log=f"{commit_out}\n\n{push_out}".strip())


# ---- mkdocs preview subprocess -------------------------------------------
def start_mkdocs() -> subprocess.Popen:
    proc = subprocess.Popen(
        [sys.executable, "-m", "mkdocs", "serve", "-a", f"127.0.0.1:{MKDOCS_PORT}"],
        cwd=REPO_ROOT,
    )
    atexit.register(proc.terminate)
    return proc


if __name__ == "__main__":
    start_mkdocs()
    webbrowser.open(f"http://127.0.0.1:{EDITOR_PORT}/")
    app.run(port=EDITOR_PORT, debug=False, use_reloader=False)
