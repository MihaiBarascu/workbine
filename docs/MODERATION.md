# Small-scale content review

Content reporting is opt-in configuration. Before setting
`COMMUNITY_REPORTS_ENABLED=true`, assign an operator with authorized application
console access to check the queue regularly. No queue worker, email notification
or unattended moderation process is created. Keep moderator identities, schedules
and incident notes outside the public repository.

## Member behavior

Members can report a topic, method or experience for spam, harassment, unsafe
content, privacy or another reason. Other reasons require an explanation. Reports
are limited to five submissions per minute and one report per member/contribution;
repeated submissions do not add duplicates or rewrite the first report.

Reports are private to operators with console/database access. The contributor
and other members receive no report details, reporter identity or report counts.
Reporting does not hide content automatically. Deleting a reporter's account
removes their reports; it does not restore already moderated content.

## Review commands

Run these from the application directory using the deployment's normal authorized
console access. IDs and notes below are examples, not production data.

```sh
php artisan reports:review
php artisan reports:review 123
php artisan reports:review 123 --action=dismiss --note='No guideline violation found.'
php artisan reports:review 123 --action=hide --note='Reviewed spam contribution.'
php artisan content:restore method 456
```

The list shows up to 50 oldest open reports. Inspect a report to see its submitted
context and current content, then record a decision with a note. Review commands
must be run manually by the operator; these examples do not schedule them.
No public web administration route exists. Console output can contain private
report details and must not be uploaded to public logs, issues or test artifacts.

Hiding retains the contribution, its links, saved references and experience
history in the database. A hidden topic also hides its methods and experiences
from public discovery, profiles and routes. A hidden method also hides its
experiences. Restoring a parent does not restore descendants that were themselves
hidden. An author cannot edit hidden topics/methods or republish a hidden experience
through the ordinary update route. They can remove their own hidden experience
when its topic and method remain visible.

Hiding content removes its image from application pages but **does not revoke an
existing public image URL**. Referenced evidence is retained for review/restoration;
cleanup must not erase it. For an image that itself requires removal, use the
existing media removal and cache-purge operational procedure in [MEDIA.md](MEDIA.md).
Take that action separately before treating an image report as fully resolved.
Account deletion still removes the related records and attempts media cleanup.

This is a manual review path for a small beta. It does not implement automated
classification, sanctions, appeals, a review SLA or a legal notice process. Decide
and publish the relevant contact/policies before inviting users.
