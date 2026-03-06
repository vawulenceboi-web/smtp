FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend directory structure
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Use shell entrypoint to allow Procfile process commands to run
ENTRYPOINT ["sh", "-c"]
CMD ["python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
