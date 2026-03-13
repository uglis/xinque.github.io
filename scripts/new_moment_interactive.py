#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path


def ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or default


def ask_yes_no(prompt: str, default_yes: bool = False) -> bool:
    default = "y" if default_yes else "n"
    value = input(f"{prompt} (y/n) [{default}]: ").strip().lower()
    if not value:
        value = default
    return value in {"y", "yes"}


def ask_multiline(prompt: str) -> str:
    print(f"{prompt}（支持多行，单独输入 . 并回车结束）")
    lines: list[str] = []
    while True:
        line = input()
        if line.strip() == ".":
            break
        lines.append(line)

    text = "\n".join(lines).strip()
    return text


def ask_text_source() -> str:
    while True:
        source = ask("动态内容来源：1) 直接输入 2) 从文件读取", "1").strip()

        if source == "1":
            return ask_multiline("动态内容")

        if source == "2":
            file_path = ask("请输入文本文件路径（例如 ./moments/draft.txt）", "").strip()
            if not file_path:
                print("⚠️ 文件路径不能为空，请重试")
                continue

            path = Path(file_path).expanduser().resolve()
            if not path.exists() or not path.is_file():
                print(f"⚠️ 未找到文件：{path}")
                continue

            content = path.read_text(encoding="utf-8").strip()
            if not content:
                print("⚠️ 文件内容为空，请重试")
                continue

            if path.suffix.lower() in {".md", ".markdown"} and content.startswith("---\n"):
                parts = content.split("\n---\n", 1)
                if len(parts) == 2:
                    content = parts[1].lstrip()

            print(f"已读取文件内容：{path}")
            return content

        print("⚠️ 请输入 1 或 2")


def normalize_multiline_text(text: str) -> str:
    normalized_lines: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.replace("\u3000", " ")
        line = re.sub(r"[ \t]+", " ", line)
        line = line.strip()
        normalized_lines.append(line)

    normalized = "\n".join(normalized_lines)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive add moment")
    parser.parse_args()

    today = date.today().isoformat()

    print("\n=== 新建动态（Interactive）===")
    text = normalize_multiline_text(ask_text_source())
    while not text:
        print("⚠️ 动态内容不能为空，请重新输入")
        text = normalize_multiline_text(ask_text_source())

    moment_date = ask("日期 (YYYY-MM-DD)", today)

    music = {}
    if ask_yes_no("是否添加音乐链接", default_yes=False):
        music_platform = ask("音乐平台 (Apple Music / 网易云音乐)", "Apple Music")
        music_title = ask("音乐标题", "未命名音乐")
        music_url = ask("音乐链接 URL", "").strip()
        if music_url:
            music = {
                "platform": music_platform,
                "title": music_title,
                "url": music_url,
            }

    photo = {}
    if ask_yes_no("是否添加照片", default_yes=False):
        photo_src = ask("照片路径 (例如 ./photos/xxx.jpg)", "").strip()
        if photo_src:
            photo_alt = ask("照片描述 alt", "分享照片")
            photo = {
                "src": photo_src,
                "alt": photo_alt,
            }

    root = Path(__file__).resolve().parents[1]
    moments_path = root / "data" / "moments.json"

    with moments_path.open("r", encoding="utf-8") as file:
        moments = json.load(file)

    if not isinstance(moments, list):
        raise ValueError("moments.json must be an array")

    new_moment = {
        "date": moment_date,
        "text": text,
        "music": music,
        "photo": photo,
    }

    moments.insert(0, new_moment)

    with moments_path.open("w", encoding="utf-8") as file:
        json.dump(moments, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("\n✅ 动态已发布到 data/moments.json")


if __name__ == "__main__":
    main()
