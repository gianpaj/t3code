# Agent Note: Reversible pin replacement in the Thread stars beta

Status: proposed — Implemented on the feature branch for beta testing.

## Problem

Engineers trying Thread stars need to keep their shortlist and recover its order when they return to pins. The same thread can be open in clients with different beta settings.

## Proposal

A pin supplies a green star when `starColor` is absent. An explicit color or clear overrides it. The beta uses the saved pin order for inherited threads and appends other starred active threads in active order. Toggling the beta leaves thread data untouched. Settling from the beta preserves the pin so the inherited star stays findable in Settled.

Dragging within Starred saves a separate `starOrderKey`. The saved star order precedes the default pinned and active order. Project and read filters hide rows from the drag surface. A drop uses the complete Starred order so hidden threads keep their relative order. Clearing the star clears its order key.

Home and the expanded workspace sidebar share the native beta preference and selection. A phone can try stars while a desktop continues using pins. The server owns each thread’s star, and the native list requests starred-only Settled pages when the filter is on.

## Alternatives considered

- A one-time pin conversion would rewrite the thread list for every client and require a snapshot to recover the original order.
- A Starred filter alone would require the engineer to look for the shortlist on first enable.
- Reusing pin order keys for drag would apply beta changes to the saved Pinned shelf.

## Acceptance criteria

Toggling off restores the Pinned shelf and its order. Toggling back on restores star edits, including cleared inherited stars. The same star predicate drives row display, history counts, and history pages.

Web and desktop can drag to reorder within Starred. Native clients display the saved order from the same environment.

## Risks

A client outside the beta can still edit shared pins. Older servers that omit explicit clears in shell reads need an update for a cleared inherited star to stay cleared.
