import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicMember } from '@/types';

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
    src,
    large = false,
}: {
    name: string;
    src?: string | null;
    large?: boolean;
}) {
    const [failedSource, setFailedSource] = useState<string | null>(null);
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
            className={cn(
                'wb-avatar overflow-hidden',
                large && 'wb-avatar-large',
            )}
        >
            {src && src !== failedSource ? (
                <img
                    src={src}
                    alt=""
                    width={large ? 88 : 32}
                    height={large ? 88 : 32}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedSource(src)}
                    className="size-full object-cover"
                />
            ) : (
                initials || '?'
            )}
        </span>
    );
}

export function MemberLink({
    user,
    avatar = false,
}: {
    user: PublicMember;
    avatar?: boolean;
}) {
    return (
        <Link href={`/members/${user.username}`} className="wb-member-link">
            {avatar && <MemberAvatar name={user.name} src={user.avatar_url} />}
            <span>{user.name}</span>
        </Link>
    );
}
