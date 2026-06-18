---
name: python-security
description: FastAPI 인증·권한, SQL 인젝션, 웹훅 서명 검증 등 Python 보안 규칙
---

---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Security


## Secret Management

```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing
```

## Security Scanning

- Use **bandit** for static security analysis:
  ```bash
  bandit -r src/
  ```

## Reference

See skill: `django-security` for Django-specific security guidelines (if applicable).
