
from typing import TypedDict, List, Optional

class NightSun(TypedDict, total=False):
    sunset: str
    sunrise: str
    civil_dusk: str
    nautical_dusk: str
    astro_dark_start: str
    astro_dark_end: str

class NightMoon(TypedDict, total=False):
    phase: float
    illumination: float
    rise: str
    set: str

class Shower(TypedDict, total=False):
    id: str
    name: str
    iau_code: str
    peak_utc: str
    active_start: str
    active_end: str
    zhr_notes: str

class Eclipse(TypedDict, total=False):
    type: str   # solar|lunar
    date_utc: str
    subtype: str
    notes: str

class Night(TypedDict, total=False):
    date: str
    sun: NightSun
    moon: NightMoon
    showers_active: List[Shower]
    eclipses_upcoming: List[Eclipse]
    dark_sky: dict

class Highlights(TypedDict, total=False):
    location: dict
    date_span: dict
    nights: List[Night]
