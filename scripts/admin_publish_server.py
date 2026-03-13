#!/usr/bin/env python3

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

from publish_markdown_post import publish_markdown_file


ROOT = Path(__file__).resolve().parents[1]


class AdminHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:8080")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(200, {"ok": True})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/publish-md":
            self._send_json(404, {"ok": False, "error": "Not found"})
            return

        expected_token = os.environ.get("ADMIN_PUBLISH_TOKEN", "")
        if not expected_token:
            self._send_json(500, {"ok": False, "error": "Server token is not configured"})
            return

        token = self.headers.get("X-Admin-Token", "")
        if token != expected_token:
            self._send_json(401, {"ok": False, "error": "Unauthorized"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(raw)

            markdown_path = str(data.get("file", "")).strip()
            markdown_content = str(data.get("markdown", ""))

            if not markdown_path:
                self._send_json(400, {"ok": False, "error": "Missing file path"})
                return

            if not markdown_content.strip():
                self._send_json(400, {"ok": False, "error": "Markdown content is empty"})
                return

            if not markdown_path.startswith("posts/"):
                self._send_json(400, {"ok": False, "error": "File must be inside posts/ directory"})
                return

            md_file = (ROOT / markdown_path).resolve()
            if not str(md_file).startswith(str((ROOT / "posts").resolve())):
                self._send_json(400, {"ok": False, "error": "Invalid file path"})
                return

            md_file.parent.mkdir(parents=True, exist_ok=True)
            md_file.write_text(markdown_content, encoding="utf-8")

            published_slug = publish_markdown_file(file_path=markdown_path, root=ROOT)
            self._send_json(200, {"ok": True, "slug": published_slug, "file": markdown_path})
        except Exception as error:
            self._send_json(500, {"ok": False, "error": str(error)})


def main() -> None:
    port = int(os.environ.get("ADMIN_PUBLISH_PORT", "8787"))
    host = os.environ.get("ADMIN_PUBLISH_HOST", "127.0.0.1")
    server = HTTPServer((host, port), AdminHandler)
    print(f"Admin publish server running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
