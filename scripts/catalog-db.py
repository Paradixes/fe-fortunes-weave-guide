"""SQLite catalogue import/export and derived bundle storage. Standard library only."""
import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data/catalog.sqlite3"
COLLECTIONS = {
    "characters": ("database", "characters"),
    "classes": ("database", "classes"),
    "equipment": ("equipment",),
    "events": ("events",),
    "map_points": ("map",),
    "learning": ("learning",),
    "planning": ("planning",),
    "abilities": ("abilities",),
    "articles": ("articles",),
}


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def connect_readonly(db):
    return sqlite3.connect(Path(db).resolve().as_uri() + "?mode=ro", uri=True)


def import_catalog(source, db):
    data = json.loads(Path(source).read_text())
    layout = {"root": list(data), "database": list(data["database"])}
    with sqlite3.connect(db) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sections (
                name TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload))
            );
            CREATE TABLE IF NOT EXISTS entities (
                collection TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL,
                payload TEXT NOT NULL CHECK(json_valid(payload)),
                PRIMARY KEY(collection,id), UNIQUE(collection,position)
            );
            CREATE TABLE IF NOT EXISTS bundles (
                name TEXT PRIMARY KEY, content BLOB NOT NULL
            );
        """)
        conn.execute("DELETE FROM sections")
        conn.execute("DELETE FROM entities")
        conn.execute("DELETE FROM bundles")
        for collection, route in COLLECTIONS.items():
            parent = data
            for key in route[:-1]:
                parent = parent[key]
            values = parent.pop(route[-1])
            kind = "dict" if isinstance(values, dict) else "list"
            conn.execute("INSERT INTO sections VALUES (?,?)", ("_type:" + collection, encode(kind)))
            items = values.items() if kind == "dict" else ((str(v.get("id", i)), v) for i, v in enumerate(values))
            conn.executemany("INSERT INTO entities VALUES (?,?,?,?)", (
                (collection, str(key), i, encode(value)) for i, (key, value) in enumerate(items)
            ))
        conn.executemany("INSERT INTO sections VALUES (?,?)", ((k, encode(v)) for k, v in data.items()))
        conn.execute("INSERT INTO sections VALUES (?,?)", ("_layout", encode(layout)))
        conn.execute("PRAGMA user_version=1")


def export_catalog(db):
    with connect_readonly(db) as conn:
        sections = {k: json.loads(v) for k, v in conn.execute("SELECT name,payload FROM sections")}
        layout = sections.pop("_layout")
        for collection, route in COLLECTIONS.items():
            if "_type:" + collection not in sections:
                continue
            kind = sections.pop("_type:" + collection)
            rows = conn.execute("SELECT id,payload FROM entities WHERE collection=? ORDER BY position", (collection,)).fetchall()
            values = {k: json.loads(v) for k, v in rows} if kind == "dict" else [json.loads(v) for _, v in rows]
            parent = sections
            for key in route[:-1]:
                parent = parent[key]
            parent[route[-1]] = values
        sections["database"] = {key: sections["database"][key] for key in layout["database"]}
        return {key: sections[key] for key in layout["root"]}


def cache_bundles(db, directory):
    with sqlite3.connect(db) as conn:
        for name in ("catalog.js", "roster.json", "learning.json", "map.json"):
            conn.execute("INSERT OR REPLACE INTO bundles VALUES (?,?)", (name, (Path(directory) / name).read_bytes()))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("import", "export", "cache"))
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--source", type=Path, default=ROOT / "data/catalog.json")
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    if args.action == "import":
        import_catalog(args.source, args.db)
    elif args.action == "export":
        print(encode(export_catalog(args.db)))
    else:
        cache_bundles(args.db, args.dist)
