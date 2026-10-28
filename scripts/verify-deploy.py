"""Exercise malicious archive rejection and release rollback without root or SSH."""
import importlib.util
import io
import json
import os
import sqlite3
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import unittest
from contextlib import closing, redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('deploy', ROOT / 'server/deploy-release.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeployTests(unittest.TestCase):
    def test_upload_preserves_binary_bytes_and_reports_eof(self):
        payload = bytes(range(256)) * 1024
        read_fd, write_fd = os.pipe()

        def send():
            with os.fdopen(write_fd, 'wb') as stream:
                stream.write(payload)

        writer = threading.Thread(target=send, daemon=True)
        writer.start()
        output, log = io.BytesIO(), io.StringIO()
        with os.fdopen(read_fd, 'rb') as source, redirect_stdout(log):
            count = deploy.receive_archive(source, output)
        writer.join(timeout=2)
        self.assertFalse(writer.is_alive())
        self.assertEqual(output.getvalue(), payload)
        self.assertEqual(count, len(payload))
        self.assertIn('Upload received: 262,144 bytes', log.getvalue())

    def test_upload_reports_partial_bytes_and_idle_periods(self):
        read_fd, write_fd = os.pipe()

        def send():
            with os.fdopen(write_fd, 'wb', buffering=0) as stream:
                time.sleep(0.08)
                stream.write(b'test')
                time.sleep(0.08)

        writer = threading.Thread(target=send, daemon=True)
        writer.start()
        output, log = io.BytesIO(), io.StringIO()
        with os.fdopen(read_fd, 'rb') as source, redirect_stdout(log):
            deploy.receive_archive(source, output, progress_interval=0.02)
        writer.join(timeout=2)
        self.assertIn('Receiving: 0 bytes', log.getvalue())
        self.assertIn('Receiving: 4 bytes', log.getvalue())
        self.assertIn('current ', log.getvalue())
        self.assertIn('elapsed ', log.getvalue())
        self.assertEqual(output.getvalue(), b'test')

    def test_upload_limit_still_rejects_oversized_stream(self):
        read_fd, write_fd = os.pipe()
        os.write(write_fd, b'x' * 32)
        os.close(write_fd)
        with os.fdopen(read_fd, 'rb') as source, patch.object(deploy, 'MAX_ARCHIVE', 16), \
                redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, 'Upload exceeds'):
                deploy.receive_archive(source, io.BytesIO())

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


class WorkflowUploadTests(unittest.TestCase):
    """Run the real workflow shell with a stub SSH transport, never a server."""

    @classmethod
    def setUpClass(cls):
        cls.workflow = (ROOT / '.github/workflows/deploy.yml').read_text()
        sections = cls.workflow.split('      - name: ')
        cls.step = next(s for s in sections if s.startswith('Deploy over verified SSH'))
        cls.script = '\n'.join(line[10:] for line in cls.step.split('        run: |\n')[1].splitlines())

    def run_transport(self, outcomes):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            shim = path / 'timeout'
            shim.write_text('#!' + sys.executable + '\n' + '''
import json, os, sys, time
from pathlib import Path
p = Path(os.environ['TEST_LOG'])
rows = json.loads(p.read_text()) if p.exists() else []
rows.append(sys.argv[1:])
p.write_text(json.dumps(rows))
codes = json.loads(os.environ['TEST_CODES'])
if len(codes) > 1 and len(rows) == 1:
    time.sleep(1.1)
sys.exit(codes[min(len(rows)-1, len(codes)-1)])
''')
            shim.chmod(0o755)
            for name in ('release.tar.gz', 'release-full.tar.gz'):
                (path / name).write_bytes(b'local test archive')
            env = {**os.environ, 'PATH': str(path) + os.pathsep + os.environ['PATH'],
                   'RUNNER_TEMP': tmp, 'DEPLOY_HOST': 'example.invalid',
                   'DEPLOY_USER': 'test-user', 'DEPLOY_SSH_KEY': 'test-only',
                   'DEPLOY_KNOWN_HOSTS': 'test-only', 'TEST_LOG': str(path / 'calls.json'),
                   'TEST_CODES': json.dumps(outcomes)}
            result = subprocess.run(['bash', '-c', self.script], env=env,
                                    capture_output=True, text=True, timeout=10)
            return result, json.loads((path / 'calls.json').read_text())

    def test_timeout_budgets_and_shell_syntax(self):
        self.assertIn('    timeout-minutes: 75', self.workflow)
        self.assertIn('        timeout-minutes: 65', self.step)
        self.assertIn('branches: [main]', self.workflow)
        self.assertIn('workflow_dispatch:', self.workflow)
        subprocess.run(['bash', '-n'], input=self.script, text=True, check=True)

    def test_success_uses_hour_budget_and_verified_noninteractive_ssh(self):
        result, calls = self.run_transport([0])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][:5], ['--kill-after=10s', '3600', 'ssh', '-T', '-F'])
        self.assertIn('StrictHostKeyChecking=yes', calls[0])

    def test_fast_failure_retry_shares_budget(self):
        result, calls = self.run_transport([255, 0])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 2)
        self.assertLess(int(calls[1][1]), int(calls[0][1]))

    def test_timeout_does_not_retry_or_report_success(self):
        result, calls = self.run_transport([124])
        self.assertEqual(result.returncode, 124)
        self.assertEqual(len(calls), 1)
        self.assertIn('exceeded its 60-minute budget', result.stdout)

    def test_failed_retry_preserves_exit_status(self):
        result, calls = self.run_transport([1, 2])
        self.assertEqual(result.returncode, 2)
        self.assertEqual(len(calls), 2)


if __name__ == '__main__':
    unittest.main()
