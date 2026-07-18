#!/usr/bin/env python3
"""Juzi marketplace release control plane.

The default operations are read-only. Mutating operations require an explicit
flag and still never create Git commits, push refs, publish releases, or change
GitHub repository settings.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Iterable

from marketplace_registry import (
    REGISTRY_PATH,
    ROOT,
    canonical_json,
    load_registry,
    project_map,
    projects,
    repository_path,
    tree_hashes,
)


CONTROL_PLANE_PATHS = {
    ".agents/projects.json",
    ".agents/plugins/marketplace.json",
    ".github",
    ".gitignore",
    "README.md",
    "CHANGELOG.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "docs",
    "scripts",
}
SECRET_PATTERNS = {
    "github-token": re.compile(rb"gh[pousr]_[A-Za-z0-9_]{20,}"),
    "aws-access-key": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "private-key": re.compile(rb"BEGIN (?:RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY"),
    "bearer-token": re.compile(rb"[Bb]earer\s+[A-Za-z0-9._~+/-]{20,}"),
    "database-url": re.compile(rb"(?:postgres|mysql|mongodb|redis)://[^\s]+@"),
}


class ReleaseError(RuntimeError):
    """Raised for an actionable release gate failure."""


def configure_utf8_stdio() -> None:
    """Keep redirected Windows logs able to represent repository paths and diagnostics."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="backslashreplace")


