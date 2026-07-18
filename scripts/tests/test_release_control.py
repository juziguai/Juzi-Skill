from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[1]
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from juzi_release import (  # noqa: E402
    ReleaseError,
    affected_project_ids,
    atomic_replace_tree,
    configure_utf8_stdio,
    run,
    scan_secret_bytes,
)
from marketplace_registry import load_registry, marketplace_document, projects, tree_hashes  # noqa: E402
from new_juzi_project import plan as scaffold_plan, render_template  # noqa: E402
from prepare_release_notes import render as render_release_notes  # noqa: E402


class RegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = load_registry()

    def test_registry_contains_all_current_capabilities(self) -> None:
        self.assertEqual(len(projects(self.registry, kind="pure-skill")), 7)
        self.assertEqual(len(projects(self.registry, kind="plugin")), 6)

    def test_global_control_plane_change_selects_every_project(self) -> None:
        selected = affected_project_ids(self.registry, ["scripts/juzi_release.py"])
        self.assertEqual(selected, [project["id"] for project in projects(self.registry)])

    def test_project_change_selects_only_owning_project(self) -> None:
        selected = affected_project_ids(self.registry, ["Juzi-travel-guide/SKILL.md"])
        self.assertEqual(selected, ["juzi-travel-guide"])

    def test_marketplace_document_has_registered_plugins_only(self) -> None:
        document = marketplace_document(self.registry)
        self.assertEqual(
            [entry["name"] for entry in document["plugins"]],
            [project["id"] for project in projects(self.registry, kind="plugin")],
        )


class SecretScanTests(unittest.TestCase):
    def test_runtime_constructed_fake_token_is_detected(self) -> None:
        fake = ("ghp" + "_" + "A" * 30).encode("ascii")
        self.assertEqual(scan_secret_bytes(fake), ["github-token"])

    def test_normal_documentation_text_is_not_a_secret(self) -> None:
        self.assertEqual(scan_secret_bytes(b"Use an environment variable named API_TOKEN."), [])


class EncodingTests(unittest.TestCase):
    def test_run_decodes_utf8_when_windows_locale_is_cp1252(self) -> None:
        command = [
            sys.executable,
            "-c",
            "import sys; sys.stdout.buffer.write('中文路径'.encode('utf-8'))",
        ]
        with mock.patch("subprocess._text_encoding", return_value="cp1252"):
            completed = run(command)
        self.assertEqual(completed.stdout, "中文路径")

    def test_configure_utf8_stdio_reconfigures_both_streams(self) -> None:
        stdout = mock.Mock()
        stderr = mock.Mock()
        with mock.patch.object(sys, "stdout", stdout), mock.patch.object(sys, "stderr", stderr):
            configure_utf8_stdio()
        stdout.reconfigure.assert_called_once_with(encoding="utf-8", errors="backslashreplace")
        stderr.reconfigure.assert_called_once_with(encoding="utf-8", errors="backslashreplace")


class AtomicSyncTests(unittest.TestCase):
    def test_atomic_replace_creates_backup_and_updates_target(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            target = root / "target"
            backup_root = root / "backups"
            source.mkdir()
            target.mkdir()
            (source / "value.txt").write_text("new", encoding="utf-8")
            (target / "value.txt").write_text("old", encoding="utf-8")
            backup = atomic_replace_tree(source, target, backup_root)
            self.assertEqual((target / "value.txt").read_text(encoding="utf-8"), "new")
            self.assertEqual((backup / "value.txt").read_text(encoding="utf-8"), "old")

    def test_atomic_replace_restores_target_when_post_swap_verification_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            target = root / "target"
            backup_root = root / "backups"
            source.mkdir()
            target.mkdir()
            (source / "value.txt").write_text("new", encoding="utf-8")
            (target / "value.txt").write_text("old", encoding="utf-8")

            def verifier(path: Path) -> dict[str, str]:
                if path.name == "target":
                    raise ReleaseError("injected verification failure")
                return tree_hashes(path)

            with self.assertRaises(ReleaseError):
                atomic_replace_tree(source, target, backup_root, verifier=verifier)
            self.assertEqual((target / "value.txt").read_text(encoding="utf-8"), "old")


class ScaffoldTests(unittest.TestCase):
    def test_pure_skill_plan_uses_human_facing_source_folder(self) -> None:
        args = SimpleNamespace(id="example-skill", kind="pure-skill", display_name="Example", summary="Example summary")
        planned = scaffold_plan(args)
        self.assertEqual(planned["project"]["canonicalPath"], "Juzi-example-skill")
        self.assertIn("Juzi-example-skill/SKILL.md", planned["files"])

    def test_plugin_plan_keeps_canonical_source_in_package(self) -> None:
        args = SimpleNamespace(id="juzi-example", kind="plugin", display_name="Example", summary="Example summary")
        planned = scaffold_plan(args)
        self.assertEqual(planned["project"]["sourceMode"], "in-package")
        self.assertIn("plugins/juzi-example/.codex-plugin/plugin.json", planned["files"])

    def test_templates_render_without_placeholders(self) -> None:
        rendered = render_template(
            "SKILL.md.template",
            {"ID": "example", "DISPLAY_NAME": "Example", "SUMMARY": "Example summary", "CACHEBUSTER": "20260719"},
        )
        self.assertNotIn("{{", rendered)


class ReleaseNotesTests(unittest.TestCase):
    def test_release_notes_include_only_unreleased_sections(self) -> None:
        changelog = """# Log\n\n## [Unreleased]\n\n### 新增\n\n- A\n\n### 变更\n\n- B\n\n### 修复\n\n- C\n\n## [Old]\n\n- old\n"""
        notes = render_release_notes("market-v2026.07.19.1", changelog, ["新增", "变更", "修复"])
        self.assertIn("- A", notes)
        self.assertNotIn("old", notes)

    def test_release_notes_reject_empty_required_section(self) -> None:
        changelog = """## [Unreleased]\n\n### 新增\n\n- A\n\n### 变更\n\n### 修复\n\n- C\n"""
        with self.assertRaises(ValueError):
            render_release_notes("market-v2026.07.19.1", changelog, ["新增", "变更", "修复"])


if __name__ == "__main__":
    unittest.main()
