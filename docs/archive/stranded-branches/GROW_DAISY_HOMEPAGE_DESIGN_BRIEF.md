# Grow Daisy Homepage Design Brief

**Date**: 2025-11-11
**App**: Grow Daisy (Gardening Specialist App)
**Feature**: Homepage with Swipeable Task Cards + Task List

---

## Executive Summary

The Grow Daisy homepage will feature an interactive, gamified task management system combining:
1. **Swipeable task cards** (top) - Tinder-style discovery of personalized gardening tasks
2. **Task list** (bottom) - Next 30 recommended tasks with quick actions

**User Flow**: Swipe right to add tasks to your todo list, swipe left to dismiss, or scroll down to see all upcoming recommendations.

---

## Page Structure

### Layout Overview

```
┌─────────────────────────────────────────────┐
│  🏡 My Home                    [☰ Menu]      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────┐     │
│  │                                   │     │
│  │   📸 Swipeable Task Card         │     │ ← Swipeable Cards
│  │                                   │     │   (1-5 cards in deck)
│  │   Plant Tomatoes 🍅              │     │
│  │   Perfect timing! Soil 65°F      │     │
│  │                                   │     │
│  │   ← 🚫 Dismiss    Add to List ✅ →│     │
│  └───────────────────────────────────┘     │
│                                             │
│  Current Weather: ☀️ 72°F, Sunny           │ ← Context Strip
│  Last Frost: May 10 (2 days ago)           │
│                                             │
├─────────────────────────────────────────────┤
│  📋 Recommended Tasks (30)                  │ ← Task List Header
├─────────────────────────────────────────────┤
│                                             │
│  ✅ 1. Plant Tomatoes 🍅         [+] [×]   │
│     Optimal window: Next 7 days             │ ← Task Items
│     Score: 95/100 • Weather: Perfect       │   (Next 30 tasks)
│                                             │
│  ⚠️  2. Water Seedlings 💧        [+] [×]   │
│     Urgent: Soil dry, hot today            │
│     Score: 88/100 • Weather: Hot           │
│                                             │
│  🌱 3. Fertilize Roses           [+] [×]   │
│     Good timing: Before rain tomorrow      │
│     Score: 82/100 • Weather: Good          │
│                                             │
│  ... (27 more tasks)                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Component 1: Swipeable Task Cards (Top)

### Visual Design

**Card Dimensions**:
- Width: Full width minus 32px padding (mobile)
- Height: 60vh (flexible, adapts to content)
- Border radius: 24px
- Shadow: Large elevation shadow (DaisyUI shadow-xl)

**Card Layout**:
```
┌─────────────────────────────────────────────┐
│  [Task Image/Illustration]                  │ ← Top 40% (visual)
│  🍅 Tomato plant illustration               │
│                                             │
├─────────────────────────────────────────────┤
│  🍅 Plant Tomatoes                          │ ← Title
│  ───────────────────────────────            │
│                                             │
│  Perfect timing! Last frost passed,         │ ← Description
│  soil temperature is 65°F - ideal for      │   (2-3 lines)
│  transplanting your tomato seedlings.       │
│                                             │
│  📅 Best window: Next 7 days                │ ← Metadata
│  🌡️ Soil temp: 65°F (optimal: 60-70°F)     │
│  ☀️ Weather: Sunny, no rain                 │
│  ⏱️ Time needed: 45 minutes                 │
│                                             │
│  Why now?                                   │ ← Reasoning
│  • Last frost passed 2 days ago            │   (bulleted list)
│  • Soil warmed up perfectly                │
│  • No rain forecast for 3 days             │
│  • Seedlings at ideal transplant size      │
│                                             │
│  ┌──────────────┐       ┌──────────────┐   │
│  │   Dismiss    │       │  Add to List │   │ ← Action Buttons
│  │      🚫       │       │      ✅       │   │   (also for tapping)
│  └──────────────┘       └──────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Card Stack Behavior

**Visual Stack**:
- Show 3 cards in stack (top card + 2 partially visible behind)
- Cards behind are scaled down (95%, 90%) and offset (8px, 16px)
- z-index layering for depth effect

