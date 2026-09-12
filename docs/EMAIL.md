# Transactional email

Workbine uses Laravel's Resend transport and the `resend/resend-php` SDK for
password recovery and optional email confirmation. Fresh installations keep
`MAIL_MAILER=log` until a delivery provider is configured.

Set these runtime environment variables in the deployment platform, using your
own verified sending domain and API key:

```dotenv
MAIL_MAILER=resend
RESEND_API_KEY=YOUR_RESEND_API_KEY
MAIL_FROM_ADDRESS=no-reply@mail.example.com
MAIL_FROM_NAME=Workbine
COMMUNITY_EMAIL_VERIFICATION_ENABLED=true
```

Verify the exact sending domain in Resend using its supplied DNS records. A
dedicated subdomain can separate transactional sending from future marketing.
The API key must allow sending from that domain. SMTP credentials are unnecessary
when using the Resend API transport. Keep the key in deployment secrets only.

The container entrypoint rebuilds Laravel's configuration cache on startup, so
saved environment changes take effect in the next deployment. These built-in
account notifications send synchronously and do not require a queue worker.

Email confirmation remains optional and is requested manually from Profile
settings. Enabling the flag does not automatically email new registrations or
block contributions. Password recovery uses the configured mailer independently
of this flag.

After deployment, use an owner-controlled account to request a confirmation and
a password-reset email. Check the sender, delivery in Resend and the receiving
inbox, and verify that both links use the application's public HTTPS URL and
complete their respective flows. Automated tests use isolated data and mocked
delivery; they do not prove production DNS, credentials or inbox delivery.

References: [Resend Laravel integration](https://resend.com/laravel) and
[domain verification](https://resend.com/docs/dashboard/domains/introduction).
