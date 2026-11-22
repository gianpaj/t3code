# Priority inbox and thread stars

2026-11-22 · Implementation plan based on `main` at `1e78f37618`

The sidebar should help one engineer find work they can move forward across projects. An agent
finishing a turn, the engineer seeing the result, and the engineer handling the work are
separate events. An open PR can still need a decision after its thread has been read.
[Research on agent oversight and review](https://arxiv.org/html/2606.05391v1#S4)

## User-visible behavior

- Split the flat Active list into **Priority** and **Everything else**. Both start expanded,
  show matching counts when collapsed, and use the same header and chevron behavior as
  **Working** and **Settled**. Remember each section’s expansion on the device. Pinned, Working,
  Snoozed, and Settled keep their existing roles. The alternate project-folder layout keeps its
  project grouping.
- Show three project shortcuts using the first three available groups in the existing project
  order. Keep all three visible while the engineer selects projects. The far-right searchable
  picker and the shortcuts update one multi-selection. Clearing it restores all projects.
  **Unread** and **Read** narrow the active and pinned rows by the existing completion cue.
  **All** also shows the shelves. The gray **Starred** toggle selects threads with any star and
  combines with the project and read filters. Green, yellow, and blue are visual choices with
  equal weight.
- Add one star button immediately before the **Snooze** clock. An unstarred row shows the
  outline on hover or keyboard focus. A starred row keeps the filled icon at rest, in the same
  position it occupies on hover. Click to cycle off → green → yellow → blue → off. The
  accessible label names the current color and the next action. Touch users can cycle the star
  through the existing thread menu. Starring leaves visit state, priority, pinned order, and
  settlement alone.
- Use the row shipped on current `main`, including its status, activity timestamp, environment
  metadata, and separate provider and PR glyphs. Keep **Mark unread**, Snooze presets, Settle,
  and their existing behavior. The last-navigation timestamp and any redesign of row metadata
  are separate work.

## 1. Add a durable star

- Add nullable `starColor` to thread state and the shell projection in
  [orchestrationV2.ts](../packages/contracts/src/orchestrationV2.ts). Use one absolute-value
  command through the existing orchestration dispatch, following the event and projection path
  used by thread tags. Keep the color as one typed value so changing it takes one write. Missing
  fields decode as unstarred. The command has no effects and leaves `updatedAt` and the visit
  watermark untouched. [Orchestrator](../apps/server/src/orchestration-v2/Orchestrator.ts) ·
  [Projection store](../apps/server/src/orchestration-v2/ProjectionStore.ts)
- Persist one star per thread in its owning environment so the engineer sees the same color
  from web, desktop, and mobile. Use environment-scoped thread keys and the existing operation
  permission and command receipt mechanisms. Gate the write on destination support and scope.
  Read-only clients display existing stars. Older servers still show their threads and can use
  the other filters. Use the shared thread command path across clients.
  [Shared commands](../packages/client-runtime/src/operations/commands.ts) ·
  [Client thread model](../packages/client-runtime/src/state/models.ts)
- Apply the latest chosen color immediately. Serialize writes for the same scoped thread,
  reconcile with the shell, and restore the acknowledged color if the latest write fails. A
  retry sends the same value with the same command ID. Preserve the star when a thread moves
  between shelves. When an engineer clears a star in Starred, remove the row from the filtered
  list and keep keyboard focus in the list or on the filter.

## 2. Derive Priority from the active list

- Start with the existing partition and order. Within Active, promote threads with an explicit
  pending approval or answer request and threads with a known open PR attached, including drafts.
  Use canonical PR links and their projected state, including the existing branch-associated
  fallback where it identifies that thread’s PR. With multiple PRs, one known open PR is enough.
  A missing or unknown PR state supplies no priority signal. Put pending requests first in
  Priority, then use the existing order for open PRs. Draft status alone leaves that order intact.
  [Sidebar partition](../apps/web/src/components/Sidebar.tsx) ·
  [Shared inbox state](../packages/client-runtime/src/state/threadInbox.ts) ·
  [Canonical PR helpers](../packages/client-runtime/src/threadPullRequests.ts)
- An ordinary completion stays in Everything else with its existing unread cue. Opening the
  thread or marking it unread updates the cue and its read-filter membership. Priority still
  follows the pending request or open PR. The last attached PR merging or closing removes the PR
  reason for Priority. The engineer can snooze an open PR thread. It stays in Snoozed until it
  wakes, then the list evaluates priority from its current state. Keep Settle and configured
  automatic settlement behavior. Use the existing keep-PR-threads setting when testing the
  experience of keeping open PRs visible over time.
  [Visit tracking](../packages/client-runtime/src/state/threadVisits.ts) ·
  [Settlement service](../apps/server/src/orchestration-v2/ThreadSettlementService.ts)
- Show up to five Priority rows by default when expanded. Show a count for the full filtered
  group and **Show more** for the remaining rows. Each thread has one row. Apply all active
  filters before counting. Reuse the existing older-Settled query for starred history and apply
  the star predicate to its page and count, so a thread stays findable after it leaves the
  initial shell window. [Older settled queries](../packages/client-runtime/src/state/olderSettledThreads.ts)

## 3. Wire the clients to the same behavior

- **Web and desktop.** Extend the existing collapsible section header and list markers. Add both
  toggles to the sidebar expansion key so a click behaves like collapsing Working or Settled.
  Keep row keys stable and use the current quiet shell reads. The priority groups are display
  sections within Active. Preserve the existing pin and shelf drop actions and the manual order
  used by the non-inbox arrangement. Thread jumps follow visible rows. Direct navigation from
  history, the palette, and links still reaches a filtered or collapsed thread.
  [Section headers](../apps/web/src/components/sidebar/SidebarListMarkers.tsx) ·
  [Thread row](../apps/web/src/components/sidebar/SidebarThreadRow.tsx) ·
  [Route reveal](../apps/web/src/components/sidebar/routeReveal.ts)
- **iOS and Android.** Use the same grouping, color cycle, and filter predicates in Home and the
  expanded workspace sidebar. Reuse native section headers and the existing project scope and
  row menu. Fit the quick filters into the native toolbar, with the full project picker
  available on compact screens. Check that a star survives switching between phone and desktop
  against the same environment.
  [Native list layout](../apps/mobile/src/features/threads/threadListV2.ts) ·
  [Home](../apps/mobile/src/features/home/HomeScreen.tsx) ·
  [Workspace sidebar](../apps/mobile/src/features/threads/ThreadNavigationSidebar.tsx)
- **Recent upstream changes to preserve.** `1e78f37618` keeps script-only drafts reachable above
  thread rows. Apply the inbox groups to saved threads and preserve draft visibility and
  navigation. `cd3a57ac72` put environment metadata on the web row. `bcb9217e8e` corrected
  scroll and list motion during settlement. `77d299cc1c` fixed removal when the last PR closes,
  which is a useful transition case for Priority. `d5497d66cc` batches thread catch-up after
  reconnect. Derive grouping from the resulting shell snapshot.

## Verification and follow-up experiment

- Extend focused shared tests for the color cycle, mixed-version snapshots and deltas,
  eligibility, combined filters, and stable grouping when a thread’s read state changes. Cover
  open draft eligibility, open → merged or closed, two linked PRs with one still open, a pending
  approval, and an open PR thread being snoozed and returning. Extend server tests for command
  permission, retry, projection replay, and starred-only settled pagination.
- Verify in an isolated web or desktop client and in the native client. Cover collapse and
  reopen, a narrowed project scope, gray filter on and off, filled star at rest, keyboard and
  touch, Mark unread while viewing a thread, Snooze opening beside the star, route reveal, mixed
  environments, and a large list of old settled threads. Run focused tests and the changed-file
  check before shipping. Add translations for the new controls and a short entry in the
  [thread sidebar guide](../docs/user/thread-sidebar.md).
- Use the deterministic rules as a baseline. Then test the Decisions API on completed turns with
  no explicit priority signal. Key each suggestion to the completed run so rereads and
  reconnections leave it stable. Compare suggestions with the engineer’s assessment and retain
  the baseline when classification is unavailable. Treat weekly goals as a later input if the
  review suggests they would improve routing.
- In a pilot, track the age of PRs that are still open and time from opening to disposition.
  Report merges and deliberate closes separately and review a sample for quality. Record first
  thread opens as a diagnostic. Check whether important drafts spend too long behind the first
  five rows, and whether threads waiting on CI occupy slots the engineer could use to finish
  other work. Use those cases to refine ordering within Priority.
