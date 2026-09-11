# Workbine interface direction

## Latest owner decision - 2026-09-11

The owner explicitly rejected the green/olive/teal palette and requested a much lighter, cleaner interface. This supersedes the previous notebook palette. Use white surfaces, a nearly white neutral canvas, graphite text and a restrained blue accent. Do not reintroduce forest green, terracotta, tinted page backgrounds, decorative gradients or large marketing-hero statements.

## Open community layout - 2026-09-11

The owner requested a wider, more natural community interface. The discovery page
uses a fluid shell up to 1600px, with a generous main feed and one 280px supporting
column. The redundant left sidebar is replaced by filters directly above the
contributions. Search sits beside the short page heading on desktop and below it
on mobile. Contributions share one quiet surface with dividing lines, larger
headings and readable summaries. The topic composer still supports sharing a
method or inviting approaches equally; prompts remain explicitly labelled.

Navigation, topic detail and experience pages share the wider alignment. Long
method text keeps a readable line length. At tablet widths supporting content
moves below the main column. Mobile controls retain visible labels, keyboard
focus and usable touch targets; the interface is checked from 320px to 1920px in
light and dark appearance. No decorative hero, new dependency, invented activity
or change to the Topic -> Method -> Experience model.

The direction uses content and working controls as the visual focus. Contemporary
community reference: [Discourse's Horizon design process](https://blog.discourse.org/2025/10/how-we-built-horizon-with-design-driven-development/).
Responsive validation follows the intent of [W3C reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow).
These references inform implementation; browser checks do not establish full WCAG
conformance or measured audience growth.

## Shared design system

- Canvas `#f8f9fb`, surfaces `#ffffff`, graphite `#242730`, secondary text `#626b7c`, rules `#e3e7ee` and blue actions `#315ed7`.
- Dark appearance remains available, with neutral charcoal `#16181d` / `#1f2229` and a soft blue `#adc3ff`. Respect members' saved theme choices; dark mode is not a green alternative palette.
- Existing Instrument Sans for all interface headings and body copy; consistent 8px controls and 12px surfaces. No new font, icon, image or animation dependency.
- Workbine's own line-based W wordmark and matching favicons, not a Laravel starter logo. Use content hierarchy and spacing, not decoration, to create character.
- Root-level semantic tokens also style menus, dialogs and toasts rendered outside the public shell.
- A short community heading, working topic composer/search, real contributions and compact secondary navigation. No fake members, follower counts, activity, notifications or unavailable controls.

## Screens and behavior

The public member profile (`/members/{id}`) is separate from private account settings. It shows explicitly serialized public introduction fields and paginated real methods/topics/experiences. Email, Google identity and security data are not public profile fields. Public text is rendered as text, not injected HTML; website links accept only HTTP/HTTPS. No uploads or external avatar service are required.

All authentication pages share the Workbine AuthLayout. Profile, Security and Appearance settings share SettingsLayout directly; the Laravel starter sidebar is not used. Fortify password, 2FA, recovery, passkey and account deletion behavior is preserved. Retain visible error messages, focus outlines, labels, reduced-motion support and readable mobile wrapping.

The cancelled coding agent and cron remain removed. Only explicitly requested development sessions may change this design.

## Portfolio references, not copied assets

- Mohammad Ebn Ali, Forum Community Feed: https://dribbble.com/shots/25457462-Forum-Community-Feed - feed hierarchy, light canvas and compact community navigation.
- Dan Edwards / No Divide, Forum UI Design: https://dribbble.com/shots/4729767-Forum-UI-Design - clear discussion rows, restrained chrome and white surfaces.
- Creliq UX/UI Design Agency, Community Feed Dashboard UI for Learning Platform: https://dribbble.com/shots/27266379-Community-Feed-Dashboard-UI-for-Learning-Platform - supporting reference for content/navigation organization, not its color palette.

These are attributed design portfolios, not evidence that those interfaces passed usability research. No illustrations, personal photos or assets are copied. Validation here means the repository's own functional/privacy tests plus actual browser and visual review; it does not claim audience growth or independent human usability testing.
