# Phase Brief — {Phase Name}

> The orchestrator fills this in before dispatching the phase to a subagent via the Agent tool. Paste the filled brief into the `prompt` field of the Task call, AFTER the embedded role prompt (`HARD RULES — self-enforce`).

## Dispatch metadata

- **Scope ID:** {kebab-id}
- **Audit:** {absolute path to docs/scopes/<scope-id>/audit.md}
- **Brief:** {absolute path to docs/scopes/<scope-id>/brief.md}
- **Binding ADRs:** none (this repo has no ADR convention)
- **Blast radius (Phase 6 / pr-shipper dispatch only):** {low | medium | high}

## Goal

{One sentence: what does "this phase is done" look like at the highest level?}

## What to do this phase

{Copied VERBATIM from the audit's "Affected files" table, filtered to this specialist's scope. One bullet per file with the Action and Notes columns.}

- `src/...` — Create / Edit / Rename / Delete — {summary}
- `src/...` — Create / Edit / Rename / Delete — {summary}

## Files OUT of scope (do NOT touch)

{Copied from the specialist's scope-lock block. Defense in depth.}

- {pattern — e.g. anything under `server/`}
- {pattern — e.g. anything under `src/shared/` unless you are the protocol-steward}
- `BACKLOG.md`, `CLAUDE.md`, anything under `.claude/`

## Constraints (always)

- Inherit `CLAUDE.md` conventions.
- TypeScript strict mode — no `any`, no unused locals/params.
- No new dependencies.
- Inline styles only on the phone side (no CSS files / frameworks).
- Don't add tests yet (per project hard rule).
- Don't refactor existing working code unless the audit explicitly required it.
- Don't break Freeze Stars.
- Don't commit, don't push, don't touch `BACKLOG.md`.

## Constraints (scope-specific)

{Anything from the brief that pins down decisions the audit didn't already enumerate. Often empty.}

## Success criteria

- {testable / observable; one bullet per check}
- `npm run typecheck` passes.
- {scope-specific bullet from the brief's Acceptance section}

## Return format

The subagent must return its work in this structured shape:

```
Done:
  - <what landed>

Changed files:
  - <path:line — change summary>

Open questions:
  - <anything that needs orchestrator or user input>

Next recommendation:
  - <what should happen next>
```

Subagent-specific addenda (when applicable) come *after* the four core sections:
- `phone-puzzle-author` adds a `Manual check:` block (what the user sees when they reload the phone URL).
- `protocol-steward` adds a `Type diff:` block (before/after of any modified type).
- `auditor` adds a `Blast radius:` block.
- `smoke-runner` adds `Typecheck output:` + `Build output:` + `Manual smoke checklist:` blocks.
- `pr-shipper` adds branch / commit / push / PR status fields.

## Notes / context for the subagent

{Any links, design constraints, file-line references, or call-site info the subagent needs that isn't obvious from reading the codebase. Pull from the brief's "Notes / context" section if present.}
