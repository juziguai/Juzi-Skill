#!/usr/bin/env python3
"""Validate the Juzi marketplace, project registry, packages, and safety contracts."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from marketplace_registry import (
    MARKETPLACE_PATH,
    REGISTRY_PATH,
    ROOT,
    RegistryError,
    load_json,
    load_registry,
    marketplace_document,
    projects,
    repository_path,
    tree_hashes,
    tree_size,
)


SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)
ALLOWED_INSTALLATION = {"NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"}
ALLOWED_AUTHENTICATION = {"ON_INSTALL", "ON_USE"}
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


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)


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
            return line.split(":", 1)[1].strip().strip("\"'")
    validation.errors.append(f"frontmatter has no name: {path.relative_to(ROOT)}")
    return None


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


def validate_registry_inventory(registry: dict[str, Any], validation: Validation) -> None:
    plugin_ids = {project["id"] for project in projects(registry, kind="plugin")}
    actual_plugins = {path.name for path in (ROOT / "plugins").iterdir() if path.is_dir()}
    validation.require(
        plugin_ids == actual_plugins,
        f"registry/plugin directory mismatch: registry_only={sorted(plugin_ids - actual_plugins)}, "
        f"directory_only={sorted(actual_plugins - plugin_ids)}",
    )
    marketplace = load_json(MARKETPLACE_PATH)
    expected = marketplace_document(registry)
    validation.require(marketplace == expected, "marketplace.json has drifted from projects.json")

    ignore_text = (ROOT / ".gitignore").read_text(encoding="utf-8")
    for project in projects(registry):
        top = project["canonicalPath"].split("/", 1)[0]
        validation.require(
            f"!/{top}/" in ignore_text and f"!/{top}/**" in ignore_text,
            f"{project['id']}: canonical top-level path is not allowlisted in .gitignore: {top}",
        )


def validate_manifest(project: dict[str, Any], validation: Validation) -> None:
    name = project["id"]
    plugin_dir = repository_path(project["packagePath"])
    validation.require(plugin_dir.is_dir(), f"{name}: packagePath is missing")
    if not plugin_dir.is_dir():
        return
    symlinks = [path.relative_to(ROOT).as_posix() for path in plugin_dir.rglob("*") if path.is_symlink()]
    validation.require(not symlinks, f"{name}: plugin package contains symlinks: {', '.join(symlinks)}")

    manifest_path = plugin_dir / ".codex-plugin" / "plugin.json"
    validation.require(manifest_path.is_file(), f"{name}: missing .codex-plugin/plugin.json")
    if not manifest_path.is_file():
        return
    manifest = load_json(manifest_path)
    validation.require(manifest.get("name") == name, f"{name}: manifest name does not match registry")
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
    packaged_skill = repository_path(project["packagedSkillPath"])
    validation.require(packaged_skill.is_dir(), f"{name}: packagedSkillPath is missing")
    skill_files = sorted(packaged_skill.rglob("SKILL.md")) if packaged_skill.is_dir() else []
    validation.require(bool(skill_files), f"{name}: plugin contains no SKILL.md")
    names = [frontmatter_name(skill_file, validation) for skill_file in skill_files]
    validation.require(project["installedId"] in names, f"{name}: plugin does not contain its registered Skill id")

    canonical = repository_path(project["canonicalPath"])
    validation.require(canonical.is_dir(), f"{name}: canonical source directory is missing")
    if project["sourceMode"] == "generated-copy" and canonical.is_dir() and packaged_skill.is_dir():
        validation.require(
            tree_hashes(canonical) == tree_hashes(packaged_skill),
            f"{name}: canonical source and packaged Skill have drifted",
        )


def validate_pure_skill(project: dict[str, Any], validation: Validation) -> None:
    name = project["id"]
    source = repository_path(project["canonicalPath"])
    skill_file = source / "SKILL.md"
    validation.require(source.is_dir(), f"{name}: canonical source is missing")
    validation.require(skill_file.is_file(), f"{name}: canonical SKILL.md is missing")
    if skill_file.is_file():
        validation.require(frontmatter_name(skill_file, validation) == project["installedId"], f"{name}: frontmatter name does not match installedId")
    symlinks = [path.relative_to(ROOT).as_posix() for path in source.rglob("*") if path.is_symlink()] if source.is_dir() else []
    validation.require(not symlinks, f"{name}: canonical source contains symlinks")


def validate_test_contracts(project: dict[str, Any], validation: Validation) -> None:
    types = {test["type"] for test in project["tests"]}
    validation.require("skill-validator" in types, f"{project['id']}: missing skill-validator contract")
    if project["kind"] == "plugin":
        validation.require("plugin-validator" in types, f"{project['id']}: missing plugin-validator contract")
        if project["sourceMode"] == "generated-copy":
            validation.require("source-package-parity" in types, f"{project['id']}: missing source-package-parity contract")
    for test in project["tests"]:
        if test["type"] != "command":
            continue
        command = test["command"]
        candidates = [item for item in command[1:] if "/" in item and not item.startswith("-")]
        for candidate in candidates:
            validation.require(repository_path(candidate).is_file(), f"{project['id']}: test path is missing: {candidate}")


def validate_asset_budgets(registry: dict[str, Any], validation: Validation) -> None:
    policies = registry["policies"]
    project_roots: list[tuple[dict[str, Any], Path]] = []
    for project in projects(registry):
        project_roots.append((project, repository_path(project["canonicalPath"])))
        if project["kind"] == "plugin" and project["sourceMode"] == "generated-copy":
            project_roots.append((project, repository_path(project["packagedSkillPath"])))

    tracked = subprocess.run(
        ["git", "-c", "core.quotePath=false", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout.decode("utf-8").split("\0")
    total = 0
    for relative in (item for item in tracked if item):
        path = ROOT / relative
        if not path.is_file():
            continue
        size = path.stat().st_size
        total += size
        owner: dict[str, Any] | None = None
        resolved = path.resolve()
        for project, root in project_roots:
            if root.is_dir() and (resolved == root.resolve() or root.resolve() in resolved.parents):
                owner = project
                break
        maximum_file = policies["maximumDefaultFileBytes"]
        maximum_images = policies["maximumEmbeddedImagesPerFile"]
        if owner and isinstance(owner.get("assetBudget"), dict):
            maximum_file = owner["assetBudget"].get("maximumFileBytes", maximum_file)
            maximum_images = owner["assetBudget"].get("maximumEmbeddedImagesPerFile", maximum_images)
        validation.require(size <= maximum_file, f"{relative}: {size} bytes exceeds file budget {maximum_file}")
        if path.suffix.lower() in {".html", ".md", ".json", ".js", ".mjs", ".py", ".ps1"}:
            count = path.read_bytes().count(b"data:image/")
            validation.require(count <= maximum_images, f"{relative}: {count} embedded images exceeds budget {maximum_images}")
    validation.require(total <= policies["maximumRepositoryBytes"], f"tracked files use {total} bytes, over repository budget")

    for project in projects(registry):
        budget = project.get("assetBudget")
        if not isinstance(budget, dict):
            continue
        canonical = repository_path(project["canonicalPath"])
        validation.require(tree_size(canonical) <= budget["maximumCanonicalBytes"], f"{project['id']}: canonical tree exceeds budget")
        if project["kind"] == "plugin":
            package = repository_path(project["packagedSkillPath"])
            validation.require(tree_size(package) <= budget["maximumPackageBytes"], f"{project['id']}: packaged Skill exceeds budget")


def validate_production_safety_contracts(validation: Validation) -> None:
    for path, required_phrases in PRODUCTION_SAFETY_CONTRACTS.items():
        validation.require(path.is_file(), f"missing safety contract file: {path.relative_to(ROOT)}")
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for phrase in required_phrases:
            validation.require(phrase in content, f"{path.relative_to(ROOT)}: missing safety phrase {phrase!r}")
    concentrate = ROOT / "Juzi-concentrate-forces" / "SKILL.md"
    if concentrate.is_file():
        validation.require("TodoWrite" not in concentrate.read_text(encoding="utf-8"), "concentrate-forces must not require TodoWrite")
    continuity = ROOT / "plugins" / "juzi-codex-continuity"
    continuity_skill = continuity / "skills" / "juzi-codex-continuity" / "SKILL.md"
    validation.require(continuity_skill.is_file(), "juzi-codex-continuity: missing SKILL.md")
    if continuity_skill.is_file():
        continuity_text = continuity_skill.read_text(encoding="utf-8")
        trigger_heading = "## 触发判定"
        gate_heading = "## 初始化门禁（必须最先执行）"
        startup_heading = "## 启动或恢复"
        validation.require(trigger_heading in continuity_text, "juzi-codex-continuity: missing trigger decision")
        validation.require(gate_heading in continuity_text, "juzi-codex-continuity: missing initialization gate")
        validation.require(
            trigger_heading in continuity_text
            and gate_heading in continuity_text
            and continuity_text.index(trigger_heading) < continuity_text.index(gate_heading),
            "juzi-codex-continuity: trigger decision must precede initialization gate",
        )
        validation.require(
            gate_heading in continuity_text
            and startup_heading in continuity_text
            and continuity_text.index(gate_heading) < continuity_text.index(startup_heading),
            "juzi-codex-continuity: initialization gate must precede startup workflow",
        )
        validation.require(
            "不得先继续工作、执行到中途再补建" in continuity_text,
            "juzi-codex-continuity: missing late-creation prohibition",
        )
        for phrase in (
            "## 任务状态机",
            "`active`",
            "`waiting_user`",
            "`blocked`",
            "`complete`",
            "必须且只能写 `NONE`",
            "建议不等于授权",
            "状态文件不是追加式日志",
            "不得擅自修改 `.gitignore`",
            "普通问答、解释、单命令只读查询",
            "按 `任务状态` 分流",
            "## 权限与事实分层",
            "状态文件和 Goal 都不是",
            "## 字段更新矩阵",
            "十个顶级栏目必须全部显式初始化",
            "每个检查点都要复核控制三元组",
            "初始化状态、初始化时间和触发原因在创建后保持不变",
            "| 完成任务 |",
        ):
            validation.require(phrase in continuity_text, f"juzi-codex-continuity: missing core protocol {phrase!r}")
    for name in ("ACTIVE_TASK.md", "compact-prompt.md"):
        skill_template = continuity / "skills" / "juzi-codex-continuity" / "templates" / name
        plugin_template = continuity / "templates" / name
        validation.require(skill_template.is_file(), f"juzi-codex-continuity: missing Skill template {name}")
        validation.require(plugin_template.is_file(), f"juzi-codex-continuity: missing plugin template {name}")
        if skill_template.is_file() and plugin_template.is_file():
            validation.require(skill_template.read_bytes() == plugin_template.read_bytes(), f"juzi-codex-continuity: duplicated template drifted: {name}")
    active_task_template = continuity / "skills" / "juzi-codex-continuity" / "templates" / "ACTIVE_TASK.md"
    if active_task_template.is_file():
        active_task_text = active_task_template.read_text(encoding="utf-8")
        validation.require(
            active_task_text.startswith("<!-- 初始化门禁："),
            "juzi-codex-continuity: ACTIVE_TASK template must lead with the initialization gate",
        )
        validation.require(
            "<!-- 字段规则：创建/接管时显式初始化全部十个栏目" in active_task_text,
            "juzi-codex-continuity: ACTIVE_TASK template missing field-update rule",
        )
        for field in ("任务状态", "初始化状态", "初始化时间", "触发原因", "建议"):
            validation.require(field in active_task_text, f"juzi-codex-continuity: ACTIVE_TASK template missing {field}")
        validation.require(
            "complete：必须且只能写 NONE" in active_task_text,
            "juzi-codex-continuity: ACTIVE_TASK template missing terminal NEXT_ACTION rule",
        )


def validate_repository_governance(registry: dict[str, Any], validation: Validation) -> None:
    required = (
        "README.md",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CHANGELOG.md",
        ".github/CODEOWNERS",
        "docs/ARCHITECTURE.md",
        "docs/RELEASES.md",
        "docs/COMPATIBILITY.md",
        "docs/DEPRECATION.md",
        "docs/PROJECT-QUALITY.md",
        "docs/ASSET-POLICY.md",
        "docs/OPERATIONS.md",
        "docs/REPOSITORY-SPLIT.md",
        "docs/PUBLIC-READINESS.md",
        "docs/ROADMAP.md",
        "scripts/Test-JuziRelease.ps1",
        "scripts/Test-JuziCanary.ps1",
        "scripts/Test-JuziLoadedState.ps1",
        "scripts/Publish-JuziRelease.ps1",
        "scripts/Set-JuziGitHubGovernance.ps1",
        "scripts/new_juzi_project.py",
        "scripts/prepare_release_notes.py",
        "templates/release/RETROSPECTIVE.md.template",
    )
    for relative in required:
        validation.require((ROOT / relative).is_file(), f"missing governance/control-plane file: {relative}")
    version_path = repository_path(registry["repository"]["versionSource"])
    validation.require(version_path.is_file(), "marketplace VERSION source is missing")
    if version_path.is_file():
        validation.require(bool(SEMVER_RE.fullmatch(version_path.read_text(encoding="utf-8").strip())), "marketplace VERSION is not SemVer")
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    validation.require("## [Unreleased]" in changelog, "CHANGELOG lacks Unreleased section")
    for section in registry["policies"]["requiredReleaseSections"]:
        validation.require(f"### {section}" in changelog, f"CHANGELOG lacks required section: {section}")
    validation.require(registry["repository"]["stableRef"] != registry["repository"]["developmentRef"], "stableRef must differ from developmentRef")

    workflow_root = ROOT / ".github" / "workflows"
    workflow_files = sorted(workflow_root.glob("*.yml")) + sorted(workflow_root.glob("*.yaml"))
    validation.require(bool(workflow_files), "no GitHub workflows found")
    action_pattern = re.compile(r"^\s*-?\s*uses:\s*[^\s@]+@([^\s#]+)", re.MULTILINE)
    for workflow in workflow_files:
        content = workflow.read_text(encoding="utf-8")
        for reference in action_pattern.findall(content):
            validation.require(bool(re.fullmatch(r"[0-9a-f]{40}", reference)), f"{workflow.relative_to(ROOT)}: action is not pinned to a full SHA: {reference}")
    clean_install = (workflow_root / "clean-install.yml").read_text(encoding="utf-8")
    validation.require(
        registry["policies"]["codexCliCanaryVersion"] in clean_install,
        "clean-install workflow Codex CLI version differs from projects.json",
    )
    for document in [ROOT / "README.md", *sorted((ROOT / "docs").glob("*.md"))]:
        content = document.read_text(encoding="utf-8")
        for raw_target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", content):
            target = raw_target.strip().strip("<>").split("#", 1)[0]
            if not target or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target):
                continue
            resolved = (document.parent / unquote(target)).resolve()
            validation.require(resolved.exists(), f"{document.relative_to(ROOT)}: broken local link {raw_target}")


def main() -> int:
    validation = Validation()
    try:
        registry = load_registry(REGISTRY_PATH)
        validation.require(MARKETPLACE_PATH.is_file(), "missing marketplace.json")
        if MARKETPLACE_PATH.is_file():
            validate_registry_inventory(registry, validation)
        for project in projects(registry):
            validate_test_contracts(project, validation)
            if project["kind"] == "pure-skill":
                validate_pure_skill(project, validation)
            else:
                validate_manifest(project, validation)
        validate_asset_budgets(registry, validation)
        validate_production_safety_contracts(validation)
        validate_repository_governance(registry, validation)
    except (OSError, RegistryError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        validation.errors.append(str(exc))

    if validation.errors:
        print(f"Marketplace validation failed with {len(validation.errors)} error(s):", file=sys.stderr)
        for error in validation.errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    plugin_count = len(projects(registry, kind="plugin"))
    pure_count = len(projects(registry, kind="pure-skill"))
    print(f"Marketplace validation passed: {plugin_count} plugin(s), {pure_count} pure Skill(s), registry=v1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
