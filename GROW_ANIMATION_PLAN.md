# 🌱 Grow Daisy Animation Plan

## Overview

This document outlines a strategy for adding delightful, lightweight animations to the Grow Daisy gardening companion. All animations will respect `prefers-reduced-motion` and prioritise performance.

## Design Principles

### 1. **Gardening-Themed Micro-interactions**
Animations should feel natural and organic, like watching plants grow:
- Subtle sprouting motions for success states
- Gentle swaying for hover/focus states
- Leaf-fall patterns for deletions
- Water ripple effects for completions

### 2. **Performance-First**
- **Duration**: 150-300ms for most interactions
- **CSS First**: Use CSS transitions/animations where possible
- **Framer Motion**: Reserve for complex gestures (already used in Homepage SwipeCard)
- **GPU-accelerated**: Use `transform` and `opacity` only (no layout triggers)

### 3. **Reduced Motion Support**
- All animations must respect `prefers-reduced-motion: reduce`
- Provide instant state changes as fallback
- Use opacity fades instead of movement when reduced motion is preferred

---

## Current Animation Infrastructure

### Already in Use
| Pattern | Location | Usage |
|---------|----------|-------|
| `framer-motion` | `Homepage.tsx` | SwipeCard drag gestures |
| `transition-colors` | Most components | Hover state changes |
| `transition-transform` | Cards, buttons | Scale on hover |
| `animate-spin` | Loading states | Spinner icons |
| `animate-pulse` | Skeletons | Loading placeholders |
| CSS `@keyframes` | `windwave.css`, `Popup.css` | Weather animations, modals |

### Existing Reduced Motion Support
- `windwave.css`: `@media (prefers-reduced-motion: reduce)` disables weather animations
- `weather.tsx`: Uses `window.matchMedia('(prefers-reduced-motion: reduce)')`
- SVG icons: Inline reduced-motion media queries

---

## Proposed Animation System

### Phase 1: Foundation (hooks & utilities)

