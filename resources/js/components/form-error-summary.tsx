import { useEffect, useRef } from 'react';

type Props = {
    errors: Record<string, string>;
    fields: Record<string, string>;
    focusKey: number;
};

export function FormErrorSummary({ errors, fields, focusKey }: Props) {
    const summary = useRef<HTMLDivElement>(null);
    const entries = Object.entries(errors).filter(([, message]) => message);

    useEffect(() => {
        if (focusKey > 0) {
            summary.current?.focus();
        }
    }, [focusKey]);

    if (!entries.length) {
        return null;
    }

    return (
        <div
            ref={summary}
            tabIndex={-1}
            role="alert"
            aria-labelledby="form-error-heading"
            className="wb-form-errors"
        >
            <h2 id="form-error-heading">Check the highlighted fields</h2>
            <p>Your writing is still here. Choose a field to fix it.</p>
            <ul>
                {entries.map(([field, message]) => (
                    <li key={field}>
                        {fields[field] ? (
                            <a
                                href={`#${field}`}
                                onClick={(event) => {
                                    const input = document.getElementById(field);
                                    if (input) {
                                        event.preventDefault();
                                        input.focus();
                                    }
                                }}
                            >
                                {fields[field]}
                            </a>
                        ) : (
                            message
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
