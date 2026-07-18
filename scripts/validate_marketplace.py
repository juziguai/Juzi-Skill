#!/usr/bin/env python3
"""Validate the Juzi Codex marketplace using only the Python standard library."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MARKETPLACE_PATH = ROOT / ".agents" / "plugins" / "marketplace.json"
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)
ALLOWED_INSTALLATION = {"NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"}
ALLOWED_AUTHENTICATION = {"ON_INSTALL", "ON_USE"}
SOURCE_MAPPINGS = {
    "juzi-codex-skill-lifecycle": ROOT / "juzi-codex-skill-lifecycle",
    "juzi-sync-project-docs": ROOT / "Juzi-sync-project-docs",
    "juzi-travel-guide": ROOT / "Juzi-travel-guide",
    "juzi-windows-elevation": ROOT / "juzi-windows-elevation",
}
PURE_SKILL_SOURCES = {
    "arming-thought": ROOT / "Juzi-arming-thought",
    "workflows": ROOT / "Juzi-workflows",
    "investigation-first": ROOT / "Juzi-investigation-first",
    "contradiction-analysis": ROOT / "Juzi-contradiction-analysis",
    "concentrate-forces": ROOT / "Juzi-concentrate-forces",
    "practice-cognition": ROOT / "Juzi-practice-cognition",
    "criticism-self-criticism": ROOT / "Juzi-criticism-self-criticism",
}
PRODUCTION_SAFETY_CONTRACTS = {
    ROOT / "Juzi-arming-thought" / "SKILL.md": (
        "生产副作用入口门",
        "替代者未就绪前不得释放当前可用基线",
        "宿主平台的系统、开发者规则与安全约束",
    ),
    ROOT / "Juzi-workflows" / "SKILL.md": (
        "Workflow 4：生产变更与事故恢复",
        "10 分钟快速验收",
        "三项缺一不可",
        "exit code `0`",
    ),
    ROOT / "Juzi-investigation-first" / "SKILL.md": (
        "生产调查的最小充分集",
        "未观测",
        "用户手动恢复",
    ),
    ROOT / "Juzi-investigation-first" / "investigation-agent-prompt.md": (
        "生产调查保持只读",
        "生产基线卡",
    ),
    ROOT / "Juzi-contradiction-analysis" / "SKILL.md": (
        "生产场景的连续性优先规则",
        "受保护基线",
    ),
    ROOT / "Juzi-contradiction-analysis" / "contradiction-mapper-prompt.md": (
        "生产连续性是硬约束",
        "生产安全边界",
    ),
    ROOT / "Juzi-concentrate-forces" / "SKILL.md": (
        "生产事故中的集中兵力",
        "不得因为焦虑而重复运行等价的长门禁",
    ),
    ROOT / "Juzi-practice-cognition" / "SKILL.md": (
        "生产验证的安全阶梯",
        "UAC 取消",
        "10 分钟快速验收",
        "三项缺一不可",
    ),
    ROOT / "Juzi-criticism-self-criticism" / "SKILL.md": (
        "生产事故复盘的最低事实集",
        "确定性根因",
        "停机窗口",
    ),
    ROOT / "Juzi-criticism-self-criticism" / "review-checklist.md": (
        "生产安全与事故检查",
        "永久修复",
    ),
    ROOT / "plugins" / "juzi-codex-continuity" / "skills" / "juzi-codex-continuity" / "SKILL.md": (
        "生产状态与破坏性边界",
        "破坏性动作预算",
    ),
    ROOT / "Juzi-sync-project-docs" / "SKILL.md": (
        "生产运维语义的真值规则",
        "exit code `0`",
        "10 分钟快速验收",
    ),
    ROOT / "juzi-windows-elevation" / "SKILL.md": (
        "Production Safety Gate",
        "one-time attempt",
        "real smoke traffic",
    ),
    ROOT / "juzi-windows-elevation" / "references" / "elevation-protocol.md": (
        "An untested failure path may not be exercised for the first time against production",
        "user-restored Runtime/PID",
    ),
    ROOT / "juzi-codex-skill-lifecycle" / "SKILL.md": (
        "Pure Skill Installation Gate",
        "untrusted mount point",
        "hash-verified real copy",
    ),
}
IGNORED_TREE_PARTS = {".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)


def read_json(path: Path, validation: Validation) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        validation.errors.append(f"cannot read JSON {path.relative_to(ROOT)}: {exc}")
        return {}
    if not isinstance(value, dict):
        validation.errors.append(f"JSON root must be an object: {path.relative_to(ROOT)}")
        return {}
    return value


def frontmatter_name(path: Path, validation: Validation) -> str | None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        validation.errors.append(f"cannot read {path.relative_to(ROOT)}: {exc}")
        return None
    if not lines or lines[0].strip() != "---":
        validation.errors.append(f"missing YAML frontmatter: {path.relative_to(ROOT)}")
        return None
    try:
        end = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration:
        validation.errors.append(f"unterminated YAML frontmatter: {path.relative_to(ROOT)}")
        return None
    for line in lines[1:end]:
        if line.startswith("name:"):
            return line.split(":", 1)[1].strip().strip('"\'')
    validation.errors.append(f"frontmatter has no name: {path.relative_to(ROOT)}")
    return None


def tree_hashes(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(root)
        if any(part in IGNORED_TREE_PARTS for part in relative.parts) or path.suffix in {".pyc", ".pyo"}:
            continue
        hashes[relative.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def validate_prompt(value: Any, plugin_name: str, validation: Validation) -> None:
    if isinstance(value, str):
        prompts = [value]
    elif isinstance(value, list) and all(isinstance(item, str) for item in value):
        prompts = value
    else:
        validation.errors.append(f"{plugin_name}: interface.defaultPrompt must be a string or string array")
        return
    validation.require(len(prompts) <= 3, f"{plugin_name}: interface.defaultPrompt supports at most 3 prompts")
    for index, prompt in enumerate(prompts):
        validation.require(len(prompt) <= 128, f"{plugin_name}: defaultPrompt[{index}] exceeds 128 characters")


def validate_plugin(entry: dict[str, Any], validation: Validation) -> None:
    name = entry.get("name")
    validation.require(isinstance(name, str) and bool(name), "marketplace entry has no valid name")
    if not isinstance(name, str) or not name:
        return

    source = entry.get("source")
    validation.require(isinstance(source, dict), f"{name}: source must be an object")
    if not isinstance(source, dict):
        return
    expected_source_path = f"./plugins/{name}"
    validation.require(source.get("source") == "local", f"{name}: source.source must be local")
    validation.require(source.get("path") == expected_source_path, f"{name}: source.path must be {expected_source_path}")

    policy = entry.get("policy")
    validation.require(isinstance(policy, dict), f"{name}: policy must be an object")
    if isinstance(policy, dict):
        validation.require(policy.get("installation") in ALLOWED_INSTALLATION, f"{name}: invalid installation policy")
        validation.require(policy.get("authentication") in ALLOWED_AUTHENTICATION, f"{name}: invalid authentication policy")
    validation.require(isinstance(entry.get("category"), str) and bool(entry.get("category")), f"{name}: category is required")

    plugins_root = ROOT / "plugins"
    exact_plugin_names = {path.name for path in plugins_root.iterdir() if path.is_dir()}
    validation.require(name in exact_plugin_names, f"{name}: plugin directory does not exist with exact casing")
    plugin_dir = plugins_root / name
    if not plugin_dir.is_dir():
        return
    symlinks = [path.relative_to(ROOT).as_posix() for path in plugin_dir.rglob("*") if path.is_symlink()]
    validation.require(not symlinks, f"{name}: plugin package contains symlinks: {', '.join(symlinks)}")

    manifest_path = plugin_dir / ".codex-plugin" / "plugin.json"
    validation.require(manifest_path.is_file(), f"{name}: missing .codex-plugin/plugin.json")
    if not manifest_path.is_file():
        return
    manifest = read_json(manifest_path, validation)
    validation.require(manifest.get("name") == name, f"{name}: manifest name does not match marketplace entry")
    version = manifest.get("version")
    validation.require(isinstance(version, str) and bool(SEMVER_RE.fullmatch(version)), f"{name}: version is not valid semver")
    validation.require(isinstance(manifest.get("description"), str) and bool(manifest.get("description")), f"{name}: description is required")
    author = manifest.get("author")
    validation.require(isinstance(author, dict) and bool(author.get("name")), f"{name}: author.name is required")
    validation.require("[TODO:" not in manifest_path.read_text(encoding="utf-8"), f"{name}: manifest contains TODO placeholders")

    interface = manifest.get("interface")
    validation.require(isinstance(interface, dict), f"{name}: interface must be an object")
    if isinstance(interface, dict):
        for field in ("displayName", "shortDescription", "longDescription", "developerName", "category"):
            validation.require(isinstance(interface.get(field), str) and bool(interface.get(field)), f"{name}: interface.{field} is required")
        if "defaultPrompt" in interface:
            validate_prompt(interface["defaultPrompt"], name, validation)
        for field in ("composerIcon", "logo", "logoDark"):
            asset = interface.get(field)
            if asset is not None:
                validation.require(isinstance(asset, str) and asset.startswith("./"), f"{name}: interface.{field} must be plugin-relative")
                if isinstance(asset, str) and asset.startswith("./"):
                    validation.require((plugin_dir / asset[2:]).is_file(), f"{name}: interface.{field} target is missing")

    skills_value = manifest.get("skills", "./skills/")
    validation.require(isinstance(skills_value, str) and skills_value.startswith("./"), f"{name}: skills path must be plugin-relative")
    if not isinstance(skills_value, str) or not skills_value.startswith("./"):
        return
    skills_dir = plugin_dir / skills_value[2:]
    validation.require(skills_dir.is_dir(), f"{name}: skills directory is missing")
    skill_files = sorted(skills_dir.rglob("SKILL.md")) if skills_dir.is_dir() else []
    validation.require(bool(skill_files), f"{name}: plugin contains no SKILL.md")
    for skill_file in skill_files:
        skill_name = frontmatter_name(skill_file, validation)
        validation.require(bool(skill_name), f"{name}: invalid Skill entry {skill_file.relative_to(ROOT)}")

    source_root = SOURCE_MAPPINGS.get(name)
    if source_root is not None:
        validation.require(source_root.is_dir(), f"{name}: canonical source directory is missing")
        packaged_skill = skills_dir / name
        validation.require(packaged_skill.is_dir(), f"{name}: packaged Skill directory is missing")
        if source_root.is_dir() and packaged_skill.is_dir():
            source_hashes = tree_hashes(source_root)
            package_hashes = tree_hashes(packaged_skill)
            validation.require(
                source_hashes == package_hashes,
                f"{name}: canonical source and packaged Skill have drifted",
            )


def validate_pure_skills(validation: Validation) -> None:
    for expected_name, source_root in PURE_SKILL_SOURCES.items():
        skill_file = source_root / "SKILL.md"
        validation.require(source_root.is_dir(), f"{expected_name}: canonical pure Skill source is missing")
        validation.require(skill_file.is_file(), f"{expected_name}: canonical SKILL.md is missing")
        if not skill_file.is_file():
            continue
        validation.require(
            frontmatter_name(skill_file, validation) == expected_name,
            f"{expected_name}: frontmatter name does not match the installed identifier",
        )
        symlinks = [path.relative_to(ROOT).as_posix() for path in source_root.rglob("*") if path.is_symlink()]
        validation.require(not symlinks, f"{expected_name}: canonical source contains symlinks")


def validate_production_safety_contracts(validation: Validation) -> None:
    for path, required_phrases in PRODUCTION_SAFETY_CONTRACTS.items():
        validation.require(path.is_file(), f"missing safety contract file: {path.relative_to(ROOT)}")
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for phrase in required_phrases:
            validation.require(
                phrase in content,
                f"{path.relative_to(ROOT)}: missing production safety contract phrase {phrase!r}",
            )

    concentrate_path = ROOT / "Juzi-concentrate-forces" / "SKILL.md"
    if concentrate_path.is_file():
        concentrate = concentrate_path.read_text(encoding="utf-8")
        validation.require("TodoWrite" not in concentrate, "concentrate-forces must not require unavailable TodoWrite")

    continuity_root = ROOT / "plugins" / "juzi-codex-continuity"
    skill_templates = continuity_root / "skills" / "juzi-codex-continuity" / "templates"
    plugin_templates = continuity_root / "templates"
    for name in ("ACTIVE_TASK.md", "compact-prompt.md"):
        skill_template = skill_templates / name
        plugin_template = plugin_templates / name
        validation.require(skill_template.is_file(), f"juzi-codex-continuity: missing Skill template: {name}")
        validation.require(plugin_template.is_file(), f"juzi-codex-continuity: missing plugin template: {name}")
        if skill_template.is_file() and plugin_template.is_file():
            validation.require(
                skill_template.read_bytes() == plugin_template.read_bytes(),
                f"juzi-codex-continuity: duplicated template drifted: {name}",
            )
    active_template_path = skill_templates / "ACTIVE_TASK.md"
    if active_template_path.is_file():
        active_template = active_template_path.read_text(encoding="utf-8")
        validation.require("生产状态与破坏性边界" in active_template, "continuity template lacks production boundary state")


def main() -> int:
    validation = Validation()
    validate_pure_skills(validation)
    validate_production_safety_contracts(validation)
    validation.require(MARKETPLACE_PATH.is_file(), "missing .agents/plugins/marketplace.json")
    if not MARKETPLACE_PATH.is_file():
        for error in validation.errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    marketplace = read_json(MARKETPLACE_PATH, validation)
    validation.require(marketplace.get("name") == "juzi-skill", "marketplace name must be juzi-skill")
    interface = marketplace.get("interface")
    validation.require(isinstance(interface, dict) and interface.get("displayName") == "Juzi Skill", "marketplace displayName must be Juzi Skill")
    plugins = marketplace.get("plugins")
    validation.require(isinstance(plugins, list) and bool(plugins), "marketplace plugins must be a non-empty array")
    if isinstance(plugins, list):
        names = [entry.get("name") for entry in plugins if isinstance(entry, dict)]
        validation.require(len(names) == len(set(names)), "marketplace plugin names must be unique")
        for entry in plugins:
            if isinstance(entry, dict):
                validate_plugin(entry, validation)
            else:
                validation.errors.append("marketplace plugin entry must be an object")

    if validation.errors:
        print(f"Marketplace validation failed with {len(validation.errors)} error(s):", file=sys.stderr)
        for error in validation.errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Marketplace validation passed: {len(plugins)} plugin(s), name={marketplace['name']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
