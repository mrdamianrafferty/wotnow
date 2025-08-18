// Test script to demonstrate the enhanced astronomy system output format
// This shows the kind of data WotNow would receive and display

const sampleAstronomyHighlight = {
  "highlights": [
    {
      "date": "2025-08-18",
      "dayName": "Monday",
      "isToday": true,
      "sun": {
        "sunrise": "06:45",
        "sunset": "20:30"
      },
      "moon": {
        "rise": "23:44",
        "set": "17:35",
        "phaseName": "Waning Crescent",
        "illumination": 30.0,
        "icon": "moon-waning-crescent.svg"
      },
      "darkWindow": {
        "start": "21:00",
        "end": "06:15",
        "durationHours": 9.3
      },
      "events": [
        {
          "type": "meteor_shower",
          "name": "Perseid Meteor Shower",
          "description": "Peak viewing after midnight, look northeast",
          "visibility": "excellent",
          "activitySuggestion": "meteor watching",
          "bestTime": "00:00-04:00",
          "direction": "northeast"
        },
        {
          "type": "seasonal",
          "name": "Summer Milky Way",
          "description": "Best viewing 2-4 hours after sunset, look south",
          "visibility": "excellent",
          "activitySuggestion": "milky way photography",
          "bestTime": "22:00-02:00",
          "direction": "south"
        }
      ],
      "wotnowMessage": "📅 Tonight in your area\n🌙 Moon sets early (17:35) - Dark skies ahead!\n⭐ Stargazing window: 21:00 - 06:15\n☄️ Perseid Meteor Shower continues. Best seen around midnight\n🔭 Perfect for: Milky Way photography, meteor watching"
    },
    {
      "date": "2025-08-19",
      "dayName": "Tuesday", 
      "isToday": false,
      "sun": {
        "sunrise": "06:46",
        "sunset": "20:28"
      },
      "moon": {
        "rise": "00:45",
        "set": "18:25",
        "phaseName": "Waning Crescent",
        "illumination": 20.2,
        "icon": "moon-waning-crescent.svg"
      },
      "darkWindow": {
        "start": "20:58",
        "end": "06:16",
        "durationHours": 9.3
      },
      "events": [
        {
          "type": "meteor_shower",
          "name": "Perseid Meteor Shower",
          "description": "Final nights of peak activity",
          "visibility": "excellent",
          "activitySuggestion": "meteor watching",
          "bestTime": "00:00-04:00"
        }
      ],
      "wotnowMessage": "📅 Tomorrow night\n🌙 Moon sets early (18:25) - Dark skies ahead!\n⭐ Stargazing window: 20:58 - 06:16\n☄️ Perseid Meteor Shower continues. Best seen around midnight\n🔭 Perfect for: Milky Way photography, meteor watching"
    }
  ]
};

// Function to display the formatted astronomy message for WotNow UI
function displayWotNowAstronomyCard(highlight) {
  console.log('\n🌟 WOTNOW ASTRONOMY CARD PREVIEW 🌟');
  console.log('=' + '='.repeat(50));
  
  // Main message (as it would appear in the UI)
  console.log(highlight.wotnowMessage);
  console.log();
  
  // Additional UI elements
  console.log('📊 DETAILED INFO:');
  console.log(`   Sun: 🌅 ${highlight.sun.sunrise} | 🌇 ${highlight.sun.sunset}`);
  console.log(`   Moon: 🌙 ${highlight.moon.phaseName} (${highlight.moon.illumination}% lit)`);
  if (highlight.moon.set) {
    console.log(`         🌙↘️ Sets at ${highlight.moon.set}`);
  }
  if (highlight.moon.rise) {
    console.log(`         🌙↗️ Rises at ${highlight.moon.rise}`);
  }
  
  if (highlight.darkWindow) {
    console.log(`   Dark Sky: 🌌 ${highlight.darkWindow.start} - ${highlight.darkWindow.end} (${highlight.darkWindow.durationHours}h)`);
  }
  
  console.log();
  console.log('🎯 ACTIVITY RECOMMENDATIONS:');
  const activities = new Set();
  highlight.events.forEach(event => {
    if (event.activitySuggestion) {
      activities.add(event.activitySuggestion);
    }
  });
  activities.forEach(activity => {
    console.log(`   • ${activity}`);
  });
  
  if (highlight.events.length > 0) {
    console.log();
    console.log('✨ SPECIAL EVENTS:');
    highlight.events.forEach(event => {
      console.log(`   • ${event.name}: ${event.description}`);
      if (event.bestTime) {
        console.log(`     ⏰ Best time: ${event.bestTime}`);
      }
      if (event.direction) {
        console.log(`     🧭 Look: ${event.direction}`);
      }
    });
  }
  
  console.log();
  console.log('🎨 UI INTEGRATION:');
  console.log(`   Moon Icon: /weather-icons/design/fill/final/${highlight.moon.icon}`);
  console.log(`   Background: Dark gradient (indigo → purple → gray)`);
  console.log(`   Text Color: White with opacity variations`);
  console.log();
}

// Available moon icons in WotNow
const availableMoonIcons = [
  'moon-new.svg',
  'moon-waxing-crescent.svg', 
  'moon-first-quarter.svg',
  'moon-waxing-gibbous.svg',
  'moon-full.svg',
  'moon-waning-gibbous.svg',
  'moon-last-quarter.svg',
  'moon-waning-crescent.svg',
  'moonrise.svg',
  'moonset.svg'
];

console.log('🌙 AVAILABLE MOON ICONS IN WOTNOW:');
availableMoonIcons.forEach(icon => {
  console.log(`   • /weather-icons/design/fill/final/${icon}`);
});

// Display the sample
displayWotNowAstronomyCard(sampleAstronomyHighlight.highlights[0]);

console.log('\n📱 INTEGRATION EXAMPLE:');
console.log('In your WotNow homepage component, add:');
console.log('```tsx');
console.log('import AstronomyCard from "../components/AstronomyCard";');
console.log('');
console.log('// In your render method:');
console.log('<AstronomyCard />');
console.log('```');
console.log('');
console.log('The card will automatically:');
console.log('• Only show for users with astronomy-related interests');
console.log('• Only appear when there\'s something interesting to see');
console.log('• Use your existing location preferences');
console.log('• Match your app\'s design system');

console.log('\n🚀 API ENDPOINT:');
console.log('GET /api/astronomy-highlights?lat=53.3&lon=-6.3&days=3');
console.log('Returns formatted astronomy data ready for UI consumption');

module.exports = { sampleAstronomyHighlight, displayWotNowAstronomyCard };
