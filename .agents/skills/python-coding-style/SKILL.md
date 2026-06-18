---
name: python-coding-style
description: Python 불변성, 타입 힌트, 네이밍 컨벤션 등 Python 전용 코딩 스타일
---

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Coding Style


## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

## Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.
