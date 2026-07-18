"""Shared registry helpers for the Juzi Skill marketplace control plane."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / ".agents" / "projects.json"
MARKETPLACE_PATH = ROOT / ".agents" / "plugins" / "marketplace.json"
IGNORED_TREE_PARTS = {".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}


class RegistryError(ValueError):
    """Raised when the marketplace project registry is invalid."""


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RegistryError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise RegistryError(f"JSON root must be an object: {path}")
    return value


def normalized_relative_path(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RegistryError(f"{field} must be a non-empty repository-relative path")
    if "\\" in value:
        raise RegistryError(f"{field} must use forward slashes: {value}")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or value.startswith("./"):
        raise RegistryError(f"{field} is not a normalized repository-relative path: {value}")
    return path.as_posix()


def _require_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RegistryError(f"{field} must be a non-empty string")
    return value.strip()


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, Any]:
    registry = load_json(path)
    if registry.get("schemaVersion") != 1:
        raise RegistryError("projects.json schemaVersion must be 1")
    repository = registry.get("repository")
    marketplace = registry.get("marketplace")
    policies = registry.get("policies")
    projects = registry.get("projects")
    if not isinstance(repository, dict):
        raise RegistryError("projects.json repository must be an object")
    if not isinstance(marketplace, dict):
        raise RegistryError("projects.json marketplace must be an object")
    if not isinstance(policies, dict):
        raise RegistryError("projects.json policies must be an object")
    if not isinstance(projects, list) or not projects:
        raise RegistryError("projects.json projects must be a non-empty array")

    _require_text(repository.get("url"), "repository.url")
    normalized_relative_path(repository.get("versionSource"), "repository.versionSource")
    _require_text(repository.get("stableRef"), "repository.stableRef")
    _require_text(repository.get("betaRef"), "repository.betaRef")
    _require_text(marketplace.get("name"), "marketplace.name")
    _require_text(marketplace.get("displayName"), "marketplace.displayName")

    ids: set[str] = set()
    canonical_paths: set[str] = set()
    for index, project in enumerate(projects):
        prefix = f"projects[{index}]"
        if not isinstance(project, dict):
            raise RegistryError(f"{prefix} must be an object")
        project_id = _require_text(project.get("id"), f"{prefix}.id")
        if project_id in ids:
            raise RegistryError(f"duplicate project id: {project_id}")
        ids.add(project_id)
        kind = project.get("kind")
        if kind not in {"pure-skill", "plugin"}:
            raise RegistryError(f"{project_id}: unsupported kind {kind!r}")
        _require_text(project.get("displayName"), f"{project_id}.displayName")
        _require_text(project.get("summary"), f"{project_id}.summary")
        _require_text(project.get("owner"), f"{project_id}.owner")
        if project.get("status") not in {"active", "deprecated", "retired"}:
            raise RegistryError(f"{project_id}: invalid status")
        canonical = normalized_relative_path(project.get("canonicalPath"), f"{project_id}.canonicalPath")
        if canonical in canonical_paths:
            raise RegistryError(f"duplicate canonicalPath: {canonical}")
        canonical_paths.add(canonical)
        _require_text(project.get("installedId"), f"{project_id}.installedId")
        platforms = project.get("platforms")
        if not isinstance(platforms, list) or not platforms or not all(isinstance(item, str) for item in platforms):
            raise RegistryError(f"{project_id}: platforms must be a non-empty string array")
        unsupported_platforms = set(platforms) - {"windows", "linux", "macos"}
        if unsupported_platforms:
            raise RegistryError(f"{project_id}: unsupported platforms {sorted(unsupported_platforms)}")
        if project.get("status") == "deprecated":
            deprecation = project.get("deprecation")
            if not isinstance(deprecation, dict):
                raise RegistryError(f"{project_id}: deprecated project requires a deprecation object")
            _require_text(deprecation.get("replacement"), f"{project_id}.deprecation.replacement")
            _require_text(deprecation.get("removeAfter"), f"{project_id}.deprecation.removeAfter")
            _require_text(deprecation.get("migration"), f"{project_id}.deprecation.migration")
        tests = project.get("tests")
        if not isinstance(tests, list) or not tests:
            raise RegistryError(f"{project_id}: tests must be a non-empty array")
        for test_index, test in enumerate(tests):
            if not isinstance(test, dict) or test.get("type") not in {
                "skill-validator",
                "plugin-validator",
                "source-package-parity",
                "command",
            }:
                raise RegistryError(f"{project_id}: invalid tests[{test_index}]")
            if test.get("type") == "command":
                _require_text(test.get("name"), f"{project_id}.tests[{test_index}].name")
                command = test.get("command")
                if not isinstance(command, list) or not command or not all(isinstance(item, str) and item for item in command):
                    raise RegistryError(f"{project_id}: command test must be a non-empty string array")
                if command[0] not in {"node", "python", "pwsh"}:
                    raise RegistryError(f"{project_id}: command test executable is not allowlisted: {command[0]}")
        if kind == "pure-skill":
            if project.get("installMode") not in {"verified-copy", "junction"}:
                raise RegistryError(f"{project_id}: invalid pure Skill installMode")
        else:
            package = normalized_relative_path(project.get("packagePath"), f"{project_id}.packagePath")
            packaged = normalized_relative_path(project.get("packagedSkillPath"), f"{project_id}.packagedSkillPath")
            if PurePosixPath(package) not in PurePosixPath(packaged).parents:
                raise RegistryError(f"{project_id}: packagedSkillPath must be inside packagePath")
            if project.get("sourceMode") not in {"in-package", "generated-copy"}:
                raise RegistryError(f"{project_id}: invalid sourceMode")
            if project.get("sourceMode") == "in-package" and canonical != packaged:
                raise RegistryError(f"{project_id}: in-package source must equal packagedSkillPath")
    return registry


def projects(registry: dict[str, Any], *, kind: str | None = None) -> list[dict[str, Any]]:
    values = list(registry["projects"])
    if kind is not None:
        values = [project for project in values if project["kind"] == kind]
    return values


def project_map(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {project["id"]: project for project in projects(registry)}


def repository_path(relative: str) -> Path:
    return ROOT / PurePosixPath(relative)


def iter_tree_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(root)
        if any(part in IGNORED_TREE_PARTS for part in relative.parts) or path.suffix in {".pyc", ".pyo"}:
            continue
        yield path


def tree_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in iter_tree_files(root)
    }


def tree_size(root: Path) -> int:
    return sum(path.stat().st_size for path in iter_tree_files(root))


def marketplace_document(registry: dict[str, Any]) -> dict[str, Any]:
    policies = registry["policies"]
    default_policy = policies["defaultPluginPolicy"]
    category = policies["defaultPluginCategory"]
    return {
        "name": registry["marketplace"]["name"],
        "interface": {"displayName": registry["marketplace"]["displayName"]},
        "plugins": [
            {
                "name": project["id"],
                "source": {"source": "local", "path": f"./{project['packagePath']}"},
                "policy": {
                    "installation": default_policy["installation"],
                    "authentication": default_policy["authentication"],
                },
                "category": category,
            }
            for project in projects(registry, kind="plugin")
            if project["status"] != "retired"
        ],
    }


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"