**Swipe Mechanics**:
1. **Swipe Right** (Add to List):
   - Card slides right with rotation (+15°)
   - Green glow/border appears
   - Haptic feedback (if mobile)
   - Animate out, next card comes forward
   - Task added to "My Tasks" list

2. **Swipe Left** (Dismiss):
   - Card slides left with rotation (-15°)
   - Red glow/border appears
   - Haptic feedback
   - Animate out, next card comes forward
   - Task dismissed (hidden for 7 days)

3. **Tap Buttons**:
   - Alternative to swiping for desktop users
   - Same animation as swipe

**Swipe Thresholds**:
- Minimum distance: 80px (25% of card width)
- Velocity threshold: 0.5 (for quick flicks)
- Snap back if released before threshold

### Card Content

**Priority Indicators**:
- 🔥 **Urgent** (Score 90-100): Red badge, "Do this today"
- ✅ **Optimal** (Score 80-89): Green badge, "Perfect timing"
- 🌱 **Good** (Score 70-79): Blue badge, "Good window"
- ⏰ **Upcoming** (Score 60-69): Gray badge, "Coming up soon"

**Visual Elements**:
- Task icon/emoji (🍅 🌻 🥕 ✂️ 💧)
- Weather-appropriate background gradient
- Plant illustration or photo (if available)
- Progress indicator (if recurring task: "Week 3 of 12")

### Example Cards

**Card 1: Urgent Task**
```
┌─────────────────────────────────────────────┐
│  [Seedling illustration with droopy leaves] │
│                                             │
│  💧 Water Seedlings                    🔥   │
│  URGENT                                     │
│  ───────────────────────────────            │
│                                             │
│  Your seedlings need water! It's hot        │
│  today (82°F) and the soil is dry.         │
│  Water them soon to prevent wilting.        │
│                                             │
│  📅 Do this: Today before 2pm               │
│  🌡️ Temperature: 82°F (hot!)                │
│  💧 Soil: Dry (needs water)                 │
│  ⏱️ Time: 10 minutes                        │
│                                             │
│  Why urgent?                                │
│  • Soil moisture low (checked yesterday)   │
│  • Hot weather forecast today              │
│  • Seedlings in sensitive growth stage     │
│                                             │
│  [Dismiss 🚫]       [Add to List ✅]        │
└─────────────────────────────────────────────┘
```

**Card 2: Optimal Task**
```
┌─────────────────────────────────────────────┐
│  [Tomato plant with flowers illustration]  │
│                                             │
│  🍅 Plant Tomatoes                     ✅   │
│  PERFECT TIMING                             │
│  ───────────────────────────────            │
│                                             │
│  Last frost passed, soil is 65°F - ideal   │
│  for transplanting tomatoes. Do it this    │
│  week for best results!                    │
│                                             │
│  📅 Best window: Next 7 days                │
│  🌡️ Soil: 65°F (optimal: 60-70°F)          │
│  ☀️ Weather: Sunny streak ahead             │
│  ⏱️ Time: 45 minutes                        │
│                                             │
│  Why now?                                   │
│  • Frost-free date passed (May 10)        │
│  • Perfect soil temperature               │
│  • Sunny weather for establishment        │
│  • Your seedlings are 6-8" tall           │
│                                             │
│  [Dismiss 🚫]       [Add to List ✅]        │
└─────────────────────────────────────────────┘
```

**Card 3: Good Timing**
```
┌─────────────────────────────────────────────┐
│  [Rose bush illustration]                   │
│                                             │
│  🌹 Fertilize Roses                    🌱   │
│  GOOD TIMING                                │
│  ───────────────────────────────            │
│                                             │
│  Rain is forecast tomorrow - perfect time  │
│  to fertilize! The rain will help wash     │
│  nutrients into the soil.                  │
│                                             │
│  📅 Do by: Tomorrow morning                 │
│  🌧️ Weather: Rain tomorrow afternoon        │
│  🌱 Growth stage: Active blooming           │
│  ⏱️ Time: 20 minutes                        │
│                                             │
│  Why this timing?                           │
│  • Rain forecast helps nutrient uptake    │
│  • Roses in active growth phase           │
│  • Haven't fertilized in 4 weeks          │
│                                             │
│  [Dismiss 🚫]       [Add to List ✅]        │
└─────────────────────────────────────────────┘
```

