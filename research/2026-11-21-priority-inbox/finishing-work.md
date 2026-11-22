# Finishing work across AI coding threads

2026-11-22 · Literature follow-up

## Summary

A PR awaiting an engineer’s decision is an outstanding obligation. Opening the PR is an acknowledgement. Subsequent work may include understanding the change, testing it, asking for revisions, and merging or closing it. The research spans three costs: the time work spends open, the attention it takes to resume, and the review required to make a sound decision.

The evidence favors examining how many items a person actively juggles and how easy each is to resume. It supports measuring resolution separately from first attention. An effective limit for a solo engineer using parallel agents remains an open question.

## Key papers

| Evidence | Finding and limits |
| --- | --- |
| **The Inefficiency of Worker Time Use**, Coviello, Ichino, and Persico, 2015. [Journal and accepted manuscript](https://cris.unibo.it/handle/11585/382049) | Using a case-assignment lottery in Italian labor courts, the authors found that judges induced to juggle more cases at once took longer to complete comparable portfolios. The cases required repeated hearings. The setting gives evidence about task sequencing under a similar workload, with limited transfer to code review. |
| **An Empirical Study of WIP in Kanban Teams**, Sjøberg, 2018. [Study abstract](https://www.sintef.no/en/publications/publication/0198cc68f9da-52d0d8f1-3d82-461c-970c-21d8229b9ac3/) | Across more than 8,000 items from five teams at one software company, lower work in progress correlated with shorter lead times. The measured productivity relationship went in the other direction. The data lacked a quality measure, and the paper identifies limitations in the productivity measure. The study leaves the optimal limit and the effect of imposing one open. |
| **A Proof for the Queuing Formula**, Little, 1961. [Operations Research](https://doi.org/10.1287/opre.9.3.383) | In a stable queue, the average number of items equals throughput multiplied by average time in the queueing system. At the same resolution rate, a larger average number of unresolved PRs corresponds to a longer average time open. The formula concerns the full queue, including waiting work, and describes a relationship among averages. A visual row limit leaves that queue count as it was. |
| **Multi-project Work and Project Performance**, Colicev, Hakkarainen, and Pedersen, 2023. [Strategic Management Journal](https://doi.org/10.1002/smj.3443) | The authors found an inverted-U association between concurrent project work and project performance in a longitudinal dataset of 9,649 employee-project-month observations at a multinational firm. Similar projects and familiar collaborators mitigated switching costs. Parallel work can make use of periods of waiting. The result is observational and comes from new product development. |
| **Tasks Interrupted**, Leroy and Glomb, 2018. [Organization Science](https://doi.org/10.1287/orsc.2017.1184) | Across four studies, anticipating time pressure when returning to an interrupted task made it harder to focus on the intervening task. A short plan for how to resume reduced that effect. The intervention addresses attention while switching, with open questions about time to merge and review quality. |
| **Interruption, Recall and Resumption**, Ghibellini and Meier, 2025. [Open-access paper](https://www.kog.psy.unibe.ch/e48276/e1785865/s41599-025-05000-w1_ger.pdf) | This meta-analysis found a general tendency to resume interrupted tasks and little support for a reliable memory advantage for unfinished tasks. The resumption evidence was largely descriptive. Remembering a task, thinking about it while doing other work, and deciding to resume it are different outcomes. |
| **Expectations, Outcomes, and Challenges of Modern Code Review**, Bacchelli and Bird, 2013. [ICSE paper](https://www.cabird.com/pubs/bacchelli2013eoc.pdf) | Observations, interviews, surveys, and review comments at Microsoft identified understanding the change and its context as central to modern code review. The study describes team-based review before coding agents. |
| **Human Oversight of Agentic Systems in Practice**, Dhanorkar, Passi, and Vorvoreanu, 2026. [Preprint](https://arxiv.org/html/2606.05391v1#S4) | In 17 developer interviews, post-execution review was the most discussed form of oversight. Participants described the effort of understanding unfamiliar agent changes and rechecking them after revisions. This qualitative study describes forms of work. It does not estimate their prevalence or measure a review bottleneck for solo engineers. |
| **On Wasted Contributions**, Khatoonabadi et al., 2023. [ACM paper](https://doi.org/10.1145/3530785) | Across ten mature open-source repositories and 265,325 PRs, more complex PRs and longer reviews were associated with greater contributor abandonment. A manual sample and maintainer survey provided additional context. These results concern contributors disengaging from a PR. A maintainer can deliberately close a superseded PR. |

## Open questions

- How much time do solo engineers spend actively reviewing PRs versus waiting on CI, another reviewer, or an agent revision? These states all contribute to time open and differ in who can move the work forward.
- What ordering helps close work deliberately without letting quick, low-value changes crowd out a larger change that matters more?
- Does a smaller set of active reviews reduce the age of unresolved PRs and perceived overload without reducing accepted output or review quality? Agent finish, first engineer visit, and PR disposition are distinct measurement points.

Paper discovery used the available literature and web search. The Firecrawl paper-index connector and CLI were unavailable. The cited sources are publisher records, author manuscripts, institutional copies, and the agent-oversight preprint.
