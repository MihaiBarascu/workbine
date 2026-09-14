import { Link, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

type Props = {
    memberId: number;
    username: string;
    context?: {
        type: 'method' | 'experience';
        id: number;
    };
    label?: string;
    compact?: boolean;
};

export function MemberMessageLink({
    memberId,
    username,
    context,
    label = 'Message',
    compact = false,
}: Props) {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    if (auth.user?.id === memberId) return null;

    const params = context
        ? `?context_type=${context.type}&context_id=${context.id}`
        : '';

    if (compact) {
        return (
            <Link
                href={`/members/${username}/message${params}`}
                title={label}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium focus-visible:ring-2"
            >
                <MessageCircle className="size-4" aria-hidden="true" />
                {label}
            </Link>
        );
    }

    return (
        <Button asChild variant="outline">
            <Link href={`/members/${username}/message${params}`}>
                <MessageCircle aria-hidden="true" />
                {label}
            </Link>
        </Button>
    );
}
