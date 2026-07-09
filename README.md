# HabitTracker
A small habit tracker styled like a hand-stamped record book. Add habits, stamp today's page (or backfill any of the last 30 days), and watch your current and best streaks tick up. Everything is saved to localStorage, so your record persists between visits on the same browser.

## Features
- Add new habits from the "Open a new page" form
- 30-day calendar per habit, aligned to the actual day of the week
- Click any day to mark/unmark it complete (ink-stamp animation on mark)
- Current streak and best streak shown as brass/pewter seals
- Retire (delete) a habit with a confirmation prompt
- All data stored client-side in `localStorage` — no backend required

## Notes
- Data is stored per-browser (not synced across devices).
- Streak logic: your current streak keeps counting if you've marked today, or if you marked yesterday and haven't yet marked today (a small grace window before it resets).
