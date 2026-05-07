# Peck

> While others pile on agents, phases, and documents — Peck subtracts until only the essential remains.

Peck is a minimal, spec-driven AI development framework built on the suckless philosophy: complexity is a bug, every abstraction must justify itself, and the right number of moving parts is the fewest that work. Two agents, no config, no ceremony — those aren't missing features, they're the point.

Peck is for developers. It assumes you can write a focused story, read a git log, and know your way around `git rebase`, `git squash`, and `git reset`. If you need guardrails, this project isn't for you.

## Getting started

```sh
npm install -g peck-cli
peck init
```

Open your project in [OpenCode](https://opencode.ai). You'll have two agents available: `planner` and `implementer`. Configure the model for each by editing `~/.opencode/agents/*`.

## Feature-first

Most frameworks are top-down (start with a PRD, a constitution, a roadmap) or bottom-up (start with architecture decisions). Peck starts from the feature — the thing that actually needs to exist.

This isn't just a workflow preference. It's a stance on where clarity actually comes from. A well-scoped feature story forces the right questions: what does done look like, what are the constraints, what's the simplest path? That's more useful than any upfront document, because it's grounded in what you're actually building right now.

## Two agents. That's it.

**Planner** — turns a feature request into a story file and switches to a feature branch. It also maintains `product.md` — a living description of what the project is right now, updated as features ship. Not a PRD, not a wishlist — just enough context for the next story to be written well.

**Implementer** — implements the story, runs both reviewers automatically, and reflects at the end. It cannot mark a story done until both pass:

- **Acceptance reviewer** — verifies ≥90% of acceptance criteria are covered by automated tests — blocking
- **Code reviewer** — verifies correctness, simplicity, and security — blocking

Quality is structural, not aspirational. The dual-reviewer gate is enforced by the framework — not by convention or discipline. As far as we know, no other AI development framework ships this kind of hard correctness gate by default.

Most AI frameworks try to prevent mistakes upfront — exhaustive plans, architecture docs, detailed prompts. Peck takes the opposite bet: let the agent work freely against a clear spec, then catch mistakes structurally at the end. The reviewers don't aspire to quality; they gate on it.

Every agent output is committed to git as an empty commit. This gives you full session replay and auditability with zero extra tooling — just `git log`. No observability stack, no agent dashboard, no external logging service.

```sh
git config --global alias.review 'log --format="%C(yellow)%h%Creset %Cblue%ar%Creset %ae %Cgreen%s%Creset%n%n%b"'
git review
```

## Why no PRD

PRDs are valuable — they force clarity upfront and give a team shared direction. The problem is maintenance. The moment a project pivots, the PRD needs to be reconciled with reality. In practice this means either keeping two sources of truth in sync, or letting the PRD drift and becoming a liability.

`product.md` captures what a PRD is most useful for — project context and direction — without the maintenance cost. It only ever describes what currently exists, so it's always accurate. The planner reads it before writing a story; the implementer doesn't need it at all.

## Why no architecture docs

90% of what an architecture document contains is directly inferable from the codebase. The remaining 10% — the non-obvious decisions, the gotchas, the constraints that aren't visible in the code — is what's actually worth writing down. Architecture docs tend to capture the wrong 90% and require constant effort to stay accurate.

Peck's reflection loop captures the right 10%. When an agent encounters something non-obvious, it reflects and writes it into `AGENTS.md` as a standing pattern or `docs/learnings.md` as an incident. If it happens twice, it becomes a pattern. Documentation emerges from real friction — not upfront assumptions about what will matter.

`AGENTS.md` isn't just a doc — it's accumulated institutional knowledge from real agent struggles on your specific codebase. Every story that runs leaves the framework slightly smarter. The first story is the most expensive; the tenth runs faster, makes fewer wrong turns, and gets blocked less often.

The code is the architecture. The reflection loop is everything the code can't tell you.

## Why no detailed plans

The assumption behind most AI frameworks is that LLMs need exhaustive plans to produce good output. Peck rejects this. LLMs are good at understanding intent — a clear description of what needs to be built, what done looks like, and the key technical decisions involved is enough. Detailed plans are an antipattern: they're hard to write, likely outdated by the time implementation begins, and solving a problem that doesn't exist.

Stories in Peck are short, human-readable, and focused. They capture requirements, acceptance criteria, and important technical decisions — nothing else. Scope them to what an agent can handle in a session. Complexity is fine; bloat is not.

Stories are intentionally small — this is the context rot solution. Other frameworks add complex machinery to manage long-running agent sessions. Peck solves it through discipline: when scope is narrow, restart is cheap. The problem doesn't arise.

## Docs that earn their place

Docs in Peck are reactive, not proactive. Nothing gets written before it's needed. `AGENTS.md` grows from real agent struggles. `product.md` reflects the current state of the project. `docs/learnings.md` captures incidents before they become patterns.

Docs are a byproduct of work, not a prerequisite for it.

## Works anywhere

Same workflow for greenfield and brownfield projects. No assumptions about project state.

## Async delegation

The effort is in writing good stories — not in supervising execution. Write a sprint's worth of stories in an afternoon, point an orchestrator at them, walk away. Come back to reviewed and gated implementations.

This is the intended workflow. Most AI frameworks assume you're watching — ready to nudge, clarify, and course-correct. Peck assumes you have other things to do. The dual-reviewer gate means you can trust what came back without reviewing it yourself. The git log means you can audit exactly what happened without a dashboard.

---

Peck doesn't do less because it's unfinished. It does less because that's what works.

