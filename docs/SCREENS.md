# Workbine screen inventory

## Community

Home and filtered/search feed; populated and empty topic detail; method creation; experience reading, creation, editing and removal. The existing Chromium contribution test covers real mutations on a disposable localhost app. Author links now lead to public member profiles rather than inert names.

## Member and account

Public member profile, Methods / Topics / Experiences tabs, pagination, real counts, blank profile and owner edit action. The profile serializer omits private user data. Private settings: Profile (public introduction and private email clearly separated), Security (password, existing 2FA/passkey controls), Appearance (Light, Dark and System). Account menu includes public profile, settings and functional POST logout. The delete-account dialog retains explicit confirmation.

## Authentication

Login and validation error, registration, forgot password, reset password, email verification, password confirmation, two-factor challenge and recovery-code mode share the Workbine auth layout. This release does not alter authentication routes, middleware, token validation or security policies.

## Release checks

`tests/browser/profile-flow.cjs` exercises these screens in an isolated local app, including profile persistence, public privacy, escaped bio text, long-name/mobile layout, theme persistence, clipboard fallback, registration, password confirmation and a seeded two-factor recovery flow. Screenshots are internal review evidence, not a ZIP deliverable. Passing a capture command is not visual sign-off.

Real Google OAuth and hardware biometric/passkey enrollment require real provider/device interaction and are not claimed covered by the synthetic browser test. Existing backend tests remain in force. The application still uses Laravel's standard error responses; a separate error-page redesign is not part of this screen pass.
