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
    plain = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", plain)
    plain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", plain)

    lines: list[str] = []
    for raw_line in plain.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line = re.sub(r"^#{1,6}\s+", "", line)
        line = re.sub(r"^>\s+", "", line)
        line = re.sub(r"^[-*+]\s+", "", line)
        line = re.sub(r"^\d+\.\s+", "", line)
        line = re.sub(r"[`*_~]", "", line)
        line = re.sub(r"\s+", " ", line).strip()

        if line and not re.fullmatch(r"[-=]{3,}", line):
            lines.append(line)

    merged = " ".join(lines)
    if len(merged) <= max_len:
        return merged or "暂无摘要"
    return f"{merged[:max_len].rstrip()}..."


def frontmatter_text(frontmatter: dict[str, str | list[str]], *keys: str) -> str:
    for key in keys:
        value = frontmatter.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def parse_tags(raw_tags: list[str]) -> list[str]:
    tags: list[str] = []
    for raw in raw_tags:
        for part in raw.split(","):
            tag = part.strip()
            if tag and tag not in tags:
                tags.append(tag)
    return tags


def publish_markdown_file(
    *,
    file_path: str,
    title: str | None = None,
    post_date: str | None = None,
    summary: str | None = None,
    slug: str | None = None,
    cover: str = "",
    tags: list[str] | None = None,
    root: Path | None = None,
) -> str:
    base_root = root or Path(__file__).resolve().parents[1]
    input_path = Path(file_path)
    md_path = (base_root / input_path).resolve() if not input_path.is_absolute() else input_path
    posts_path = base_root / "data" / "posts.json"

    if not md_path.exists():
        raise FileNotFoundError(f"Markdown file not found: {md_path}")

    markdown_text_raw = md_path.read_text(encoding="utf-8")
    frontmatter, markdown_body = extract_frontmatter(markdown_text_raw)
    markdown_text = strip_frontmatter(markdown_body).strip()

    resolved_title = title or frontmatter_text(frontmatter, "title")
    if not resolved_title:
        raise ValueError("Missing title: provide --title or add title in markdown frontmatter")

    resolved_date = post_date or frontmatter_text(frontmatter, "date") or date.today().isoformat()
    resolved_cover = cover.strip() or frontmatter_text(frontmatter, "cover")

    cli_tags = parse_tags(tags or [])
    fm_tags_raw = frontmatter.get("tags", [])
    fm_tags = fm_tags_raw if isinstance(fm_tags_raw, list) else parse_tags([str(fm_tags_raw)])
    resolved_tags = list(dict.fromkeys([*cli_tags, *fm_tags]))

    resolved_summary = (
        (summary or "").strip()
        or frontmatter_text(frontmatter, "summary", "summmary", "description", "desc")
        or markdown_summary(markdown_text)
    )

    with posts_path.open("r", encoding="utf-8") as file:
        posts = json.load(file)

    source_rel = str(md_path.relative_to(base_root)) if md_path.is_relative_to(base_root) else str(md_path)
    base_slug = slug or frontmatter_text(frontmatter, "slug") or slugify(resolved_title)

    existing_index = next(
        (index for index, item in enumerate(posts) if item.get("source_markdown_file") == source_rel),
        -1,
    )

    if existing_index >= 0:
        resolved_slug = str(posts[existing_index].get("slug") or base_slug)
    else:
        used_slugs = {item.get("slug", "") for item in posts}
        resolved_slug = base_slug
        if resolved_slug in used_slugs:
            suffix = 2
            candidate = f"{resolved_slug}-{suffix}"
            while candidate in used_slugs:
                suffix += 1
                candidate = f"{resolved_slug}-{suffix}"
            resolved_slug = candidate

    new_post = {
        "slug": resolved_slug,
        "title": resolved_title,
        "date": resolved_date,
        "summary": resolved_summary,
        "tags": resolved_tags,
        "content_markdown": markdown_text,
        "cover": resolved_cover,
        "source_markdown_file": source_rel,
    }

    if existing_index >= 0:
        posts[existing_index] = new_post
    else:
        posts.insert(0, new_post)

    with posts_path.open("w", encoding="utf-8") as file:
        json.dump(posts, file, ensure_ascii=False, indent=2)
        file.write("\n")

    return resolved_slug


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

    published_slug = publish_markdown_file(
        file_path=args.file,
        title=args.title,
        post_date=args.date,
        summary=args.summary,
        slug=args.slug,
        cover=args.cover,
        tags=args.tags,
    )

    print(f"Published markdown post: {published_slug}")


if __name__ == "__main__":
    main()
