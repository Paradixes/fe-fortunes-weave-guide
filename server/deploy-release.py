#!/usr/bin/python3
"""Restricted SSH receiver: validate a runtime archive, switch releases, roll back."""
import ast
import fcntl
import json
import os
import re
import select
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from contextlib import closing
from pathlib import Path, PurePosixPath

ROOT = Path('/var/www/fire-emblem')
CONFIG = Path('/etc/fire-emblem-deploy.json')
SERVICE = 'fire-emblem-catalog'
BUNDLES = ('catalog.js', 'roster.json', 'learning.json', 'map.json')
MAX_ARCHIVE = 64 * 1024 * 1024
MAX_CONTENT = 256 * 1024 * 1024


def receive_archive(source, output, progress_interval=15):
    """Report bytes received by the server, including while waiting for input."""
    started = time.monotonic()
    reported_at, reported_bytes, received = started, 0, 0

    def report(final=False):
        nonlocal reported_at, reported_bytes
        now = time.monotonic()
        elapsed = now - started
        recent_rate = (received - reported_bytes) / max(now - reported_at, 0.001)
        average_rate = received / max(elapsed, 0.001)
        label = 'Upload received' if final else 'Receiving'
        print(f'{label}: {received:,} bytes ({received / 1048576:.2f} MiB); '
              f'current {recent_rate / 1024:.1f} KiB/s; '
              f'average {average_rate / 1024:.1f} KiB/s; '
              f'elapsed {int(elapsed) // 60:02d}:{int(elapsed) % 60:02d}', flush=True)
        reported_at, reported_bytes = now, received

    print('Receiver ready; reporting actual received bytes every '
          f'{progress_interval:g} seconds.', flush=True)
    while True:
        wait = max(0, reported_at + progress_interval - time.monotonic())
        readable, _, _ = select.select([source], [], [], wait)
        if readable:
            chunk = os.read(source.fileno(), 64 * 1024)
            if not chunk:
                report(final=True)
                return received
            received += len(chunk)
            if received > MAX_ARCHIVE:
                raise ValueError('Upload exceeds size limit')
            output.write(chunk)
        if time.monotonic() - reported_at >= progress_interval:
            report()


def unpack(archive, target):
    """Never extract links, devices, duplicate paths or files outside the runtime."""
    seen, size = set(), 0
    with tarfile.open(archive, 'r:gz') as package:
        members = package.getmembers()
        if len(members) > 5000:
            raise ValueError('Too many archive entries')
        for entry in members:
            name = PurePosixPath(entry.name)
            if name.parts and name.parts[0] == '.':
                name = PurePosixPath(*name.parts[1:])
            if not name.parts and entry.isdir():
                continue
            valid = (name.parts and name.parts[0] == 'dist') or str(name) in {
                'data', 'data/catalog.sqlite3', 'server', 'server/catalog_server.py',
                'delta.json',
            }
            if (not valid or name.is_absolute() or '..' in name.parts
                    or name in seen or not (entry.isdir() or entry.isfile())):
                raise ValueError('Unsafe runtime archive')
            seen.add(name)
            size += entry.size
            if size > MAX_CONTENT:
                raise ValueError('Runtime archive exceeds size limit')
            dest = target / str(name)
            if entry.isdir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with package.extractfile(entry) as source, dest.open('xb') as output:
                    shutil.copyfileobj(source, output)
                dest.chmod(0o644)


def validate(target):
    manifest = json.loads((target / 'dist/deployment.json').read_text())
    if not re.fullmatch(r'[0-9a-f]{40}', manifest.get('sha', '')):
        raise ValueError('Invalid commit identifier')
    if not re.fullmatch(re.escape(manifest['sha']) + r'-[0-9]+-[0-9]+', manifest.get('release', '')):
        raise ValueError('Invalid release identifier')
    if not (target / 'dist/index.html').is_file():
        raise ValueError('Missing site entry point')
    ast.parse((target / 'server/catalog_server.py').read_text())
    database = target / 'data/catalog.sqlite3'
    with closing(sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)) as conn:
        if conn.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Invalid catalogue database')
        count = conn.execute("SELECT count(*) FROM entities WHERE collection='characters'").fetchone()[0]
        if not count:
            raise ValueError('Empty character catalogue')
        for name in BUNDLES:
            row = conn.execute('SELECT content FROM bundles WHERE name=?', (name,)).fetchone()
            if not row or bytes(row[0]) != (target / 'dist' / name).read_bytes():
                raise ValueError('Static and SQLite bundles differ')
    return manifest


