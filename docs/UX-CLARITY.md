# Human-first topic flow

This increment refines discovery and topic creation without changing the
Topic -> Method -> Experience model, endpoints, persistence or permissions.
It keeps the white/neutral/blue palette and the existing wide community layout.

## Interaction decisions

- The discovery composer says **Continue**, not Publish. Its helper explains that
  nothing has been published and tells guests that login comes next.
- Empty discovery offers everyday starting ideas beside the next action, not
  another competing Start button. Prompts and the expandable worked example are
  explicitly illustrative; they are not seeded activity or member testimonials.
- Choosing an idea offers **Undo** to restore the previous title. Editing the
  selected idea dismisses that temporary undo hint.
- Topic creation has a short heading, one required topic title and clearly optional
  context. The optional first method remains an unchecked native checkbox with a
  large clickable label. It is not a mandatory onboarding step.
- Hidden method fields stay mounted to retain writing, but disabled so they do not
  participate in validation or submission. Turning the method off clears its
  stale server errors without clearing its values.
- Writing prompts explain what to share in everyday language. Extra guidance is
  a native disclosure, not another required field or generated content.
- The publish area explains the selected outcome, public visibility and later
  editing. Processing has an explicit Publishing label. Redundant links to start
  a topic are omitted while already composing one.
- Server validation keeps inline messages, connects them to their fields and
  focuses a summary with links to the affected inputs. Inputs use a single
  visible focus outline rather than stacked focus rings.

## Regression coverage

`tests/browser/community-flow.cjs` calls `topic-clarity.cjs` in the existing
isolated browser run. It checks idea selection/undo, title handoff, native keyboard
controls, optional field submission, retained writing, server-error focus and
320px/1440px light/dark composer captures. It also checks that the intentionally
invalid draft does not publish anything. A one-response, browser-only fixture
checks and captures the true empty discovery state without deleting seeded data.
Existing topic-only, topic-with-method,
search, account and experience checks remain part of that flow.

Both the existing manual UI preview workflow and local test runner already invoke
community-flow.cjs; no new workflow triggers, cron, browser dependencies or
production mutations are introduced.

## Release gate

This document describes implementation and test coverage, not passing test
results. Run the environment-appropriate checks in [TESTING.md](TESTING.md), review
the actual screenshots and fix failures before merging. Syntax checks alone do
not establish a passing application build, integration suite, browser behavior or
visual review. Human usability and enjoyment remain hypotheses to validate with
people, not claims established by automated tests.

Implementation references: [Inertia forms](https://inertiajs.com/docs/v3/the-basics/forms)
and [W3C form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/).
