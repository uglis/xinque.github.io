#!/usr/bin/env python3
"""Append a new post entry into data/posts.json."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path


def slugify(text: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", text.strip().lower())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or f"post-{date.today().isoformat()}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a new blog post entry")
    parser.add_argument("--title", required=True, help="Post title")
    parser.add_argument("--summary", required=True, help="Post summary")
    parser.add_argument("--date", default=date.today().isoformat(), help="Post date (YYYY-MM-DD)")
    parser.add_argument("--slug", help="Custom slug")
    parser.add_argument("--cover", default="", help="Cover image URL/path")
    parser.add_argument(
        "--tags",
        nargs="*",
        default=[],
        help="Post tags, pass multiple values",
    )
    parser.add_argument(
        "--content",
        nargs="+",
        default=["请在 data/posts.json 中继续完善正文内容。"],
        help="Post paragraphs, pass multiple segments",
    )

    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    posts_path = root / "data" / "posts.json"

    with posts_path.open("r", encoding="utf-8") as file:
        posts = json.load(file)

    slug = args.slug or slugify(args.title)
    used_slugs = {item.get("slug", "") for item in posts}

    if slug in used_slugs:
        suffix = 2
        candidate = f"{slug}-{suffix}"
        while candidate in used_slugs:
            suffix += 1
            candidate = f"{slug}-{suffix}"
        slug = candidate

    new_post = {
        "slug": slug,
        "title": args.title,
        "date": args.date,
        "summary": args.summary,
        "tags": [tag.strip() for tag in args.tags if tag.strip()],
        "content": args.content,
        "cover": args.cover,
    }

    posts.insert(0, new_post)

    with posts_path.open("w", encoding="utf-8") as file:
        json.dump(posts, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Created post: {slug}")


if __name__ == "__main__":
    main()
