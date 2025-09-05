#!/bin/bash
# test-canaries-local.sh - Test script to verify canaries work locally

set -e

echo "🧪 Testing astronomy canaries locally..."

# Change to the project directory
cd "$(dirname "$0")"

# Set GitHub Actions environment variable to test the new logic
export GITHUB_ACTIONS=true
export PYTHONUNBUFFERED=1

echo "📁 Current directory: $(pwd)"
echo "🐍 Python executable: $(which python)"
echo "🔧 Environment variables:"
env | grep -E "(PYTHON|GITHUB)" | sort

# Change to the canaries directory
cd services/astro_highlights/astro_highlights

echo "📦 Installing dependencies..."
pip install -r requirements.txt
pip install -e .

echo "🚀 Running canaries..."
python run_canaries.py

echo "✅ Test completed!"
echo "📁 Output files:"
ls -la ../out/
