import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MessageSquareText, UserRound } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalSummary } from '@/types';

type Props = {
    goal: GoalSummary;
};

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export default function GoalShow({ goal }: Props) {
    return (
        <PublicShell>
            <Head title={goal.title} />

            <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href="/goals">
                        <ArrowLeft />
                        All goals
                    </Link>
                </Button>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">
                            Community goal
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                            {goal.title}
                        </h1>

                        {goal.description && (
                            <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8 whitespace-pre-wrap">
                                {goal.description}
                            </p>
                        )}

                        <section className="mt-12">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">
                                        Methods
                                    </p>
                                    <h2 className="mt-1 text-2xl font-semibold">
                                        How people actually did it
                                    </h2>
                                </div>
                            </div>

                            <div className="border-border bg-muted/20 rounded-xl border border-dashed px-6 py-12 text-center">
                                <MessageSquareText className="text-muted-foreground mx-auto size-8" />
                                <h3 className="mt-4 font-semibold">
                                    No methods published yet
                                </h3>
                                <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
                                    This is the next layer of Workbine: people
                                    will be able to publish the exact method
                                    they used, then others can validate it with
                                    real experience and evidence.
                                </p>
                            </div>
                        </section>
                    </div>

                    <aside>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Goal details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <UserRound className="text-muted-foreground mt-0.5 size-4" />
                                    <div>
                                        <p className="text-muted-foreground">
                                            Created by
                                        </p>
                                        <p className="font-medium">
                                            {goal.user.name}
                                        </p>
                                    </div>
                                </div>

                                {goal.created_at && (
                                    <div>
                                        <p className="text-muted-foreground">
                                            Published
                                        </p>
                                        <p className="font-medium">
                                            {formatDate(goal.created_at)}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>
        </PublicShell>
    );
}
