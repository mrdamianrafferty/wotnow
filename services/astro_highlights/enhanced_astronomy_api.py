# Enhanced Astronomy Highlights System for WotNow

"""
Enhanced system that:
1. Uses existing APIs (Stormglass, OpenWeather) for sunset/sunrise and moon data
2. Generates user-friendly astronomy highlights with moon phase icons
3. Detects special astronomical events for activity recommendations
4. Integrates seamlessly with existing WotNow weather API structure
"""

import json
import asyncio
import aiohttp
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import os

class AstronomyHighlightsAPI:
    """Enhanced astronomy highlights using existing WotNow API pattern"""
    
    def __init__(self):
        self.stormglass_key = os.getenv('STORMGLASS_API_KEY')
        self.openweather_key = os.getenv('NEXT_PUBLIC_OPENWEATHER_KEY')
        
    async def fetch_stormglass_astronomy(self, lat: float, lon: float, start_date: str, end_date: str) -> Dict:
        """Fetch astronomy data from Stormglass API (same as WotNow pattern)"""
        if not self.stormglass_key:
            raise ValueError('Missing STORMGLASS_API_KEY')
            
        url = 'https://api.stormglass.io/v2/astronomy/point'
        params = {
            'lat': lat,
            'lng': lon,
            'start': f"{start_date}T00:00:00Z",
            'end': f"{end_date}T23:59:59Z"
        }
        headers = {'Authorization': self.stormglass_key}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status != 200:
                    raise Exception(f"Stormglass astronomy API error: {response.status}")
                return await response.json()
    
    async def fetch_openweather_current(self, lat: float, lon: float) -> Dict:
        """Fetch current weather for today's sunrise/sunset (same as WotNow pattern)"""
        if not self.openweather_key:
            raise ValueError('Missing NEXT_PUBLIC_OPENWEATHER_KEY')
            
        url = 'https://api.openweathermap.org/data/2.5/weather'
        params = {
            'lat': lat,
            'lon': lon,
            'units': 'metric',
            'appid': self.openweather_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    raise Exception(f"OpenWeather API error: {response.status}")
                return await response.json()
    
    def get_moon_phase_icon(self, phase_fraction: float) -> str:
        """Return moon icon filename based on phase fraction"""
        # Map to WotNow's available moon icons
        if phase_fraction < 0.05:
            return "moon-new.svg"
        elif phase_fraction < 0.2:
            return "moon-waxing-crescent.svg"
        elif 0.2 <= phase_fraction < 0.3:
            return "moon-first-quarter.svg"
        elif 0.3 <= phase_fraction < 0.45:
            return "moon-waxing-gibbous.svg"
        elif 0.45 <= phase_fraction < 0.55:
            return "moon-full.svg"
        elif 0.55 <= phase_fraction < 0.7:
            return "moon-waning-gibbous.svg"
        elif 0.7 <= phase_fraction < 0.8:
            return "moon-last-quarter.svg"
        elif 0.8 <= phase_fraction < 0.95:
            return "moon-waning-crescent.svg"
        else:
            return "moon-new.svg"
    
    def get_moon_phase_name(self, phase_fraction: float) -> str:
        """Return human-readable moon phase name"""
        if phase_fraction < 0.05:
            return "New Moon"
        elif phase_fraction < 0.2:
            return "Waxing Crescent"
        elif 0.2 <= phase_fraction < 0.3:
            return "First Quarter"
        elif 0.3 <= phase_fraction < 0.45:
            return "Waxing Gibbous"
        elif 0.45 <= phase_fraction < 0.55:
            return "Full Moon"
        elif 0.55 <= phase_fraction < 0.7:
            return "Waning Gibbous"
        elif 0.7 <= phase_fraction < 0.8:
            return "Last Quarter"
        elif 0.8 <= phase_fraction < 0.95:
            return "Waning Crescent"
        else:
            return "New Moon"
    
    def detect_special_events(self, date: datetime, moon_phase: float, moon_illumination: float) -> List[Dict]:
        """Detect special astronomical events for activity recommendations"""
        events = []
        month = date.month
        day = date.day
        
        # Meteor showers (based on IMO calendar)
        if month == 8 and 10 <= day <= 15:
            events.append({
                "type": "meteor_shower",
                "name": "Perseid Meteor Shower",
                "description": "Peak viewing after midnight, look northeast",
                "visibility": "excellent" if moon_illumination < 30 else "fair",
                "activity_suggestion": "meteor watching",
                "best_time": "00:00-04:00",
                "direction": "northeast"
            })
        elif month == 12 and 10 <= day <= 15:
            events.append({
                "type": "meteor_shower", 
                "name": "Geminid Meteor Shower",
                "description": "Best meteor shower of the year, look east after 22:00",
                "visibility": "excellent" if moon_illumination < 30 else "good",
                "activity_suggestion": "meteor watching",
                "best_time": "22:00-06:00",
                "direction": "east"
            })
        
        # Moon phase events
        if moon_illumination > 95:
            events.append({
                "type": "moon_event",
                "name": "Full Moon Night",
                "description": "Bright moonlight perfect for night hiking and lunar photography",
                "visibility": "excellent",
                "activity_suggestion": "moonlight hiking",
                "best_time": "all night"
            })
        elif moon_illumination < 5:
            events.append({
                "type": "moon_event",
                "name": "New Moon - Dark Skies",
                "description": "Perfect conditions for deep space observation and Milky Way photography",
                "visibility": "excellent",
                "activity_suggestion": "astrophotography",
                "best_time": "all night"
            })
        
        # Seasonal highlights
        if month in [6, 7, 8]:  # Summer
            events.append({
                "type": "seasonal",
                "name": "Summer Milky Way",
                "description": "Best viewing 2-4 hours after sunset, look south",
                "visibility": "excellent" if moon_illumination < 30 else "fair",
                "activity_suggestion": "milky way photography",
                "best_time": "22:00-02:00",
                "direction": "south"
            })
        elif month in [12, 1, 2]:  # Winter
            events.append({
                "type": "seasonal",
                "name": "Winter Constellations", 
                "description": "Orion, Gemini, and Taurus dominate the winter sky",
                "visibility": "excellent",
                "activity_suggestion": "constellation observation",
                "best_time": "20:00-24:00",
                "direction": "south"
            })
        
        return events
    
    def format_time_local(self, utc_time: str, timezone_offset: int = 0) -> str:
        """Format UTC time to local HH:MM format"""
        try:
            dt = datetime.fromisoformat(utc_time.replace('Z', '+00:00'))
            local_dt = dt + timedelta(seconds=timezone_offset)
            return local_dt.strftime('%H:%M')
        except:
            return utc_time
    
    def calculate_dark_window(self, sunset: Optional[str], sunrise: Optional[str]) -> Optional[Dict]:
        """Calculate optimal dark sky viewing window"""
        if not sunset or not sunrise:
            return None
            
        try:
            sunset_dt = datetime.fromisoformat(sunset.replace('Z', '+00:00'))
            sunrise_dt = datetime.fromisoformat(sunrise.replace('Z', '+00:00'))
            
            # Add civil twilight buffer (30 minutes after sunset, 30 before sunrise)
            dark_start = sunset_dt + timedelta(minutes=30)
            dark_end = sunrise_dt - timedelta(minutes=30)
            
            # Handle day transitions
            if dark_end < dark_start:
                dark_end += timedelta(days=1)
            
            duration_hours = (dark_end - dark_start).total_seconds() / 3600
            
            return {
                "start": dark_start.strftime('%H:%M'),
                "end": dark_end.strftime('%H:%M'),
                "duration_hours": round(duration_hours, 1)
            }
        except:
            return None
    
    async def generate_wotnow_highlights(self, lat: float, lon: float, days: int = 7) -> Dict:
        """Generate WotNow-style astronomy highlights"""
        
        start_date = datetime.now(timezone.utc).date()
        end_date = start_date + timedelta(days=days-1)
        
        # Fetch data from existing APIs
        astronomy_data = await self.fetch_stormglass_astronomy(
            lat, lon, start_date.isoformat(), end_date.isoformat()
        )
        current_weather = await self.fetch_openweather_current(lat, lon)
        
        highlights = []
        
        # Process each day
        astro_days = astronomy_data.get('data', [])
        for i, day_data in enumerate(astro_days[:days]):
            date_str = day_data.get('time', '')[:10]
            date_obj = datetime.fromisoformat(date_str)
            
            # Extract times
            sunrise = day_data.get('sunrise')
            sunset = day_data.get('sunset')
            moonrise = day_data.get('moonrise')
            moonset = day_data.get('moonset')
            moon_phase = day_data.get('moonPhase', {}).get('value', 0.5)
            
            # Calculate moon illumination percentage (estimate)
            moon_illumination = abs(0.5 - moon_phase) * 200 if moon_phase <= 0.5 else (1 - moon_phase) * 200
            
            # Get moon phase info
            moon_icon = self.get_moon_phase_icon(moon_phase)
            moon_name = self.get_moon_phase_name(moon_phase)
            
            # Calculate optimal viewing window
            dark_window = self.calculate_dark_window(sunset, sunrise)
            
            # Detect special events
            special_events = self.detect_special_events(date_obj, moon_phase, moon_illumination)
            
            # Format times for display
            timezone_offset = current_weather.get('timezone', 0)
            
            # Create WotNow-style highlight
            day_highlight = {
                "date": date_str,
                "day_name": date_obj.strftime('%A') if i == 0 else date_obj.strftime('%A'),
                "is_today": i == 0,
                
                # Sun times
                "sun": {
                    "sunrise": self.format_time_local(sunrise, timezone_offset) if sunrise else None,
                    "sunset": self.format_time_local(sunset, timezone_offset) if sunset else None,
                },
                
                # Moon information
                "moon": {
                    "rise": self.format_time_local(moonrise, timezone_offset) if moonrise else None,
                    "set": self.format_time_local(moonset, timezone_offset) if moonset else None,
                    "phase_name": moon_name,
                    "phase_fraction": round(moon_phase, 3),
                    "illumination": round(moon_illumination, 1),
                    "icon": moon_icon
                },
                
                # Dark sky window
                "dark_window": dark_window,
                
                # Special events and recommendations
                "events": special_events,
                
                # WotNow-style formatted message
                "wotnow_message": self.generate_wotnow_message(
                    date_obj, moon_illumination, moonset, dark_window, special_events
                )
            }
            
            highlights.append(day_highlight)
        
        return {
            "location": {"lat": lat, "lon": lon},
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "highlights": highlights
        }
    
    def generate_wotnow_message(self, date: datetime, moon_illumination: float, 
                               moonset: Optional[str], dark_window: Optional[Dict], 
                               events: List[Dict]) -> str:
        """Generate WotNow-style formatted message"""
        
        messages = []
        
        # Date header
        if date.date() == datetime.now().date():
            messages.append("📅 Tonight")
        else:
            messages.append(f"📅 {date.strftime('%A')}")
        
        # Moon conditions
        if moon_illumination < 25 and moonset:
            moonset_time = moonset.split('T')[1][:5] if 'T' in moonset else moonset
            messages.append(f"🌙 Moon sets early ({moonset_time}) - Dark skies ahead!")
        elif moon_illumination > 80:
            messages.append(f"🌕 Bright moon ({moon_illumination:.0f}% illuminated) - Perfect for night activities!")
        else:
            messages.append(f"🌙 Moon {moon_illumination:.0f}% illuminated")
        
        # Dark window
        if dark_window and dark_window['duration_hours'] > 6:
            messages.append(f"⭐ Stargazing window: {dark_window['start']} - {dark_window['end']}")
        
        # Special events
        meteor_events = [e for e in events if e['type'] == 'meteor_shower']
        if meteor_events:
            event = meteor_events[0]
            messages.append(f"☄️ {event['name']} - {event['description']}")
        
        # Activity suggestions
        activities = []
        if moon_illumination < 30:
            activities.extend(["Milky Way photography", "deep space observation"])
        if any(e['type'] == 'meteor_shower' for e in events):
            activities.append("meteor watching")
        if moon_illumination > 70:
            activities.extend(["moonlight hiking", "lunar photography"])
        
        if activities:
            messages.append(f"🔭 Perfect for: {', '.join(activities)}")
        
        return '\n'.join(messages)


async def main():
    """Example usage for Dublin"""
    api = AstronomyHighlightsAPI()
    
    # Dublin coordinates (same as WotNow testing)
    dublin_lat, dublin_lon = 53.3, -6.3
    
    try:
        highlights = await api.generate_wotnow_highlights(dublin_lat, dublin_lon, days=7)
        
        # Save to file
        with open('dublin_astronomy_highlights.json', 'w') as f:
            json.dump(highlights, f, indent=2)
        
        # Print today's highlight
        today = highlights['highlights'][0]
        print("🌟 ASTRONOMY HIGHLIGHTS FOR WOTNOW 🌟")
        print("=" * 50)
        print(today['wotnow_message'])
        print()
        
        # Print upcoming special events
        all_events = []
        for day in highlights['highlights']:
            all_events.extend(day['events'])
        
        if all_events:
            print("🗓️ UPCOMING ASTRONOMICAL EVENTS:")
            for event in all_events[:3]:  # Show next 3 events
                print(f"• {event['name']}: {event['description']}")
        
    except Exception as e:
        print(f"Error generating highlights: {e}")

if __name__ == "__main__":
    asyncio.run(main())
