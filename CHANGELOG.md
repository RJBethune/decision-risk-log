# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-05-31

Initial release. A single-file, offline-capable tool for recording architecture
decisions (ADRs) and tracking a risk register, with no backend and no install.

### Decisions
- Structured decision records: context, options (with the chosen one marked),
  decision, consequences, status, owner, decided/review dates, tags.
- Supersede chains: linking a decision to the one it supersedes auto-marks the
  old record Superseded and maintains a back-link, with the prior status
  preserved so re-pointing a supersede restores it.
- Decision timeline view following the supersede lineage.
- Decision templates (technology selection, vendor selection, security
  exception, architecture pattern) that pre-fill the form.

### Risks
- Risk records scored likelihood x impact (1-5 each), color-coded by severity.
- Risk heat-map (5x5 grid); click a cell to filter the list beside it.
- Sorted risk list surfaces the highest scores and unowned risks first.
- Risk trend: snapshot the register (manually or automatically once per day on
  save) and chart total score and high-risk count over time.

### Workflow
- Needs-review surfacing: flags decisions past their review date or unedited
  beyond 180 days, and open risks not updated in 90 days.
- Quick add (press Q): two-minute capture of a decision or risk; full record
  filled in later.
- Saved views: named filter/view perspectives, stored in the file.
- Search across all records; status and tag filters.
- Deep links (#decision=ID / #risk=ID) jump to a record in the loaded file.

### Output
- Audit / ATO package export: summary, open high risks with owners, full open
  register, accepted decisions of record, and a superseded-history appendix.
- Markdown export (decisions as ADR docs + risk register table).
- CSV export (decisions + risks), with spreadsheet formula-injection guard.
- Print stylesheet: clean light-on-white, chrome hidden, briefing-ready.

### Data & distribution
- File-as-source-of-truth: open a JSON file, edit, save back in place
  (File System Access API in Chrome/Edge; download fallback elsewhere).
- Every change cached to localStorage as a safety net.
- Malformed loaded files are sanitized on import (coerced types, filtered
  snapshots/saved views) so a bad file can't break the app.

### Accessibility
- Landmark roles, labelled icon buttons, dialog semantics on the modal.
- Keyboard-operable navigation, filters, rows, and matrix cells.
- Visible focus rings; status conveyed by color + icon + text.

### Distribution
- Single self-contained HTML file.
- Two CDN dependencies (Font Awesome 6, Inter) loaded with CORS; degrades
  gracefully offline (system font, no icons).
