# Workbine product identity

## Direction approved for implementation

The owner rejected the generic SaaS landing-page feeling and asked for a distinctive, useful community platform. Do not bring back the oversized marketing hero, teal letter-in-a-rounded-square logo, generic feature-card grid, fake member counters or fake contributions.

Workbine is a shared community notebook: a practical question, a method someone used, then the honest account of what happened when others tried it. The interface should show those activities, not sell a software subscription.

## Visual language

- Warm paper background (#f5f2e9), carbon-green ink (#252c24), restrained terracotta accent (#a53d20), pale lime selected states (#e5ecb8). Dark mode has a dark olive-paper background and readable warm text.
- Distinct lowercase wordmark with an interlocking line-based W symbol. No generic rounded initial badge.
- Serif display headings for the notebook/thread titles, existing Instrument Sans for functional UI, small monospace labels for navigation and metadata. No new font or icon dependencies.
- Thin dividing rules, editorial margins, mostly square controls and a readable row-based feed. Do not make every content block the same floating card.
- Show the question composer, working search and real topic activity immediately. The introduction is a short masthead, not an oversized hero.
- The field guide belongs in the margin on desktop and after the feed on mobile. Curated question prompts must be clearly labeled as prompts, never made to look like user contributions.

## Layout and components

PublicShell owns the brand header, navigation, theme tokens, keyboard skip link and compact footer. Brand styling is scoped to `.wb-public`; private settings are not redesigned accidentally.

The community notebook uses a 1320px maximum canvas with three desktop columns: a compact browse rail, the flexible topic feed, and a 244px field-guide margin. At intermediate widths the guide moves below the feed. Below 700px, the rail becomes filter navigation and the composer stacks its controls.

Existing topic/method/experience pages remain functional and use the same paper/ink tokens. Hard-coded legacy teal treatments should be replaced with semantic theme colors as they are touched.

## Behavior

- Search and Needs a method are real server-side filters, including pagination.
- A question can be drafted from the feed. It is passed to the protected creation page; login preserves the intended destination and the draft query.
- Starter prompts fill the composer; they do not publish anything or create fake users.
- Author names, dates, method counts and experience totals come from the database.
- Positive, partial and negative experiences are equally valid. Do not imply independent verification or invented success rates.
- Keep visible labels, focus states, adequate contrast and reduced-motion support. Check long names, URLs and 320px mobile widths.

## Acceptance before release

Run the complete repository CI on SQLite and PostgreSQL, the real browser contribution flow, and visual review of populated and empty states, desktop/mobile, light/dark. Verify the deployed public site separately. Passing a screenshot command is not visual approval.

Do not keep redesigning finished surfaces on a timer. Follow the next concrete backlog item and preserve established components unless user feedback or an observed problem justifies a change.

## 2026-09-11 refinement: community, member and account screens

The owner's new feedback supersedes the earlier deliberately notebook-like visual treatment where it conflicts: the interface should be cleaner, less ornamental, and consistent across all existing screens, especially the former Laravel account area.

Use one quiet community UI: near-white canvas, white content surfaces, a restrained forest-green primary action and terracotta accent. Keep the Workbine wordmark, remove oversized serif statements and decorative AI sparkles, use consistent 8px controls, 12px content surfaces, readable sans-serif headings and generous but purposeful spacing. Navigation has real destinations, never invented notifications, follower counts or unavailable actions.

A member profile (`/members/{id}`) is separate from private account settings. It shows only explicitly serialized public fields, real contribution counts and paginated Methods / Topics / Experiences. Optional bio, location and website are clearly marked public when editing. Email, Google identity, secrets and security settings never enter the public serializer. Initial-based avatars require no uploads, external image service or new dependency.

All existing auth screens use the branded AuthLayout. All three settings screens use SettingsLayout directly, not the Laravel sidebar wrapper. Shared theme tokens live at the document root so Radix dialogs/dropdowns and toasts have the same theme as the page. Existing Fortify password, 2FA, passkey and account deletion behavior remains intact.

### References reviewed, not copied

- Mohammad Ebn Ali, _Forum Community Feed_: https://dribbble.com/shots/25457462-Forum-Community-Feed — compact community navigation, clear author/title/content hierarchy, useful secondary column. The published screenshot was inspected.
- Creliq UX/UI Design Agency, _Community Feed Dashboard UI for Learning Platform_: https://dribbble.com/shots/27266379-Community-Feed-Dashboard-UI-for-Learning-Platform — documented community/feed navigation structure. Its project description was reviewed; the large image could not be retrieved reliably.

These are attributed portfolio references, not proof of usability testing or business results. No purchased assets, copied illustrations, fake activity or claims of designer validation are part of this implementation. Product validation is the repository's own functional, privacy and browser checks.
