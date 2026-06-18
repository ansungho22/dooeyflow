---
name: python-testing
description: pytest, 픽스처, 커버리지 등 Python 테스트 규칙
---

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Testing


## Framework

Use **pytest** as the testing framework.

## Coverage

```bash
pytest --cov=src --cov-report=term-missing
```

## Test Organization

Use `pytest.mark` for test categorization:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```

## Reference

See skill: `python-testing` for detailed pytest patterns and fixtures.