### Card Deck Logic

**How Cards are Selected**:
1. Top 5 highest-scoring tasks (from 30 recommendations)
2. Prioritize variety (don't show 5 watering tasks in a row)
3. Filter out tasks already in user's todo list
4. Filter out recently dismissed tasks (< 7 days)

**Card Rotation**:
- Start with 5 cards in deck
- After swiping all 5, reload with next 5 highest-scoring tasks
- Show "You're all caught up!" message when no more high-priority tasks
- Button to "Show more tasks" → scrolls down to task list

---

## Component 2: Context Strip

Shows current conditions that affect task recommendations.

**Layout**:
```
┌─────────────────────────────────────────────┐
│  📍 Portland, OR                            │
│  ☀️ 72°F, Sunny  •  💧 Soil: Moist         │
│  🌡️ Last Frost: May 10 (2 days ago)        │
│  📅 Zone 8b  •  🌱 Growing Season: Week 4   │
└─────────────────────────────────────────────┘
```

**Data Points**:
- Current weather (temp, conditions)
- Soil moisture estimate
- Last frost date (days since)
- Growing zone
- Current growing week

**Updates**: Refreshes every 30 minutes

---

## Component 3: Task List (Next 30 Tasks)

### List Header

```
┌─────────────────────────────────────────────┐
│  📋 Recommended Tasks (30)                  │
│                                             │
│  Sorted by: [Urgency ▼]  [Filter: All ▼]  │
│                                             │
│  🔥 3 Urgent  •  ✅ 12 Optimal  •  🌱 15 Good│
└─────────────────────────────────────────────┘
```

**Controls**:
- **Sort by**: Urgency (default), Date, Plant Type, Time Required
- **Filter**: All (default), Urgent Only, Planting, Watering, Maintenance, Harvest

**Task Count Summary**: Shows breakdown of priority levels

### Task Item Design

**Compact View** (default):
```
┌─────────────────────────────────────────────┐
│  🔥 1. Water Seedlings 💧                   │
│     Urgent: Soil dry, hot today        [+] [×]│
│     Score: 88/100 • Weather: Hot • 10min  │
└─────────────────────────────────────────────┘
```

**Expanded View** (tap to expand):
```
┌─────────────────────────────────────────────┐
│  🔥 1. Water Seedlings 💧             [+] [×]│
│     ───────────────────────────────          │
│                                             │
│     Urgent: Soil dry, hot today             │
│                                             │
│     📅 Do this: Today before 2pm            │
│     🌡️ Temperature: 82°F                     │
│     💧 Soil: Dry (needs water)              │
│     ⏱️ Time: 10 minutes                     │
│                                             │
│     Why now?                                │
│     • Soil moisture low                    │
│     • Hot weather today                    │
│     • Seedlings sensitive stage            │
│                                             │
│     [View Full Details →]                   │
└─────────────────────────────────────────────┘
```

### Task Item Components

**Priority Badge** (left):
- 🔥 Red circle for Urgent
- ✅ Green checkmark for Optimal
- 🌱 Blue seedling for Good
- ⏰ Gray clock for Upcoming

**Task Number** (for reference):
- 1-30, helps users track position in list

**Task Title** (bold):
- Plant name + action (e.g., "Water Tomatoes")
- Task icon/emoji

**One-Line Summary**:
- Brief reason for recommendation
- e.g., "Perfect timing! Soil 65°F"

**Metadata Row** (small text):
- Score: 88/100
- Weather context: "Hot" / "Perfect" / "Good"
- Time required: "10min" / "45min" / "2hr"

**Action Buttons** (right):
- **[+] button**: Add to My Tasks (replaces heart ❤️)
- **[×] button**: Dismiss/Remove task

### Button States

**[+] Add to List Button**:
- Default: Outlined button with "+"
- Hover: Fills with primary color
- Active: Green with checkmark ✓
- Added: Green background, "Added" text, checkmark
- Tap again: Removes from list (toggle)

**[×] Dismiss Button**:
- Default: Outlined button with "×"
- Hover: Fills with gray/red
- Confirm: Shows "Dismiss?" prompt
- Dismissed: Fades out, task removed from list

### Example Task Items

**1. Urgent Task**:
```
┌─────────────────────────────────────────────┐
│  🔥 1. Water Seedlings 💧                   │
│     Urgent: Soil dry, 82°F today       [+] [×]│
│     Score: 95/100 • Hot • 10min            │
└─────────────────────────────────────────────┘
```

**2. Optimal Task**:
```
┌─────────────────────────────────────────────┐
│  ✅ 2. Plant Tomatoes 🍅                    │
│     Perfect timing! Soil 65°F          [+] [×]│
│     Score: 92/100 • Perfect • 45min        │
└─────────────────────────────────────────────┘
```

**3. Good Task**:
```
┌─────────────────────────────────────────────┐
│  🌱 3. Fertilize Roses 🌹                   │
│     Before rain tomorrow               [+] [×]│
│     Score: 82/100 • Good • 20min           │
└─────────────────────────────────────────────┘
```

**4. Upcoming Task**:
```
┌─────────────────────────────────────────────┐
│  ⏰ 4. Prune Fruit Trees ✂️                 │
│     Coming up: Late dormant season     [+] [×]│
│     Score: 65/100 • Upcoming • 1hr         │
└─────────────────────────────────────────────┘
```

---

## User Interactions

### Swipe Card Interactions

**Right Swipe (Add to List)**:
1. User swipes card right or taps "Add to List" button
2. Card animates out to the right with green glow
3. Task added to user's "My Tasks" list
4. Haptic feedback (mobile)
5. Toast notification: "Added to My Tasks ✓"
6. Next card comes forward
7. Task appears in navigation with badge count (+1)

**Left Swipe (Dismiss)**:
1. User swipes card left or taps "Dismiss" button
2. Card animates out to the left with red glow
3. Confirmation prompt: "Dismiss this task?"
   - "Already done" → Mark as completed
   - "Don't want to do" → Hide for 7 days
   - "Cancel" → Card returns
4. Task hidden from recommendations
5. Next card comes forward

**Tap Card (View Details)**:
1. Card expands to show full details
2. Background dims (modal overlay)
3. Shows:
   - Full description
   - All weather/soil data
   - Step-by-step instructions (if available)
   - Related tasks
   - Option to add notes
4. Bottom actions: [Dismiss] [Add to List] [Close]

**Empty Deck**:
```
┌─────────────────────────────────────────────┐
│                                             │
│             🎉                              │
│                                             │
│         You're All Caught Up!               │
│                                             │
│     You've reviewed all high-priority      │
│     tasks for today.                       │
│                                             │
│     [Show More Tasks ↓]                     │
│                                             │
└─────────────────────────────────────────────┘
```

### Task List Interactions

**[+] Add Button**:
1. Tap [+] button
2. Button turns green with checkmark
3. Task added to "My Tasks"
4. Toast: "Added to My Tasks ✓"
5. Button now shows [✓] (can tap to remove)

**[×] Dismiss Button**:
1. Tap [×] button
2. Inline confirmation appears:
   ```
   Dismiss? [Already done] [Don't want to] [Cancel]
   ```
3. If "Already done": Task marked complete, removed from list
4. If "Don't want to": Task hidden for 7 days
5. If "Cancel": Returns to normal

**Tap Task Item**:
1. Expands inline to show more details
2. Shows:
   - Full description
   - All metadata
   - "Why now?" reasoning
   - [View Full Details] button
3. Tap again to collapse

**Tap "View Full Details"**:
1. Opens full-screen task detail modal
2. Shows:
   - Large image/illustration
   - Complete instructions
   - Related tasks
   - Add notes field
   - Schedule option
3. Bottom actions: [Dismiss] [Add to List] [Close]

### Filter & Sort

**Sort Dropdown**:
- Urgency (default): Highest score first
- Date: Earliest deadline first
- Plant Type: Alphabetical by plant
- Time Required: Shortest first

**Filter Dropdown**:
- All (default): Show all 30 tasks
- Urgent Only: Only 90+ score
- By Category:
  - 🌱 Planting
  - 💧 Watering
  - ✂️ Pruning/Maintenance
  - 🌾 Harvesting
  - 🐛 Pest/Disease
  - 🌿 Fertilizing

---

## Data & State Management

### Task Data Structure

```typescript
interface GardenTask {
  id: string;
  taskCode: string; // e.g., "PLANT_TOMATOES"

  // Display
  title: string; // "Plant Tomatoes"
  emoji: string; // "🍅"
  icon: string; // Task type icon
  shortDescription: string; // "Perfect timing! Soil 65°F"
  fullDescription: string;

  // Scoring
  score: number; // 0-100
  urgency: 'critical' | 'optimal' | 'good' | 'upcoming';
  urgencyBadge: '🔥' | '✅' | '🌱' | '⏰';

  // Context
  plant?: {
    id: string;
    name: string;
    type: string;
    growthStage: string;
  };

  // Timing
  bestWindow: {
    start: Date;
    end: Date;
    description: string; // "Next 7 days"
  };
  deadline?: Date;

  // Weather factors
  weatherFactors: {
    temperatureScore: number;
    moistureScore: number;
    timingScore: number;
    forecastScore: number;
  };

  // Metadata
  timeRequired: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'planting' | 'watering' | 'maintenance' | 'harvest' | 'pest' | 'fertilizing';

  // Reasoning
  reasoning: string[];
  whyNow: string[];

  // Instructions
  instructions?: string[];
  tips?: string[];
  relatedTasks?: string[]; // IDs of related tasks

  // User interaction
  inMyTasks: boolean;
  dismissedAt?: Date;
  completedAt?: Date;

  // Images
  imageUrl?: string;
  illustrationUrl?: string;
}
```

### API Endpoints

**`GET /api/garden/tasks`**
```typescript
// Get personalized task recommendations
interface TasksRequest {
  location: { lat: number; lon: number };
  zone: string;
  limit?: number; // Default 30
  includeCompleted?: boolean;
}

interface TasksResponse {
  tasks: GardenTask[];
  topCards: GardenTask[]; // Top 5 for swipe deck
  context: {
    weather: WeatherSummary;
    soil: SoilConditions;
    zone: string;
    lastFrostDate: Date;
    growingWeek: number;
  };
  counts: {
    urgent: number;
    optimal: number;
    good: number;
    upcoming: number;
  };
}
```

**`POST /api/garden/tasks/:id/add`**
```typescript
// Add task to user's todo list
interface AddTaskRequest {
  taskId: string;
  scheduledFor?: Date; // Optional: schedule for later
  notes?: string;
}

interface AddTaskResponse {
  success: boolean;
  task: GardenTask;
  myTasksCount: number; // New total
}
```

**`POST /api/garden/tasks/:id/dismiss`**
```typescript
// Dismiss a task
interface DismissTaskRequest {
  taskId: string;
  reason: 'completed' | 'not_interested' | 'not_applicable';
  completedAt?: Date; // If completed
}

interface DismissTaskResponse {
  success: boolean;
  hiddenUntil?: Date; // If not_interested: hidden for 7 days
}
```

**`GET /api/garden/my-tasks`**
```typescript
// Get user's todo list
interface MyTasksResponse {
  tasks: GardenTask[];
  counts: {
    total: number;
    dueToday: number;
    overdue: number;
  };
}
```

### Database Schema

**`garden_tasks` table** (task templates):
```sql
CREATE TABLE garden_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  short_description TEXT,
  full_description TEXT,
  instructions JSONB, -- Array of steps
  tips JSONB, -- Array of tips
  time_required INTEGER, -- minutes
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`user_garden_tasks` table** (user's tasks):
```sql
CREATE TABLE user_garden_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  task_code TEXT NOT NULL REFERENCES garden_tasks(task_code),

  -- Scheduling
  added_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for DATE,
  due_date DATE,

  -- Status
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed', 'dismissed')),
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismiss_reason TEXT,

  -- User data
  notes TEXT,
  time_spent INTEGER, -- minutes

  -- Plant relationship
  plant_id UUID REFERENCES user_plants(id),

  -- Metadata
  score_at_add NUMERIC, -- Score when added
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, task_code, scheduled_for)
);

