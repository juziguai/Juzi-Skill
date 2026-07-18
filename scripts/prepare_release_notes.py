#!/usr/bin/env python3
"""Build user-facing marketplace release notes from CHANGELOG Unreleased."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from marketplace_registry import REGISTRY_PATH, ROOT, load_registry


def unreleased_body(content: str) -> str:
    match = re.search(r"^## \[Unreleased\]\s*$([\s\S]*?)(?=^## \[|\Z)", content, re.MULTILINE)
    if not match:
        raise ValueError("CHANGELOG has no Unreleased section")
    return match.group(1).strip()


def validate_sections(body: str, sections: list[str]) -> None:
    for index, section in enumerate(sections):
        next_sections = "|".join(re.escape(value) for value in sections[index + 1 :])
        boundary = rf"(?=^### (?:{next_sections})\s*$|\Z)" if next_sections else r"\Z"
        match = re.search(rf"^### {re.escape(section)}\s*$([\s\S]*?){boundary}", body, re.MULTILINE)
        if not match or not re.search(r"^-\s+\S", match.group(1), re.MULTILINE):
            raise ValueError(f"Unreleased section is empty or missing: {section}")


def render(tag: str, content: str, sections: list[str]) -> str:
    body = unreleased_body(content)
    validate_sections(body, sections)
    return f"# Juzi Skill {tag}\n\n{body}\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    registry = load_registry(REGISTRY_PATH)
    content = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    notes = render(args.tag, content, registry["policies"]["requiredReleaseSections"])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(notes, encoding="utf-8", newline="\n")
    print(f"Release notes written: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