def run(
    args: list[str],
    *,
    cwd: Path = ROOT,
    check: bool = True,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    command_env = os.environ.copy()
    command_env.update(env or {})
    if not env or "PYTHONUTF8" not in env:
        command_env["PYTHONUTF8"] = "1"
    if not env or "PYTHONIOENCODING" not in env:
        command_env["PYTHONIOENCODING"] = "utf-8"
    try:
        completed = subprocess.run(
            args,
            cwd=cwd,
            check=False,
            text=True,
            encoding="utf-8",
            errors="strict",
            capture_output=True,
            env=command_env,
        )
    except OSError as exc:
        raise ReleaseError(f"cannot start command {' '.join(args)}: {exc}") from exc
    if check and completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or f"exit {completed.returncode}"
        raise ReleaseError(f"command failed: {' '.join(args)}: {detail}")
    return completed


def git(*args: str, check: bool = True) -> str:
    return run(["git", *args], check=check).stdout.strip()


def git_paths(*args: str) -> list[str]:
    raw = subprocess.run(
        ["git", "-c", "core.quotePath=false", *args, "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout.decode("utf-8")
    return [item for item in raw.split("\0") if item]


def tracked_paths() -> list[str]:
    return git_paths("ls-files")


def worktree_paths() -> list[str]:
    return sorted(set(tracked_paths()) | set(git_paths("ls-files", "--others", "--exclude-standard")))


def changed_paths(base: str, head: str = "HEAD") -> list[str]:
    return git_paths("diff", "--name-only", f"{base}...{head}")


def candidate_paths(base: str) -> list[str]:
    committed_and_worktree = git_paths("diff", "--name-only", base)
    untracked = git_paths("ls-files", "--others", "--exclude-standard")
    return sorted(set(committed_and_worktree) | set(untracked))


def path_is_within(path: str, root: str) -> bool:
    candidate = PurePosixPath(path)
    parent = PurePosixPath(root)
    return candidate == parent or parent in candidate.parents


def affected_project_ids(registry: dict[str, Any], paths: Iterable[str]) -> list[str]:
    all_ids = [project["id"] for project in projects(registry)]
    affected: set[str] = set()
    for path in paths:
        if any(path_is_within(path, global_path) for global_path in CONTROL_PLANE_PATHS):
            return all_ids
        for project in projects(registry):
            roots = [project["canonicalPath"]]
            if project["kind"] == "plugin":
                roots.append(project["packagePath"])
            if any(path_is_within(path, root) for root in roots):
                affected.add(project["id"])
    return [project_id for project_id in all_ids if project_id in affected]


def current_versions(registry: dict[str, Any], selected: Iterable[str]) -> dict[str, str | None]:
    selected_set = set(selected)
    result: dict[str, str | None] = {}
    for project in projects(registry):
        if project["id"] not in selected_set:
            continue
        if project["kind"] == "plugin":
            manifest = repository_path(project["packagePath"]) / ".codex-plugin" / "plugin.json"
            result[project["id"]] = json.loads(manifest.read_text(encoding="utf-8"))["version"]
        else:
            result[project["id"]] = None
    return result


def find_official_validator(kind: str) -> Path | None:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    if kind == "skill-validator":
        path = codex_home / "skills" / ".system" / "skill-creator" / "scripts" / "quick_validate.py"
    else:
        path = codex_home / "skills" / ".system" / "plugin-creator" / "scripts" / "validate_plugin.py"
    return path if path.is_file() else None


def scan_secret_bytes(data: bytes) -> list[str]:
    return [name for name, pattern in SECRET_PATTERNS.items() if pattern.search(data)]


def scan_worktree_secrets() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for relative in worktree_paths():
        path = ROOT / relative
        if not path.is_file() or path.stat().st_size > 5 * 1024 * 1024:
            continue
        for category in scan_secret_bytes(path.read_bytes()):
            findings.append({"category": category, "path": relative})
    return findings


def scan_history_secrets() -> list[dict[str, str]]:
    commits = [line for line in git("rev-list", "--all").splitlines() if line]
    findings: list[dict[str, str]] = []
    grep_patterns = {
        "github-token": r"gh[pousr]_[A-Za-z0-9_]{20,}",
        "aws-access-key": r"AKIA[0-9A-Z]{16}",
        "private-key": r"BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY",
        "bearer-token": r"[Bb]earer[[:space:]]+[A-Za-z0-9._~+/-]{20,}",
        "database-url": r"(postgres|mysql|mongodb|redis)://[^[:space:]]+@",
    }
    for category, pattern in grep_patterns.items():
        completed = run(["git", "grep", "-I", "-l", "-E", pattern, *commits, "--"], check=False)
        if completed.returncode not in {0, 1}:
            raise ReleaseError(f"history scan failed for {category}: {completed.stderr.strip()}")
        for item in completed.stdout.splitlines():
            _, _, path = item.partition(":")
            findings.append({"category": category, "path": path or item})
    return findings


def repository_digest() -> str:
    digest = hashlib.sha256()
    for relative in worktree_paths():
        path = ROOT / relative
        if path.is_file():
            digest.update(relative.encode("utf-8"))
            digest.update(b"\0")
            digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def porcelain_status() -> list[dict[str, str]]:
    raw = subprocess.run(
        ["git", "-c", "core.quotePath=false", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout.decode("utf-8")
    fields = [item for item in raw.split("\0") if item]
    result: list[dict[str, str]] = []
    index = 0
    while index < len(fields):
        entry = fields[index]
        status = entry[:2]
        path = entry[3:]
        result.append({"status": status, "path": path})
        if "R" in status or "C" in status:
            index += 1
            if index < len(fields):
                result.append({"status": "source", "path": fields[index]})
        index += 1
    return result


def git_state() -> dict[str, Any]:
    status = porcelain_status()
    return {
        "branch": git("branch", "--show-current"),
        "commit": git("rev-parse", "HEAD"),
        "dirty": bool(status),
        "statusPaths": [item["path"] for item in status],
        "repositoryDigest": repository_digest(),
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_json(value), encoding="utf-8", newline="\n")


def run_project_tests(registry: dict[str, Any], selected: Iterable[str]) -> list[dict[str, Any]]:
    selected_set = set(selected)
    results: list[dict[str, Any]] = []
    for project in projects(registry):
        if project["id"] not in selected_set:
            continue
        for test in project["tests"]:
            test_type = test["type"]
            if test_type == "source-package-parity":
                continue
            if test_type in {"skill-validator", "plugin-validator"}:
                validator = find_official_validator(test_type)
                if validator is None:
                    results.append({"project": project["id"], "test": test_type, "status": "not-available"})
                    continue
                target = project["canonicalPath"] if test_type == "skill-validator" else project["packagePath"]
                command = [sys.executable, str(validator), str(repository_path(target))]
                name = test_type
            else:
                command = list(test["command"])
                name = test["name"]
                if command[0] == "pwsh" and shutil.which("pwsh") is None and shutil.which("powershell"):
                    command[0] = "powershell"
                if shutil.which(command[0]) is None:
                    raise ReleaseError(f"{project['id']} test executable is unavailable: {command[0]}")
            started = time.monotonic()
            completed = run(command, check=False)
            duration = round(time.monotonic() - started, 3)
            status = "passed" if completed.returncode == 0 else "failed"
            results.append(
                {
                    "project": project["id"],
                    "test": name,
                    "status": status,
                    "exitCode": completed.returncode,
                    "durationSeconds": duration,
                }
            )
            if completed.returncode != 0:
                detail = completed.stderr.strip() or completed.stdout.strip()
                raise ReleaseError(f"{project['id']} test failed: {name}: {detail}")
    return results


def validate_changed_versions(registry: dict[str, Any], base: str, selected: Iterable[str]) -> list[str]:
    errors: list[str] = []
    selected_set = set(selected)
    paths = set(candidate_paths(base))
    for project in projects(registry, kind="plugin"):
        if project["id"] not in selected_set:
            continue
        package = project["packagePath"]
        manifest_path = f"{package}/.codex-plugin/plugin.json"
        meaningful = [path for path in paths if path_is_within(path, package) and path != manifest_path]
        previous = run(["git", "show", f"{base}:{manifest_path}"], check=False)
        if previous.returncode != 0:
            continue
        old_manifest = json.loads(previous.stdout)
        current_manifest = json.loads((ROOT / manifest_path).read_text(encoding="utf-8"))
        old_version = old_manifest["version"]
        current_version = current_manifest["version"]
        old_without_version = {key: value for key, value in old_manifest.items() if key != "version"}
        current_without_version = {key: value for key, value in current_manifest.items() if key != "version"}
        if manifest_path in paths and old_without_version != current_without_version:
            meaningful.append(manifest_path)
        if not meaningful:
            continue
        if old_version == current_version:
            errors.append(f"{project['id']}: package changed but version/cachebuster did not change")
    return errors


def preflight(args: argparse.Namespace) -> int:
    started = time.monotonic()
    registry = load_registry(REGISTRY_PATH)
    if args.all:
        selected = [project["id"] for project in projects(registry)]
        paths = worktree_paths()
    else:
        paths = candidate_paths(args.base)
        selected = affected_project_ids(registry, paths)
    state = git_state()
    errors: list[str] = []
    if args.require_clean and state["dirty"]:
        errors.append("working tree must be clean")
    for command in (
        [sys.executable, "scripts/manage_catalog.py", "--check"],
        [sys.executable, "scripts/validate_marketplace.py"],
        ["git", "diff", "--check"],
    ):
        completed = run(command, check=False)
        if completed.returncode != 0:
            errors.append(completed.stderr.strip() or completed.stdout.strip() or "command failed")
    secret_findings = scan_worktree_secrets()
    if secret_findings:
        errors.append(f"working tree secret scan found {len(secret_findings)} path/category match(es)")
    history_findings: list[dict[str, str]] = []
    if args.history:
        history_findings = scan_history_secrets()
        if history_findings:
            errors.append(f"history secret scan found {len(history_findings)} path/category match(es)")
    version_errors = validate_changed_versions(registry, args.base, selected)
    errors.extend(version_errors)
    tests: list[dict[str, Any]] = []
    if not errors:
        try:
            tests = run_project_tests(registry, selected)
        except ReleaseError as exc:
            errors.append(str(exc))
    result = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "passed" if not errors else "failed",
        "git": state,
        "base": args.base,
        "allProjects": args.all,
        "changedPaths": paths,
        "projects": selected,
        "versions": current_versions(registry, selected),
        "tests": tests,
        "secretFindingCount": len(secret_findings),
        "historySecretFindingCount": len(history_findings),
        "durationSeconds": round(time.monotonic() - started, 3),
        "errors": errors,
    }
    if args.output:
        write_json(Path(args.output), result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


def atomic_replace_tree(
    source: Path,
    target: Path,
    backup_root: Path,
    *,
    verifier: Callable[[Path], dict[str, str]] = tree_hashes,
) -> Path:
    if not source.is_dir() or not target.is_dir():
        raise ReleaseError("atomic tree replacement requires existing source and target directories")
    backup = backup_root / target.name
    backup.parent.mkdir(parents=True, exist_ok=True)
    if backup.exists():
        raise ReleaseError(f"backup already exists: {backup}")
    shutil.copytree(target, backup)
    stage = target.parent / f".{target.name}.stage-{uuid.uuid4().hex}"
    old = target.parent / f".{target.name}.old-{uuid.uuid4().hex}"
    try:
        shutil.copytree(source, stage)
        if verifier(source) != verifier(stage):
            raise ReleaseError("staged tree hash differs from canonical source")
        target.rename(old)
        try:
            stage.rename(target)
            if verifier(source) != verifier(target):
                raise ReleaseError("installed tree hash differs after atomic replacement")
        except Exception:
            if target.exists():
                shutil.rmtree(target)
            old.rename(target)
            raise
        shutil.rmtree(old)
        return backup
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def sync_project(args: argparse.Namespace) -> int:
    registry = load_registry(REGISTRY_PATH)
    mapping = project_map(registry)
    if args.project not in mapping:
        raise ReleaseError(f"unknown project: {args.project}")
    project = mapping[args.project]
    if project["kind"] != "plugin" or project.get("sourceMode") != "generated-copy":
        raise ReleaseError(f"{args.project} does not use a generated package copy")
    source = repository_path(project["canonicalPath"])
    target = repository_path(project["packagedSkillPath"])
    matches = tree_hashes(source) == tree_hashes(target)
    result: dict[str, Any] = {"project": args.project, "matches": matches, "applied": False}
    if not matches and args.apply:
        timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = ROOT / ".codex" / "package-backups" / timestamp / args.project
        result["backup"] = str(atomic_replace_tree(source, target, backup.parent).relative_to(ROOT))
        result["matches"] = tree_hashes(source) == tree_hashes(target)
        result["applied"] = True
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["matches"] else 2


def public_audit(args: argparse.Namespace) -> int:
    registry = load_registry(REGISTRY_PATH)
    public_files = (
        "LICENSE",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CHANGELOG.md",
        ".github/CODEOWNERS",
        "docs/PUBLIC-READINESS.md",
        "docs/ASSET-POLICY.md",
    )
    missing = [name for name in public_files if not (ROOT / name).is_file()]
    history = scan_history_secrets()
    current = scan_worktree_secrets()
    license_state = registry["repository"].get("license")
    errors: list[str] = []
    if missing:
        errors.append(f"missing public governance files: {', '.join(missing)}")
    if license_state == "pending-user-selection":
        errors.append("repository license still requires user selection")
    if history or current:
        errors.append("secret scan has findings")
    result = {
        "status": "passed" if not errors else "blocked",
        "commitCount": int(git("rev-list", "--all", "--count")),
        "trackedAndCandidateFileCount": len(worktree_paths()),
        "historySecretFindingCount": len(history),
        "worktreeSecretFindingCount": len(current),
        "missingFiles": missing,
        "license": license_state,
        "errors": errors,
    }
    if args.output:
        write_json(Path(args.output), result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


def create_receipt(args: argparse.Namespace) -> int:
    registry = load_registry(REGISTRY_PATH)
    state = git_state()
    selected = args.project or [project["id"] for project in projects(registry)]
    receipt = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "repository": registry["repository"]["url"],
        "marketplaceVersion": repository_path(registry["repository"]["versionSource"]).read_text(encoding="utf-8").strip(),
        "channel": args.channel,
        "git": state,
        "projects": selected,
        "versions": current_versions(registry, selected),
        "registrySha256": hashlib.sha256(REGISTRY_PATH.read_bytes()).hexdigest(),
        "preflight": None,
    }
    if args.preflight:
        receipt["preflight"] = json.loads(Path(args.preflight).read_text(encoding="utf-8"))
    write_json(Path(args.output), receipt)
    print(f"Release receipt written: {args.output}")
    return 0


def health(args: argparse.Namespace) -> int:
    registry = load_registry(REGISTRY_PATH)
    pure: list[dict[str, Any]] = []
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    for project in projects(registry, kind="pure-skill"):
        source = repository_path(project["canonicalPath"])
        installed = codex_home / "skills" / project["installedId"]
        status = "not-installed"
        if installed.is_dir():
            status = "matching" if tree_hashes(source) == tree_hashes(installed) else "drifted"
        pure.append({"project": project["id"], "status": status})
    plugin_status: list[dict[str, Any]] = []
    codex = shutil.which("codex")
    if codex:
        completed = run([codex, "plugin", "list", "--json"], check=False)
        if completed.returncode == 0:
            installed_plugins = {item["pluginId"].split("@", 1)[0]: item for item in json.loads(completed.stdout)["installed"]}
            for project in projects(registry, kind="plugin"):
                item = installed_plugins.get(project["id"])
                plugin_status.append({
                    "project": project["id"],
                    "installed": bool(item and item.get("installed")),
                    "enabled": bool(item and item.get("enabled")),
                    "version": item.get("version") if item else None,
                })
    file_rows: list[dict[str, Any]] = []
    total_bytes = 0
    for relative in worktree_paths():
        path = ROOT / relative
        if path.is_file():
            size = path.stat().st_size
            total_bytes += size
            file_rows.append({"path": relative, "bytes": size})
    split_candidates: list[dict[str, Any]] = []
    for project in projects(registry):
        canonical_bytes = sum(path.stat().st_size for path in repository_path(project["canonicalPath"]).rglob("*") if path.is_file())
        package_bytes = 0
        if project["kind"] == "plugin" and project.get("sourceMode") == "generated-copy":
            package_bytes = sum(path.stat().st_size for path in repository_path(project["packagedSkillPath"]).rglob("*") if path.is_file())
        if canonical_bytes + package_bytes >= 10 * 1024 * 1024:
            split_candidates.append(
                {"project": project["id"], "canonicalBytes": canonical_bytes, "duplicatePackageBytes": package_bytes}
            )
    last_tag = run(["git", "describe", "--tags", "--match", "market-v*", "--abbrev=0"], check=False)
    errors = []
    if args.require_installed:
        errors.extend(item["project"] for item in pure if item["status"] != "matching")
        errors.extend(item["project"] for item in plugin_status if not item["installed"] or not item["enabled"])
    result = {
        "status": "healthy" if not errors else "degraded",
        "repository": {
            "marketplaceVersion": repository_path(registry["repository"]["versionSource"]).read_text(encoding="utf-8").strip(),
            "projectCount": len(projects(registry)),
            "trackedAndCandidateFileCount": len(file_rows),
            "totalBytes": total_bytes,
            "largestFiles": sorted(file_rows, key=lambda item: item["bytes"], reverse=True)[:10],
            "lastMarketTag": last_tag.stdout.strip() if last_tag.returncode == 0 else None,
            "splitCandidates": split_candidates,
        },
        "pureSkills": pure,
        "plugins": plugin_status,
        "errors": errors,
    }
    if args.output:
        write_json(Path(args.output), result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


def rollback_plan(args: argparse.Namespace) -> int:
    receipt = json.loads(Path(args.receipt).read_text(encoding="utf-8"))
    commit = receipt["git"]["commit"]
    registry = load_registry(REGISTRY_PATH)
    plan = {
        "targetCommit": commit,
        "safeDefault": "plan-only",
        "steps": [
            f"verify immutable target commit {commit}",
            f"configure or restore marketplace ref to {commit}",
            "upgrade juzi-skill marketplace snapshot",
            *[f"reinstall {project['id']}@juzi-skill" for project in projects(registry, kind="plugin")],
            "verify plugin versions, hashes, enabled state, and a new-task loaded-state proof",
        ],
        "warning": "Changing refs or reinstalling plugins requires explicit authorization and is not executed by this command.",
    }
    print(json.dumps(plan, ensure_ascii=False, indent=2))
    return 0


def rollback_drill(args: argparse.Namespace) -> int:
    receipt = json.loads(Path(args.receipt).read_text(encoding="utf-8"))
    commit = receipt["git"]["commit"]
    registry = load_registry(REGISTRY_PATH)
    errors: list[str] = []
    if run(["git", "cat-file", "-e", f"{commit}^{{commit}}"], check=False).returncode != 0:
        errors.append(f"target commit is unavailable: {commit}")
    marketplace = run(["git", "show", f"{commit}:.agents/plugins/marketplace.json"], check=False)
    if marketplace.returncode != 0:
        errors.append("target commit has no marketplace catalog")
    else:
        try:
            json.loads(marketplace.stdout)
        except json.JSONDecodeError:
            errors.append("target marketplace catalog is invalid JSON")
    checked: list[dict[str, Any]] = []
    for project in projects(registry, kind="plugin"):
        manifest_path = f"{project['packagePath']}/.codex-plugin/plugin.json"
        manifest = run(["git", "show", f"{commit}:{manifest_path}"], check=False)
        if manifest.returncode != 0:
            errors.append(f"target commit is missing {manifest_path}")
            continue
        try:
            version = json.loads(manifest.stdout)["version"]
        except (json.JSONDecodeError, KeyError):
            errors.append(f"target manifest is invalid: {manifest_path}")
            continue
        checked.append({"project": project["id"], "version": version})
    result = {
        "status": "passed" if not errors else "failed",
        "targetCommit": commit,
        "checkedPlugins": checked,
        "errors": errors,
        "mutatedState": False,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


def show_changed(args: argparse.Namespace) -> int:
    registry = load_registry(REGISTRY_PATH)
    paths = candidate_paths(args.base) if args.head == "WORKTREE" else changed_paths(args.base, args.head)
    result = {"base": args.base, "head": args.head, "paths": paths, "projects": affected_project_ids(registry, paths)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    changed = sub.add_parser("changed", help="map a Git diff to registered projects")
    changed.add_argument("--base", required=True)
    changed.add_argument("--head", default="WORKTREE", help="Git ref or WORKTREE (default)")
    changed.set_defaults(func=show_changed)

    gate = sub.add_parser("preflight", help="run release gates")
    gate.add_argument("--base", default="origin/main")
    gate.add_argument("--all", action="store_true")
    gate.add_argument("--history", action="store_true")
    gate.add_argument("--require-clean", action="store_true")
    gate.add_argument("--output")
    gate.set_defaults(func=preflight)

    audit = sub.add_parser("public-audit", help="check public repository readiness")
    audit.add_argument("--output")
    audit.set_defaults(func=public_audit)

    sync = sub.add_parser("sync", help="plan or apply canonical-to-package synchronization")
    sync.add_argument("--project", required=True)
    sync.add_argument("--apply", action="store_true")
    sync.set_defaults(func=sync_project)

    receipt = sub.add_parser("receipt", help="write a release receipt")
    receipt.add_argument("--output", required=True)
    receipt.add_argument("--channel", choices=("stable", "beta"), default="stable")
    receipt.add_argument("--project", action="append")
    receipt.add_argument("--preflight")
    receipt.set_defaults(func=create_receipt)

    status = sub.add_parser("health", help="report source/install drift")
    status.add_argument("--require-installed", action="store_true")
    status.add_argument("--output")
    status.set_defaults(func=health)

    rollback = sub.add_parser("rollback-plan", help="render a non-mutating rollback plan")
    rollback.add_argument("--receipt", required=True)
    rollback.set_defaults(func=rollback_plan)
    drill = sub.add_parser("rollback-drill", help="verify an old receipt is still recoverable without changing state")
    drill.add_argument("--receipt", required=True)
    drill.set_defaults(func=rollback_drill)
    return parser


def main() -> int:
    configure_utf8_stdio()
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.func(args)
    except (OSError, ReleaseError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
