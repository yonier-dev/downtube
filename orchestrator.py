#!/usr/bin/env python3
"""
Orquestador principal del proyecto Downtube (Django + yt-dlp).

Coordina el flujo de trabajo entre los agentes especializados:
- Orquestador (Gerente)
- Desarrollador Backend (Django & yt-dlp)
- Desarrollador Frontend (HTML/CSS/JS)
- Ingeniero QA / Tester
"""

from __future__ import annotations

from pathlib import Path
import sys

# Rutas del proyecto
PROJECT_ROOT = Path(__file__).resolve().parent
AGENTS_DIR = PROJECT_ROOT / ".agents"
WORKSPACE_DIR = PROJECT_ROOT / "workspace"

PROMPT_FILES = {
    "orchestrator": AGENTS_DIR / "orchestrator_prompt.txt",
    "backend": AGENTS_DIR / "backend_prompt.txt",
    "frontend": AGENTS_DIR / "frontend_prompt.txt",
    "tester": AGENTS_DIR / "tester_prompt.txt",
}


def ensure_directories() -> None:
    """Crea las carpetas necesarias si no existen."""
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)


def load_prompt(role: str) -> str:
    """Carga el contenido de un prompt de rol."""
    path = PROMPT_FILES.get(role)
    if path is None or not path.exists():
        return f"[Prompt no encontrado para el rol: {role}]"
    return path.read_text(encoding="utf-8")


def list_workspace() -> list[str]:
    """Lista los archivos generados en workspace/."""
    if not WORKSPACE_DIR.exists():
        return []
    return [p.name for p in WORKSPACE_DIR.iterdir()]


def show_status() -> None:
    """Muestra el estado actual del proyecto."""
    print("=" * 60)
    print("ESTADO DEL PROYECTO - DOWNTUBE ORCHESTRATOR (Django)")
    print("=" * 60)
    print(f"\nDirectorio del proyecto: {PROJECT_ROOT}")
    print(f"Carpeta de agentes:      {AGENTS_DIR}")
    print(f"Carpeta de trabajo:      {WORKSPACE_DIR}")

    print("\n--- Prompts de rol disponibles ---")
    for role, path in PROMPT_FILES.items():
        status = "OK" if path.exists() else "FALTANTE"
        print(f"  [{status}] {role}: {path.name}")

    print("\n--- Archivos en workspace/ ---")
    files = list_workspace()
    if files:
        for name in files:
            print(f"  - {name}")
    else:
        print("  (vacío - listo para construir)")

    print("\n" + "=" * 60)


def print_agent_instructions(role: str) -> None:
    """Imprime el prompt del agente solicitado para que puedas pasárselo a OpenCode."""
    content = load_prompt(role)
    print(f"\n--- PROMPT DEL AGENTE: {role.upper()} ---")
    print(content)
    print("-" * 60)


def main() -> int:
    ensure_directories()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "status":
            show_status()
        elif command in PROMPT_FILES:
            print_agent_instructions(command)
        else:
            print(f"Comando desconocido: {command}")
            print("Uso: python orchestrator.py [status | orchestrator | backend | frontend | tester]")
    else:
        show_status()
        print("\n💡 Sugerencia de uso:")
        print("  python orchestrator.py backend    -> Ver prompt del Backend")
        print("  python orchestrator.py frontend   -> Ver prompt del Frontend")
        print("  python orchestrator.py tester     -> Ver prompt del Tester")
        
    return 0


if __name__ == "__main__":
    sys.exit(main())