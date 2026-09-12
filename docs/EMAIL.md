# Transactional email

Workbine uses Laravel's Resend transport and the `resend/resend-php` SDK for
password recovery and email confirmation. Fresh installations keep
`MAIL_MAILER=log` until a delivery provider is configured.

Set these runtime environment variables in the deployment platform, using your
own verified sending domain and API key:

```dotenv
MAIL_MAILER=resend
RESEND_API_KEY=YOUR_RESEND_API_KEY
MAIL_FROM_ADDRESS=no-reply@mail.example.com
MAIL_FROM_NAME=Workbine
```

Verify the exact sending domain in Resend using its supplied DNS records. A
dedicated subdomain can separate transactional sending from future marketing.
The API key must allow sending from that domain. SMTP credentials are unnecessary
when using the Resend API transport. Keep the key in deployment secrets only.

The container entrypoint rebuilds Laravel's configuration cache on startup, so
saved environment changes take effect in the next deployment. These built-in
account notifications send synchronously and do not require a queue worker.

Accounts use Laravel/Fortify's standard `MustVerifyEmail` contract, registration
notification, signed expiring links, authenticated confirmation and throttled
resending. Email/password registration sends a confirmation automatically.
Changing the email in Profile settings clears verification and sends a new link.
Google-created accounts use Google's verified email and receive no confirmation.

The standard `verified` middleware protects contribution and saved-topic routes.
Browsing, Profile settings, password/security settings, account deletion and
logout remain accessible before confirmation. Existing unverified members must
confirm before their next protected action; their content is retained. The old
`COMMUNITY_EMAIL_VERIFICATION_ENABLED` variable is no longer used and can be
removed from deployment settings.

One account is retained per email. Duplicate registration does not replace an
existing account; the form links to login and standard password recovery. A
mailbox owner can reset the password of a preclaimed unverified account, which
revokes previous sessions and removes previously enrolled login credentials.
The owner then logs in and confirms the email. Google does not silently link to
an unverified local account. No separate account-claim protocol is introduced.

After deployment, use an owner-controlled account to request a confirmation and
a password-reset email. Check the sender, delivery in Resend and the receiving
inbox, and verify that both links use the application's public HTTPS URL and
complete their respective flows. Automated tests use isolated data and mocked
delivery; they do not prove production DNS, credentials or inbox delivery.

References: [Resend Laravel integration](https://resend.com/laravel) and
[domain verification](https://resend.com/docs/dashboard/domains/introduction).

[Laravel email verification](https://laravel.com/docs/13.x/verification) describes
the standard contract, notification and middleware used here.
