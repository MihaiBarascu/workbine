export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    // Settings sections share the Profile page's panel heading.
    if (variant === 'small')
        return (
            <header className="wb-panel-heading mb-0">
                <div>
                    <h2>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
            </header>
        );

    return (
        <header className="mb-8 space-y-0.5">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </header>
    );
}
