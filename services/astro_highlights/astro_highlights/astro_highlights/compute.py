
from skyfield.api import load, wgs84
from skyfield import almanac
from datetime import datetime, timedelta, timezone

def load_ephemerides():
    ts = load.timescale()
    try:
        eph = load('de440s.bsp')
    except Exception:
        eph = load('de421.bsp')
    return type('E', (), {'ts':ts, 'eph':eph})

def moon_phase_fraction(eph, ts, t):
    e = almanac.moon_phase(eph, t)
    import math
    phase_deg = e.degrees
    illum = 0.5*(1 - math.cos(math.radians(phase_deg))) * 100.0
    return phase_deg/360.0, illum

def day_span(start_date, days):
    return [datetime.fromisoformat(start_date) + timedelta(days=i) for i in range(days)]



def illumination_at(eph, ts, iso_utc: str) -> float:
    """Return illumination percent at a given UTC ISO timestamp."""
    from datetime import datetime, timezone
    from skyfield import almanac
    import math
    try:
        dt = datetime.fromisoformat(iso_utc.replace('Z', '+00:00')).astimezone(timezone.utc)
    except Exception:
        return 50.0
    phase_deg = almanac.moon_phase(eph, ts.from_datetime(dt)).degrees
    illum = 0.5 * (1 - math.cos(math.radians(phase_deg))) * 100.0
    return float(illum)
def get_moon_phase_icon(phase_fraction):
    """Return the appropriate moon icon filename based on phase fraction."""
    if phase_fraction < 0.03:
        return "moon-new.svg"
    elif phase_fraction < 0.22:
        return "moon-waxing-crescent.svg"
    elif phase_fraction < 0.28:
        return "moon-first-quarter.svg"
    elif phase_fraction < 0.47:
        return "moon-waxing-gibbous.svg"
    elif phase_fraction < 0.53:
        return "moon-full.svg"
    elif phase_fraction < 0.72:
        return "moon-waning-gibbous.svg"
    elif phase_fraction < 0.78:
        return "moon-last-quarter.svg"
    elif phase_fraction < 0.97:
        return "moon-waning-crescent.svg"
    else:
        return "moon-new.svg"

def get_moon_phase_name(phase_fraction):
    """Return human-readable moon phase name."""
    if phase_fraction < 0.03:
        return "New Moon"
    elif phase_fraction < 0.22:
        return "Waxing Crescent"
    elif phase_fraction < 0.28:
        return "First Quarter"
    elif phase_fraction < 0.47:
        return "Waxing Gibbous"
    elif phase_fraction < 0.53:
        return "Full Moon"
    elif phase_fraction < 0.72:
        return "Waning Gibbous"
    elif phase_fraction < 0.78:
        return "Last Quarter"
    elif phase_fraction < 0.97:
        return "Waning Crescent"
    else:
        return "New Moon"

