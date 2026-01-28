# Log Observation Screen Redesign

## Design Goals

Created for two distinct user perspectives that must coexist:

### 1. Parent Perspective (Years of Experience)
- **Fast capture** - Muscle memory for common observations
- **Compassionate language** - No judgment, every entry valued
- **Pattern recognition** - Quick phrases and remembered defaults
- **Low cognitive load** - Minimal required fields
- **Mobile-first** - One-handed logging during stressful moments

### 2. Researcher Perspective (Data Quality)
- **Structured data** - Consistent severity tracking
- **Complete context** - Duration, timing, circumstances
- **Longitudinal analysis** - Severity trends over time
- **Clear categorization** - Proper scoping for filtered analysis
- **Optional depth** - Rich detail when time permits

---

## Key Design Changes

### 1. Visual Event Type Selector

**Before:** Text-only pills, no visual hierarchy
**After:** Color-coded grid with icons and logical grouping

```
Critical Concerns (3 large cards)
⚡ Seizure | 🫁 Aspiration | 🦠 Infection

Daily Care (4 medium cards)
💊 Medication | 🍽️ Feeding | 😴 Sleep | 🤗 Comfort

More Types (collapsible)
🩹 Skin/wounds | 🏃 Mobility | 👁️ Vision | 📝 General
```

**Benefits:**
- **Parent**: Faster recognition, less reading required
- **Researcher**: Clear hierarchy of event significance

### 2. Severity Always Visible

**Before:** Optional severity, hidden until auto-save
**After:** Prominent severity selector with contextual help text

```
How significant was this?
[1 Minimal] [2 Mild] [3 Moderate] [4 Severe]
↓
"Helps track patterns over time"
```

**Benefits:**
- **Parent**: Remembers their typical severity per event type
- **Researcher**: 100% severity capture (currently ~0%)

### 3. Smart Context Toggles

**Before:** Hidden in "context markers" section
**After:** Always-visible emoji buttons

```
Context (optional)
[😴 After sleep] [💊 After medication] [🦠 While unwell]
```

**Benefits:**
- **Parent**: One tap to add important context
- **Researcher**: Structured trigger/circumstance data

### 4. Quick Phrases Library

**Before:** None - parents type the same phrases repeatedly
**After:** Event-specific common phrases

```
Quick phrases
[+ Brief myoclonic jerks]
[+ Settled after 5 minutes]
[+ Rescue medication given]
```

**Benefits:**
- **Parent**: Save 30-45 seconds per log, less typing fatigue
- **Researcher**: Consistent terminology across users

### 5. Inline Duration Field

**Before:** Hidden in optional details
**After:** Shown automatically for seizure/aspiration/sleep events

```
Duration (minutes) *
[____] e.g. 5
```

**Benefits:**
- **Parent**: Clear what's expected, no hunting for field
- **Researcher**: Critical data for severity assessment

### 6. Quick Mode / Detailed Mode Toggle

**Before:** Single "more options" expansion
**After:** User-controlled complexity level

**Quick Mode (default):**
- Event type
- Severity (required)
- Duration (if relevant)
- Context toggles
- Notes (optional)

**Detailed Mode:**
- All quick mode fields
- Timestamp backdate
- Explicit scope selection
- Larger notes field

**Benefits:**
- **Parent**: Fast logging 90% of the time, detail when needed
- **Researcher**: Optional structured fields available

### 7. Mini Trend Chart

**Kept from original:** Shows 7-day history for selected event type

```
Recent Seizures
▂▁▃▄▅▃▂ (sparkline)
```

**Benefits:**
- **Parent**: Immediate context - "More than usual this week"
- **Researcher**: Validates data quality

---

## Removed Features

### Auto-save after Severity Selection
**Why removed:**
- Created confusion about when the event was "done"
- "Add details" flow felt like fixing a mistake
- Unclear what was saved vs. not saved

**Replaced with:**
- Single "Save observation" button after all fields complete
- Clear validation (can't save without severity)

### "Nothing new to report"
**Why removed:**
- Rarely used in practice
- Can be logged as general/minimal severity event instead

---

## Information Architecture

### Field Hierarchy

**Tier 1 (Always Required):**
- Event type
- Severity

**Tier 2 (Shown for Relevant Events):**
- Duration (seizure, aspiration, sleep)

**Tier 3 (Always Available, Optional):**
- Context toggles
- Quick phrases
- Notes

**Tier 4 (Detailed Mode Only):**
- Timestamp backdate
- Explicit scope selection

---

## Expected Outcomes

### For Parents
- **50% faster** common event logging (30s → 15s)
- **Less typing fatigue** via quick phrases
- **Lower abandonment rate** (fewer incomplete logs)
- **Better long-term engagement** (less burdensome)

### For Researchers
- **100% severity capture** (up from ~0%)
- **Consistent duration data** for critical events
- **Structured context** (triggers, circumstances)
- **Longitudinal severity trends** for disease progression analysis

### For Clinical Teams
- **Richer handover data** when events escalate
- **Pattern recognition** via severity trends
- **Intervention effectiveness** tracking

---

## Mobile Optimization

All interactive elements meet WCAG 2.1 touch target minimums:
- Event type buttons: 48px min height
- Severity buttons: 48px min height
- Context toggles: 32px min height (acceptable for secondary actions)

---

## Accessibility

- **Keyboard navigation**: Full support via tab/enter
- **Screen readers**: Proper ARIA labels on all controls
- **Color independence**: Icons + text labels (not color-only)
- **Sufficient contrast**: All text meets WCAG AA

---

## Future Enhancements (Out of Scope)

1. **Voice logging**: "Log a moderate seizure, 5 minutes"
2. **Photo inline preview**: Show thumbnail before upload
3. **Rescue med quick-add**: Link to medication log
4. **Smart suggestions**: "You usually log feeding at this time"
5. **Offline indicator**: Clear visual when offline
6. **Keyboard shortcuts**: Power user hotkeys (S for seizure, etc.)

---

## Implementation Notes

- Severity defaults saved per event type in localStorage
- Quick phrases configurable per deployment
- Color scheme uses Tailwind color utilities for easy theming
- Form state preserved during online/offline transitions
- Compatible with existing event database schema

---

## Success Metrics

Track after 2 weeks of use:

1. **Time to log** (target: <20s for common events)
2. **Severity completion rate** (target: >95%)
3. **Abandonment rate** (target: <5%)
4. **Quick phrase usage** (target: >40% of logs)
5. **Detailed mode usage** (expect: ~10-15% of logs)
6. **Parent satisfaction** (survey)

---

## Rollout Strategy

### Phase 1: A/B Test (2 weeks)
- 50% users see new form
- 50% users see old form
- Compare completion rates and time-to-log

### Phase 2: Opt-in (1 week)
- Both forms available
- "Try new logging experience" banner
- Collect feedback

### Phase 3: Full Rollout
- New form becomes default
- Old form removed after monitoring period

---

## Related Documentation

- [Event Types Schema](../src/lib/event-types.ts)
- [Severity Tracking](../prisma/schema.prisma#L400)
- [Offline Sync](../src/lib/offline/sync.ts)
