import { Head, Link } from '@inertiajs/react';
import { PublicShell } from '@/components/public-shell';

export default function ReputationGuide() {
    return (
        <PublicShell>
            <Head title="How reputation works" />
            <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
                <Link
                    href="/topics"
                    className="text-muted-foreground inline-flex min-h-10 items-center text-sm"
                >
                    ← Back to the community
                </Link>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                    Reputation comes from useful contributions
                </h1>
                <p className="text-muted-foreground mt-4 leading-7">
                    Share an approach, explain when it helped, and include its
                    limitations. Your score grows when other members save your
                    topics or describe a positive result after trying your
                    methods.
                </p>
                <h2 className="mt-8 text-xl font-semibold">
                    The first version of the score
                </h2>
                <dl className="bg-card mt-4 divide-y rounded-xl border px-5">
                    <div className="flex items-center justify-between gap-4 py-4">
                        <dt>Someone saves your topic</dt>
                        <dd className="shrink-0 font-semibold">+1</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                        <dt>Someone tries your method: worked for me</dt>
                        <dd className="shrink-0 font-semibold">+5</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                        <dt>Someone tries your method: partly worked</dt>
                        <dd className="shrink-0 font-semibold">+2</dd>
                    </div>
                </dl>
                <div className="mt-8 space-y-6 text-sm leading-7">
                    <section>
                        <h2 className="text-lg font-semibold">
                            Quality over volume
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Publishing more posts or uploading images adds no
                            points by itself. A negative result adds no points
                            and carries no automatic penalty. Honest limitations
                            help people decide what fits their situation.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            A few limits keep support meaningful
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Only actions from other members with a verified
                            email address count toward reputation. Your own
                            saves and experiences add no points. Each member can
                            contribute one save and their strongest current
                            outcome to an author within a topic. Across all
                            topics, one member contributes at most 25 points to
                            the same author.
                        </p>
                        <p className="text-muted-foreground mt-2">
                            The public save count includes other members’ saves
                            even when their email is unverified, so it can be
                            higher than the saves counted toward reputation.
                            Lists and saver identities stay private.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            Scores reflect the current contributions
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Removing a save or experience, changing an outcome,
                            deleting an account, or hiding content can change
                            the score. Restoring content can restore its points.
                            A profile shows the counted saves and outcomes and
                            any points excluded by the 25-point limit.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            Feedback, with context
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Outcomes are self-reported. Email verification and
                            limits reduce some easy ways to inflate points; they
                            do not prove identity, expertise or independent
                            success. Read the methods and experiences behind a
                            score. This first version does not award points to
                            the writer of an experience, grant special
                            privileges or change discovery order.
                        </p>
                    </section>
                </div>
            </main>
        </PublicShell>
    );
}