def link(target, name):
    temp = ROOT / ('.' + name + '-next')
    temp.unlink(missing_ok=True)
    temp.symlink_to(target)
    os.replace(temp, ROOT / name)


def restart():
    subprocess.run(['systemctl', 'restart', SERVICE], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)


def read_json(url):
    with urllib.request.urlopen(url, timeout=5) as response:
        return json.load(response)


def healthy(site_url, manifest=None):
    for _ in range(8):
        try:
            local = read_json('http://127.0.0.1:18776/api/health')
            public = read_json(site_url + '/api/health')
            if local.get('status') != 'ok' or public.get('status') != 'ok':
                raise ValueError('Unhealthy catalogue')
            if manifest:
                live = read_json(site_url + '/deployment.json?release=' + manifest['release'])
                if live != manifest:
                    raise ValueError('Served release does not match')
            return True
        except Exception:
            time.sleep(2)
    return False


def activate(release, manifest, site_url):
    previous_app = (ROOT / 'app-current').resolve(strict=True)
    previous_site = (ROOT / 'current').resolve(strict=True)
    try:
        link(release, 'app-current')
        link(release / 'dist', 'current')
        restart()
        if not healthy(site_url, manifest):
            raise RuntimeError('Deployment health checks failed')
    except BaseException:
        link(previous_app, 'app-current')
        link(previous_site, 'current')
        restart()
        if not healthy(site_url):
            raise RuntimeError('Rollback health checks failed') from None
        print('Previous release restored.', flush=True)
        raise


def apply_delta(target, current):
    """Expand a delta upload into a full release tree copied from the live one."""
    delta = json.loads((target / 'delta.json').read_text())
    live = json.loads((current / 'dist/deployment.json').read_text())
    if delta.get('base') != live.get('sha'):
        raise ValueError('Delta base does not match the live release')
    full = target.parent / 'full'
    shutil.copytree(current, full)
    root = full.resolve()
    for name in delta.get('deleted', []):
        dest = (full / name).resolve()
        if not str(dest).startswith(str(root) + '/'):
            raise ValueError('Unsafe delta deletion')
        dest.unlink(missing_ok=True)
    for entry in sorted(target.rglob('*')):
        if entry.is_file() and entry.name != 'delta.json':
            dest = full / entry.relative_to(target)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(entry, dest)
    return full


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Deploy receiver requires root')
    site_url = json.loads(CONFIG.read_text())['site_url'].rstrip('/')
    if not site_url.startswith('https://'):
        raise ValueError('HTTPS health-check URL required')
    releases = ROOT / 'app-releases'
    releases.mkdir(parents=True, exist_ok=True)
    with (ROOT / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='.incoming-', dir=releases) as staging:
            staging = Path(staging)
            archive = staging / 'upload.tar.gz'
            with archive.open('wb') as output:
                receive_archive(sys.stdin.buffer, output)
            print('Upload complete; validating the archive and release.', flush=True)
            target = staging / 'release'
            target.mkdir(mode=0o755)
            unpack(archive, target)
            if (target / 'delta.json').is_file():
                current = (ROOT / 'app-current').resolve(strict=True)
                target = apply_delta(target, current)
            manifest = validate(target)
            release = releases / manifest['release']
            if release.exists():
                raise ValueError('Release already exists; rerun with a new attempt')
            target.rename(release)
            activate(release, manifest, site_url)
            print('Deployed ' + manifest['sha'] + '; SQLite and HTTPS checks passed.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Keep server names, URLs, key material and systemctl output out of CI logs.
        print('Deployment failed (' + type(error).__name__ + '). Check server configuration.', file=sys.stderr)
        sys.exit(1)
