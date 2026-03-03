FROM python:3.11-slim

WORKDIR /app

# deps
COPY Backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# app
COPY Backend/ /app/Backend/
WORKDIR /app/Backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]