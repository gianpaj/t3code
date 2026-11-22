# Product ideas for a priority inbox

2026-11-21 · Candidates for discussion

For one engineer returning to several projects, the inbox could answer “What needs me?” and a weekly home could answer “What did I mean to move forward?” See the [research synthesis](research.md) and [product precedents](product-precedents.md) for the evidence behind these ideas.

## A short attention queue

- **A bounded Priority section above Everything else.** Show a few handoffs and their next action, with a count and a route to the full queue. A cap on visible rows keeps the scan short. A cap on eligible work risks burying older handoffs. A fixed number is still an open question. One row per thread also prevents several callbacks from the same agent from filling the section.
- **Clear the current handoff.** A control such as “Acknowledge” or “Mark handled” could remove this update from the queue, with later actionable activity bringing the thread back. Compare it with clearing on open, which saves a gesture and can hide an unfinished review. Current T3 Code actions already cover snoozing and settling the thread.
- **Choose projects at the point of triage.** Make selected projects and a quick way back to “All projects” visible. Searchable multi-select exists on web and desktop. The open question is which projects the engineer currently has in view and how quickly they can change the selection. A single cross-project order makes trade-offs apparent. Grouping by project helps when the engineer wants to finish several related reviews together.
- **Show an absolute date and time on every row.** “Agent finished Nov 20, 16:42” answers how long a result has been waiting. “You left Nov 20, 16:42” would report navigation away. “Last activity” makes a broader promise and can change on routine updates. Choose the meaning before choosing the field. If the user wants to know what arrived after they stopped looking, an unread cue can carry that relationship alongside the timestamp.

## Finishing PRs

- **Keep an open PR actionable after the engineer reads the thread.** Opening clears the unread cue. The next action might be “Review diff,” “Waiting on CI,” or “Decide whether to close.” Merge and close record different outcomes. A later turn can change the next action while the PR stays open.
- **Try a small set of reviews to finish.** A short ranked section limits scanning. A limit on active reviews changes what the engineer takes on. Work waiting on CI, another reviewer, or an agent remains visible with its next trigger. One question for the model is which PR the engineer can advance toward a decision, given current goals and blockers.
- **Compare time to resolution and age of open PRs.** Track merges and closes separately. Include accepted work and review quality so a queue that clears faster through premature closures or approvals does not look like a success. See the [literature on finishing work](finishing-work.md).

## Stars and filters

- **A personal marker that sticks to the thread.** Yellow, blue, and green stars could act as three reusable categories. The engineer might use them for “follow up,” “bring this context back,” and “reference.” A star could survive a handled update, and filters could offer “Any star,” “No star,” and a specific color if people use the colors consistently. Color names or distinct accessible labels give the markers a meaning outside color alone.
- **A manual priority signal.** Another meaning for starring is “show this near the top until I change my mind.” This reduces the need to correct automated ordering, and overlaps with Pin. A saved-reference star and a priority star make different promises. Pick the behavior users can predict from the control.

## Weekly goals on home

1. **One cross-project list of outcomes.** A quiet home shows a few goals for the week, with an optional project on each. The engineer can name “Ship CSV export” and “Get billing migration ready for review” together. A project with no declared goal can still produce urgent work. If there are zero goals, home could show handoffs already waiting or a small “What do you want to move forward this week?” prompt.
2. **One goal per project where useful.** The project's goal can reappear whenever the engineer returns to its threads. That helps restore context within a project and spreads commitments across multiple places. This fits engineers who plan by repository more than those whose goals span several repos.
3. **One optional focus sentence.** Momentum's new-tab pattern asks the engineer for a single commitment. It is easy to scan and cheap to maintain. It gives prioritization less detail than linked project outcomes.

Across these options, the home can serve as a reminder as soon as the user writes something. An outcome can span several threads and remain relevant when an individual turn finishes. An explicit carry-over gives the engineer a chance to update the intent each week.

## What could put a thread at the top

| Candidate signal | What it would surface | What to learn |
| --- | --- | --- |
| **Thread state and timing** | Explicit requests for approval or answers, failures, and results clearly awaiting review. | Which state changes truly require the engineer? Can a quiet but old handoff still be found? |
| **An explicit goal link** | Handoffs on a thread the engineer tied to a current weekly goal. A visible reason could say “Review diff · Ship CSV export.” | Is the link worth maintaining, and will engineers use it across devices and projects? |
| **A relevance judgment via the Decisions API** | A suggested placement in Priority or Everything else when an agent's handoff asks for work or advances a weekly goal. The API provides estimated probabilities for conditions and distributions for choices. [Decisions API](https://developers.openai.com/api/docs/guides/decisions) | Does inferred relevance help find better handoffs than explicit status or links? How often does a confident suggestion misplace a blocker? A useful explanation and manual correction matter more than showing a confidence score. |

The signals could work together. A waiting approval or failed release check can deserve attention even when its project has no weekly goal. Goal relevance could help when choosing among reviewable results. Manual corrections can resolve a bad suggestion. API-assisted ordering leaves open what thread or code context may be sent and what the engineer sees when classification is unavailable.

**Example.** The engineer's goal is “Ship CSV export.” A finished export diff from yesterday may deserve review ahead of a routine docs completion from this morning. A release-blocking check in a third project can still go first. A blue star on the docs thread can preserve it as a reference after its update is cleared.

The open product question is whether these choices make the engineer more likely to act on the right handoff and resume their work with less rereading. Clearing items quickly, receiving fewer notifications, or opening more threads would each capture only part of that outcome.
