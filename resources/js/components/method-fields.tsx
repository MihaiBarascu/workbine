import { RichTextEditor } from '@/components/rich-text-editor';
import type { RichTextNode } from '@/components/rich-text-content';
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
        body_document?: RichTextNode | null;
        source_url: string | null;
    };
};

export function MethodFields({
    errors,
    prefix = '',
    autoFocus = false,
    initialValues,
}: Props) {
    const describedBy = (field: string) =>
        [
            `${prefix}${field}-hint`,
            errors[`${prefix}${field}`] ? `${prefix}${field}-error` : '',
        ]
            .filter(Boolean)
            .join(' ');

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${prefix}title`}>Method title</Label>
                <Input
                    id={`${prefix}title`}
                    name={`${prefix}title`}
                    defaultValue={initialValues?.title}
                    aria-invalid={Boolean(errors[`${prefix}title`])}
                    aria-describedby={describedBy('title')}
                    required
                    autoFocus={autoFocus}
                    maxLength={160}
                    placeholder="Start with one small, repeatable step"
                />
                <p
                    id={`${prefix}title-hint`}
                    className="text-muted-foreground text-sm"
                >
                    Give your approach a short name so people know what to
                    expect.
                </p>
                <InputError
                    id={`${prefix}title-error`}
                    message={errors[`${prefix}title`]}
                />
            </div>

            <div className="grid gap-2">
                <Label id={`${prefix}body-label`} htmlFor={`${prefix}body`}>
                    How you do it
                </Label>
                <p
                    id={`${prefix}body-hint`}
                    className="text-muted-foreground text-sm leading-6"
                >
                    Share the steps you took and what happened. Write as if you
                    were explaining it to a friend.
                </p>
                <RichTextEditor
                    id={`${prefix}body`}
                    name={`${prefix}body`}
                    initialText={initialValues?.body}
                    initialDocument={initialValues?.body_document}
                    invalid={Boolean(errors[`${prefix}body`])}
                    describedBy={describedBy('body')}
                    placeholder="Explain what you did and what happened. Add photos wherever they help."
                />
                <InputError
                    id={`${prefix}body-error`}
                    message={errors[`${prefix}body`]}
                />
            </div>

            <details
                className="wb-writing-help"
                open={
                    initialValues?.source_url || errors[`${prefix}source_url`]
                        ? true
                        : undefined
                }
            >
                <summary>Add a source</summary>
                <div className="mt-3 grid gap-2">
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
                        aria-describedby={describedBy('source_url')}
                        type="url"
                        maxLength={2048}
                        placeholder="https://…"
                    />
                    <p
                        id={`${prefix}source_url-hint`}
                        className="text-muted-foreground text-sm leading-6"
                    >
                        Learned this from someone else? Credit the original
                        source with an http:// or https:// link.
                    </p>
                    <InputError
                        id={`${prefix}source_url-error`}
                        message={errors[`${prefix}source_url`]}
                    />
                </div>
            </details>
        </>
    );
}
