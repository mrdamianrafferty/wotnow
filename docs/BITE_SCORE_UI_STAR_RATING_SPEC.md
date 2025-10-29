# Bite Score UI: Star Rating System
**Date**: October 29, 2025
**Concept**: 0-5 star rating where each star = 20% of possible score

## 🌟 Overall Bite Score Display

### Primary View (Species Card)
```
Grey Mullet
⭐⭐⭐⭐☆ 4.2/5    "Excellent conditions"
```

**Star Calculation**:
- bite_score: 0-100
- stars = bite_score / 20
- Example: 84/100 = 4.2 stars → ⭐⭐⭐⭐☆

**Color Coding**:
- ⭐⭐⭐⭐⭐ 4.0-5.0 stars (80-100%) = GREEN "Excellent" / "Go Now"
- ⭐⭐⭐☆☆ 2.5-3.9 stars (50-79%) = YELLOW "Fair" / "Worth Trying"
- ⭐⭐☆☆☆ 1.0-2.4 stars (20-49%) = ORANGE "Poor" / "Not Ideal"
- ⭐☆☆☆☆ 0.0-0.9 stars (0-19%) = RED "Very Poor" / "Don't Bother"

**Text Labels**:
| Stars | Label | Recommendation |
|-------|-------|----------------|
| 4.5-5.0 | "Prime time!" | Drop everything, go now |
| 4.0-4.4 | "Excellent" | Very good conditions |
| 3.5-3.9 | "Good" | Solid bite expected |
| 3.0-3.4 | "Fair" | Worth trying |
| 2.5-2.9 | "Moderate" | Mixed conditions |
| 2.0-2.4 | "Below average" | Tough fishing |
| 1.5-1.9 | "Poor" | Unlikely to catch |
| 1.0-1.4 | "Very poor" | Don't waste your time |
| 0.0-0.9 | "Unsuitable" | Wrong conditions |

---

## 📊 Expandable Breakdown View

### Tap/Click to Expand:

```
Grey Mullet
⭐⭐⭐⭐☆ 4.2/5    "Excellent conditions"

[Tap for breakdown ▼]

───────────────────────────────────────
🌊 TIDE & FLOW
⭐⭐⭐⭐⭐ 5.0/5 (25/25 pts)
"Perfect mid-flood tide - peak feeding time for this species"

🌅 LIGHT CONDITIONS
⭐⭐⭐⭐☆ 3.8/5 (15/20 pts)
"Dawn approaching in 32 minutes - prime feeding window starting"

💨 WIND & WAVES
⭐⭐⭐☆☆ 3.3/5 (10/15 pts)
"Light chop (8 knots) stirring bait - onshore wind pushing food to shore"

🔽 PRESSURE TREND
⭐⭐⭐⭐⭐ 5.0/5 (10/10 pts)
"Steady pressure - stable conditions keep fish active"

🌡️ TEMP & BIO
⭐⭐⭐⭐☆ 4.0/5 (8/10 pts)
"Water temp 19.1°C - perfect for this species (optimal: 14-20°C)"

💧 WATER CLARITY
⭐⭐⭐☆☆ 3.5/5 (7/10 pts)
"Moderate clarity - suitable for opportunistic feeders"

☁️ MICRO-WEATHER
⭐⭐⭐⭐☆ 4.0/5 (4/5 pts)
"Light overcast - diffused light ideal for feeding"

🌙 LUNAR TIMING
⭐⭐☆☆☆ 2.0/5 (2/5 pts)
"Outside major solunar window - next peak in 3.5 hours"

───────────────────────────────────────
Total: ⭐⭐⭐⭐☆ 84/100 (4.2/5)
```

---

## 🎨 Visual Design Patterns

### Star Rendering Options:

**Option 1: Unicode Stars** (simplest)
```
⭐⭐⭐⭐☆  (4.0)
⭐⭐⭐⭐🌟  (4.5 - half star)
```

**Option 2: SVG Stars** (most flexible)
```tsx
<StarRating value={4.2} max={5}>
  <Star filled />
  <Star filled />
  <Star filled />
  <Star filled />
  <Star partial={0.2} />  // 20% filled
</StarRating>
```

