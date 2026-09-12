import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function TopicClassification({
    categories,
    category,
    tags = [],
    errors,
}: {
    categories: Record<string, string>;
    category?: string | null;
    tags?: string[];
    errors: Record<string, string>;
}) {
    return (
        <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor="category">
                    Category{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </Label>
                <select
                    id="category"
                    name="category"
                    defaultValue={category ?? ''}
                    className="wb-category-select"
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={
                        errors.category ? 'category-error' : undefined
                    }
                >
                    <option value="">Choose a category</option>
                    {Object.entries(categories).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <InputError id="category-error" message={errors.category} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="tags">
                    Tags{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </Label>
                <Input
                    id="tags"
                    name="tags"
                    defaultValue={tags.join(', ')}
                    maxLength={100}
                    placeholder="n8n, client-work"
                    aria-describedby="tags-hint tags-error"
                    aria-invalid={Object.keys(errors).some((key) =>
                        key.startsWith('tags'),
                    )}
                />
                <p id="tags-hint" className="text-muted-foreground text-xs">
                    Up to 3 short tags, separated by commas.
                </p>
                <InputError
                    id="tags-error"
                    message={
                        Object.entries(errors).find(([key]) =>
                            key.startsWith('tags'),
                        )?.[1]
                    }
                />
            </div>
        </div>
    );
}
