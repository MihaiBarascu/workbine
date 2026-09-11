import { Form, Head, Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Globe, LockKeyhole } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    return (
        <>
            <Head title="Profile settings" />
            <Form
                {...ProfileController.update.form()}
                options={{ preserveScroll: true }}
                disableWhileProcessing
                className="wb-settings-form"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <section className="wb-panel">
                            <div className="wb-panel-heading">
                                <div>
                                    <p className="wb-kicker">
                                        <Globe aria-hidden="true" />
                                        Visible to the community
                                    </p>
                                    <h2>Make your profile yours</h2>
                                    <p>
                                        Help people put a person behind the
                                        practical advice.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={auth.user.name}
                                        maxLength={255}
                                        required
                                        autoComplete="name"
                                        aria-invalid={Boolean(errors.name)}
                                        aria-describedby="name-error"
                                    />
                                    <InputError
                                        id="name-error"
                                        message={errors.name}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bio">
                                        About you{' '}
                                        <span className="text-muted-foreground font-normal">
                                            (optional)
                                        </span>
                                    </Label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        rows={4}
                                        maxLength={500}
                                        defaultValue={auth.user.bio ?? ''}
                                        placeholder="What do you spend your time figuring out?"
                                        className="wb-textarea"
                                        aria-invalid={Boolean(errors.bio)}
                                        aria-describedby="bio-help bio-error"
                                    />
                                    <p
                                        id="bio-help"
                                        className="text-muted-foreground text-xs"
                                    >
                                        Your background, interests, or the
                                        experience you bring. Up to 500
                                        characters.
                                    </p>
                                    <InputError
                                        id="bio-error"
                                        message={errors.bio}
                                    />
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="location">
                                            Location (optional)
                                        </Label>
                                        <Input
                                            id="location"
                                            name="location"
                                            maxLength={100}
                                            defaultValue={
                                                auth.user.location ?? ''
                                            }
                                            placeholder="City or region"
                                            autoComplete="address-level2"
                                            aria-invalid={Boolean(
                                                errors.location,
                                            )}
                                            aria-describedby="location-error"
                                        />
                                        <InputError
                                            id="location-error"
                                            message={errors.location}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="website">
                                            Website (optional)
                                        </Label>
                                        <Input
                                            id="website"
                                            name="website"
                                            type="url"
                                            maxLength={2048}
                                            defaultValue={
                                                auth.user.website ?? ''
                                            }
                                            placeholder="https://your-site.com"
                                            autoComplete="url"
                                            aria-invalid={Boolean(
                                                errors.website,
                                            )}
                                            aria-describedby="website-error"
                                        />
                                        <InputError
                                            id="website-error"
                                            message={errors.website}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={`/members/${auth.user.id}`}
                                className="wb-inline-link mt-6"
                            >
                                See your public profile
                                <ArrowUpRight aria-hidden="true" />
                            </Link>
                        </section>
                        <section className="wb-panel">
                            <div className="wb-panel-heading">
                                <div>
                                    <p className="wb-kicker">
                                        <LockKeyhole aria-hidden="true" />
                                        Only visible to you
                                    </p>
                                    <h2>Account email</h2>
                                    <p>
                                        Used to sign in and recover access.
                                        Never displayed to other members.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="email"
                                    defaultValue={auth.user.email}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby="email-error"
                                />
                                <InputError
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>
                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="mt-4 text-sm">
                                        <p>
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="underline underline-offset-4"
                                            >
                                                Send a verification email
                                            </Link>
                                        </p>
                                        {status ===
                                            'verification-link-sent' && (
                                            <p role="status" className="mt-2">
                                                A new verification link has been
                                                sent.
                                            </p>
                                        )}
                                    </div>
                                )}
                        </section>
                        <div className="wb-save-row">
                            <p
                                role="status"
                                className="text-muted-foreground text-sm"
                            >
                                {recentlySuccessful
                                    ? 'Your profile has been saved.'
                                    : 'Only share details you are comfortable making public.'}
                            </p>
                            <Button
                                type="submit"
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing ? 'Saving…' : 'Save changes'}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
            <div className="wb-panel wb-danger-panel">
                <DeleteUser />
            </div>
        </>
    );
}
