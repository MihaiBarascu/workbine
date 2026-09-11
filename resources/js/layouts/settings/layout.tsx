import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { MemberAvatar } from '@/components/community';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import type { Auth } from '@/types';

const sections = [
    {
        title: 'Profile',
        href: '/settings/profile',
        icon: UserRound,
        description: 'Your introduction and account',
    },
    {
        title: 'Security',
        href: '/settings/security',
        icon: ShieldCheck,
        description: 'Password and sign-in methods',
    },
    {
        title: 'Appearance',
        href: '/settings/appearance',
        icon: Palette,
        description: 'Make yourself at home',
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const path = usePage().url.split('?')[0];
    return (
        <PublicShell>
            <main className="wb-page wb-account-page">
                <header className="wb-account-heading">
                    <div className="flex min-w-0 items-center gap-4">
                        <MemberAvatar
                            name={auth.user.name}
                            src={auth.user.avatar_url}
                            large
                        />
                        <div className="min-w-0">
                            <p className="wb-kicker">Your space on Workbine</p>
                            <h1>Your account</h1>
                            <p className="text-muted-foreground mt-1 text-sm [overflow-wrap:anywhere]">
                                A little about you. Everything under your
                                control.
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={`/members/${auth.user.username}`}>
                            View public profile
                            <ArrowUpRight aria-hidden="true" />
                        </Link>
                    </Button>
                </header>
                <div className="wb-settings-grid">
                    <aside>
                        <nav aria-label="Settings" className="wb-settings-nav">
                            {sections.map(
                                ({ title, href, icon: Icon, description }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        aria-current={
                                            path === href ? 'page' : undefined
                                        }
                                    >
                                        <Icon aria-hidden="true" />
                                        <span>
                                            <strong>{title}</strong>
                                            <small>{description}</small>
                                        </span>
                                    </Link>
                                ),
                            )}
                        </nav>
                        <p className="wb-private-note">
                            <ShieldCheck aria-hidden="true" />
                            Only you can see your account settings. Your email
                            and sign-in details are never shown on your public
                            profile.
                        </p>
                    </aside>
                    <section
                        className="wb-settings-content"
                        aria-label="Account preferences"
                    >
                        {children}
                    </section>
                </div>
            </main>
        </PublicShell>
    );
}
