#!/bin/bash
set -e

echo "Installing Python dependencies..."
cd backend
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "Starting the application..."
exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
