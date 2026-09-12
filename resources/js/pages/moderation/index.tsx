import { Head, Link, router } from '@inertiajs/react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';

type Props = {
    kind: 'review' | 'report' | 'suspended';
    history: boolean;
    items: {
        data: {
            id: number;
            status: string;
            summary: string;
            created_at: string;
        }[];
        prev_page_url: string | null;
        next_page_url: string | null;
    };
};

export default function ModerationIndex({ kind, history, items }: Props) {
    return (
        <PublicShell>
            <Head title="Moderation">
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="wb-notebook">
                <header className="wb-notebook-masthead">
                    <div>
                        <h1>Moderation</h1>
                        <p>
                            Review held submissions and reports from the
                            community.
                        </p>
                    </div>
                </header>
                <nav
                    aria-label="Moderation queues"
                    className="mb-6 flex flex-wrap gap-3"
                >
                    <Button
                        asChild
                        variant={kind === 'review' ? 'default' : 'outline'}
                    >
                        <Link href="/moderation">Held submissions</Link>
                    </Button>
                    <Button
                        asChild
                        variant={kind === 'report' ? 'default' : 'outline'}
                    >
                        <Link href="/moderation?kind=report">
                            Community reports
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant={kind === 'suspended' ? 'default' : 'outline'}
                    >
                        <Link href="/moderation?kind=suspended">
                            Publishing suspensions
                        </Link>
                    </Button>
                    {kind !== 'suspended' && (
                        <Button asChild variant="ghost">
                            <Link
                                href={`/moderation?kind=${kind}&history=${history ? '0' : '1'}`}
                            >
                                {history
                                    ? 'Show pending only'
                                    : 'Include reviewed'}
                            </Link>
                        </Button>
                    )}
                </nav>
                {kind === 'review' && (
                    <p className="text-muted-foreground mb-5 text-sm">
                        These submissions are not public. Automated checks can
                        make mistakes; consider the context before deciding.
                        Records expire after 30 days.
                    </p>
                )}
                {items.data.length ? (
                    <div className="wb-entry-list">
                        {items.data.map((item) => (
                            <article className="wb-entry" key={item.id}>
                                <h2 className="font-semibold">
                                    {kind === 'suspended' ? (
                                        item.summary
                                    ) : (
                                        <Link
                                            href={`/moderation/${kind}/${item.id}`}
                                        >
                                            #{item.id} · {item.summary}
                                        </Link>
                                    )}
                                </h2>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    {item.status} ·{' '}
                                    {new Date(
                                        item.created_at,
                                    ).toLocaleDateString()}
                                </p>
                                {kind === 'suspended' && (
                                    <Button
                                        className="mt-3"
                                        variant="outline"
                                        onClick={() =>
                                            router.post(
                                                `/moderation/members/${item.id}/restore`,
                                            )
                                        }
                                    >
                                        Restore publishing
                                    </Button>
                                )}
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="wb-empty">
                        <h2>Nothing to review here</h2>
                        <p>
                            New submissions will appear in this list when they
                            need attention.
                        </p>
                    </div>
                )}
                <nav aria-label="Queue pages" className="mt-6 flex gap-3">
                    {items.prev_page_url && (
                        <Button asChild variant="outline">
                            <Link href={items.prev_page_url}>Previous</Link>
                        </Button>
                    )}
                    {items.next_page_url && (
                        <Button asChild variant="outline">
                            <Link href={items.next_page_url}>Next</Link>
                        </Button>
                    )}
                </nav>
            </main>
        </PublicShell>
    );
}
