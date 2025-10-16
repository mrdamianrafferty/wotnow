# Theme Color Override Fix

## Problem
DaisyUI theme was overriding Tailwind color classes, causing white-on-white rendering issues in components.

## Solution
Use inline `style={{ color: 'hex-value' }}` instead of Tailwind color classes to bypass theme overrides.

## Pattern

### ❌ Before (Theme can override)
```tsx
<button className={`${isActive ? 'text-cyan-600' : 'text-gray-500'}`}>
  <Icon />
</button>
```

### ✅ After (Explicit colors)
```tsx
<button style={{ color: isActive ? '#0891b2' : '#6b7280' }}>
  <Icon />
</button>
```

## Color Reference

### Go Daisy Branding Colors
- **Active/Primary**: `#0891b2` (cyan-600)
- **Inactive/Secondary**: `#6b7280` (gray-500)
- **Hover**: `#374151` (gray-700)
- **Error/Danger**: `#dc2626` (red-600)
- **Success**: `#10b981` (green-500)
- **Blue (Day Tabs Active)**: `#3b82f6` (blue-500)

### When to Use This Pattern
1. **Bottom Navigation** - Icons and labels need consistent colors
2. **Day Tabs** - Active/inactive states need proper contrast
3. **Any component** where Tailwind classes resolve to white/invisible colors
4. **Theme-independent components** that should look the same regardless of theme

### Example: Bottom Navigation Fix
```tsx
// components/BottomNav.tsx
<button
  style={{
    color: isActive ? '#0891b2' : '#6b7280',
  }}
  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors hover:opacity-80"
>
  <Icon size={24} strokeWidth={2} />
  <span className="text-[10px] font-medium">{item.label}</span>
</button>
```

### Example: Day Tabs Fix
```tsx
// pages/activities.tsx - DayTabs component
<button
  style={{
    backgroundColor: activeDay === idx ? '#3b82f6' : '#f8f9fa',
    borderColor: activeDay === idx ? '#3b82f6' : '#e5e7eb',
    color: activeDay === idx ? '#ffffff' : '#374151',
  }}
  className="day-tab-base" // Use for layout/spacing only
>
  <div className="text-center">
    <div>{getDayLabel(day.date, idx, serverTime)}</div>
    <div>{day.temperature}°</div>
  </div>
</button>
```

## Benefits
1. ✅ **Predictable** - Colors render exactly as specified
2. ✅ **Theme-independent** - Works with any DaisyUI theme
3. ✅ **High contrast** - Ensures readability
4. ✅ **Maintainable** - Centralized color reference in this doc
5. ✅ **Accessible** - Proper color contrast ratios

## Alternative Approaches Considered
1. ❌ Modify DaisyUI theme - Too invasive, affects entire app
2. ❌ CSS `!important` - Hard to maintain, specificity issues
3. ❌ CSS modules - More setup, doesn't solve root issue
4. ✅ **Inline styles** - Simple, explicit, works everywhere

## Files Modified
- `components/BottomNav.tsx` - Bottom navigation icons and labels
- `pages/activities.tsx` - Day navigation tabs (pending)
- *(Add more as needed)*

## Testing Checklist
- [ ] Mobile view shows all icons clearly
- [ ] Active state uses primary color
- [ ] Inactive state uses gray
- [ ] Hover states work properly
- [ ] Text is readable on white background
- [ ] Works on both light and dark modes (if applicable)

---

**Last Updated**: October 16, 2025  
**Author**: GitHub Copilot + Damian  
**Commit**: 3fc760c7 (BottomNav fix)
