# WotNow Homepage & Card Restoration Report

## What Was Wrong
- The homepage (`index.tsx`) was not using the shared `Card` component for hero/activity cards or activity lists, resulting in inconsistent markup, styling, and lost functionality.
- Popups for activities lacked rich content (messages, reasons, marine data) and were not using the correct payload structure.
- Markup and class names were jumbled, not matching `Card.css`, causing poor visual alignment and broken styles.
- Activity lists (perfect/good/indoor) used custom markup instead of the reusable Card, leading to code duplication and inconsistent behavior.

## How It Was Fixed
- Audited and compared the homepage and Card component markup, class names, and props.
- Refactored the homepage to use the `Card` component for hero/activity cards, passing all required props and restoring popup payload logic.
- Refactored activity lists to use the `Card` component for each activity, ensuring consistent styling and popup logic.
- Verified that all popups now receive rich content (messages, reasons, marine/more data) and that all cards use the correct CSS classes.
- Ensured the homepage markup aligns with `Card.css` and restored lost visual and functional features.

## When/Why It Went Wrong
- The homepage was previously refactored or rewritten without reusing the shared Card component, possibly during a migration, redesign, or merge conflict.
- Markup and logic drifted from the original, causing loss of features, inconsistent styles, and broken popups.
- Lack of clear separation between shared UI components and page-specific markup led to code duplication and divergence.
- Insufficient code review or automated UI tests allowed regressions to go unnoticed.

## Lessons Learned & Prevention
- **Always use shared UI components for repeated patterns (cards, popups, lists) to ensure consistency and maintainability.**
- **Audit and compare markup/class names after major refactors or merges to catch regressions early.**
- **Write automated UI tests for critical user flows (homepage, popups, cards) to detect lost functionality and styling.**
- **Document component usage and enforce it in code review (e.g., homepage must use Card for all activity cards).**
- **Keep backup copies of old code and maintain a changelog for major UI/logic changes.**
- **Regularly review and update CSS to match component markup, avoiding drift.**

---

This restoration ensures the homepage and activity cards are visually and functionally consistent, maintainable, and resilient to future code loss.
