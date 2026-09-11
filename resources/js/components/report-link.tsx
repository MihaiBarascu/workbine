import { Link, usePage } from '@inertiajs/react';
import { Flag } from 'lucide-react';

export function ReportLink({
    type,
    id,
}: {
    type: 'topic' | 'method' | 'experience';
    id: number;
}) {
    const { reportsEnabled } = usePage<{ reportsEnabled: boolean }>().props;
    if (!reportsEnabled) return null;

    return (
        <Link
            href={`/reports/${type}/${id}/create`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm focus-visible:ring-2"
        >
            <Flag className="size-3.5" aria-hidden="true" />
            Report <span className="sr-only">{type}</span>
        </Link>
    );
}
