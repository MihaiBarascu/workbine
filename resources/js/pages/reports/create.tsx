import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
    target: { type: string; id: number; title: string; url: string };
};

export default function ReportCreate({ target }: Props) {
    return (
        <PublicShell>
            <Head title="Report content">
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
                <Link
                    href={target.url}
                    className="text-muted-foreground mb-6 inline-flex min-h-10 items-center gap-2 text-sm"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to the contribution
                </Link>
                <h1 className="text-3xl font-semibold tracking-tight">
                    Report content
                </h1>
                <p className="mt-3 font-medium [overflow-wrap:anywhere]">
                    {target.title}
                </p>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                    Tell us what needs attention. Reports go to the moderation
                    queue. Your report and identity are not shown to the
                    contributor or other members. Reports do not automatically
                    hide content.
                </p>
                <Form
                    action={`/reports/${target.type}/${target.id}`}
                    method="post"
                    disableWhileProcessing
                    className="mt-8 space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="reason">
                                    Why are you reporting this?
                                </Label>
                                <select
                                    id="reason"
                                    name="reason"
                                    required
                                    defaultValue=""
                                    aria-invalid={Boolean(errors.reason)}
                                    aria-describedby="reason-error"
                                    className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm focus-visible:ring-2"
                                >
                                    <option value="" disabled>
                                        Choose a reason
                                    </option>
                                    <option value="spam">
                                        Spam or advertising
                                    </option>
                                    <option value="harassment">
                                        Harassment or hateful content
                                    </option>
                                    <option value="unsafe">
                                        Unsafe or harmful content
                                    </option>
                                    <option value="privacy">
                                        Personal information or privacy
                                    </option>
                                    <option value="other">
                                        Something else
                                    </option>
                                </select>
                                <InputError
                                    id="reason-error"
                                    message={errors.reason}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="details">
                                    Details (required for “Something else”)
                                </Label>
                                <textarea
                                    id="details"
                                    name="details"
                                    rows={6}
                                    maxLength={2000}
                                    aria-invalid={Boolean(errors.details)}
                                    aria-describedby="details-help details-error"
                                    className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm leading-6 focus-visible:ring-2"
                                />
                                <p
                                    id="details-help"
                                    className="text-muted-foreground text-xs leading-5"
                                >
                                    Include enough context to review the issue.
                                    Do not include passwords or unnecessary
                                    personal information. One report per
                                    contribution is enough.
                                </p>
                                <InputError
                                    id="details-error"
                                    message={errors.details}
                                />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Sending…' : 'Send report'}
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={target.url}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </main>
        </PublicShell>
    );
}
