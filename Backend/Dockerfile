FROM python:3.11-slim

WORKDIR /app

# Installer les deps depuis le bon requirements (dans Backend/)
COPY Backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copier le code (optionnel en dev, mais utile en prod)
COPY Backend/ /app/Backend/

WORKDIR /app/Backend
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
