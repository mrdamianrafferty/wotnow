

# 🚧 Parked Weather Condition Keys & Affected Activities

These weather condition keys currently exist in `activityTypes.ts` but cannot yet be matched because the weather API does not provide these data points. They are documented here for future reference so they can be re-integrated when the API supports them.

---

## 🌥️ General Weather-Related Keys

| Key             | Appears in Activities |
|-----------------|-----------------------|
| `humidity`      | running, trail_running, hiking, football_soccer |
| `clouds`        | running, trail_running, road_cycling, mountain_biking, birdwatching, coarse_fishing, football_soccer, kayaking, rock_climbing, golf, tennis, beach_volleyball, horse_riding, canoeing, picnicking, bbq, geocaching, fishing_sea, foraging, archery, orienteering, rock_hopping, snorkeling, stand_up_paddleboarding, swimming, urban_exploring, mushroom_hunting, snowboarding, ice_fishing, photography, beekeeping, trail_hunting, camping |
| `visibility`    | running, trail_running, mountain_biking, skiing, hiking, snowboarding |

## 🔷 Domain-Specific / Descriptive Keys

| Key                            | Appears in Activities |
|--------------------------------|------------------------|
| `dry_conditions`               | trail_running |
| `wet_trail`                    | mountain_biking, rock_hopping |
| `dry_24h_ago`                  | mountain_biking |
| `partly_cloudy`                | mountain_biking, skiing, snowboarding, rock_climbing |
| `overcast`                     | fly_fishing_freshwater, birdwatching, coarse_fishing, rock_climbing, picnicking, bbq, mushroom_hunting |
| `light_precipitation`          | gardening, fly_fishing_freshwater |
| `light_precipitation_yesterday`| gardening, mushroom_hunting |
| `soil_moist`                   | gardening |
| `bright_sun_wind<5`            | fly_fishing_freshwater |
| `hatching_conditions`          | fly_fishing_freshwater |
| `thunderstorm`                 | many fishing & water activities |
| `stable_pressure`, `falling_pressure` | coarse_fishing |
| `clean_swell`                  | surfing |
| `calm_waters`, `calm_sea`      | kayaking, canoeing, snorkeling, fishing_sea, stand_up_paddleboarding |
| `fresh_snow`, `powder_snow`    | skiing, snowboarding, cross_country_skiing |
| `poor_visibility`              | skiing, snowboarding |
| `ice_conditions`, `stable_ice`, `fresh_ice` | skiing, snowboarding, ice_skating, ice_fishing |
| `dawn_time`, `golden_hour`, `post_storm_clearing` | birdwatching, photography |
| `clear_weather`                | birdwatching |
| `dry_pitch`                    | football_soccer |
| `wet_rocks`, `dry_rocks`       | rock_climbing, rock_hopping |
| `high_waves`                   | kayaking, canoeing, surfing |
| `pitch_waterlogged`            | football_soccer |

---

✅ These keys are currently **parked**. They should be re-enabled in `activityTypes.ts` and `activitySuitability.ts` when the API provides them.
