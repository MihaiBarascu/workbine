import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    label: string;
    currentImage?: string | null;
    maxUploadMb: number;
    error?: string;
    allowRemove?: boolean;
    round?: boolean;
    onSelectionChange?: (selected: boolean) => void;
    uploadEnabled?: boolean;
};

export function ImageUploadField({
    name,
    label,
    currentImage,
    maxUploadMb,
    error,
    allowRemove = false,
    round = false,
    onSelectionChange,
    uploadEnabled = true,
}: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectionError, setSelectionError] = useState<string>();
    const [removeExisting, setRemoveExisting] = useState(false);
    const image = preview ?? (removeExisting ? null : currentImage);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    function clearSelection() {
        if (input.current) input.current.value = '';
        setPreview(null);
        setSelectionError(undefined);
        onSelectionChange?.(false);
    }

    return (
        <div className="grid min-w-0 gap-3">
            {uploadEnabled ? (
                <Label htmlFor={name}>{label}</Label>
            ) : (
                <p className="text-sm font-medium">{label}</p>
            )}
            {image && (
                <img
                    src={image}
                    alt={preview ? 'Selected photo preview' : 'Current photo'}
                    className={cn(
                        'bg-muted max-h-48 max-w-full border object-contain',
                        round
                            ? 'size-20 rounded-full object-cover'
                            : 'w-fit rounded-lg',
                    )}
                />
            )}
            {uploadEnabled && (
                <>
                    <Input
                        ref={input}
                        id={name}
                        name={name}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-invalid={Boolean(selectionError || error)}
                        aria-describedby={`${name}-help ${name}-error`}
                        className="h-auto min-h-10 min-w-0 py-2 file:mr-3 file:font-medium"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                                clearSelection();
                                return;
                            }
                            const message = ![
                                'image/jpeg',
                                'image/png',
                                'image/webp',
                            ].includes(file.type)
                                ? 'Choose a JPEG, PNG or WebP image.'
                                : file.size > maxUploadMb * 1024 * 1024
                                  ? `Choose an image smaller than ${maxUploadMb} MB.`
                                  : undefined;
                            if (message) {
                                clearSelection();
                                setSelectionError(message);
                                return;
                            }
                            setSelectionError(undefined);
                            setRemoveExisting(false);
                            setPreview(URL.createObjectURL(file));
                            onSelectionChange?.(true);
                        }}
                    />
                    <p
                        id={`${name}-help`}
                        className="text-muted-foreground text-xs leading-5"
                    >
                        JPEG, PNG or WebP, up to {maxUploadMb} MB.
                        {round
                            ? ' Your photo will be cropped to a square.'
                            : ' One image. Make sure any text is readable.'}
                    </p>
                </>
            )}
            {preview && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={clearSelection}
                >
                    Cancel selected photo
                </Button>
            )}
            {allowRemove && (
                <>
                    <input
                        type="hidden"
                        name={`remove_${name}`}
                        value={removeExisting ? '1' : '0'}
                    />
                    {currentImage && !preview && (
                        <label className="flex items-start gap-2 text-sm leading-5">
                            <input
                                type="checkbox"
                                checked={removeExisting}
                                onChange={(event) =>
                                    setRemoveExisting(event.target.checked)
                                }
                                className="accent-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 focus-visible:ring-2"
                            />
                            Remove the current photo when I save
                        </label>
                    )}
                </>
            )}
            <InputError
                id={`${name}-error`}
                message={selectionError ?? error}
            />
        </div>
    );
}

export function UploadProgress({ percentage }: { percentage?: number }) {
    if (percentage === undefined) return null;

    return (
        <div className="grid gap-1" role="status">
            <progress
                value={percentage}
                max={100}
                className="accent-primary h-2 w-full"
                aria-label="Photo upload progress"
            />
            <p className="text-muted-foreground text-xs">
                {percentage < 100
                    ? `Uploading photo… ${percentage}%`
                    : 'Upload received. Saving your photo…'}
            </p>
        </div>
    );
}
