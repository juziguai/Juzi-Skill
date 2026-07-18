#!/usr/bin/env python3
"""Generate or verify marketplace and README catalog sections from projects.json."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from marketplace_registry import (
    MARKETPLACE_PATH,
    REGISTRY_PATH,
    ROOT,
    canonical_json,
    load_registry,
    marketplace_document,
    projects,
)


README_PATH = ROOT / "README.md"
PLUGIN_START = "<!-- BEGIN GENERATED:PLUGIN_CATALOG -->"
PLUGIN_END = "<!-- END GENERATED:PLUGIN_CATALOG -->"
PURE_START = "<!-- BEGIN GENERATED:PURE_SKILL_CATALOG -->"
PURE_END = "<!-- END GENERATED:PURE_SKILL_CATALOG -->"


def table_for(kind: str, registry: dict) -> str:
    rows = projects(registry, kind=kind)
    if kind == "plugin":
        lines = ["| 插件 | 用途 |", "|---|---|"]
        lines.extend(f"| `{project['id']}` | {project['summary']} |" for project in rows)
    else:
        lines = ["| 规范源码 | 安装标识 | 职责 |", "|---|---|---|"]
        lines.extend(
            f"| `{project['canonicalPath']}` | `{project['installedId']}` | {project['summary']} |"
            for project in rows
        )
    return "\n".join(lines)


def replace_block(content: str, start: str, end: str, body: str) -> str:
    if content.count(start) != 1 or content.count(end) != 1:
        raise ValueError(f"README must contain exactly one generated block: {start}")
    before, remainder = content.split(start, 1)
    _, after = remainder.split(end, 1)
    return f"{before}{start}\n{body}\n{end}{after}"


def expected_readme(registry: dict) -> str:
    content = README_PATH.read_text(encoding="utf-8")
    content = replace_block(content, PLUGIN_START, PLUGIN_END, table_for("plugin", registry))
    return replace_block(content, PURE_START, PURE_END, table_for("pure-skill", registry))


def check(registry: dict) -> list[str]:
    errors: list[str] = []
    expected_marketplace = canonical_json(marketplace_document(registry))
    if MARKETPLACE_PATH.read_text(encoding="utf-8") != expected_marketplace:
        errors.append("marketplace.json differs from projects.json; run manage_catalog.py --write")
    try:
        expected = expected_readme(registry)
    except ValueError as exc:
        errors.append(str(exc))
    else:
        if README_PATH.read_text(encoding="utf-8") != expected:
            errors.append("README generated catalog differs from projects.json; run manage_catalog.py --write")
    return errors


def write(registry: dict) -> None:
    MARKETPLACE_PATH.write_text(canonical_json(marketplace_document(registry)), encoding="utf-8", newline="\n")
    README_PATH.write_text(expected_readme(registry), encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="fail when generated catalog files have drifted")
    mode.add_argument("--write", action="store_true", help="rewrite generated catalog files")
    args = parser.parse_args()
    registry = load_registry(REGISTRY_PATH)
    if args.write:
        write(registry)
    errors = check(registry)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Catalog generation check passed: projects.json -> marketplace.json + README")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
