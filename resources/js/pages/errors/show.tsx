import { Head } from '@inertiajs/react';

type Props = {
    status: number;
    title: string;
    description: string;
};

export default function ErrorPage({ status, title, description }: Props) {
    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col">
            <Head title={title}>
                <meta name="robots" content="noindex" />
            </Head>
            <header className="mx-auto w-full max-w-400 px-6 py-6 sm:px-10">
                <a href="/" className="wb-wordmark" aria-label="Workbine home">
                    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path
                            d="M3 7L9 25L16 9L23 25L29 7M5 16H27"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span>
                        workbine<span className="wb-brand-dot">.</span>
                    </span>
                </a>
            </header>
            <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pt-10 pb-24 sm:px-10">
                <p className="text-muted-foreground mb-4 text-sm font-medium">
                    Error {status}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {title}
                </h1>
                <p className="text-muted-foreground mt-4 max-w-lg text-base leading-relaxed">
                    {description}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <a
                        href="/topics"
                        className="bg-primary text-primary-foreground focus-visible:outline-ring inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                        Browse topics
                    </a>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="border-border focus-visible:outline-ring inline-flex min-h-11 items-center justify-center rounded-lg border px-5 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                        Go back
                    </button>
                </div>
            </main>
        </div>
    );
}
