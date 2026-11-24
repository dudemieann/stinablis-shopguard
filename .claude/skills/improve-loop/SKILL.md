---
name: improve-loop
description: Runs a bounded multi-agent review, fix, and QA verification loop on Stinablis ShopGuard (max 3 rounds).
disable-model-invocation: true
---

# Improve loop (maximum 3 rounds)

Run this when the user types `/improve-loop` or asks to run the improve-loop workflow.

Notes from the user or founder for this run: $ARGUMENTS

Use three specialist agents: `shop-ux-reviewer` (reviews, read-only), `shopguard-builder` (the only one that edits), and `browser-qa` (runs the Chromium suite). Keep the main conversation clean: pass each agent only what it needs and report back short summaries.

For up to **3 rounds**:

**Step A. Review and test in parallel.**
Start `shop-ux-reviewer` and `browser-qa` in the same turn, on the current repo state. Give `shop-ux-reviewer` any notes from above.

**Step B. Stop check.**
If `browser-qa` reports 100% passing AND `shop-ux-reviewer` returns `STATUS: CLEAN` (zero Critical and zero Medium issues), STOP at once. Report that ShopGuard is ready, then go to Step E only if there are uncommitted changes (for example updated agent memory notes).

**Step C. Fix.**
Otherwise, send the combined Critical and Medium findings, the exact failing test lines, and any founder notes to `shopguard-builder`. It fixes only what it is given. Minor issues are listed for the user, not fixed.

**Step D. Verify.**
Re-run `browser-qa`. Re-run `shop-ux-reviewer` too if any visible text or layout changed. Go back to Step B. Never start a 4th round.

**Step E. Wrap up (only when `browser-qa` is 100% passing).**
1. Update `README.md` if features or wording changed.
2. Commit all changes, including updated `.claude/agent-memory/` notes, as ONE commit whose message says what each agent caught and fixed (reviewer findings, QA failures, builder fixes).
3. Push to the current branch with `git push -u origin <current-branch>`, retrying network errors up to 4 times with backoff.

**If issues still remain after round 3, stop.** Do not commit broken work as finished. Tell the user what is left (short list with the exact failing lines or issues) and ask how they want to proceed.
