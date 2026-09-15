import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, MessagesSquare, PenLine } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';

export default function CommunityGuide() {
    return (
        <PublicShell>
            <Head title="Community guide" />
            <main className="wb-community-guide mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
                <p className="wb-kicker">Welcome to Workbine</p>
                <h1 className="mt-3 text-4xl font-semibold">
                    Something you’ve learned could help someone else.
                </h1>
                <p className="text-muted-foreground mt-5 text-lg leading-8">
                    Share practical ways to solve real problems, build things,
                    learn skills, or improve how you work. Explain what you did,
                    the context, and what actually happened.
                </p>
                <div className="my-8 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/topics">
                            Explore topics <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/topics/create">Start a topic</Link>
                    </Button>
                </div>
                <div className="wb-guide-cards">
                    <section>
                        <BookOpen aria-hidden="true" />
                        <div>
                            <h2>Start with a topic</h2>
                            <p>
                                A topic is something people want to do or
                                understand. Give it a clear title and a little
                                context. You can share your own method straight
                                away, or invite other people to suggest one.
                            </p>
                        </div>
                    </section>
                    <section>
                        <PenLine aria-hidden="true" />
                        <div>
                            <h2>Share a method that helped</h2>
                            <p>
                                Explain what you did, when it helped, and
                                anything you would change. Use the editor to add
                                paragraphs, lists, links and photos where they
                                make your explanation clearer. Credit the source
                                if the approach comes from someone else.
                            </p>
                        </div>
                    </section>
                    <section>
                        <MessagesSquare aria-hidden="true" />
                        <div>
                            <h2>Tried it? Share what happened</h2>
                            <p>
                                Open a method and choose “I tried this”. Say
                                whether it worked, partly worked, or didn’t work
                                for you, then explain your situation. You can
                                add photos in the same editor and update your
                                response later. A different result is useful
                                too.
                            </p>
                        </div>
                    </section>
                </div>
                <section className="wb-guide-example mt-8 rounded-xl border p-6">
                    <p className="wb-kicker">
                        A simple example · illustration only
                    </p>
                    <h2 className="mt-3 text-xl font-semibold">
                        Keeping a weekly meal plan simple
                    </h2>
                    <p className="mt-4 leading-7">
                        <strong>A method:</strong> “I keep five reliable dinners
                        on a short list, plan four of them, and leave one
                        evening flexible. I shop from the same base ingredients
                        so unused food can move to another meal.”
                    </p>
                    <p className="mt-3 leading-7">
                        <strong>A response:</strong> “It worked for three weeks.
                        I wasted less food, but I needed one faster backup meal
                        for busy days.”
                    </p>
                </section>
                <section className="mt-9 space-y-3 leading-7">
                    <h2 className="text-xl font-semibold">
                        Explain the context behind the result
                    </h2>
                    <p>
                        Say what you were trying to do, the constraints you had,
                        the tools or materials involved, and any meaningful time
                        or cost. Describe what changed, what surprised you, and
                        what you would do differently. A result without context
                        is much harder for someone else to use.
                    </p>
                </section>
                <section className="mt-9 space-y-3 leading-7">
                    <h2 className="text-xl font-semibold">
                        Make room for real people
                    </h2>
                    <p>
                        Be specific, kind, and honest about the limits of your
                        experience. Ask for context before judging someone’s
                        result. Share photos you have permission to use and
                        check that they don’t reveal private information.
                    </p>
                    <p>
                        Do not post pornography, graphic abuse, threats, hateful
                        attacks, dangerous instructions, scams, or someone
                        else’s private information. Respectful discussions about
                        health and recovery are welcome.
                    </p>
                    <p className="text-muted-foreground">
                        Public text and uploaded photos may be checked by OpenAI
                        before publication. Flagged submissions can be held
                        privately for human review. Review records expire after
                        30 days; administrators can correct mistaken decisions.
                    </p>
                </section>
                <section className="mt-9 space-y-3 leading-7">
                    <h2 className="text-xl font-semibold">
                        Come back when you need it
                    </h2>
                    <p>
                        Save useful topics to your private list. Your
                        notifications show new methods on your topics and
                        people’s first responses to your methods. Find your own
                        contributions through My topics or your profile.
                    </p>
                    <Link
                        className="wb-guide-link"
                        href="/community/reputation"
                    >
                        How reputation works <ArrowRight aria-hidden="true" />
                    </Link>
                </section>
            </main>
        </PublicShell>
    );
}
