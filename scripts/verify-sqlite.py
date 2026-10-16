"""Verify lossless catalogue migration and the actual SQLite HTTP read path."""
import importlib.util
import json
import threading
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


store = load_module("catalog_store", ROOT / "scripts/catalog-db.py")
api = load_module("catalog_api", ROOT / "server/catalog_server.py")
source = json.loads((ROOT / "data/catalog.json").read_text())
database = ROOT / "data/catalog.sqlite3"
assert store.export_catalog(database) == source, "SQLite must preserve every catalogue field"
with store.connect_readonly(database) as conn:
    assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    try:
        conn.execute("DELETE FROM sections")
        raise AssertionError("Runtime connection must be read-only")
    except Exception as error:
        assert "readonly" in str(error)

server = api.make_server(database, 0)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = "http://127.0.0.1:" + str(server.server_port)
try:
    for name in api.BUNDLES:
        with urllib.request.urlopen(base + "/" + name + "?v=78") as response:
            assert response.read() == (ROOT / "dist" / name).read_bytes()
            etag = response.headers["ETag"]
        try:
            urllib.request.urlopen(urllib.request.Request(base + "/" + name, headers={"If-None-Match": etag}))
            raise AssertionError("Unchanged data must return 304")
        except urllib.error.HTTPError as error:
            assert error.code == 304
    assert json.load(urllib.request.urlopen(base + "/api/abilities")) == source["abilities"]
    health = json.load(urllib.request.urlopen(base + "/api/health"))
    assert health == {"status": "ok", "storage": "sqlite", "characters": 63}
    assert json.load(urllib.request.urlopen(base + "/api/characters")) == source["database"]["characters"]
    with urllib.request.urlopen(urllib.request.Request(base + "/roster.json", method="HEAD")) as response:
        assert response.read() == b"" and int(response.headers["Content-Length"]) > 0
    event = next(e for e in source["events"] if e["route"] == "レダ" and e["chapter"] == 5 and e["type"] == "spectate")
    assert event["start"] == "1449/04/10" and event["time"] == "12:00–17:59"
finally:
    server.shutdown()
    server.server_close()
print("PASS SQLite: lossless migration, integrity, read-only API, all four bundles, ETags, HEAD and verified calendar date")