CREATE INDEX idx_user_garden_tasks_user_status ON user_garden_tasks(user_id, status);
CREATE INDEX idx_user_garden_tasks_scheduled ON user_garden_tasks(scheduled_for);
```

**`garden_task_dismissals` table** (track dismissals):
```sql
CREATE TABLE garden_task_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  task_code TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  hide_until TIMESTAMPTZ, -- Hide for 7 days if "not_interested"
  reason TEXT,

  UNIQUE(user_id, task_code, dismissed_at)
);

CREATE INDEX idx_task_dismissals_user_code ON garden_task_dismissals(user_id, task_code);
```

### State Management

**React Context**: `TasksContext`

```typescript
interface TasksState {
  // Recommended tasks
  recommendedTasks: GardenTask[];
  topCards: GardenTask[]; // Top 5 for swipe deck
  currentCardIndex: number;

  // User's tasks
  myTasks: GardenTask[];
  myTasksCount: number;

  // Filters
  sortBy: 'urgency' | 'date' | 'plant' | 'time';
  filterBy: 'all' | 'urgent' | 'planting' | 'watering' | 'maintenance' | 'harvest';

  // UI state
  isLoading: boolean;
  error?: string;

  // Context
  weather?: WeatherSummary;
  soil?: SoilConditions;
}

