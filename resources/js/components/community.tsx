import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

type Person = { id: number; name: string; username: string };

export function WorkbineBrand() {
    return (
        <Link href="/" className="wb-wordmark" aria-label="Workbine home">
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
        </Link>
    );
}

export function MemberAvatar({
    name,
    large = false,
}: {
    name: string;
    large?: boolean;
}) {
    const initials = name
        .trim()
        .split(/\s+/u)
        .slice(0, 2)
        .map((part) => Array.from(part)[0] ?? '')
        .join('')
        .toLocaleUpperCase();
    return (
        <span
            aria-hidden="true"
            className={cn('wb-avatar', large && 'wb-avatar-large')}
        >
            {initials || '?'}
        </span>
    );
}

export function MemberLink({
    user,
    avatar = false,
}: {
    user: Person;
    avatar?: boolean;
}) {
    return (
        <Link href={`/members/${user.username}`} className="wb-member-link">
            {avatar && <MemberAvatar name={user.name} />}
            <span>{user.name}</span>
        </Link>
    );
}
