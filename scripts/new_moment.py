#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a new moment to data/moments.json")
    parser.add_argument("--text", required=True, help="Moment text content")
    parser.add_argument("--date", default=date.today().isoformat(), help="Moment date (YYYY-MM-DD)")
    parser.add_argument("--photo", default="", help="Photo path/url")
    parser.add_argument("--photo-alt", default="分享照片", help="Photo alt text")
    parser.add_argument("--music-url", default="", help="Music link URL")
    parser.add_argument("--music-title", default="", help="Music title")
    parser.add_argument("--music-platform", default="", help="Music platform name")

    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    moments_path = root / "data" / "moments.json"

    with moments_path.open("r", encoding="utf-8") as file:
        moments = json.load(file)

    if not isinstance(moments, list):
        raise ValueError("moments.json must be an array")

    moment = {
        "date": args.date,
        "text": args.text,
        "music": {
            "platform": args.music_platform,
            "title": args.music_title,
            "url": args.music_url,
        },
        "photo": {
            "src": args.photo,
            "alt": args.photo_alt,
        },
    }

    if not args.music_url:
        moment["music"] = {}
    if not args.photo:
        moment["photo"] = {}

    moments.insert(0, moment)

    with moments_path.open("w", encoding="utf-8") as file:
        json.dump(moments, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("Added new moment")


if __name__ == "__main__":
    main()
