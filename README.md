# Decision &amp; Risk Log

A single-file, offline-capable, browser-based tool for recording architecture
decisions (ADRs) and tracking a risk register across a project or team. Open one
HTML file in any modern browser. No server. No build. No install. Your data never
leaves the machine.

> **[Try the live demo](https://rjbethune.github.io/decision-risk-log/)** — runs in your browser, no install needed.

---

## What it does

Capture *why* the architecture is the way it is, and *what* might go wrong, as
durable records instead of tribal knowledge. Each decision keeps its context,
the options weighed, the choice made, and the consequences accepted, linked to
the decision it supersedes so you can see how the architecture evolved. Each
risk is scored likelihood times impact, plotted on a heat-map, and sorted so the
worst and the unowned surface first. When someone asks "show me your decisions
and your risk posture" for an audit or an ATO, one click produces the package.

It is built for engineering teams who need this as a durable, shareable,
auditable artifact, especially in environments where the data is sensitive and
cloud tools or installs are not an option.

## Quick start

1. **Download** [`decision-risk-log.html`](decision-risk-log.html).
2. **Double-click** to open in your browser. (Or visit the [live demo](https://rjbethune.github.io/decision-risk-log/).)
3. It loads with sample data so you can explore immediately. Press **?** for in-app help.
4. Press **Q** to quick-add your first real decision or risk.

When you're ready to keep your own log: click **Save** to write a JSON file as
your working document, then **Open** it next time. Every change also auto-caches
to localStorage as a safety net.

## Features

**Decisions (ADRs)**

- Structured records: context, options (mark the chosen one), decision, consequences, status, owner, decided and review dates, tags.
- Supersede chains: link a decision to the one it replaces; the old record is auto-marked Superseded with a back-link, and its prior status is preserved if you re-point the link.
- Decision timeline view that follows the supersede lineage, so you can read how the architecture changed its mind.
- Templates for recurring decision types (technology selection, vendor selection, security exception, architecture pattern) that pre-fill the form.

**Risks**

- Records scored likelihood times impact (1-5 each), color-coded by severity.
- Heat-map on a 5x5 grid; click a cell to filter the risks beside it.
- Sorted list surfaces the highest scores and any unowned risks first.
- Risk trend: snapshot the register (manually, or automatically once per day on save) and chart total score and high-risk count over time.

**Workflow**

- Needs-review surfacing flags decisions past their review date or unedited beyond 180 days, and open risks not updated in 90 days.
- Quick add (press `Q`) for two-minute capture; fill in the full record later.
- Saved views: name a filter and view perspective, stored in the file.
- Search across everything; status and tag filters.
- Deep links (`#decision=ADR-014`, `#risk=RISK-004`) jump to a record within the loaded file.

**Output**

- Audit / ATO package: summary, open high risks with owners, the full open register, accepted decisions of record, and a superseded-history appendix.
- Markdown export (decisions as ADR documents plus a risk register table).
- CSV export (decisions and risks), with a spreadsheet formula-injection guard.
- Print stylesheet: clean light-on-white, chrome hidden, briefing-ready.

**Data &amp; distribution**

- File-as-source-of-truth: open a JSON file, edit, save back to it (File System Access API in Chrome and Edge; download fallback in Firefox and Safari).
- Every change cached to localStorage.
- Malformed loaded files are sanitized on import so a bad file can't break the app.

**Accessibility**

- Landmark roles, labelled icon buttons, dialog semantics on the modal.
- Keyboard-operable navigation, filters, table rows, and matrix cells.
- Visible focus rings; status conveyed by color, icon, and text together.

**Keyboard shortcuts**

| Key | Action |
|-----|--------|
| `Q` | Quick add |
| `Ctrl+S` | Save working file |
| `Ctrl+O` | Open file |
| `Ctrl+P` | Print current view |
| `Esc` | Close dialog |

## Data model

A log is a JSON file with this shape:

```json
{
  "version": 1,
  "decisions": [
    {
      "id": "ADR-014",
      "title": "Adopt PostgreSQL over SQL Server for core ledger",
      "status": "Accepted",
      "context": "...",
      "options": [{ "text": "PostgreSQL", "chosen": true }],
      "decision": "...",
      "consequences": "...",
      "supersedes": "ADR-009",
      "supersededBy": "",
      "decidedBy": "A. Chen",
      "decidedAt": "2026-05-29",
      "reviewBy": "12 months",
      "tags": ["data", "infra"],
      "relatedRisks": ["RISK-002"],
      "updatedAt": "2026-05-29T..."
    }
  ],
  "risks": [
    {
      "id": "RISK-004",
      "title": "Unpatched XML parser CVE",
      "status": "Open",
      "likelihood": 5,
      "impact": 4,
      "description": "...",
      "mitigation": "...",
      "owner": "",
      "tags": ["security"],
      "relatedDecisions": ["ADR-012"],
      "updatedAt": "2026-05-..."
    }
  ],
  "snapshots": [],
  "savedViews": []
}
```

**Decision statuses**: Proposed, Accepted, Superseded, Rejected.
**Risk statuses**: Open, Mitigating, Accepted, Closed.
**Risk score**: likelihood times impact, 1 (lowest) to 25 (highest); 15+ counts as high.

## Browser support

| Browser | Open / Save in place | Open / Download | All other features |
|---------|---------------------|------------------|--------------------|
| Chrome  | ✓ | ✓ | ✓ |
| Edge    | ✓ | ✓ | ✓ |
| Firefox |   | ✓ | ✓ |
| Safari  |   | ✓ | ✓ |

The File System Access API (in-place save) is Chromium-only; in Firefox and
Safari the Save button downloads a new copy of the JSON, which you replace your
working file with manually. Every other feature works identically across browsers.

## Architecture

Single HTML file, three layers in one document: CSS design tokens with a dark
theme, semantic HTML with ARIA, and vanilla JavaScript with no framework and no
build. Two CDN dependencies (Font Awesome 6, Inter) load with CORS and degrade
gracefully when offline (system font, no icons).

Why one file? It is the simplest possible distribution: email it, drop it on a
share, host it on any static URL, double-click it. No `node_modules`, no
transpilation, no dependencies to keep current. You can read every line in one
file.

A Node smoke-test (`scripts/smoke-test.js`) loads the embedded script in a
sandbox and exercises scoring, supersede integrity, sanitization, stale
detection, snapshots, saved views, and exports, to catch regressions before
pushing.

## License

[MIT](LICENSE). Use it, fork it, embed it, customize it for your organization.

## Acknowledgments

A sibling tool to the [Enterprise Relationship Graph](https://github.com/RJBethune/enterprise-relationship-graph),
sharing its single-file, offline-first, file-as-source-of-truth design.
