import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({
    status,
    verificationAvailable,
}: {
    status?: string | null;
    verificationAvailable: boolean;
}) {
    return (
        <>
            <Head title="Email verification" />

            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {verificationAvailable
                    ? 'Confirm the email address on your account. Verification is optional: you can keep browsing and contributing without it.'
                    : 'Email verification is not available yet. You can keep using Workbine and return here later.'}
            </p>

            {verificationAvailable && status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="text-primary mb-4 text-center text-sm font-medium"
                >
                    A new verification link has been sent to the email address
                    on your account.
                </div>
            )}

            {verificationAvailable && (
                <Form {...send.form()} className="mb-6 text-center">
                    {({ processing }) => (
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Send a verification email
                        </Button>
                    )}
                </Form>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <TextLink href="/topics">Continue to topics</TextLink>
                <TextLink href={logout.url()} method="post" as="button">
                    Log out
                </TextLink>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description: 'Manage verification for your Workbine email address.',
};
