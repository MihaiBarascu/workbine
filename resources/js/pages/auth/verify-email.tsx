import { Form, Head, usePage } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

export default function VerifyEmail({ status }: { status?: string | null }) {
    const { auth } = usePage<{ auth: Auth }>().props;
    return (
        <>
            <Head title="Email verification" />

            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Check the inbox for{' '}
                <span className="break-all">{auth.user.email}</span> and follow
                the verification link. Confirm your address before publishing or
                saving topics. You can keep browsing while you wait.
            </p>

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="text-primary mb-4 text-center text-sm font-medium"
                >
                    A new verification link has been sent to the email address
                    on your account.
                </div>
            )}

            <Form {...send.form()} className="mb-6 text-center">
                {({ processing }) => (
                    <Button disabled={processing} variant="secondary">
                        {processing && <Spinner />}
                        Resend verification email
                    </Button>
                )}
            </Form>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <TextLink href="/topics">Continue to topics</TextLink>
                <TextLink href="/settings/profile">
                    Change email address
                </TextLink>
                <TextLink href={logout.url()} method="post" as="button">
                    Log out
                </TextLink>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Confirm your email',
    description: 'One quick step before contributing to Workbine.',
};
