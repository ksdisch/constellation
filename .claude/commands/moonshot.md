---
description: Visionary/moonshot brainstorm — the inverted twin of /autonomous-milestone. Launches agent teams to generate BOLD, outside-the-box, forward-thinking ideas for evolving THIS project, kills the timid/derivative ones (and the incoherent fantasies), refines the survivors, and — only on your go-ahead — captures each as a docs/ideas vision doc + a linked backlog stub. Steers per run (tethered → off-leash). Project-agnostic; uses ultracode multi-agent orchestration.
argument-hint: [optional seed — theme/horizon/leash, e.g. "phone-player agency, off-leash, 5-year horizon"]
---

Seed (optional): $ARGUMENTS

You are running `/moonshot` — a **visionary brainstorm** engine. Its entire purpose is to generate
ideas, visions, and plans for evolving THIS project that are **ambitious, outside the box,
innovative, forward-thinking, bold, surprising, and reach-y** — then validate them, refine the
survivors, and (only on an explicit go-ahead) add them to the project's backlog.

It is the deliberate **inverted twin** of `/autonomous-milestone`'s brainstorm mode. That command
scores by impact/effort/risk and rewards safe, high-ROI wins. **This one flips the scoring
function**: the adversarial rounds kill ideas for being too **safe / derivative / timid /
incremental** — *never* for being too risky or too hard.

**Use multi-agent orchestration for the fan-out** — the **Workflow tool** (this command is your
explicit ultracode opt-in; no further permission needed) or inline `general-purpose` subagents with
the role rules embedded inline. Don't reference `.claude/agents/` by name — those are templates, not
resolvable subagent types.

| | `/autonomous-milestone` brainstorm | `/moonshot` |
|---|---|---|
| Scores by | impact / effort / risk | novelty / reach / surprise |
| Kills ideas for being | risky, vague, low-ROI | safe, timid, derivative |
| Asks | "what should we build next?" | "what could this become that no one expects?" |
| Output | one item → straight to Build | N vision docs + linked backlog stubs (you review first) |

---

## Orient  (always first — light, no fan-out)

