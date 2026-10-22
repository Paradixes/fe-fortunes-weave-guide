"""Exercise malicious archive rejection and release rollback without root or SSH."""
import importlib.util
import io
import json
import sqlite3
import tarfile
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('deploy', ROOT / 'server/deploy-release.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeployTests(unittest.TestCase):
    def test_rejects_unsafe_archives(self):
        for name, kind in [('../outside', tarfile.REGTYPE), ('dist/link', tarfile.SYMTYPE),
                           ('server/unexpected.py', tarfile.REGTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                archive = root / 'upload.tar.gz'
                with tarfile.open(archive, 'w:gz') as package:
                    entry = tarfile.TarInfo(name)
                    entry.type = kind
                    entry.linkname = '/etc'
                    package.addfile(entry, io.BytesIO())
                with self.assertRaises(ValueError):
                    deploy.unpack(archive, root / 'extracted')
                self.assertFalse((root / 'outside').exists())

    def test_bundle_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ('dist', 'data', 'server'):
                (root / name).mkdir()
            (root / 'dist/index.html').write_text('site')
            manifest = {'sha': 'a' * 40, 'release': 'a' * 40 + '-1-1'}
            (root / 'dist/deployment.json').write_text(json.dumps(manifest))
            (root / 'server/catalog_server.py').write_text('pass')
            with closing(sqlite3.connect(root / 'data/catalog.sqlite3')) as conn, conn:
                conn.executescript('CREATE TABLE entities(collection TEXT);'
                                   "INSERT INTO entities VALUES('characters');"
                                   'CREATE TABLE bundles(name TEXT, content BLOB);')
                for name in deploy.BUNDLES:
                    conn.execute('INSERT INTO bundles VALUES(?,?)', (name, b'expected'))
                    (root / 'dist' / name).write_bytes(b'expected')
            self.assertEqual(deploy.validate(root), manifest)
            (root / 'dist/catalog.js').write_bytes(b'stale')
            with self.assertRaisesRegex(ValueError, 'bundles differ'):
                deploy.validate(root)

    def test_failed_health_restores_both_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            old, new = root / 'old', root / 'new'
            (old / 'dist').mkdir(parents=True)
            (new / 'dist').mkdir(parents=True)
            (root / 'app-current').symlink_to(old)
            (root / 'current').symlink_to(old / 'dist')
            with patch.object(deploy, 'ROOT', root), patch.object(deploy, 'restart') as restart, \
                    patch.object(deploy, 'healthy', side_effect=[False, True]):
                with self.assertRaisesRegex(RuntimeError, 'health checks failed'):
                    deploy.activate(new, {}, 'https://guide.example.com')
                self.assertEqual(restart.call_count, 2)
            self.assertEqual((root / 'app-current').resolve(), old.resolve())
            self.assertEqual((root / 'current').resolve(), (old / 'dist').resolve())

    def test_delta_expands_onto_live_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            current = root / 'current'
            (current / 'dist/assets').mkdir(parents=True)
            (current / 'data').mkdir()
            live = {'sha': 'b' * 40, 'release': 'b' * 40 + '-1-1'}
            (current / 'dist/deployment.json').write_text(json.dumps(live))
            (current / 'dist/app.js').write_text('old')
            (current / 'dist/assets/keep.png').write_bytes(b'png')
            (current / 'dist/stale.css').write_text('stale')
            staging = root / 'incoming'
            target = staging / 'release'
            target.mkdir(parents=True)
            (target / 'delta.json').write_text(json.dumps(
                {'base': 'b' * 40, 'deleted': ['dist/stale.css']}))
            (target / 'dist').mkdir()
            (target / 'dist/app.js').write_text('new')
            full = deploy.apply_delta(target, current)
            self.assertEqual((full / 'dist/app.js').read_text(), 'new')
            self.assertEqual((full / 'dist/assets/keep.png').read_bytes(), b'png')
            self.assertFalse((full / 'dist/stale.css').exists())
            self.assertFalse((full / 'delta.json').exists())
            self.assertEqual((current / 'dist/app.js').read_text(), 'old')

    def test_delta_base_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            current = root / 'current'
            (current / 'dist').mkdir(parents=True)
            (current / 'dist/deployment.json').write_text(
                json.dumps({'sha': 'b' * 40, 'release': 'b' * 40 + '-1-1'}))
            target = root / 'release'
            target.mkdir()
            (target / 'delta.json').write_text(json.dumps({'base': 'c' * 40, 'deleted': []}))
            with self.assertRaisesRegex(ValueError, 'does not match'):
                deploy.apply_delta(target, current)

    def test_delta_deletion_cannot_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            current = root / 'current'
            (current / 'dist').mkdir(parents=True)
            (current / 'dist/deployment.json').write_text(
                json.dumps({'sha': 'b' * 40, 'release': 'b' * 40 + '-1-1'}))
            target = root / 'release'
            target.mkdir()
            (target / 'delta.json').write_text(
                json.dumps({'base': 'b' * 40, 'deleted': ['../outside.txt']}))
            with self.assertRaisesRegex(ValueError, 'Unsafe delta'):
                deploy.apply_delta(target, current)

    def test_delta_manifest_accepted_by_unpack(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / 'upload.tar.gz'
            with tarfile.open(archive, 'w:gz') as package:
                for d in ('./', './dist'):
                    d_entry = tarfile.TarInfo(d)
                    d_entry.type = tarfile.DIRTYPE
                    package.addfile(d_entry)
                payload = json.dumps({'base': 'b' * 40, 'deleted': []}).encode()
                entry = tarfile.TarInfo('./delta.json')
                entry.size = len(payload)
                package.addfile(entry, io.BytesIO(payload))
            deploy.unpack(archive, root / 'extracted')
            self.assertTrue((root / 'extracted/delta.json').is_file())


if __name__ == '__main__':
    unittest.main()
