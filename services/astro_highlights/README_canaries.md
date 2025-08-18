# Astronomy Canaries System

This system generates astronomy highlights for representative locations across all inhabited landmasses.

## Quick Start

### Local Development
```bash
# Run all canaries
python services/astro_highlights/astro_highlights/run_canaries.py

# Or via npm script (if available)
npm run astro:canaries
```

### Configuration

Canary locations are configured in `services/astro_highlights/astro_canaries.yml`:
- 30+ locations across all continents
- From Arctic (Tromsø) to Antarctic (McMurdo)
- Major cities and representative coordinates

### Outputs

The system generates:
- `services/astro_highlights/out/highlights_{region}_{location}.json` - Individual location highlights
- `services/astro_highlights/out/index_canaries.json` - Master manifest for UI consumption

### UI Integration

The UI should:
1. Read `index_canaries.json` to get all available locations
2. Find the nearest canary to the user's location
3. Load that canary's highlights JSON
4. Display astronomy highlights in stargazing cards:
   - "Look to the east tonight around midnight to see the Perseids"
   - Moon phase and visibility information
   - Planet visibility and conjunctions
   - Eclipse notifications

### Data Sources

- **Meteor Showers**: International Meteor Organization (IMO)
- **Eclipses**: NASA/Goddard Space Flight Center catalogues
- **Ephemerides**: JPL DE440s via Skyfield
- **Calculations**: Custom astronomy computations

### CI/CD

GitHub Actions workflow (`.github/workflows/astro_canaries.yml`):
- Runs nightly at 02:00 UTC
- Builds all canaries with fresh data
- Uploads artifacts for UI consumption
- Manual trigger via workflow_dispatch

### Local Testing

```bash
# Test with specific location
cd services/astro_highlights/astro_highlights
.venv/bin/python -m astro_highlights.build_highlights \
  --lat 53.3 --lon -6.3 --days 7 \
  --out test_dublin.json
```

### Output Format

Each highlights JSON contains:
```json
{
  "location": {"name": "Dublin_IE", "lat": 53.3, "lon": -6.3},
  "generated_at": "2025-08-18T12:00:00Z",
  "highlights": [
    {
      "type": "meteor_shower",
      "name": "Perseids",
      "peak_date": "2025-08-12",
      "description": "Look northeast after midnight",
      "visibility": "excellent"
    }
  ]
}
```
