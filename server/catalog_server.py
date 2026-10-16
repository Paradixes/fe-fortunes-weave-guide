"""Read-only catalogue HTTP service. Bind to loopback behind Nginx."""
import argparse
import hashlib
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

BUNDLES = {"catalog.js": "application/javascript", "roster.json": "application/json",
           "learning.json": "application/json", "map.json": "application/json"}


class CatalogHandler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            with sqlite3.connect(self.server.db_uri, uri=True, timeout=5) as conn:
                name = path.lstrip("/")
                if name in BUNDLES:
                    row = conn.execute("SELECT content FROM bundles WHERE name=?", (name,)).fetchone()
                    if row is None:
                        self.send_error(503, "Catalogue bundle unavailable")
                        return
                    content, mime = bytes(row[0]), BUNDLES[name]
                elif path == "/api/health":
                    count = conn.execute("SELECT count(*) FROM entities WHERE collection='characters'").fetchone()[0]
                    content = json.dumps({"status": "ok", "storage": "sqlite", "characters": count}).encode()
                    mime = "application/json"
                elif path in ("/api/characters", "/api/equipment", "/api/events", "/api/abilities"):
                    collection = path.rsplit("/", 1)[-1]
                    rows = conn.execute("SELECT payload FROM entities WHERE collection=? ORDER BY position", (collection,))
                    content = ("[" + ",".join(v[0] for v in rows) + "]").encode()
                    mime = "application/json"
                else:
                    self.send_error(404)
                    return
        except sqlite3.Error:
            self.send_error(503, "Catalogue storage unavailable")
            return
        etag = '"' + hashlib.sha256(content).hexdigest() + '"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", mime + "; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("ETag", etag)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)


def make_server(db, port):
    server = ThreadingHTTPServer(("127.0.0.1", port), CatalogHandler)
    server.db_uri = Path(db).resolve().as_uri() + "?mode=ro"
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--port", type=int, default=18776)
    args = parser.parse_args()
    with make_server(args.db, args.port) as server:
        server.serve_forever()