interface TasksActions {
  // Card actions
  swipeRight: (taskId: string) => Promise<void>;
  swipeLeft: (taskId: string, reason: string) => Promise<void>;

  // List actions
  addTask: (taskId: string) => Promise<void>;
  dismissTask: (taskId: string, reason: string) => Promise<void>;

  // Filters
  setSortBy: (sort: string) => void;
  setFilterBy: (filter: string) => void;

  // Refresh
  refreshTasks: () => Promise<void>;
}
```

---

## Visual Design

### Color Palette

**Priority Colors**:
- **Urgent (🔥)**: Red 600 (`#DC2626`)
- **Optimal (✅)**: Green 600 (`#059669`)
- **Good (🌱)**: Blue 600 (`#2563EB`)
- **Upcoming (⏰)**: Gray 500 (`#6B7280`)

**Action Colors**:
- **Add/Accept**: Green 500 (`#10B981`)
- **Dismiss/Decline**: Red 500 (`#EF4444`)
- **Neutral**: Gray 400 (`#9CA3AF`)

**Background Gradients** (for cards):
- **Urgent**: Red 50 → Orange 50
- **Optimal**: Green 50 → Emerald 50
- **Good**: Blue 50 → Sky 50
- **Upcoming**: Gray 50 → Slate 50