#### 1.1 Create `useReducedMotion` Hook
```tsx
// hooks/useReducedMotion.ts
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

#### 1.2 Extend Tailwind Config with Custom Animations
```javascript
// Add to tailwind.config.cjs theme.extend
animation: {
  'sprout': 'sprout 400ms ease-out',
  'leaf-fall': 'leafFall 500ms ease-in forwards',
  'water-ripple': 'waterRipple 600ms ease-out',
  'gentle-sway': 'gentleSway 2s ease-in-out infinite',
  'fade-in': 'fadeIn 200ms ease-out',
  'fade-out': 'fadeOut 200ms ease-in',
  'scale-in': 'scaleIn 200ms ease-out',
  'slide-up': 'slideUp 250ms ease-out',
  'slide-down': 'slideDown 200ms ease-in',
  'check-pop': 'checkPop 300ms ease-out',
},
keyframes: {
  sprout: {
    '0%': { transform: 'scaleY(0) translateY(20%)', opacity: '0' },
    '60%': { transform: 'scaleY(1.1) translateY(-5%)', opacity: '1' },
    '100%': { transform: 'scaleY(1) translateY(0)', opacity: '1' },
  },
  leafFall: {
    '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
    '100%': { transform: 'translateY(30px) rotate(45deg)', opacity: '0' },
  },
  waterRipple: {
    '0%': { transform: 'scale(0.8)', opacity: '0.8' },
    '100%': { transform: 'scale(1.5)', opacity: '0' },
  },
  gentleSway: {
    '0%, 100%': { transform: 'rotate(-1deg)' },
    '50%': { transform: 'rotate(1deg)' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  scaleIn: {
    '0%': { transform: 'scale(0.9)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  slideUp: {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  checkPop: {
    '0%': { transform: 'scale(0)' },
    '50%': { transform: 'scale(1.2)' },
    '100%': { transform: 'scale(1)' },
  },
},
```

#### 1.3 Add Reduced Motion Variant to Tailwind
```javascript
// Add to tailwind.config.cjs
plugins: [
  // Custom variant for reduced motion
  function({ addVariant }) {
    addVariant('motion-safe', '@media (prefers-reduced-motion: no-preference)');
    addVariant('motion-reduce', '@media (prefers-reduced-motion: reduce)');
  },
],
```

---

### Phase 2: Component Animations

#### 2.1 Task Completion (Homepage SwipeCard) ✅
**Already implemented** with framer-motion drag gestures.

**Enhancement**: Add celebratory micro-animation on complete:
- Checkmark icon pops in with `check-pop` animation
- Brief green flash on card background
- Card fades out smoothly

#### 2.2 Plant Added to Garden
**Trigger**: When user adds a plant via AddPlantDialog

**Animation**:
- Success toast slides up from bottom with `slide-up`
- Plant card in garden animates with `sprout` (grows from bottom)
- Optional: Confetti-like leaf particles (CSS-only, 3-4 leaves)

**Implementation**:
```tsx
// New plant card appears with animation
<div className="motion-safe:animate-sprout motion-reduce:animate-fade-in">
  <PlantCard plant={newPlant} />
</div>
```

#### 2.3 Plant Deleted from Garden
**Trigger**: When user removes a plant

**Animation**:
- Card fades and shrinks with `leaf-fall`
- Siblings slide to fill gap (CSS grid handles this naturally)

**Implementation**:
```tsx
// Deleting plant
<div className={cn(
  "transition-all duration-300",
  isDeleting && "motion-safe:animate-leaf-fall motion-reduce:opacity-0"
)}>
  <PlantCard plant={plant} />
</div>
```

#### 2.4 Dialog Open/Close
**Current**: Radix Dialog has built-in animations (data-state)

**Enhancement**: Add gardening-themed entry:
- Overlay fades in
- Content scales in from center with `scale-in`

**Implementation** (already supported by Radix):
```tsx
<DialogContent className="motion-safe:animate-scale-in motion-reduce:animate-fade-in">
```

#### 2.5 Threat Cards Interaction
**Trigger**: Hover/focus on threat cards

**Current**: Has `hover:scale-105` and `transition-transform`

**Enhancement**: Add subtle sway on focus for organic feel:
```tsx
<div className="motion-safe:focus-within:animate-gentle-sway">
  <ThreatCard />
</div>
```

#### 2.6 Bottom Navigation
**Current**: Static icons with background highlight

**Enhancement**: 
- Active icon has subtle pulse on tap
- Icon scales up slightly on active state

```tsx
<Link className={cn(
  "transition-transform duration-150",
  isActive && "motion-safe:scale-110"
)}>
```

#### 2.7 Weather Integration Card
**Trigger**: Weather data loads on grow pages

**Animation**:
- Cards stagger in with `slide-up` animation
- Each card delays slightly (50ms increments)

```tsx
{cards.map((card, i) => (
  <div 
    key={card.id}
    className="motion-safe:animate-slide-up"
    style={{ animationDelay: `${i * 50}ms` }}
  >
    {card.content}
  </div>
))}
```

#### 2.8 Loading States
**Current**: `animate-spin` on Loader2, `animate-pulse` on skeletons

**Keep as-is**: These are appropriate and already respect reduced motion implicitly.

---

### Phase 3: Success/Feedback Animations

#### 3.1 Task Completed Celebration
**Trigger**: User marks a care task complete

**Animation**:
- Checkmark icon pops with `check-pop`
- Brief green glow on task row
- Optional: Small water droplet emoji rises and fades

#### 3.2 Watering Reminder Acknowledged
**Trigger**: User acknowledges watering reminder

**Animation**:
- Water ripple effect emanates from tap point
- Uses `water-ripple` keyframe

#### 3.3 Plant Health Improved
**Trigger**: Plant threat level decreases

**Animation**:
- Heart or leaf icon pulses green
- Progress bar fills with smooth transition

---

## Implementation Priority

### High Priority (Do First)
1. ✅ Create `useReducedMotion` hook - **DONE** (`hooks/useReducedMotion.ts`)
2. ✅ Add custom keyframes to tailwind.config.cjs - **DONE**
3. ✅ Add motion-safe/motion-reduce CSS utilities - **DONE** (`styles/index.css`)
4. ✅ Plant added animation (sprout) - **DONE** (`GardenPage.tsx`)
5. ⏳ Task completion celebration (check-pop) - SwipeCard already has framer-motion

### Medium Priority
6. ⏳ Dialog open/close enhancements - Radix provides defaults
7. ✅ Plant deleted animation (leaf-fall) - **DONE** (`GardenPage.tsx`)
8. ⏳ Staggered card loading
9. ✅ Bottom nav active state animation - **DONE** (`GrowBottomNav.tsx`)

### Low Priority (Nice to Have)
10. Gentle sway on focus
11. Water ripple effects
12. Confetti leaves on major milestones

---

## Testing Plan

### Manual Testing
1. **Standard Motion**: Verify animations play smoothly
2. **Reduced Motion**: 
   - macOS: System Preferences → Accessibility → Display → Reduce motion
   - Browser DevTools: Rendering → Emulate CSS media feature `prefers-reduced-motion`
3. **Performance**: Check for jank on low-end devices

### Automated Testing
- Add Playwright test for reduced motion:
```typescript
test('respects reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/grow');
  // Verify no animations playing
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `hooks/useReducedMotion.ts` | NEW: Create hook |
| `tailwind.config.cjs` | Add keyframes, animations, variants |
| `components/grow/AddPlantDialog.tsx` | Add sprout animation on success |
| `components/grow/GardenPage.tsx` | Add delete animation, staggered load |
| `components/grow/Homepage.tsx` | Add task completion celebration |
| `components/grow/GrowBottomNav.tsx` | Add active state animation |
| `components/grow/ThreatCard.tsx` | Add focus sway animation |
| `styles/index.css` | Add any global animation utilities |

---

## Acceptance Criteria

- [ ] All animations are under 300ms (except gentle-sway)
- [ ] All animations use only `transform` and `opacity`
- [ ] `prefers-reduced-motion: reduce` disables all motion
- [ ] Reduced motion shows instant state changes (opacity only)
- [ ] No layout shift during animations
- [ ] Animations enhance UX without distracting from content
- [ ] Performance: 60fps on mobile devices

---

## References

- [Tailwind Animation Docs](https://tailwindcss.com/docs/animation)
- [Framer Motion](https://www.framer.com/motion/) (already in use)
- [prefers-reduced-motion MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.1 Motion Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
