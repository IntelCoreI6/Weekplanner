# Cascade Implementation Notes

## TODOimplement.md Feature Summary

### 1. Save System
- Save all user changes (events, settings, etc.)
- User can change iCal in settings
- Prompt for iCal/config on launch
- Backup/import options
- Ensure save files are in .gitignore

### 2. Badges, Streaks, Levels, Visual Progress, Confetti
- Track completed tasks, streaks, etc. (localStorage/backend)
- Show badges/levels in profile/dashboard
- Progress bars for goals
- Confetti animation for milestones (canvas-confetti)
- Playful UI: avatars, colors, animations

### 3. Drag-and-Drop Rescheduling
- Use react-beautiful-dnd or custom DnD for events
- Drag events to new times/days

### 4. Recurring Tasks
- Recurrence options in event modal
- Store rules, auto-generate instances

### 5. Attachments (Files, Links, Notes)
- Add file/link/note fields to event modal
- Store/display attachments

### 6. Analytics & Insights
- Track time spent, completed tasks, streaks
- Show charts (Chart.js, Recharts)

### 7. Integration & Import/Export
- Google/Outlook Calendar sync (OAuth)
- Export as PDF/CSV (jsPDF, FileSaver)
- Import via CSV/text parsing

### 8. Wellbeing & Balance
- Event types: break, meal, sleep
- Mood tracking (emoji/slider)
- Gentle reminders (breaks/hydration)

#### UI/UX Enhancements
- Profile/Stats dashboard
- Fun Mode toggle
- Color/animation for achievements

---

## Implementation Notes
- [ ] Start with Save System (core data model, persistence, settings)
- [ ] Document key decisions, libraries, and file locations here as features are added
- [ ] Add code snippets for tricky logic or important patterns

---

## Libraries to Consider
- Persistence: localStorage, IndexedDB, or backend API
- Drag-and-drop: react-beautiful-dnd
- Charts: Chart.js, Recharts
- Confetti: canvas-confetti
- Export: jsPDF, FileSaver
- Calendar Sync: Google/Outlook APIs

---

## Progress Log
- 2025-04-16: Created summary and notes file. Next: Implement Save System.
