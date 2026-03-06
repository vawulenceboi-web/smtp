#!/bin/bash
set -e

echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt

echo "Starting the application..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
