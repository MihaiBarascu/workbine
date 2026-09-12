# Usefulness and reputation

Profiles foreground evidence of usefulness, with clickable indicators:

- **Methods tried** counts visible methods with an experience from another member,
  including negative results. Clicking lists those methods.
- **Worked for others** and **Partly worked** count the corresponding visible
  experiences on the member's methods. Clicking lists matching methods; outcome
  links then open the actual filtered experiences and any evidence.
- **Topic saves** counts other members' current bookmarks on visible topics.
  Clicking lists the saved topics, never the people who saved them.

These are contribution/outcome totals, not unique people counts or independently
verified success. One person can try several methods or save several topics.
They include feedback from unverified accounts; that is distinct from eligibility
for the secondary reputation calculation. Hidden content and self-validation do
not count. Negative outcomes remain discoverable through the method's experiences.

## Secondary calculation, version 1

A collapsed Reputation details section shows a transparent calculation. Publishing
content or uploading evidence gives no points on its own. Eligible support gives:

| Signal                   | Recipient     | Points                  |
| ------------------------ | ------------- | ----------------------- |
| Topic save               | Topic author  | 1                       |
| Worked experience        | Method author | 5                       |
| Partly worked experience | Method author | 2                       |
| Did not work experience  | Method author | 0, no automatic penalty |

Only another member with a verified email can contribute points. One supporter
contributes at most one save plus their strongest current outcome to an author
within one topic. Across all current visible contributions, one supporter
contributes at most 25 points to the same author. Splitting one approach into
several methods in a topic does not multiply that supporter's outcome points.

The profile shows counted saves/outcomes and any deduction from the support cap.
Scores are computed from current records without a mutable points balance or
scheduled worker. Removing saves/experiences, changing outcomes or verification,
hiding/restoring content and deleting accounts are reflected on the next request.
Previously hidden evidence remains referenced and is not pruned accidentally.

Email verification is an eligibility signal, not proof of one human per account.
Caps reduce straightforward farming by one supporter; they do not prevent
coordinated accounts or establish expertise. There are no ranking changes,
leaderboards, privileges, paid points or automatic sanctions. This version does
not reward the author of an experience; recognition for useful experience writers
needs a separate, evidence-based design decision.

## Verification and acceptance

Email confirmation is required before new contributions and saves. Existing
activity still uses current verification status when calculating reputation.
Google verification applies only to the provider's matching verified email.
A local unverified account cannot be silently linked and trusted through Google;
the existing account must first be recovered/confirmed. Actual mail delivery is a
separate deployment check, not established by mocked notifications.

Tests cover ownership, eligible support, caps, changes/removals, visibility,
filtered pagination, privacy and click-through to reported outcomes. Use the
[local release gate](TESTING.md) and review the Impact mobile/dark screenshots.
