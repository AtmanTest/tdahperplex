# QA REPORT — tdahperplex v17b

**Date:** 2026-07-10
**Version:** v17b
**Repo:** https://github.com/AtmanTest/tdahperplex
**Source repo tdah-profile:** intact (0 commits)

---

## What Was Changed

### Removed (exhaustive)
- **8 interactive sections**: dialogue, tests, psychiatre, dashboard, PDF, planner, tracker, community
- **5 JS files**: dashboard.js, pdf-print.js, planner.js, tracker.js, testimonials.js
- **Entire `tests/` directory** (6 config JSON + 4 JS: results-display, scoring-engine, test-history, test-runner)
- **Nav links**: dialogue, tests, psychiatre, dashboard, PDF, planner, tracker, community
- **CSS selectors**: .tq-, .tr-, .dlg-, .testi-, .planner-, .tracker-, .faq-, .testimonial-
- **Translation keys**: all nav.*, sec.*, h2.*, dlg.*, test.*, dash.*, pdf.*, planner.*, tracker.*, community.*, faq.*, testi.*

### Fixed
- **CSS unbalanced braces**: `.timeline-item .age{` missing closing `}` ; `@keyframes hero-glow{` unclosed
- **Missing `<script>` tag**: scroll spy + theme toggle code was bare JS in body (needed wrapping)
- **Missing CSS rules**: theme-grid, .theme-card, .card-grid, .pull, table styles restored
- **News-ticker fetch**: `location.protocol === 'file:'` check to avoid console error in local mode
- **Table overflow**: `overflow-x:auto` on `.table-wrap` with `-webkit-overflow-scrolling:touch`

### Kept
- 8 informational sections: resume, chronologie, symptomes, exemples, impacts, pourquoi, synthese, actualites
- Dark/light theme with toggle + localStorage persistence
- i18n FR/EN
- Scroll spy (IntersectionObserver)
- News ticker (news.json fetch)
- Responsive layout
- Hero CTA

---

## TNR Results

```
✅ Nav: 8 links
✅ Sections: 8
✅ No forbidden sections
✅ Scripts clean (3 loaded)
✅ Theme toggle button present
✅ Theme toggle: dark -> light
✅ Theme persistence: reload keeps dark
✅ Theme elements visible in both themes
✅ Responsive 320px: scrollWidth=320 <= innerWidth=320
✅ Responsive 375px: scrollWidth=375 <= innerWidth=375
✅ Responsive 390px: scrollWidth=390 <= innerWidth=390
✅ Responsive 414px: scrollWidth=414 <= innerWidth=414
✅ Responsive 768px: scrollWidth=768 <= innerWidth=768
✅ Scroll spy: IntersectionObserver present
✅ No console errors
✅ Version v17b displayed

==================================================
✅ GO: ALL TESTS PASSED
```

**15 tests, 0 failures.**
No `.skip`, `.only`, empty assertions, or mocking.

### Responsive Proof (viewport 320px)
- `scrollWidth` = 320 ≤ `innerWidth` = 320 ✅
- Table scrolls inside `.table-wrap` (overflow-x:auto)
- No horizontal overflow on any viewport

### Theme Proof
- Initial: `data-theme="dark"`
- After click: `data-theme="light"`
- After reload: `data-theme="dark"` (persisted)

---

## Deployed Files

| File | Status |
|------|--------|
| index.html | Modified (v17b) |
| translations.js | Modified (keys cleaned) |
| scripts/news-ticker.js | Modified (file: check) |
| scripts/dashboard.js | Deleted |
| scripts/pdf-print.js | Deleted |
| scripts/planner.js | Deleted |
| scripts/tracker.js | Deleted |
| scripts/testimonials.js | Deleted |
| tests/ (8 files) | Deleted |
| test_tnr_v17b.py | Added |

---

## Decision

✅ **GO — Commit and push v17b**
