"""Check a source export before publishing; never print matched secret values."""
import ipaddress
import re
import subprocess
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    "private key": rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----",
    "SSH key": rb"(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\s+[A-Za-z0-9+/]{40,}",
    "GitHub token": rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})",
    "API secret": rb"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}",
    "cloud access key": rb"\b(?:AKIA[A-Z0-9]{16}|AKID[A-Za-z0-9]{16,})\b",
    "personal path": rb"/(?:Users|home)/[A-Za-z0-9._-]+/",
    "deployment binding": rb"appg(?:prj|ver|dep)_[A-Za-z0-9_]{20,}",
    "private work email": rb"[A-Za-z0-9._%+-]+@tencent\.com",
}
IPV4 = re.compile(rb"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])")
IPV6 = re.compile(rb"(?<![A-Za-z0-9])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![A-Za-z0-9:])")
DOC_NETS = [ipaddress.ip_network(n) for n in ("192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24")]
FORBIDDEN_SUFFIXES = {".pem", ".key", ".pub", ".p12", ".pfx", ".keystore"}


def files():
    # Scan everything that could enter Git, including newly created untracked files.
    result = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
                            cwd=ROOT, capture_output=True, check=True)
    return sorted({Path(name.decode()) for name in result.stdout.split(b"\0") if name})


issues = []
paths = files()
for relative in paths:
    path = ROOT / relative
    if not path.is_file():
        continue
    if relative.suffix in FORBIDDEN_SUFFIXES or relative.name.startswith(".env") and relative.name != ".env.example":
        issues.append((str(relative), "credential filename"))
    if relative.parts[0] in {".openai", ".ssh", ".codex"} or str(relative).startswith("dist/deploy/"):
        issues.append((str(relative), "local/deployment state"))
    data = path.read_bytes()
    for kind, pattern in PATTERNS.items():
        if re.search(pattern, data):
            issues.append((str(relative), kind))
    for match in IPV4.finditer(data):
        try:
            address = ipaddress.ip_address(match.group().decode())
        except ValueError:
            continue
        if not (address.is_loopback or str(address) == "0.0.0.0" or any(address in net for net in DOC_NETS)):
            issues.append((str(relative), "non-local IPv4 address"))
    # IPv6 text patterns can occur by chance in compressed pixels. Inspect text
    # files and structured SQLite content, rather than compressed image bytes.
    try:
        data.decode("utf-8")
        ipv6_data = data
    except UnicodeDecodeError:
        ipv6_data = b""
        if relative.suffix == ".sqlite3":
            with sqlite3.connect(path.resolve().as_uri()+"?mode=ro", uri=True) as database:
                values = [v[0].encode() for v in database.execute("SELECT payload FROM entities")]
                values += [v[0].encode() for v in database.execute("SELECT payload FROM sections")]
                values += [bytes(v[0]) for v in database.execute("SELECT content FROM bundles")]
                ipv6_data = b"\n".join(values)
    for match in IPV6.finditer(ipv6_data):
        try:
            address = ipaddress.ip_address(match.group().decode())
        except ValueError:
            continue
        if not (address.is_loopback or address.is_unspecified or address in ipaddress.ip_network("2001:db8::/32")):
            issues.append((str(relative), "non-local IPv6 address"))
if issues:
    for name, kind in sorted(set(issues)):
        print(f"REVIEW {name}: {kind} (value redacted)")
    raise SystemExit(1)
print(f"PASS public export: {len(paths)} files checked; no detected keys, deployment bindings, personal paths, work emails or real server IP addresses.")
