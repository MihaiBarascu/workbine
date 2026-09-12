import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import Turnstile from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { request as requestPasswordReset } from '@/routes/password';

type Props = {
    passwordRules: string;
    turnstileSiteKey: string | null;
};

export default function Register({ passwordRules, turnstileSiteKey }: Props) {
    const [turnstileToken, setTurnstileToken] = useState('');
    const [verificationAttempt, setVerificationAttempt] = useState(0);

    return (
        <>
            <Head title="Register" />

            <div className="flex flex-col gap-6">
                <Button asChild variant="outline" className="w-full">
                    <a href="/auth/google">Continue with Google</a>
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="border-border w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card text-muted-foreground px-2">
                            or create with email
                        </span>
                    </div>
                </div>

                <Form
                    {...store.form()}
                    resetOnSuccess={['password', 'password_confirmation']}
                    disableWhileProcessing
                    onFinish={() =>
                        setVerificationAttempt((value) => value + 1)
                    }
                    className="flex flex-col gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        autoComplete="name"
                                        name="name"
                                        placeholder="Full name"
                                    />
                                    <InputError
                                        message={errors.name}
                                        className="mt-2"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        name="email"
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                    {errors.email && (
                                        <p className="text-muted-foreground text-sm">
                                            Already used this address?{' '}
                                            <TextLink href={login()}>
                                                Log in
                                            </TextLink>{' '}
                                            or{' '}
                                            <TextLink
                                                href={requestPasswordReset()}
                                            >
                                                reset your password
                                            </TextLink>{' '}
                                            to recover access.
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <PasswordInput
                                        id="password"
                                        required
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Password"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Confirm password"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                {turnstileSiteKey !== null && (
                                    <div className="grid gap-2">
                                        <Turnstile
                                            siteKey={turnstileSiteKey}
                                            resetKey={verificationAttempt}
                                            onToken={setTurnstileToken}
                                        />
                                        <input
                                            type="hidden"
                                            name="cf-turnstile-response"
                                            value={turnstileToken}
                                        />
                                        <InputError
                                            message={
                                                errors['cf-turnstile-response']
                                            }
                                        />
                                    </div>
                                )}

                                <InputError message={errors.request} />

                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        (turnstileSiteKey !== null &&
                                            !turnstileToken)
                                    }
                                    className="mt-2 w-full"
                                    data-test="register-user-button"
                                >
                                    {processing && <Spinner />}
                                    Create account
                                </Button>
                                <p className="text-muted-foreground text-sm">
                                    We’ll email you a confirmation link before
                                    you can publish or save topics.
                                </p>
                            </div>

                            <div className="text-muted-foreground text-center text-sm">
                                Already have an account?{' '}
                                <TextLink href={login()} tabIndex={6}>
                                    Log in
                                </TextLink>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Continue with Google or enter your details below',
};
