import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function GoalCreate() {
    return (
        <>
            <Head title="Create a goal" />

            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
                <Button asChild variant="ghost" className="mb-5 -ml-3">
                    <Link href="/goals">
                        <ArrowLeft />
                        Back to goals
                    </Link>
                </Button>

                <div className="mb-8">
                    <p className="text-muted-foreground text-sm font-medium">
                        New community goal
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                        What are you trying to accomplish?
                    </h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                        Describe the outcome clearly. Methods and real
                        experiences will be attached to this goal in the next
                        step of Workbine.
                    </p>
                </div>

                <Form
                    action="/goals"
                    method="post"
                    disableWhileProcessing
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Goal</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    autoFocus
                                    maxLength={160}
                                    placeholder="How to build a SaaS with Gemini"
                                />
                                <p className="text-muted-foreground text-sm">
                                    Start with the result someone wants, not
                                    with a specific solution.
                                </p>
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Context</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={7}
                                    maxLength={5000}
                                    placeholder="Add constraints, context or what a useful answer should cover..."
                                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-32 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Publish goal
                                </Button>
                                <Button asChild variant="ghost" size="lg">
                                    <Link href="/goals">Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

GoalCreate.layout = {
    breadcrumbs: [
        {
            title: 'Goals',
            href: '/goals',
        },
        {
            title: 'Create',
            href: '/goals/create',
        },
    ],
};