def detect_special_events(date, moon_phase, moon_illumination):
    """Detect special astronomical events for the given date."""
    events = []
    
    # Meteor shower detection (basic calendar-based)
    import datetime as dt
    month, day = date.month, date.day
    
    # Major meteor showers
    if month == 8 and 10 <= day <= 15:
        events.append({
            "type": "meteor_shower",
            "name": "Perseid Meteor Shower",
            "description": "Look northeast after midnight for shooting stars",
            "peak": day == 12 or day == 13,
            "visibility": "excellent" if moon_illumination < 30 else "good" if moon_illumination < 60 else "fair"
        })
    elif month == 12 and 10 <= day <= 16:
        events.append({
            "type": "meteor_shower", 
            "name": "Geminid Meteor Shower",
            "description": "Look toward Gemini constellation after 10 PM",
            "peak": day == 13 or day == 14,
            "visibility": "excellent" if moon_illumination < 30 else "good" if moon_illumination < 60 else "fair"
        })
    elif month == 10 and 15 <= day <= 25:
        events.append({
            "type": "meteor_shower",
            "name": "Orionid Meteor Shower", 
            "description": "Look toward Orion constellation after midnight",
            "peak": day == 21 or day == 22,
            "visibility": "excellent" if moon_illumination < 30 else "good" if moon_illumination < 60 else "fair"
        })
    
    # Moon phase events
    if moon_illumination > 98:
        events.append({
            "type": "moon_event",
            "name": "Full Moon",
            "description": "Perfect for lunar photography and night activities",
            "visibility": "excellent"
        })
    elif moon_illumination < 2:
        events.append({
            "type": "moon_event", 
            "name": "New Moon",
            "description": "Dark skies perfect for deep space observation",
            "visibility": "excellent"
        })
    
    # Seasonal astronomy highlights
    if month in [6, 7, 8]:  # Summer
        events.append({
            "type": "seasonal",
            "name": "Summer Milky Way",
            "description": "Best viewing 2-4 hours after sunset, look south",
            "visibility": "excellent" if moon_illumination < 30 else "fair"
        })
    elif month in [12, 1, 2]:  # Winter  
        events.append({
            "type": "seasonal",
            "name": "Winter Constellations",
            "description": "Orion, Gemini, and Taurus dominate the sky",
            "visibility": "excellent"
        })
    
    return events

def sun_moon_times(lat, lon, date, eph, ts):
    """Compute sunrise/sunset, moonrise/moonset, and astronomical dark period for given date/lat/lon."""
    from skyfield.api import wgs84
    from skyfield import almanac

    topos = wgs84.latlon(lat, lon)
    t0 = ts.utc(date.year, date.month, date.day)
    t1 = ts.utc(date.year, date.month, date.day + 1)

    sun = {}
    moon = {}

    # --- Sunrise/Sunset ---
    try:
        f = almanac.risings_and_settings(eph, eph['Sun'], topos)
        times, events = almanac.find_discrete(t0, t1, f)
        for t, rising in zip(times, events):
            if rising:
                sun['sunrise'] = t.utc_datetime().replace(tzinfo=timezone.utc).isoformat()
            else:
                sun['sunset'] = t.utc_datetime().replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        pass

    # --- Astronomical dark window (robust across Skyfield versions) ---
    astro_dark_start, astro_dark_end = None, None
    try:
        f = almanac.dark_twilight_day(eph, topos)
        times, events = almanac.find_discrete(t0, t1, f)

        night_code = getattr(almanac, 'NIGHT', None) or getattr(almanac, 'DARK', None)
        astro_code = getattr(almanac, 'ASTRONOMICAL_TWILIGHT', None)

        if len(events):
            max_state = int(max(events))
            if night_code is None:
                night_code = max_state
            if astro_code is None and max_state >= 1:
                astro_code = max_state - 1

        for t, e in zip(times, events):
            if night_code is not None and int(e) == int(night_code) and astro_dark_start is None:
                astro_dark_start = t.utc_datetime().replace(tzinfo=timezone.utc).isoformat()
            elif astro_dark_start and astro_code is not None and int(e) == int(astro_code) and astro_dark_end is None:
                astro_dark_end = t.utc_datetime().replace(tzinfo=timezone.utc).isoformat()
                break
    except Exception:
        pass

    if astro_dark_start: sun['astro_dark_start'] = astro_dark_start
    if astro_dark_end:   sun['astro_dark_end']   = astro_dark_end

    # --- Moon rise/set and illumination ---
    f = almanac.risings_and_settings(eph, eph['Moon'], topos)
    times, events = almanac.find_discrete(t0, t1, f)
    moon['events'] = [
        {"time": t.utc_datetime().replace(tzinfo=timezone.utc).isoformat(), "event": "rise" if e else "set"}
        for t, e in zip(times, events)
    ]
    phase, illum = moon_phase_fraction(eph, ts, t0)
    moon['phase'] = phase
    moon['illumination'] = illum
    moon['phase_name'] = get_moon_phase_name(phase)
    moon['icon'] = get_moon_phase_icon(phase)

    return sun, moon

