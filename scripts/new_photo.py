#!/usr/bin/env python3
"""Append a new photo entry into data/photos.json."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a new photo entry")
    parser.add_argument("--src", required=True, help="Photo URL/path")
    parser.add_argument("--title", required=True, help="Photo title")
    parser.add_argument("--description", default="", help="Photo description")

    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    photos_path = root / "data" / "photos.json"

    with photos_path.open("r", encoding="utf-8") as file:
        photos = json.load(file)

    photos.insert(
        0,
        {
            "src": args.src,
            "title": args.title,
            "description": args.description,
        },
    )

    with photos_path.open("w", encoding="utf-8") as file:
        json.dump(photos, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Added photo: {args.title}")


if __name__ == "__main__":
    main()
