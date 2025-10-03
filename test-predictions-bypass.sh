#!/bin/bash

echo "Testing findr predictions API with cache bypass..."

# Test with cache bypass
curl -X POST https://fishfindr.eu/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "rectangleCode": "24E8",
    "predictionDate": "2025-01-03",
    "language": "en",
    "bypassCache": true
  }' \
  -v \
  -w "\n\nResponse time: %{time_total}s\nHTTP status: %{http_code}\n"