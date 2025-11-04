# Backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copie requirements en premier pour le cache
COPY Backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Place le code ensuite
COPY Backend /app/Backend

# Rendre Backend importable et compatible avec imports "core.XXX"
ENV PYTHONPATH=/app:/app/Backend

WORKDIR /app/Backend

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
