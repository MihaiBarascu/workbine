import { Head } from '@inertiajs/react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';

const modes: {
    value: Appearance;
    title: string;
    description: string;
    icon: typeof Sun;
}[] = [
    {
        value: 'light',
        title: 'Light',
        description: 'A clear, bright workspace.',
        icon: Sun,
    },
    {
        value: 'dark',
        title: 'Dark',
        description: 'A softer view after hours.',
        icon: Moon,
    },
    {
        value: 'system',
        title: 'System',
        description: 'Follow this device’s setting.',
        icon: Monitor,
    },
];

export default function AppearanceSettings() {
    const { appearance, updateAppearance } = useAppearance();
    return (
        <>
            <Head title="Appearance settings" />
            <section className="wb-panel">
                <div className="wb-panel-heading">
                    <div>
                        <p className="wb-kicker">Your reading environment</p>
                        <h2>Appearance</h2>
                        <p>
                            Choose the view that feels most comfortable. The
                            preference is saved on this device.
                        </p>
                    </div>
                </div>
                <div
                    role="group"
                    aria-label="Color theme"
                    className="wb-theme-options"
                >
                    {modes.map(({ value, title, description, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={appearance === value}
                            onClick={() => updateAppearance(value)}
                            className="wb-theme-option"
                        >
                            <span
                                className={`wb-theme-preview wb-theme-${value}`}
                                aria-hidden="true"
                            >
                                <i />
                                <i />
                                <i />
                            </span>
                            <span className="flex items-center gap-2">
                                <Icon className="size-4" aria-hidden="true" />
                                <strong>{title}</strong>
                                {appearance === value && (
                                    <Check
                                        className="ml-auto size-4"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                            <small>{description}</small>
                        </button>
                    ))}
                </div>
                <p role="status" className="text-muted-foreground mt-5 text-sm">
                    {modes.find((mode) => mode.value === appearance)?.title}{' '}
                    appearance selected.
                </p>
            </section>
        </>
    );
}