### Typography

**Card Title**:
- Font: Bold, 24px
- Line height: 1.2

**Card Description**:
- Font: Regular, 16px
- Line height: 1.5

**Metadata**:
- Font: Medium, 14px
- Color: Gray 600

**Reasoning/Why Now**:
- Font: Regular, 14px
- Line height: 1.6

**Task List Title**:
- Font: Bold, 18px

**Task List Metadata**:
- Font: Regular, 12px
- Color: Gray 500

### Spacing

**Card Padding**: 24px
**Card Stack Gap**: 8px, 16px
**List Item Padding**: 16px vertical, 20px horizontal
**Section Spacing**: 32px between major sections

### Animations

**Card Swipe**:
- Duration: 300ms
- Easing: ease-out
- Rotation: ±15°
- Translate: 100vw (off screen)

**Card Appear**:
- Duration: 200ms
- Easing: ease-in
- Scale: 0.9 → 1.0
- Opacity: 0 → 1

**Button Press**:
- Duration: 150ms
- Scale: 0.95
- Haptic feedback (mobile)

**Task Add/Remove**:
- Duration: 250ms
- Slide out left (remove)
- Fade in (add)

---

## Responsive Design

### Mobile (< 768px)

- Cards: Full width minus 16px padding
- Card height: 60vh (scrollable content)
- Swipe gestures: Primary interaction
- Buttons: Large touch targets (48px min)
- Task list: Full width, compact cards

### Tablet (768px - 1024px)

