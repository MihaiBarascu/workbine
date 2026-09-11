import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    errors: Record<string, string>;
    prefix?: '' | 'method_';
    autoFocus?: boolean;
    initialValues?: {
        title: string;
        body: string;
        source_url: string | null;
    };
};

export function MethodFields({
    errors,
    prefix = '',
    autoFocus = false,
    initialValues,
}: Props) {
    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${prefix}title`}>Method title</Label>
                <Input
                    id={`${prefix}title`}
                    name={`${prefix}title`}
                    defaultValue={initialValues?.title}
                    aria-invalid={Boolean(errors[`${prefix}title`])}
                    aria-describedby={
                        errors[`${prefix}title`]
                            ? `${prefix}title-error`
                            : undefined
                    }
                    required
                    autoFocus={autoFocus}
                    maxLength={160}
                    placeholder="Validate a small batch before importing everything"
                />
                <InputError
                    id={`${prefix}title-error`}
                    message={errors[`${prefix}title`]}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}body`}>
                    Steps, context and result
                </Label>
                <textarea
                    id={`${prefix}body`}
                    name={`${prefix}body`}
                    defaultValue={initialValues?.body}
                    aria-invalid={Boolean(errors[`${prefix}body`])}
                    aria-describedby={
                        errors[`${prefix}body`]
                            ? `${prefix}body-error`
                            : undefined
                    }
                    required
                    rows={12}
                    maxLength={10000}
                    placeholder="Explain what you did, why you chose it, the important steps, what went wrong, and what you would repeat..."
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-56 w-full rounded-md border px-3 py-2 text-sm leading-6 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <InputError
                    id={`${prefix}body-error`}
                    message={errors[`${prefix}body`]}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}source_url`}>
                    Source link{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </Label>
                <Input
                    id={`${prefix}source_url`}
                    name={`${prefix}source_url`}
                    defaultValue={initialValues?.source_url ?? ''}
                    aria-invalid={Boolean(errors[`${prefix}source_url`])}
                    aria-describedby={
                        errors[`${prefix}source_url`]
                            ? `${prefix}source_url-error`
                            : undefined
                    }
                    type="url"
                    maxLength={2048}
                    placeholder="https://..."
                />
                <p className="text-muted-foreground text-sm">
                    Add the original source when you are sharing or adapting a
                    method you found elsewhere.
                </p>
                <InputError
                    id={`${prefix}source_url-error`}
                    message={errors[`${prefix}source_url`]}
                />
            </div>
        </>
    );
}