Read the project; **don't assume a stack**. Auto-discover and skim: `CLAUDE.md` / `README`
(identity, tone, conventions), the backlog file (`BACKLOG.md` or equivalent), any roadmap/plan docs
and the ideas dir (`docs/ideas/` or equivalent), recent `git log`, and open issues (`gh issue list`
if a remote exists). Distill a ~10-line **soul brief**: what this project fundamentally *is*, its
core loop/value, who its user is, and 4–6 load-bearing assumptions you can infer (these are what the
lenses get quota'd to break). Put the existing backlog + ideas titles in the brief so the team can
self-censor anything already shipped, planned, or shelved. If the brief is large, write it to a
scratch file so subagents read it instead of re-deriving it.

## Steer  (you + me — light, no fan-out)

Open with ONE `AskUserQuestion` (prefill from the seed above if given), echo a one-line steering
summary, and **confirm before any fan-out**:

- **A. Leash** — how far outside the project's current identity may ideas reach?
  - *Tethered (Recommended)* — bold & surprising, but still unmistakably **this** project; soul inviolable.
  - *Long leash* — may drift into adjacent domains, platform shifts, new user relationships (flag each as an identity-shift).
  - *Off-leash* — pivots, forks, reinventions; anything goes (survivors clearly marked speculative).
- **B. Theme / horizon (optional)** — any emphasis to push on, and the time horizon: next feature → next version → the 5-year vision. **Horizon scales the seed test** (below).
- **C. How many survivors** — default 3.

⚠️ Be honest: **the tethered default is the *least* bold mode.** On *off-leash*, take a genuinely
different path — relax soul-fit and allow seeds that require new infrastructure, don't just relabel
the same pipeline.

## Diverge  (heavy — bounded, single blind round)

Run **6 lenses by default (9 max)** in parallel, **blind to each other** (independence is what
guarantees spread; if they see each other they anchor and converge). Each lens is a different
*transform on the project*, not a different topic — written in project/user/value terms (game
phrasings below are illustrative; adapt to what you oriented on):

1. **Futurist** — project 3–5 years out, after the field around it has moved: what must it *become* to still matter?
2. **Contrarian-Inverter** — take a load-bearing assumption and flip it; remove the thing you'd "never" remove.
3. **Domain-Transplant** — steal the central pattern of an unrelated domain (a spreadsheet, a message queue, a social feed; *e.g. for a game:* a rhythm game, a roguelike) and graft it on — what hybrid emerges?
4. **Constraint-Killer** — name the single hardest limit (technical / social / economic / attention); assume it vanished; what becomes designable that nobody builds because they assume the wall?
5. **First-Principles-Rebuilder** — rebuild from zero knowing only the goal; where is today's shape just historical accident?
6. **Emotional-Core-Amplifier** — what feeling or core value is this *secretly* about? Deliver it at full intensity — louder, rarer, more earned.

**Divergence rules (every lens obeys):**
- Produce **2–3 visions**; **≥1 must explicitly break a stated assumption** (name which).
- Each vision must name **what is new IN KIND** — a new verb the project can't do today, a premise shift, an inverted assumption — *not* "more / bigger." Strip the scope words ("more, bigger, also, at scale, 10x"); if nothing of substance remains, it's inflation → drop it. *(This is the "visionary or just bigger?" test, applied at birth.)*
- Self-test: "would a veteran of this domain *flinch*?" If every idea is comfortable, the round is too safe — push the thinnest lenses once more.

Then, **on the main thread** (cheap): **dedup on the bold-move axis** — two ideas that break the
same assumption the same way are one idea; keep the stronger. Ensure the pool spans **≥3 lenses**.
(Optional: merge two ideas into a hybrid *only if* it's bolder than both parents **and** carries its
own seed; otherwise keep the parents — never ship the safe midpoint.)

## Validate  (heavy — the flipped, two-sided gate)

Run **independent skeptics**: batch ideas (~3–5 per call, **never one agent per idea**) and **never
show one critic another's verdict** (consensus kills the outliers you want). Three lenses, in
deliberate tension:

- **Too-Timid critic (`opus`)** — KILLS safe/derivative/incremental: "already a backlog item with a bigger number," "a feature, not a vision," "any competent team ships this anyway," "just turns a dial."
- **Incoherent-Fantasy critic (`opus`)** — KILLS ungrounded grandiosity: "what's the actual first step?", "a different project wearing this one's name," "magic words, no mechanism."
- **Soul-Keeper (`sonnet`)** — repo-grounded; flags soul-fit and **auto-kills literal duplicates** of an existing backlog/ideas item (name which).

An idea **survives only if it clears BOTH the Too-Timid AND the Incoherent-Fantasy critic** — too
bold to dismiss as incremental, too grounded to dismiss as fantasy. That two-sided gate carves the
narrow **ambitious-but-reachable** band this command exists to find.

**Two non-negotiables — put both verbatim in every critic's inline prompt:**
1. **Risk / effort / ROI / "too hard" / "no resources" objections are INADMISSIBLE.** Those are the *virtues* this command hunts for. If a critic's only objection is risk or effort, discard the objection and keep the idea. Risk is a reason to seed small, never to kill.
2. **Credible seed — scaled to the horizon.** Every survivor must name a believable **first wedge**. Near-term horizon → a small concrete change to a real file/area in *this* codebase, shippable in ~one sitting. Multi-year horizon → the first step may itself be substantial; judge "is the first step *believable*," not "is it small" (do **not** kill long-horizon moonshots for lacking a one-sitting wedge). No credible path at all = fantasy → cut. (A "killer first experiment" is a nice-to-have, not required — don't let it become boilerplate.)

**No numeric scoring** — a weighted composite is false precision and invites fabricated decimals.
Judge against the bold-bet bar qualitatively. Keep the **N survivors** the steering asked for. If
fewer than N clear both gates, **say so and stop** — never promote timid filler to hit the quota.
**Counter-pressure:** always keep the single *boldest* survivor even if it's borderline on a gate
(the wildcard) — so the output isn't uniformly the safe-bold midpoint.

## Refine  (moderate — 1 `opus` pass per survivor; 2 max only with a stated reason)

Steelman each survivor — strengthen it against the critics' surviving objections by making it **more
itself, not safer** (if sharpening it makes it more incremental, you sharpened it wrong). For each:
**name the bet** (the one thing that must be true for it to be worth it), **pin the first wedge** to
a real file/area, and **pre-fill the vision-doc fields** so Capture starts warm.

## Synthesize  (you + me — HARD STOP before any write)

Present every survivor inline as a **bold-bet card** (the inverse of the impact/effort/risk case):

- **What it is** — one concrete sentence.
- **The bold bet** — which assumption it flips/extends; what would make a veteran flinch.
- **Why now** — what about the current project state makes this timely.
- **Credible first step** — the smallest believable move that proves it's real (scaled to horizon).
- **Soul fit** — tethered / stretch / identity-shift; if it shifts, name what changes in what-this-project-IS.
- **What it changes** — the part of the project's core experience/value that gets rewritten.

Flag if two survivors could merge into something bolder. Then ask **which to write up — one /
several / all / none.** Adding to the backlog is the deliverable, but it's a **review-first** write:
**do not write any file before this go-ahead.** A blanket prior approval doesn't count — this run
needs its own. "None" ends the run cleanly (ideas stay in chat).

## Capture  (light — only after explicit go-ahead)

For each approved survivor:

1. **Vision doc** → the ideas dir. Auto-discover: `docs/ideas/` → else `docs/` / `notes/` / `ideas/`
   → else create `docs/ideas/` and say so. **If an ideas doc already exists there, mirror ITS section
   shape**; otherwise use this default:
   `# <Title>` · **Status:** Idea — not committed. Added by /moonshot on `<date>`. · **Premise** ·
   **The bold bet** · **Decisions / open questions** · **Credible first step** · **Dependencies** ·
   **Explicitly out of scope (revisit later)** · **Identity/positioning note** (tethered → "none";
   else name what shifts in what-this-project-is). Filename: `<kebab-title>.md`.
2. **Backlog stub** → append under `## Open` only (**never edit existing items**). Auto-discover the
   backlog file (`BACKLOG.md` → else `TODO.md` / `ROADMAP.md` / `docs/backlog.md` → else propose
   creating `BACKLOG.md` and confirm). Always type **`[Exploration]`**, **Size: L**:
   ```
   ### [Exploration] <Title>
   - **Why:** <the bold bet, one sentence>. See [`docs/ideas/<kebab-title>.md`](docs/ideas/<kebab-title>.md) for the full vision.
   - **Acceptance:** Prototype the credible first step and judge whether the bet holds.
   - **Size:** L
   - **Added:** <YYYY-MM-DD>
   ```

**Report** every file written (absolute paths) + any auto-discovery fallback chosen — the report
should be the only thing I need to read to know what landed.

---

## Token discipline & fan-out ceiling

- **Orient + Steer:** light, no fan-out. **Diverge:** the wide-but-shallow spend — 6 lenses default (9 max), 2–3 paragraph-seeds each, **single blind round**, no recursive spawning. **Validate:** `opus` only where the blade is load-bearing (the two killing critics), `sonnet` for the Soul-Keeper; critics **batched to ≤3 calls total**. **Refine:** 1 `opus` pass per survivor (2 max, with a reason). **Capture:** `sonnet` formatting only.
- **Default-run ceiling: ≤ ~6 lens + ≤3 critic + N refine subagents** (~12 calls, most on `opus` only where novelty/verdicts are won). **State the actual count when you launch.**
- Keep the main thread lean: subagents return **compact cases, not transcripts**; write large intermediates to a scratch file; `/compact` at the **Validate → Refine** and **Synthesize** seams.

## Autonomy boundary

- ✅ **Without asking:** read anything, run `git` / `gh` to orient, spawn the brainstorm/critique subagents, present the interview and the cards.
- ⛔ **Never without an explicit per-run go-ahead:** write to the ideas dir or backlog file; create `docs/ideas/` or `BACKLOG.md`; commit, push, or open a PR.
- ⛔ **Never:** merge to `main`; edit existing backlog items (append only); write to production anything.
