# Private messaging

Workbine messaging connects people after a useful contribution gives them a reason
to talk. It is deliberately not a freelance marketplace, follower system or public
social feed. The public product model remains `Topic -> Methods -> Real experiences
-> Evidence -> Reputation`; messaging is a private bridge between the people behind
those contributions.

## Product contract

- Conversations are one-to-one. A member pair has one conversation.
- A verified member can start a conversation from another member's profile.
- A method or experience can be attached to the first message as context. The
  context must belong to the recipient, so a client cannot forge a contribution
  attribution.
- Method and experience pages expose contextual message actions. Profiles expose a
  neutral `Message` action; there is no `Available for work`, `Hire`, hourly rate,
  expert badge or personal rating.
- Messages are plain text, up to 4,000 characters. V1 has no attachments, groups,
  presence, typing indicators, reactions or read receipts exposed in the UI.
- The open conversation polls every five seconds with Inertia partial reloads. Polls
  use `rest` concurrency mode and therefore do not overlap. Background tabs retain
  Inertia's default polling throttling.
- The page loads the latest 100 messages. Older rows remain in the database; no
  history pagination is added until real conversation length justifies it.
- Messages do not create community reputation and do not send community
  notifications or email in V1. The unread message count has its own navigation
  badge to avoid duplicate notification channels.

## Abuse and privacy boundaries

- Messaging routes require authentication and a verified email.
- A member can start at most ten new conversations per day. Message submission also
  has route-level request throttles. Continuing an existing conversation does not
  consume the new-conversation allowance.
- Either member can block the other. A block pauses new messages in both directions;
  existing history remains visible. Only the blocker can undo their block.
- A recipient can report a specific incoming message. The existing content-report
  and moderation queue handles that report; only conversation participants can
  address the report target and a sender cannot report their own message.
- A moderator can hide a reported message. Participants then see a moderation
  placeholder instead of the message body. Private messages are not sent through
  the automatic public-content moderation pipeline in this feature.
- Direct-message pages use encrypted Inertia history. Conversation payloads contain
  public member fields only, never email or authentication fields.
- Account deletion cascades conversations involving that account. A separate
  moderation report may remain under the existing moderation retention rules.

## Data model

`conversations` stores the canonical member pair. The lower user id is always
`user_one_id`, which lets the database unique constraint prevent duplicate one-to-one
threads.

`messages` stores sender, body, optional contribution context, read timestamp and a
moderation visibility timestamp. Context is intentionally a small typed reference
(`method` or `experience`) rather than a general polymorphic model.

`user_blocks` stores directional block decisions. A block in either direction is
enough to stop new messages in both directions.

## Deliberate non-features

Do not add WebSockets/Redis/Reverb only to make chat feel more real-time. The current
Inertia polling path fits the existing monolith and expected load. Reconsider a
push transport only after measured polling load or product behavior makes it useful.

Do not add a separate freelancer profile, projects/portfolio content type, follower
feed, public DMs, arbitrary group conversations or message attachments without a
new product decision. Those features would change Workbine's knowledge-first model
and add abuse/storage complexity not required by the current use case.
