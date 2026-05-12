# Phase Brief — {Phase Name}

> The orchestrator fills this in before dispatching the phase to a subagent via the Task tool. Paste the filled brief into the `prompt` field of the Task call.

## Goal

{One sentence: what does "this phase is done" look like at the highest level?}

## Files in scope

- {exact path}
- {exact path}

## Files OUT of scope (do not touch)

- {exact path}
- {pattern — e.g. anything under `server/`, anything under `src/shared/`}

## Constraints

- {e.g. no new dependencies}
- {e.g. inline styles only, no CSS files}
- {e.g. don't refactor existing X}
- {e.g. don't break Freeze Stars / M2 flow}

## Success criteria

- {testable / observable; one bullet per check}
- {e.g. `npm run typecheck` passes}
- {e.g. component renders without errors when X is true}
- {e.g. cast handler no-ops if a platform already exists}

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

Subagent-specific fields (when applicable) come *after* the four core sections — e.g. the `phone-puzzle-author` adds a `Manual check:` block; the `protocol-steward` adds a `Type diff:` block.

## Notes / context for the subagent

{Any links, design constraints, file-line references, or call-site info the subagent needs that isn't obvious from reading the codebase.}
