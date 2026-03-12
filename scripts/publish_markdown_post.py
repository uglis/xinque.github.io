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


def extract_frontmatter(markdown_text: str) -> tuple[dict[str, str | list[str]], str]:
    if not markdown_text.startswith("---\n"):
        return {}, markdown_text

    parts = markdown_text.split("\n---\n", 1)
    if len(parts) != 2:
        return {}, markdown_text

    raw_fm = parts[0].replace("---\n", "", 1).strip()
    body = parts[1].lstrip()
    data: dict[str, str | list[str]] = {}
    current_list_key = ""

    for raw_line in raw_fm.split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if current_list_key and line.startswith("- "):
            existing = data.get(current_list_key)
            if isinstance(existing, list):
                item = line[2:].strip().strip('"').strip("'")
                if item:
                    existing.append(item)
            continue

        current_list_key = ""
        if ":" not in line:
            continue

        key, raw_value = line.split(":", 1)
        key = key.strip().lower()
        value = raw_value.strip()

        if not value:
            data[key] = []
            current_list_key = key
            continue

        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                data[key] = []
            else:
                items = [part.strip().strip('"').strip("'") for part in inner.split(",")]
                data[key] = [item for item in items if item]
            continue

        cleaned = value.strip('"').strip("'")
        data[key] = cleaned

    return data, body


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
    parser.add_argument("--title", help="Post title (optional if provided in frontmatter)")
    parser.add_argument("--date", help="Post date (YYYY-MM-DD), defaults to frontmatter or today")
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

    markdown_text_raw = md_path.read_text(encoding="utf-8")
    frontmatter, markdown_body = extract_frontmatter(markdown_text_raw)
    markdown_text = strip_frontmatter(markdown_body).strip()

    title = (args.title or str(frontmatter.get("title", "")).strip())
    if not title:
        raise ValueError("Missing title: provide --title or add title in markdown frontmatter")

    post_date = (args.date or str(frontmatter.get("date", "")).strip() or date.today().isoformat())

    cover = args.cover.strip() or str(frontmatter.get("cover", "")).strip()
    cli_tags = parse_tags(args.tags)
    fm_tags_raw = frontmatter.get("tags", [])
    fm_tags = fm_tags_raw if isinstance(fm_tags_raw, list) else parse_tags([str(fm_tags_raw)])
    tags = list(dict.fromkeys([*cli_tags, *fm_tags]))

    summary = (
        args.summary.strip()
        or str(frontmatter.get("summary", "")).strip()
        or markdown_summary(markdown_text)
    )

    with posts_path.open("r", encoding="utf-8") as file:
        posts = json.load(file)

    slug = args.slug or str(frontmatter.get("slug", "")).strip() or slugify(title)
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
        "title": title,
        "date": post_date,
        "summary": summary,
        "tags": tags,
        "content_markdown": markdown_text,
        "cover": cover,
    }

    posts.insert(0, new_post)

    with posts_path.open("w", encoding="utf-8") as file:
        json.dump(posts, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Published markdown post: {slug}")


if __name__ == "__main__":
    main()
