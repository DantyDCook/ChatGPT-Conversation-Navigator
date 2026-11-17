#!/usr/bin/env python3
"""Deterministic, allowlisted packaging for the browser extension.

This script does not install dependencies, sign, or publish the extension.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
ASSET_TYPES = {".js", ".css", ".html", ".png", ".svg", ".webp", ".jpg", ".jpeg"}
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)


def collect_files():
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3:
        raise ValueError("Manifest V3 required")
    files = {Path("manifest.json")}
    for path in ROOT.iterdir():
        if path.is_file() and not path.is_symlink() and path.suffix.lower() in ASSET_TYPES:
            files.add(path.relative_to(ROOT))
    icon_dir = ROOT / "icons"
    if icon_dir.is_dir():
        for path in icon_dir.rglob("*"):
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in ASSET_TYPES:
                files.add(path.relative_to(ROOT))

    references = []
    for script in manifest.get("content_scripts", []):
        references.extend(script.get("js", []))
        references.extend(script.get("css", []))
    if manifest.get("background", {}).get("service_worker"):
        references.append(manifest["background"]["service_worker"])
    if manifest.get("action", {}).get("default_popup"):
        references.append(manifest["action"]["default_popup"])
    references.extend(manifest.get("icons", {}).values())
    for relative in references:
        rel_path = Path(relative)
        if rel_path.is_absolute() or ".." in rel_path.parts or rel_path not in files:
            raise ValueError(f"Missing or unsafe extension asset: {relative}")

    for relative in files:
        if not (ROOT / relative).is_file():
            raise ValueError(f"Missing extension input: {relative}")
    return manifest, sorted(files, key=lambda p: p.as_posix())


def package(out_dir):
    manifest, files = collect_files()
    version = manifest["version"]
    out_dir.mkdir(parents=True, exist_ok=True)
    archive = out_dir / f"ChatGPT-Conversation-Navigator-v{version}.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as output:
        for relative in files:
            info = ZipInfo(relative.as_posix(), FIXED_ZIP_TIME)
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            output.writestr(info, (ROOT / relative).read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(archive) as saved:
        if saved.testzip() is not None or set(saved.namelist()) != {p.as_posix() for p in files}:
            raise ValueError("Invalid extension archive contents")
    source_sha = os.environ.get("GITHUB_SHA", "unverified-local-source")
    provenance = out_dir / "PROVENANCE.txt"
    provenance.write_text(
        f"repository=DantyDCook/ChatGPT-Conversation-Navigator\n"
        f"source_commit={source_sha}\n"
        f"manifest_version={version}\n"
        f"signed=false\npublished=false\n",
        encoding="utf-8",
    )
    names = [archive, provenance]
    sums = "".join(
        f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n"
        for p in names
    )
    (out_dir / "SHA256SUMS.txt").write_text(sums, encoding="utf-8")
    print(f"Packaged {archive.name}: {len(files)} allowlisted files")
    print(sums, end="")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default="dist")
    args = parser.parse_args()
    package(Path(args.out_dir))