**Option 3: Icon Font** (good compromise)
```css
.star-filled { content: "\2605"; color: #FFD700; }
.star-empty { content: "\2606"; color: #CCCCCC; }
.star-half { /* gradient or clip-path */ }
```

### Color Palette:

```css
/* Star colors by score range */
.stars-excellent (4.0-5.0) {
  fill: #10B981;  /* Green */
  glow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.stars-good (3.0-3.9) {
  fill: #F59E0B;  /* Amber */
  glow: 0 0 8px rgba(245, 158, 11, 0.6);
}

.stars-fair (2.0-2.9) {
  fill: #F97316;  /* Orange */
  glow: 0 0 8px rgba(249, 115, 22, 0.6);
}

.stars-poor (0.0-1.9) {
  fill: #EF4444;  /* Red */
  glow: 0 0 8px rgba(239, 68, 68, 0.6);
}
```

---

## 📱 Responsive Layout

### Mobile (Compact View):
```
┌─────────────────────────┐
│ Grey Mullet             │
│ ⭐⭐⭐⭐☆ 4.2/5          │
│ "Excellent conditions"  │
│ [Tap for details ▼]    │
└─────────────────────────┘
```

### Tablet/Desktop (Inline Preview):
```
┌──────────────────────────────────────────────┐
│ Grey Mullet              ⭐⭐⭐⭐☆ 4.2/5      │
│ "Excellent conditions"                       │
│                                              │
│ 🌊 ⭐⭐⭐⭐⭐  💨 ⭐⭐⭐☆☆  🌡️ ⭐⭐⭐⭐☆       │
│ Tide     Wind         Temp                   │
│ [See full breakdown →]                       │
└──────────────────────────────────────────────┘
```

---

## 🧮 Component Score Conversion

Each component has its own maximum, convert to 5-star scale:

| Component | Max Pts | Formula | Example |
|-----------|---------|---------|---------|
| Tide Moment | 25 | (score/25) × 5 | 20/25 = 4.0⭐ |
| Light Moment | 20 | (score/20) × 5 | 15/20 = 3.75⭐ |
| Wind/Wave | 15 | (score/15) × 5 | 10/15 = 3.33⭐ |
| Pressure | 10 | (score/10) × 5 | 10/10 = 5.0⭐ |
| Temp/Bio | 10 | (score/10) × 5 | 8/10 = 4.0⭐ |
| Clarity | 10 | (score/10) × 5 | 7/10 = 3.5⭐ |
| Micro-Weather | 5 | (score/5) × 5 | 4/5 = 4.0⭐ |
| Lunar Window | 5 | (score/5) × 5 | 2/5 = 2.0⭐ |

**Overall**: `(total_score / 100) × 5`

---

## 🎯 Star Rounding Rules

**For Display Clarity**:
- **Whole stars**: Round to nearest 0.5
  - 4.2 → 4.0 (⭐⭐⭐⭐☆)
  - 4.3 → 4.5 (⭐⭐⭐⭐🌟)
  - 4.7 → 4.5 (⭐⭐⭐⭐🌟)
  - 4.8 → 5.0 (⭐⭐⭐⭐⭐)

**For Sorting/Filtering**:
- Use exact decimal values (4.23, 3.87, etc.)
- Don't round until display

**Text Display**:
- Show 1 decimal: "4.2/5"
- NOT: "4.23/5" (too precise, cluttered)

---

## 🔔 Real-Time Updates

### Dynamic Star Changes:

```
Current:  ⭐⭐⭐☆☆ 3.2/5  "Fair conditions"
           ↓ (15 minutes later, tide turns)
Updated:  ⭐⭐⭐⭐☆ 4.5/5  "Prime time! 🎣"
```

**Notification**:
```
┌─────────────────────────────────────┐
│ 🎣 BITE WINDOW OPENING!             │
│                                     │
│ Grey Mullet jumped from 3.2→4.5⭐   │
│ "Mid-flood tide starting - go now!" │
│                                     │
│ [View Details] [Dismiss]            │
└─────────────────────────────────────┘
```

---

## 💡 Best Practices

**DO**:
✅ Use stars for quick visual scanning
✅ Show exact score (4.2/5) for precision
✅ Provide text explanation for each factor
✅ Color-code by quality (green/yellow/orange/red)
✅ Animate star changes when score updates
✅ Show "Best bite in X minutes" countdown

