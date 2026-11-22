# Agent Note: Reversible pin replacement in the Thread stars beta

Status: proposed — Implemented on the feature branch for beta testing.

## Problem

Engineers trying Thread stars need to keep their shortlist and recover its order when they return to pins. The same thread can be open in clients with different beta settings.

## Proposal

A pin supplies a green star when `starColor` is absent. An explicit color or clear overrides it. The beta uses the saved pin order for inherited threads and appends other starred active threads in active order. Toggling the beta leaves thread data untouched. Settling from the beta preserves the pin so the inherited star stays findable in Settled.

## Alternatives considered

- A one-time pin conversion would rewrite the thread list for every client and require a snapshot to recover the original order.
- A Starred filter alone would require the engineer to look for the shortlist on first enable.

## Acceptance criteria

Toggling off restores the Pinned shelf and its order. Toggling back on restores star edits, including cleared inherited stars. The same star predicate drives row display, history counts, and history pages.

## Risks

A client outside the beta can still edit shared pins. Older servers that omit explicit clears in shell reads need an update for a cleared inherited star to stay cleared.
