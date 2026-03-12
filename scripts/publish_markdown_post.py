#!/usr/bin/env python3
"""Publish a Markdown file into data/posts.json for this static blog."""

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


def strip_frontmatter(markdown_text: str) -> str:
    if markdown_text.startswith("---\n"):
        parts = markdown_text.split("\n---\n", 1)
        if len(parts) == 2:
            return parts[1].lstrip()
    return markdown_text


def markdown_summary(markdown_text: str, max_len: int = 90) -> str:
    plain = re.sub(r"```[\s\S]*?```", "", markdown_text)
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", plain)
    plain = re.sub(r"\[[^\]]+\]\([^)]*\)", r"\1", plain)
    plain = re.sub(r"[#>*`\-]", "", plain)
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_len:
        return plain or "暂无摘要"
    return f"{plain[:max_len].rstrip()}..."


def parse_tags(raw_tags: list[str]) -> list[str]:
    tags: list[str] = []
    for raw in raw_tags:
        for part in raw.split(","):
            tag = part.strip()
            if tag and tag not in tags:
                tags.append(tag)
    return tags


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish markdown file to posts.json")
    parser.add_argument("--file", required=True, help="Markdown file path")
    parser.add_argument("--title", required=True, help="Post title")
    parser.add_argument("--date", default=date.today().isoformat(), help="Post date (YYYY-MM-DD)")
    parser.add_argument("--summary", default="", help="Post summary (optional, auto-generate if omitted)")
    parser.add_argument("--slug", help="Custom slug")
    parser.add_argument("--cover", default="", help="Cover image URL/path")
    parser.add_argument("--tags", nargs="*", default=[], help="Tags (space-separated or comma-separated)")

    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    md_path = (root / args.file).resolve() if not Path(args.file).is_absolute() else Path(args.file)
    posts_path = root / "data" / "posts.json"

    if not md_path.exists():
        raise FileNotFoundError(f"Markdown file not found: {md_path}")

    markdown_text = md_path.read_text(encoding="utf-8")
    markdown_text = strip_frontmatter(markdown_text).strip()

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

    tags = parse_tags(args.tags)
    summary = args.summary.strip() or markdown_summary(markdown_text)

    new_post = {
        "slug": slug,
        "title": args.title,
        "date": args.date,
        "summary": summary,
        "tags": tags,
        "content_markdown": markdown_text,
        "cover": args.cover,
    }

    posts.insert(0, new_post)

    with posts_path.open("w", encoding="utf-8") as file:
        json.dump(posts, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Published markdown post: {slug}")


if __name__ == "__main__":
    main()