**DON'T**:
❌ Show percentages (78%) - less intuitive than stars
❌ Use more than 5 stars (confusing scale)
❌ Hide component breakdowns (transparency builds trust)
❌ Update too frequently (<10 min) - creates noise
❌ Use stars without explanation text

---

## 📊 Example Species Comparison

```
┌────────────────────────────────────────┐
│ TOP PREDICTIONS FOR YOUR LOCATION      │
├────────────────────────────────────────┤
│ 1. Sea Bass       ⭐⭐⭐⭐⭐ 4.8/5      │
│    "Prime time - perfect tide & light" │
├────────────────────────────────────────┤
│ 2. Grey Mullet    ⭐⭐⭐⭐☆ 4.2/5      │
│    "Excellent - all factors align"     │
├────────────────────────────────────────┤
│ 3. Sea Bream      ⭐⭐⭐⭐☆ 4.0/5      │
│    "Very good - ideal temperature"     │
├────────────────────────────────────────┤
│ 4. Mackerel       ⭐⭐⭐☆☆ 3.5/5      │
│    "Fair - wind a bit strong"          │
├────────────────────────────────────────┤
│ 5. Common Octopus ⭐⭐☆☆☆ 2.5/5      │
│    "Poor - daytime (nocturnal species)"│
└────────────────────────────────────────┘
```

---

## 🚀 Implementation Priority

**Phase 1**: Overall star rating (species cards)
**Phase 2**: Expandable component breakdown
**Phase 3**: Real-time star updates
**Phase 4**: "Bite window" notifications
**Phase 5**: Countdown timers ("Best bite in...")

---

## 📐 Mockup Code (React/Next.js)

```tsx
interface StarRatingProps {
  score: number;      // 0-100
  maxScore?: number;  // default: 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showScore?: boolean;
}

export function StarRating({
  score,
  maxScore = 100,
  size = 'md',
  showLabel = true,
  showScore = true
}: StarRatingProps) {
  const stars = (score / maxScore) * 5;
  const fullStars = Math.floor(stars);
  const partialStar = stars % 1;
  const emptyStars = 5 - Math.ceil(stars);

  const colorClass =
    stars >= 4.0 ? 'text-green-500' :
    stars >= 3.0 ? 'text-amber-500' :
    stars >= 2.0 ? 'text-orange-500' :
    'text-red-500';

  const label =
    stars >= 4.5 ? 'Prime time!' :
    stars >= 4.0 ? 'Excellent' :
    stars >= 3.5 ? 'Good' :
    stars >= 3.0 ? 'Fair' :
    stars >= 2.5 ? 'Moderate' :
    stars >= 2.0 ? 'Below average' :
    stars >= 1.5 ? 'Poor' :
    stars >= 1.0 ? 'Very poor' :
    'Unsuitable';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex ${colorClass}`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="fill-current" />
        ))}
        {partialStar > 0 && (
          <StarPartial percentage={partialStar * 100} className="fill-current" />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <StarEmpty key={`empty-${i}`} className="text-gray-300" />
        ))}
      </div>
      {showScore && (
        <span className="text-sm font-medium">
          {stars.toFixed(1)}/5
        </span>
      )}
      {showLabel && (
        <span className={`text-sm font-semibold ${colorClass}`}>
          {label}
        </span>
      )}
    </div>
  );
}
```

---

## ✅ Advantages of Star System

1. **Universal Understanding**: Everyone knows 5 stars = excellent
2. **Quick Scanning**: Visual pattern recognition (⭐⭐⭐⭐⭐ vs ⭐⭐☆☆☆)
3. **Emotional Connection**: Stars feel rewarding, percentages feel clinical
4. **Consistent Scale**: All factors use same 0-5 scale, easier comparison
5. **Mobile-Friendly**: Stars render well at small sizes
6. **Accessibility**: Can add aria-labels like "4.2 out of 5 stars"

**User Mental Model**:
- 5 stars = "I need to go fishing NOW"
- 4 stars = "Great conditions, plan a trip"
- 3 stars = "Worth trying if I have time"
- 2 stars = "Probably not worth it"
- 1 star = "Stay home"
