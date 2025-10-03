#!/bin/bash
# Test the findr predictions API directly

echo "Testing findr predictions API..."

# Test with a known rectangle code
curl -X POST https://fishfindr.eu/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "rectangleCode": "21D8",
    "predictionDate": "2025-10-03",
    "language": "en"
  }' \
  -v

echo "\n\nTesting with another rectangle..."

curl -X POST https://fishfindr.eu/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "rectangleCode": "20C5", 
    "predictionDate": "2025-10-03",
    "language": "en"
  }' \
  -v