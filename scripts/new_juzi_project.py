#!/usr/bin/env python3
"""Scaffold a registered Juzi pure Skill or plugin without overwriting files."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from marketplace_registry import REGISTRY_PATH, ROOT, canonical_json, load_registry


ID_RE = re.compile(r"^[a-z][a-z0-9-]{2,63}$")
TEMPLATE_ROOT = ROOT / "templates" / "project"


def render_template(name: str, values: dict[str, str]) -> str:
    content = (TEMPLATE_ROOT / name).read_text(encoding="utf-8")
    for key, value in values.items():
        content = content.replace("{{" + key + "}}", value)
    unresolved = re.findall(r"{{[A-Z_]+}}", content)
    if unresolved:
        raise ValueError(f"unresolved template values: {unresolved}")
    return content


def project_record(args: argparse.Namespace, canonical: str) -> dict:
    base = {
        "id": args.id,
        "kind": args.kind,
        "displayName": args.display_name,
        "summary": args.summary,
        "status": "active",
        "owner": "Juzi",
        "canonicalPath": canonical,
        "installedId": args.id,
        "platforms": ["windows"],
    }
    if args.kind == "pure-skill":
        base["installMode"] = "verified-copy"
        base["tests"] = [{"type": "skill-validator"}]
    else:
        package = f"plugins/{args.id}"
        base.update(
            {
                "packagePath": package,
                "packagedSkillPath": f"{package}/skills/{args.id}",
                "sourceMode": "in-package",
                "tests": [{"type": "skill-validator"}, {"type": "plugin-validator"}],
            }
        )
    return base


def plan(args: argparse.Namespace) -> dict:
    canonical = f"Juzi-{args.id.removeprefix('juzi-')}" if args.kind == "pure-skill" else f"plugins/{args.id}/skills/{args.id}"
    files = [f"{canonical}/SKILL.md", f"{canonical}/agents/openai.yaml"]
    if args.kind == "plugin":
        files.append(f"plugins/{args.id}/.codex-plugin/plugin.json")
    return {"project": project_record(args, canonical), "files": files}


def apply(args: argparse.Namespace) -> None:
    registry = load_registry(REGISTRY_PATH)
    if any(project["id"] == args.id for project in registry["projects"]):
        raise ValueError(f"project already exists in registry: {args.id}")
    planned = plan(args)
    for relative in planned["files"]:
        if (ROOT / relative).exists():
            raise ValueError(f"refusing to overwrite existing path: {relative}")
    values = {
        "ID": args.id,
        "DISPLAY_NAME": args.display_name,
        "SUMMARY": args.summary,
        "CACHEBUSTER": dt.datetime.now().strftime("%Y%m%d%H%M%S"),
    }
    registry_before = REGISTRY_PATH.read_text(encoding="utf-8")
    ignore_path = ROOT / ".gitignore"
    marketplace_path = ROOT / ".agents" / "plugins" / "marketplace.json"
    readme_path = ROOT / "README.md"
    ignore_before = ignore_path.read_text(encoding="utf-8")
    marketplace_before = marketplace_path.read_text(encoding="utf-8")
    readme_before = readme_path.read_text(encoding="utf-8")
    created_root = ROOT / (planned["project"]["packagePath"] if args.kind == "plugin" else planned["project"]["canonicalPath"])
    staging_root = ROOT / ".codex" / "scaffold"
    staging_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=staging_root) as temporary:
        stage = Path(temporary)
        canonical = Path(planned["project"]["canonicalPath"])
        (stage / canonical / "agents").mkdir(parents=True)
        (stage / canonical / "SKILL.md").write_text(render_template("SKILL.md.template", values), encoding="utf-8", newline="\n")
        (stage / canonical / "agents" / "openai.yaml").write_text(
            render_template("agents.openai.yaml.template", values), encoding="utf-8", newline="\n"
        )
        if args.kind == "plugin":
            manifest = stage / "plugins" / args.id / ".codex-plugin"
            manifest.mkdir(parents=True)
            (manifest / "plugin.json").write_text(render_template("plugin.json.template", values), encoding="utf-8", newline="\n")
            target = ROOT / canonical
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(stage / canonical), str(target))
            manifest_target = ROOT / "plugins" / args.id / ".codex-plugin"
            shutil.move(str(manifest), str(manifest_target))
        else:
            shutil.move(str(stage / canonical), str(ROOT / canonical))
    try:
        registry["projects"].append(planned["project"])
        REGISTRY_PATH.write_text(canonical_json(registry), encoding="utf-8", newline="\n")
        if args.kind == "pure-skill":
            content = ignore_before
            content += f"\n!/{planned['project']['canonicalPath']}/\n!/{planned['project']['canonicalPath']}/**\n"
            ignore_path.write_text(content, encoding="utf-8", newline="\n")
        completed = subprocess.run([sys.executable, str(ROOT / "scripts" / "manage_catalog.py"), "--write"], cwd=ROOT, check=False)
        if completed.returncode != 0:
            raise RuntimeError("catalog generation failed after scaffolding")
    except Exception:
        if created_root.is_dir() and ROOT.resolve() in created_root.resolve().parents:
            shutil.rmtree(created_root)
        REGISTRY_PATH.write_text(registry_before, encoding="utf-8", newline="\n")
        ignore_path.write_text(ignore_before, encoding="utf-8", newline="\n")
        marketplace_path.write_text(marketplace_before, encoding="utf-8", newline="\n")
        readme_path.write_text(readme_before, encoding="utf-8", newline="\n")
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", required=True, choices=("pure-skill", "plugin"))
    parser.add_argument("--id", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not ID_RE.fullmatch(args.id):
        parser.error("--id must be lowercase kebab-case")
    if args.kind == "plugin" and not args.id.startswith("juzi-"):
        parser.error("plugin id must start with juzi-")
    planned = plan(args)
    print(json.dumps(planned, ensure_ascii=False, indent=2))
    if args.apply:
        apply(args)
    else:
        print("Plan only; pass --apply to create files and update the registry.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
