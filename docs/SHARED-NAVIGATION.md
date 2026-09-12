# Shared community navigation

The owner requested a retractable sidebar and secondary pages aligned with the
current discovery homepage. This extends the connected design; it does not
change contribution, privacy, reputation or authentication behavior.

## One shell, two contexts

`PublicShell` supplies the same navigation, canvas, account controls, surfaces and
spacing to discovery, topics/methods, responses, profiles, saved topics,
notifications, community guides, authentication and account settings. The existing
`AuthLayout` and `SettingsLayout` remain in use. Error pages can render the shell
without private shared props or a database-dependent category query.

The earth artwork and pointer effects remain exclusive to discovery. Forms,
account pages and long reading views use quiet opaque panels. The existing font,
neutral/blue palette, light/dark preference and 8px controls/12px surfaces remain.
Settings use an in-page section navigation rather than a second vertical sidebar.
Form labels, validation, passwords, uploads and security flows are not replaced.

Discovery retains compact cards while increasing tiny metadata, descriptive text
and filter labels. Navigation, account controls, filter tabs and compact card
actions have 44px target areas. Reduced-motion preferences suppress the new
layout transition. Screenshot review is not a claim of full WCAG conformance or
independent human usability research.

## Sidebar interaction

On screens wider than 1050px, the header control collapses or expands the sidebar.
Collapsing reclaims the whole navigation column and removes its links from focus
and accessibility navigation. The control stays available, with an explicit name,
`aria-expanded` and `aria-controls`.

The existing `sidebar_state` cookie stores only this presentation preference for
seven days, with SameSite=Lax and Secure on HTTPS. It contains no identity or
account data. Server-rendered page props restore the preference after navigation
or reload. It is not authorization or a new server-side account setting.

At 1050px and below, navigation is a separate closed-by-default drawer. Opening it
locks background scrolling and makes the rest of the shell inert. Focus starts on
the close control; Tab remains in the drawer. Escape, the close button, the
backdrop and navigation close it. Closing restores focus to the trigger, and
switching to desktop releases the drawer. Mobile opening does not overwrite the
desktop preference.

Active links match the actual route and category instead of highlighting Explore
on every page. Categories reuse the public `TopicDiscovery` catalog through shared
Inertia props; no category counts, private activity or extra SQL are loaded for
navigation. Account and contribution destinations retain their existing guards.

## Validation

`tests/Feature/CommunityNavigationTest.php` checks public catalog sharing and the
existing sidebar preference. `tests/e2e/community-navigation.spec.ts` exercises
desktop persistence, reclaimed space, active destinations, mobile modal behavior,
keyboard focus and page reflow. It captures representative 320px and desktop
account pages plus mobile dark appearance. Existing contribution, account and
security browser checks remain required.

Use the environment selection and full release gate in [TESTING.md](TESTING.md).
Record actual tested revisions and outcomes in the PR; this file describes the
implementation contract, not proof that any particular revision passed.
