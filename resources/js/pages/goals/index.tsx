import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Target } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { PaginatedGoals } from '@/types';

type Props = {
    goals: PaginatedGoals;
};

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export default function GoalsIndex({ goals }: Props) {
    return (
        <PublicShell>
            <Head title="Real methods for real goals" />

            <main>
                <section className="border-border/60 border-b">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                        <div className="max-w-3xl">
                            <div className="bg-muted text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                                <Target className="size-4" />
                                Methods validated by real experience
                            </div>

                            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                                Find out how people actually achieve a goal.
                            </h1>

                            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
                                Workbine collects practical methods, evidence and real-world experience so useful answers are easier to trust.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button asChild size="lg">
                                    <Link href="/goals/create">
                                        Share a goal
                                        <ArrowRight />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg">
                                    <a href="#goals">Explore goals</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="goals" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mb-8 flex items-end justify-between gap-6">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Community goals</p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight">What people want to accomplish</h2>
                        </div>
                    </div>

                    {goals.data.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {goals.data.map((goal) => (
                                <Link key={goal.id} href={`/goals/${goal.slug}`} className="group block">
                                    <Card className="h-full transition-shadow group-hover:shadow-md">
                                        <CardHeader>
                                            <CardDescription>
                                                By {goal.user.name}
                                                {goal.created_at ? ` · ${formatDate(goal.created_at)}` : ''}
                                            </CardDescription>
                                            <CardTitle className="text-xl leading-7 group-hover:underline group-hover:underline-offset-4">
                                                {goal.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                                                {goal.description ?? 'No description yet. Open the goal to see community methods as they are added.'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="border-border bg-muted/20 rounded-xl border border-dashed px-6 py-16 text-center">
                            <Target className="text-muted-foreground mx-auto size-8" />
                            <h3 className="mt-4 text-lg font-semibold">No goals published yet</h3>
                            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
                                Be the first person to describe something worth figuring out together.
                            </p>
                            <Button asChild className="mt-6">
                                <Link href="/goals/create">Create the first goal</Link>
                            </Button>
                        </div>
                    )}

                    {goals.last_page > 1 && (
                        <div className="mt-10 flex items-center justify-between">
                            <Button asChild={Boolean(goals.prev_page_url)} variant="outline" disabled={!goals.prev_page_url}>
                                {goals.prev_page_url ? <Link href={goals.prev_page_url}>Previous</Link> : <span>Previous</span>}
                            </Button>
                            <span className="text-muted-foreground text-sm">
                                Page {goals.current_page} of {goals.last_page}
                            </span>
                            <Button asChild={Boolean(goals.next_page_url)} variant="outline" disabled={!goals.next_page_url}>
                                {goals.next_page_url ? <Link href={goals.next_page_url}>Next</Link> : <span>Next</span>}
                            </Button>
                        </div>
                    )}
                </section>
            </main>
        </PublicShell>
    );
}
