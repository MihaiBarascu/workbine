import { BookOpen, MessageSquare, Route } from 'lucide-react';
import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public-shell';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <PublicShell>
            <main className="wb-auth-grid">
                <aside
                    className="wb-auth-story"
                    aria-label="About the community"
                >
                    <p className="wb-kicker">
                        Less guesswork. More shared experience.
                    </p>
                    <h2>
                        Share your way.
                        <br />
                        <span>Discover another.</span>
                    </h2>
                    <p>
                        A place for the useful details: the steps people took,
                        the things that worked, and the things they would
                        change.
                    </p>
                    <div className="wb-auth-steps">
                        <div>
                            <MessageSquare aria-hidden="true" />
                            <span>Share your method or start a topic.</span>
                        </div>
                        <div>
                            <Route aria-hidden="true" />
                            <span>Explore other ways to do it.</span>
                        </div>
                        <div>
                            <BookOpen aria-hidden="true" />
                            <span>Come back and share what happened.</span>
                        </div>
                    </div>
                    <span className="wb-auth-signature">
                        Small lessons. Shared forward.
                    </span>
                </aside>
                <section className="wb-auth-form">
                    <header>
                        <p className="wb-kicker">Welcome to Workbine</p>
                        <h1>{title}</h1>
                        <p>{description}</p>
                    </header>
                    {children}
                </section>
            </main>
        </PublicShell>
    );
}
