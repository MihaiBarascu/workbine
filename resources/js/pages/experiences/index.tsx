import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, MessageCircleMore } from 'lucide-react';
import { CopyLinkButton } from '@/components/copy-link-button';
import { ExperienceForm } from '@/components/experience-form';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { ExperienceOutcome, ExperienceSummary, PaginatedExperiences, User } from '@/types';

type Props = {
    topic: { id: number; title: string; slug: string };
    method: { id: number; title: string; user: { id: number; name: string } };
    experiences: PaginatedExperiences;
    ownExperience: ExperienceSummary | null;
    summary: Record<ExperienceOutcome, number>;
};

const outcomes: Record<ExperienceOutcome, string> = {
    worked: 'Worked for me',
    partly: 'Partly worked',
    did_not_work: 'Did not work for me',
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(value));
}

export default function ExperiencesIndex({ topic, method, experiences, ownExperience, summary }: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const base = `/topics/${topic.slug}/methods/${method.id}`;
    const isAuthor = auth.user?.id === method.user.id;

    return (
        <PublicShell>
            <Head title={`Experiences - ${method.title}`} />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                <Button asChild variant="ghost" className="mb-6 -ml-3">
                    <Link href={`/topics/${topic.slug}#method-${method.id}`}>
                        <ArrowLeft aria-hidden="true" />
                        Back to the method
                    </Link>
                </Button>
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">After trying the method</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{method.title}</h1>
                <p className="text-muted-foreground mt-3 text-sm [overflow-wrap:anywhere]">
                    Method shared by {method.user.name} · Topic: {topic.title}
                </p>
                <div className="mt-5"><CopyLinkButton path={`${base}/experiences`} /></div>

                <section aria-label="Reported outcomes" className="mt-8 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(outcomes) as ExperienceOutcome[]).map((outcome) => (
                        <div key={outcome} className="bg-card rounded-xl border p-4">
                            <p className="text-2xl font-semibold">{summary[outcome]}</p>
                            <p className="text-muted-foreground mt-1 text-sm">{outcomes[outcome]}</p>
                        </div>
                    ))}
                </section>
                <p className="text-muted-foreground mt-3 text-xs leading-5">
                    Self-reported experiences, not independent verification. Results depend on context. One experience per person; updates replace their earlier entry.
                </p>

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <section aria-labelledby="experiences-heading" className="min-w-0">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <h2 id="experiences-heading" className="text-xl font-semibold">
                                {experiences.total} {experiences.total === 1 ? 'experience' : 'experiences'}
                            </h2>
                            {!isAuthor && (
                                <Button asChild size="sm" variant="outline">
                                    {auth.user ? <a href="#share">{ownExperience ? 'Edit my experience' : 'I tried this'}</a> : <Link href={`${base}/experiences/create`}>I tried this</Link>}
                                </Button>
                            )}
                        </div>
                        {experiences.data.length === 0 ? (
                            <div className="bg-muted/20 rounded-2xl border border-dashed p-8 text-center">
                                <MessageCircleMore className="mx-auto size-8 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                                <h3 className="mt-4 text-lg font-semibold">Tried it? Your context matters.</h3>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">Share what happened, even when it only partly worked or did not help. An honest limitation can save someone time.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {experiences.data.map((experience) => (
                                    <article key={experience.id} id={`experience-${experience.id}`} className="bg-card scroll-mt-36 rounded-2xl border p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{experience.user.name}</h3>
                                            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-100">{outcomes[experience.outcome]}</span>
                                        </div>
                                        {experience.updated_at && <p className="text-muted-foreground mt-2 text-xs">Last shared <time dateTime={experience.updated_at}>{formatDate(experience.updated_at)}</time></p>}
                                        {experience.tried_on && <p className="text-muted-foreground mt-1 text-xs">Tried on <time dateTime={experience.tried_on}>{formatDate(experience.tried_on)}</time></p>}
                                        <p className="mt-4 text-sm leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap">{experience.body}</p>
                                        {experience.evidence_url && (
                                            <a href={experience.evidence_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-4 inline-flex items-center gap-2 text-sm text-teal-700 underline underline-offset-4 dark:text-teal-300">
                                                View shared evidence <ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
                                            </a>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                        {experiences.last_page > 1 && (
                            <nav aria-label="Experience pagination" className="mt-6 flex items-center justify-between gap-3">
                                <Button asChild={Boolean(experiences.prev_page_url)} variant="outline" disabled={!experiences.prev_page_url}>
                                    {experiences.prev_page_url ? <Link href={experiences.prev_page_url}>Previous</Link> : <span>Previous</span>}
                                </Button>
                                <span className="text-muted-foreground text-sm">Page {experiences.current_page} of {experiences.last_page}</span>
                                <Button asChild={Boolean(experiences.next_page_url)} variant="outline" disabled={!experiences.next_page_url}>
                                    {experiences.next_page_url ? <Link href={experiences.next_page_url}>Next</Link> : <span>Next</span>}
                                </Button>
                            </nav>
                        )}
                    </section>
                    <section id="share" tabIndex={-1} aria-labelledby="share-heading" className="bg-card h-fit min-w-0 scroll-mt-36 rounded-2xl border p-5">
                        <h2 id="share-heading" className="text-xl font-semibold">{ownExperience ? 'Update your experience' : 'Share your experience'}</h2>
                        <p className="text-muted-foreground mt-2 mb-6 text-sm leading-6">Tell the next person what to expect, not just whether you liked the idea.</p>
                        {!auth.user ? (
                            <Button asChild className="w-full"><Link href={`${base}/experiences/create`}>Log in to share an experience</Link></Button>
                        ) : isAuthor ? (
                            <p className="text-muted-foreground text-sm leading-6">You shared this method. Experiences are for other people who tried it, so you cannot validate your own method.</p>
                        ) : (
                            <ExperienceForm action={`${base}/experience`} experience={ownExperience} />
                        )}
                    </section>
                </div>
            </main>
        </PublicShell>
    );
}
