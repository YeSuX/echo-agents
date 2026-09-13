"""Check public auth routes, prerender caching, and anonymous access controls."""

import argparse
import email
import json
import re
import subprocess
import tempfile
import urllib.parse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", nargs="?", default="http://localhost:8787")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    url = urllib.parse.urlsplit(base)
    if url.scheme not in ("http", "https") or not url.netloc or url.username or url.query or url.fragment:
        parser.error("Use an HTTP(S) origin without credentials, query, or fragment.")
    def fetch(path, headers=None):
        with tempfile.TemporaryDirectory(prefix="echo-auth-smoke-") as directory:
            body_file = Path(directory) / "body"
            header_file = Path(directory) / "headers"
            command = [
                "curl", "-sS", "--compressed", "--max-time", "30",
                "-o", str(body_file), "-D", str(header_file), "-w", "%{json}", base + path,
            ]
            for key, value in (headers or {}).items():
                command.extend(["-H", f"{key}: {value}"])
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            status = json.loads(result.stdout)["http_code"]
            blocks = header_file.read_text().strip().split("\n\n")
            response_headers = email.message_from_string(blocks[-1].split("\n", 1)[1])
            return status, response_headers, body_file.read_text()

    for path in ("/", "/sign-in", "/sign-up"):
        for rsc in (False, True):
            status, headers, body = fetch(path, {"RSC": "1"} if rsc else None)
            assert status == 200, (path, status)
            assert any(headers.get(key) == "HIT" for key in ("x-nextjs-cache", "x-opennext-cache")), path
            assert ("text/x-component" if rsc else "text/html") in headers.get("Content-Type", ""), path
            assert "pk_test_" not in body, "Development Clerk key in production artifact"
            if not rsc:
                assert "pk_live_" in body, "Production Clerk public key missing"
                assert "clerk.cooper-ai.org/npm/" in body, "Unexpected Clerk frontend instance"
                if path == "/":
                    chunk = re.search(r'src="(/_next/static/chunks/[^\"]+\.js)"', body)
                    assert chunk, "No application chunk found"
                    asset_path = chunk.group(1)
        print(f"PASS {path}: HTML and RSC cache hits, production Clerk instance")

    for path in ("/api/conversations", "/api/me/conversation-preferences"):
        status, _, body = fetch(path)
        assert status == 401 and "AUTH_REQUIRED" in body, path
        print(f"PASS {path}: anonymous access rejected")

    status, headers, _ = fetch("/conversations")
    assert status == 307 and "/sign-in" in headers.get("Location", ""), "History access guard"
    print("PASS /conversations: anonymous redirect")

    status, headers, _ = fetch(asset_path)
    assert status == 200 and "immutable" in headers.get("Cache-Control", ""), "Asset cache header"
    print("PASS hashed JavaScript: immutable browser caching")
    print("Browser login, email verification, and authenticated access require separate acceptance.")


if __name__ == "__main__":
    main()
