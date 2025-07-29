export type ActivityMessageConfig = {
  templates: {
    perfect: string;
    good: string;
    poor: string;
  };
  omitReasons?: string[];
};

export const activityMessages: Record<string, ActivityMessageConfig> = {
  surfing: {
    templates: {
      perfect: "Surf's up! {reasons}.",
      good: "Grab your wetsuit, it's pretty nice out there: {reasons}.",
      poor: "Gnarly, but not in a good way: {reasons}."
    },
    omitReasons: ['month']
  },
  snowboarding: {
    templates: {
      perfect: "Powder day! {reasons}.",
      good: "Decent snowboarding conditions: {reasons}.",
      poor: "Not a great day for snowboarding: {reasons}."
    },
    omitReasons: ['month']
  },
  road_cycling: {
    templates: {
      perfect: "Ideal cycling weather: {reasons}.",
      good: "Good for a ride: {reasons}.",
      poor: "Challenging conditions: {reasons}."
    }
  },
  hiking: {
    templates: {
      perfect: "Perfect hiking weather: {reasons}.",
      good: "Good day for a walk: {reasons}.",
      poor: "Not the best for hiking: {reasons}."
    }
  },
  mountain_biking: {
    templates: {
      perfect: "Trails are prime for mountain biking: {reasons}.",
      good: "Decent biking conditions: {reasons}.",
      poor: "Tough day for mountain biking: {reasons}."
    }
  },
  kayaking: {
    templates: {
      perfect: "Ideal for kayaking: {reasons}.",
      good: "Good paddling weather: {reasons}.",
      poor: "Not recommended for kayaking: {reasons}."
    }
  },
  running: {
    templates: {
      perfect: "Great running weather: {reasons}.",
      good: "Good for a jog: {reasons}.",
      poor: "Challenging for running: {reasons}."
    }
  },
  trail_running: {
    templates: {
      perfect: "Perfect for trail running: {reasons}.",
      good: "Good trail running conditions: {reasons}.",
      poor: "Not ideal for trail running: {reasons}."
    }
  },
  skateboarding: {
    templates: {
      perfect: "Skate on! {reasons}.",
      good: "Decent for skateboarding: {reasons}.",
      poor: "Not great for skateboarding: {reasons}."
    }
  },
  rollerblading: {
    templates: {
      perfect: "Rollerblading weather is perfect: {reasons}.",
      good: "Good for rollerblading: {reasons}.",
      poor: "Not recommended for rollerblading: {reasons}."
    }
  },
  birdwatching: {
    templates: {
      perfect: "Birds are out and about: {reasons}.",
      good: "Good for birdwatching: {reasons}.",
      poor: "Birdwatching will be tough: {reasons}."
    }
  },
  foraging: {
    templates: {
      perfect: "Perfect for foraging: {reasons}.",
      good: "Good for a forage: {reasons}.",
      poor: "Not much to forage today: {reasons}."
    }
  },
  mushroom_hunting: {
    templates: {
      perfect: "Great day for mushroom hunting: {reasons}.",
      good: "Good for mushrooms: {reasons}.",
      poor: "Poor mushroom hunting conditions: {reasons}."
    }
  },
  stargazing: {
    templates: {
      perfect: "Clear skies for stargazing: {reasons}.",
      good: "Decent for stargazing: {reasons}.",
      poor: "Cloudy or poor visibility for stargazing: {reasons}."
    }
  },
  swimming: {
    templates: {
      perfect: "Perfect swimming conditions: {reasons}.",
      good: "Good for a swim: {reasons}.",
      poor: "Not recommended for swimming: {reasons}."
    }
  },
  stand_up_paddleboarding: {
    templates: {
      perfect: "Ideal for paddleboarding: {reasons}.",
      good: "Good for SUP: {reasons}.",
      poor: "Poor paddleboarding conditions: {reasons}."
    }
  },
  snorkeling: {
    templates: {
      perfect: "Crystal clear for snorkeling: {reasons}.",
      good: "Good for snorkeling: {reasons}.",
      poor: "Not great for snorkeling: {reasons}."
    }
  },
  scuba_diving: {
    templates: {
      perfect: "Perfect for scuba diving: {reasons}.",
      good: "Good diving conditions: {reasons}.",
      poor: "Poor diving conditions: {reasons}."
    }
  },
  kitesurfing: {
    templates: {
      perfect: "Wind's up for kitesurfing: {reasons}.",
      good: "Good for kitesurfing: {reasons}.",
      poor: "Not safe for kitesurfing: {reasons}."
    }
  },
  windsurfing: {
    templates: {
      perfect: "Perfect windsurfing weather: {reasons}.",
      good: "Good for windsurfing: {reasons}.",
      poor: "Poor windsurfing conditions: {reasons}."
    }
  },
  beach: {
    templates: {
      perfect: "Beach day! {reasons}.",
      good: "Good for the beach: {reasons}.",
      poor: "Not ideal for the beach: {reasons}."
    }
  },
  camping: {
    templates: {
      perfect: "Perfect camping weather: {reasons}.",
      good: "Good for camping: {reasons}.",
      poor: "Challenging camping conditions: {reasons}."
    }
  },
  picnicking: {
    templates: {
      perfect: "Ideal for a picnic: {reasons}.",
      good: "Good picnic weather: {reasons}.",
      poor: "Not picnic weather: {reasons}."
    }
  },
  geocaching: {
    templates: {
      perfect: "Great for geocaching: {reasons}.",
      good: "Good geocaching conditions: {reasons}.",
      poor: "Poor geocaching conditions: {reasons}."
    }
  },
  outdoor_gym: {
    templates: {
      perfect: "Perfect for outdoor gym: {reasons}.",
      good: "Good for outdoor gym: {reasons}.",
      poor: "Not recommended for outdoor gym: {reasons}."
    }
  },
  outdoor_yoga: {
    templates: {
      perfect: "Ideal for outdoor yoga: {reasons}.",
      good: "Good for outdoor yoga: {reasons}.",
      poor: "Poor outdoor yoga conditions: {reasons}."
    }
  },
  outdoor_meditation: {
    templates: {
      perfect: "Perfect for outdoor meditation: {reasons}.",
      good: "Good for meditation: {reasons}.",
      poor: "Not ideal for meditation: {reasons}."
    }
      },
  dog_walking: {
    templates: {
    perfect: "Perfect for walking the dog: {reasons}.",
    good: "Good day for a walk with your dog: {reasons}.",
    poor: "Not ideal for dog walking: {reasons}."
    }
      },
  photography: {
    templates: {
    perfect: "Amazing conditions for photography: {reasons}.",
    good: "Good light for photos: {reasons}.",
    poor: "Not great for photography: {reasons}."
    }

  },
  // Add any additional outdoor activities from emojiMap here
};



export function getActivityMessage(
  activityId: string,
  category: 'perfect' | 'good' | 'poor',
  reasons: { key: string; value: any; label: string }[]
): string {
  const config = activityMessages[activityId];
  if (!config) return '';
  const filteredReasons = reasons.filter(
    r => !(config.omitReasons || []).includes(r.key)
  );
const reasonText = reasons.map(r => r.label.trim().replace(/\.$/, '')).join('. ') + '.';  const template = config.templates[category];
  return template.replace('{reasons}', reasonText);
}