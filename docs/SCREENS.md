# Workbine screen inventory

## Community

Home and filtered/search feed; populated and empty topic detail; method creation; experience reading, creation, editing and removal. The existing Chromium contribution test covers real mutations on a disposable localhost app. Author links now lead to public member profiles rather than inert names.

## Responsive discovery coverage

The public capture script covers the feed at 320, 375, 768, 1024, 1440 and 1920px
in light and dark appearance, plus matching-search and no-results views at 320 and
1440px. It checks horizontal overflow, visible keyboard-focusable header actions,
working topic/member links, query retention, theme selection and browser errors.
At 1440px and above the contribution column must remain at least 900px wide.
It also follows both seeded topic links at 320px and 1440px. Preview content is
synthetic data in the disposable test app and is never added to production.

## Member and account

Public member profile, Methods / Topics / Experiences tabs, pagination, real counts, blank profile and owner edit action. The profile serializer omits private user data. Private settings: Profile (editable username with public URL preview, public introduction and private email clearly separated), Security (password, existing 2FA/passkey controls), Appearance (Light, Dark and System). Account menu includes public profile, settings and functional POST logout. The delete-account dialog retains explicit confirmation.

## Authentication

Login and validation error, registration, forgot password, reset password, email verification, password confirmation, two-factor challenge and recovery-code mode share the Workbine auth layout. This release does not alter authentication routes, middleware, token validation or security policies.

## Release checks

`tests/browser/profile-flow.cjs` exercises these screens in an isolated local app, including profile persistence, public privacy, escaped bio text, long-name/mobile layout, theme persistence, clipboard fallback, registration, password confirmation and a seeded two-factor recovery flow. Username checks cover invalid and duplicate values, stable usernames after display-name edits, saved renames, canonical author/profile/tab/copy links, numeric 301 redirects preserving filters and pagination, and a missing previous username. Public and account captures include a 30-character username at 320px. Screenshots are internal review evidence, not a ZIP deliverable. Passing a capture command is not visual sign-off.

Real Google OAuth and hardware biometric/passkey enrollment require real provider/device interaction and are not claimed covered by the synthetic browser test. Existing backend tests remain in force. The application still uses Laravel's standard error responses; a separate error-page redesign is not part of this screen pass.
