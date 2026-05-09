"""从仓库根目录 .env.local 加载键值对到 os.environ（不依赖 python-dotenv）。"""
from __future__ import annotations

import os
from pathlib import Path

_ENV_LOCAL = Path(".env.local")


def _strip_quotes(raw: str) -> str:
    s = raw.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return s[1:-1]
    return s


def load_local_secrets() -> None:
    """将仓库根目录 .env.local 中的变量写入 os.environ（同名键覆盖已有环境变量）。"""
    root = Path(__file__).resolve().parent.parent
    path = root / _ENV_LOCAL
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        eq = line.find("=")
        if eq <= 0:
            continue
        key = line[:eq].strip()
        if not key:
            continue
        val = _strip_quotes(line[eq + 1 :])
        os.environ[key] = val
