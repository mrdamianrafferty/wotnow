#!/bin/bash
# Test predictions API after RPC fixes

echo "Testing predictions API..."
curl -X POST https://fishfindr.eu/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31E8","targetDate":"2025-11-12","language":"en"}' \
  2>&1 | head -200
