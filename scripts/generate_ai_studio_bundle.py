#!/usr/bin/env python3
"""Emit AI_STUDIO_FEL_ARCHITECTURE_BUNDLE.md at repo root. Run from anywhere."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "AI_STUDIO_FEL_ARCHITECTURE_BUNDLE.md"


def read_rel(p: str) -> str:
    return (ROOT / p).read_text(encoding="utf-8")


def block(path: str, lang: str, body: str) -> str:
    return f"File: `{path}`\n\n```{lang}\n{body.rstrip()}\n```\n\n"


def lines_range(path: str, start: int, end: int) -> str:
    """1-based inclusive line range."""
    lines = read_rel(path).splitlines(keepends=True)
    chunk = "".join(lines[start - 1 : end])
    return f"// excerpt: {path} lines {start}-{end} (total {len(lines)} lines)\n{chunk}"


def main() -> None:
    parts: list[str] = []

    parts.append(
        """# Final Evolution Lab — AI Studio architecture bundle

**Purpose:** Paste into [Google AI Studio](https://aistudio.google.com/) (or similar) for **forensic architecture review**.  
**Repo:** `rork-final-evolution-lab` · **iOS:** `FinalEvolutionLab/` · **Unreal templates:** `UnrealStarter/BasketballGame/` · **UE target:** 5.7 / MyProjec.

---

## System instruction (paste into AI Studio “System instructions”)

You are the **Neuro-Mechanic Lead Architect** for **Final Evolution Lab**. You are reviewing a **split codebase**:

- **iOS (`FinalEvolutionLab`):** SwiftUI for **Arena** (UI-only rounds) and **Lab**; **RealityKit** for the **dunk** scene. Performance narrative uses **PRQ**, **readiness / scan** flows, and optional **Gemini** services — not Unreal UMG.
- **Unreal 5.7 (`MyProjec` / templates under `UnrealStarter/BasketballGame/`):** C++ gameplay slice — movement, ball, hoop triggers, HUD, **readiness snapshot → tuning**, **session export JSON**. Editor automation via **Python** in `UnrealStarter/EditorPython/`.

**Product concepts**

- **Bonds Bounce Blueprint:** vertical-jump **training architecture** (phases, progression, copy in `BlueprintLibrary`); align any jump/dunk **phase naming** (e.g. load, launch, flight, landing) with this story when commenting on code. Note: audit doc flags a **naming mismatch** vs spec (Load/Launch vs Foundations/Flight/Elite).
- **Forensic goals:** trace how **scan / metrics** flow into **in-game feel** (Swift dunk engine + Unreal `ApplyReadiness`-style tuning), identify gaps between **docs and implementation**, and propose **UE 5.7**-realistic next steps (C++, Blueprint hooks, Python batch tools) **without inventing APIs** not shown below.

When unsure, **quote file paths** and state assumptions explicitly.

---

## Consolidated sources

The following sections use the format:

`File: path/to/file`

```{language}
…
```

"""
    )

    # --- Markdown (full or summarized) ---
    parts.append("### Architecture & flows (Markdown)\n\n")
    parts.append(block("PROJECT_FLOWS.md", "markdown", read_rel("PROJECT_FLOWS.md")))
    parts.append(block("app-synopsis.md", "markdown", read_rel("app-synopsis.md")))
    parts.append(block("UnrealStarter/VISION_ALIGNMENT.md", "markdown", read_rel("UnrealStarter/VISION_ALIGNMENT.md")))

    audit = read_rel("AUDIT_BIOMECHANICAL_ECOSYSTEM.md")
    parts.append(
        block(
            "AUDIT_BIOMECHANICAL_ECOSYSTEM.md (§3 Bonds Bounce + surrounding Digital Vault)",
            "markdown",
            "\n".join(audit.splitlines()[0:120]) + "\n\n… [truncated after §3.2 header — full file in repo] …\n",
        )
    )

    pkg = read_rel("UnrealStarter/BasketballGame/PACKAGE_AND_TEST.md")
    parts.append(
        block(
            "UnrealStarter/BasketballGame/PACKAGE_AND_TEST.md (§1–6, §9–11)",
            "markdown",
            "\n".join(pkg.splitlines()[0:149])
            + "\n\n… [§7–8 iOS/notarization omitted — see repo] …\n\n"
            + "\n".join(pkg.splitlines()[149:177]),
        )
    )

    # --- Swift: full smaller files ---
    swift_full = [
        "FinalEvolutionLab/Core/DunkContestEngine.swift",
        "FinalEvolutionLab/Views/RealityKitDunkView.swift",
        "FinalEvolutionLab/Services/PRQScoreManager.swift",
        "FinalEvolutionLab/Core/BlueprintLibrary.swift",
    ]
    parts.append("### Swift — full files\n\n")
    for p in swift_full:
        parts.append(block(p, "swift", read_rel(p)))

    # --- Unreal ---
    parts.append("### Unreal C++ / JSON (MyProjec templates)\n\n")
    unreal_files = [
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessTypes.h",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessIO.h",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessIO.cpp",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballActor.h",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballActor.cpp",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballCharacter.h",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballCharacter.cpp",
        "UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballGameMode.h",
        "example_readiness_snapshot.json",
    ]
    for p in unreal_files:
        ext = Path(p).suffix
        lang = "cpp" if ext in (".h", ".cpp") else "json"
        parts.append(block(p, lang, read_rel(p)))

    # --- Python ---
    parts.append("### Unreal Editor Python\n\n")
    for p, lang in [
        ("UnrealStarter/EditorPython/fel_setup_level.py", "python"),
        ("UnrealStarter/EditorPython/fel_quick_playtest_level.py", "python"),
        ("UnrealStarter/EditorPython/fel_setup_lighting.py", "python"),
    ]:
        parts.append(block(p, lang, read_rel(p)))

    parts.append(
        "\n---\n\n*End of bundle. Regenerate with:* `python3 scripts/generate_ai_studio_bundle.py`\n"
    )

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