- Cards: 80% width, centered
- Card height: 70vh
- Both swipe and tap interactions
- Task list: 2-column grid

### Desktop (> 1024px)

- Cards: Max 600px width, centered
- Card height: Auto (max 80vh)
- Click/drag for swipe
- Task list: 2-column grid
- Keyboard shortcuts:
  - ← Left arrow: Dismiss
  - → Right arrow: Add
  - ↓ Down arrow: Next card
  - Space: View details

---

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate through cards and list items
- **Enter/Space**: Activate buttons
- **Arrow keys**: Navigate cards (desktop)
- **Escape**: Close modals

### Screen Readers

- Cards announce: "Task card: [Title]. [Description]. [Urgency]. Press Enter to view details, Right arrow to add, Left arrow to dismiss."
- Buttons have clear aria-labels
- Task list items announce full context

### Visual

- High contrast mode support
- Color is not the only indicator (icons + text)
- Minimum 4.5:1 contrast ratio
- Focus indicators on all interactive elements

---

## Performance Optimizations

### Lazy Loading

- Load cards 5 at a time
- Preload next 5 cards in background
- Task list: Virtual scrolling (only render visible items)

### Caching

- Cache task recommendations for 6 hours
- Cache weather data for 30 minutes
- Optimistic updates for add/dismiss actions

### Animations

- Use CSS transforms (GPU accelerated)
- RequestAnimationFrame for smooth swipes
- Debounce swipe gestures

---

## Success Metrics

**Engagement**:
- % of users who swipe at least 1 card
- Average cards swiped per session
- % of cards added to list vs dismissed

**Task Completion**:
- % of swiped tasks that get completed
- Time from add to completion
- Most popular task categories

**Retention**:
- Daily active users returning
- % of users with active todo items
- Average tasks completed per week

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)
- [x] Basic swipeable card component
- [x] Add/dismiss actions
- [x] Task list with [+] [×] buttons
- [x] Basic task scoring
- [x] Database schema

### Phase 2: Polish (Week 3)
- [ ] Card animations and gestures
- [ ] Task detail modal
- [ ] Filter and sort
- [ ] Context strip

### Phase 3: Advanced (Week 4)
- [ ] Keyboard shortcuts
- [ ] Optimistic updates
- [ ] Advanced scoring algorithm
- [ ] Related tasks

---

## Technical Notes

### Swipe Library

Use **Framer Motion** (already in project):
```typescript
import { motion, useMotionValue, useTransform } from 'framer-motion';

// Card swipe component
const SwipeCard = ({ task, onSwipeRight, onSwipeLeft }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x > 100) {
          onSwipeRight(task.id);
        } else if (offset.x < -100) {
          onSwipeLeft(task.id);
        }
      }}
    >
      {/* Card content */}
    </motion.div>
  );
};
```

### Task Scoring Algorithm

Reuse from existing implementation:
```typescript
// From GROW_DAISY_TASK_SCORING.md
score = (weatherWindow × 0.40) +
        (plantNeed × 0.30) +
        (seasonalTiming × 0.20) +
        (forecastOptimization × 0.10)
```

---

## Open Questions

1. **Swipe confirmation**: Should we confirm dismissals or make them instant?
   - **Decision**: Instant for swipes, confirm for button taps

2. **Card refresh**: How often should we refresh the card deck?
   - **Decision**: Refresh when empty, or on pull-to-refresh

3. **Task scheduling**: Should users be able to schedule tasks for specific dates when adding?
   - **Decision**: Phase 2 feature (quick add for now)

4. **Recurring tasks**: How do we handle tasks that need to be done weekly (e.g., water)?
   - **Decision**: Show again after completion with updated scoring

---

## Related Documents

- `GROW_DAISY_IMPLEMENTATION_GUIDE.md` - Overall implementation
- `GROW_DAISY_TASK_SCORING.md` - Task scoring algorithm
- `GROW_DAISY_API_ENDPOINTS.md` - API specifications
- `GROW_DAISY_NAVIGATION_UPDATE.md` - Navigation structure

---

**Status**: Ready for implementation
**Priority**: High (core feature)
**Estimated Effort**: 2-3 weeks (including testing)
