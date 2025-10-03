#!/bin/bash

echo "Testing findr predictions API on www.fishfindr.eu..."

# Test with www domain
curl -X POST https://www.fishfindr.eu/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "rectangleCode": "24E8",
    "predictionDate": "2025-01-03",
    "language": "en"
  }' \
  -v \
  -w "\n\nResponse time: %{time_total}s\nHTTP status: %{http_code}\n"