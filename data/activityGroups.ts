/**
 * How the activity library is grouped for a person choosing from it.
 *
 * This tree is hand-ordered and that is the whole point of it. In library order
 * the 81 outdoor activities open on football, american football, baseball,
 * hurling, gaelic football and hockey — a block of team sports, because that is
 * where the data files happen to sit. Nobody scanning for "something I'd
 * actually do" reads that as a range of options.
 *
 * So each list here runs recognisable-first (football, cricket, rugby — not
 * ice hockey), and the subcategories give the long list somewhere to breathe.
 * It was built for `/interests`, which is the screen this redesign replaces,
 * and it is the one piece of that page worth keeping: it encodes a judgement
 * about what people recognise that no sort of the data can reproduce.
 *
 * Moved out of the page so `/start` can order its expanded list the same way.
 * An id here that is not in the library is skipped, and a library activity
 * missing from the tree still has to be shown by the caller — neither side is
 * authoritative about the other.
 *
 * @module data/activityGroups
 */

export interface ActivitySubcategory {
  key: string;
  icon: string;
  acts: string[];
}

export interface ActivityCategory {
  key: string;
  icon: string;
  subcategories: ActivitySubcategory[];
}

export const ACTIVITY_GROUPS: ActivityCategory[] = [
    {
        key: "Active Sports",
        icon: "🏃‍♂️",
        subcategories: [
            {
                key: "Team Sports",
                icon: "🤾‍♂️",
                acts: [
                    "football_soccer",
                    "cricket",
                    "rugby",
                    "basketball_outdoor",
                    "beach_volleyball",
                    "american_football",
                    "baseball",
                    "hurling_camogie",
                    "gaelic_football",
                    "hockey",
                    "netball",
                ],
            },
            {
                key: "Individual Sports",
                icon: "🎾",
                acts: [
                    "golf",
                    "tennis",
                    "tennis_indoor",
                    "squash",
                    "badminton",
                    "table_tennis",
                    "archery",
                    "pickleball",
                    "volleyball_indoor",
                    "padel",
                ],
            },
            {
                key: "Water Sports",
                icon: "🛶",
                acts: [
                    "kayaking",
                    "sea_kayaking",
                    "canoeing",
                    "surfing",
                    "stand_up_paddleboarding",
                    "sup_sea",
                    "snorkeling",
                    "indoor_swimming",
                    "sea_swimming",
                    // Sea fishing lives under Fishing, not here. It was in both
                    // when this tree fed a checkbox page that could list a thing
                    // twice; the setup screen places each activity once, so a
                    // cross-listing just decides the section by whichever came
                    // first in the file — and for these two that was the wrong one.
                    "windsurfing",
                    "kitesurfing",
                    "jet_skiing",
                    "scuba_diving",
					"sailing",
                    "sailing_inland",
                    "windsurfing_inland",
                ],
            },
            {
                key: "Action Sports",
                icon: "🚵‍♂️",
                acts: [
                    "mountain_biking",
                    "road_cycling",
                    "gravel_biking",
                    "rock_climbing",
                    "rock_hopping",
                    "indoor_climbing",
                    "skateboarding",
                    "rollerblading",
					"riding_motorbike",
                ],
            },
        ],
    },
    {
        key: "Fitness & Wellness",
        icon: "💪",
        subcategories: [
            {
                key: "Mindfulness",
                icon: "🧘‍♂️",
                acts: [
                    "yoga",
                    "outdoor_yoga",
                    "meditation",
                    "outdoor_meditation",
                    "pilates",
                    "martial_arts",
                    "tai_chi",
                ],
            },
            {
                key: "Cardio & Running",
                icon: "🏃",
                acts: ["running", "trail_running", "cycling", "urban_exploring"],
            },
            {
                key: "Strength & Gym",
                icon: "🏋️‍♂️",
                acts: ["gym_workout", "outdoor_gym", "zumba", "boxing", "spinning"],
            },
        ],
    },
    {
        key: "Outdoor Activities",
        icon: "🌲",
        subcategories: [
            {
                key: "Nature Activities",
                icon: "🌳",
                acts: [
                    "hiking",
                    "birdwatching",
                    "photography",
                    "foraging",
                    "mushroom_hunting",
                    "wild_swimming",
                    "outdoor_gardening",
                    "geocaching",
                    "beekeeping",
                    "birdwatching_passage",
                    "stargazing",
                ],
            },
            {
                key: "Outdoor Recreation",
                icon: "🥏",
                acts: [
                    "horse_riding",
                    "frisbee",
                    "orienteering",
                ],
            },
            {
                key: "Fishing",
                icon: "🎣",
                acts: [
                    "fly_fishing_freshwater",
                    "coarse_fishing",
                    "sea_fishing_shore",
                    "sea_fishing_boat",
                    "ice_fishing",
                ],
            },
            {
                key: "Kicking Back and Relaxing",
                icon: "🍔",
                acts: [
          "picnicking",
          "bbq",
          "beach",
          "camping",
          "outdoor_gardening",
          "gaming",
          "reading",
          "going_to_pub",
          "outdoor_reading",
          "dog_walking",
          "outdoor_playground",
          "outdoor_chess",
          "outdoor_painting",
          "outdoor_music",
        ],
            },
        ],
    },
    {
        key: "Winter Sports",
        icon: "❄️",
        subcategories: [
            {
                key: "Snow Sports",
                icon: "⛷️",
                acts: ["skiing", "snowboarding", "cross_country_skiing"],
            },
            {
                key: "Ice Sports",
                icon: "⛸️",
                acts: [
                    "ice_skating",
                    "curling",
                    "ice_hockey",
                    "ice_fishing",
                    "ice_hockey_indoor",
                ],
            },
        ],
    },
    {
        key: "Creative & Arts",
        icon: "🎨",
        subcategories: [
            {
                key: "Visual Arts",
                icon: "🎨",
                acts: [
                    "painting",
                    "outdoor_painting",
                    "crafts",
                    "photography",
                    "knitting",
                    "diy",
                ],
            },
            {
                key: "Music & Performance",
                icon: "🎷",
                acts: [
                    "playing_records",
                    "make_music",
                    "dance",
                    "outdoor_music",
                ],
            },
            {
                key: "Literature & Learning",
                icon: "📚",
                acts: ["reading", "outdoor_reading"],
            },
        ],
    },
    {
        key: "Indoor Recreation",
        icon: "🏠",
        subcategories: [
            {
                key: "Home Activities",
                icon: "🧶",
                acts: [
                    "crafts",
                    "knitting",
                    "reading",
                    "diy",
                    "playing_records",
                    "cooking",
                    "painting",
					"gaming",

                ],
            },
            {
                key: "Social Activities",
                icon: "🍻",
                acts: [
                    "going_to_pub",
                    "table_tennis",
                    "playing_cards",
                    "watch_a_movie",
                    "cafe",
                    "cinema",
                    "museum",
                    "shopping",
                    "dance",
					"gallery",
					"bowling",
                ],
            },
            {
                key: "Indoor Sports",
                icon: "🏓",
                acts: [
                    "indoor_climbing",
                    "squash",
                    "badminton",
                    "tennis_indoor",
                    "indoor_swimming",
                    "gym_workout",
                    "pilates",
                    "yoga",
                    "meditation",
                ],
            },
        ],
    },
];
