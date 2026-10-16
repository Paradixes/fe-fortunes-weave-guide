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


if __name__ == '__main__':
    unittest.main()
