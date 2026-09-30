import { Camera, ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import '../../css/photos.css';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    /** Shown beside the choose button once a photo is selected, e.g. Save. */
    actions?: ReactNode;
};

/**
 * One photo with a live preview: choose it with a button or drop it on the
 * field. The native file input stays in the form, visually hidden.
 */
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
    actions,
}: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectionError, setSelectionError] = useState<string>();
    const [removeExisting, setRemoveExisting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
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

    function select(file: File | undefined) {
        if (!file) {
            clearSelection();
            return;
        }
        const message = !TYPES.includes(file.type)
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
    }

    return (
        <div
            className={cn('wb-image-field', round && 'is-round')}
            data-drag-over={dragOver}
            onDragOver={(event) => {
                if (
                    !uploadEnabled ||
                    !event.dataTransfer.types.includes('Files')
                )
                    return;
                event.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={(event) => {
                if (
                    !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                    )
                )
                    setDragOver(false);
            }}
            onDrop={(event) => {
                const file = event.dataTransfer.files[0];
                if (!uploadEnabled || !file) return;
                event.preventDefault();
                setDragOver(false);
                // The dropped file travels with the form like a chosen one.
                if (input.current) {
                    const files = new DataTransfer();
                    files.items.add(file);
                    input.current.files = files.files;
                }
                select(file);
            }}
        >
            {uploadEnabled && (
                <input
                    ref={input}
                    id={name}
                    name={name}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-invalid={Boolean(selectionError || error)}
                    aria-describedby={`${name}-help ${name}-error`}
                    className="sr-only"
                    onChange={(event) => select(event.target.files?.[0])}
                />
            )}
            <div className="wb-image-field-preview">
                {image ? (
                    <img
                        src={image}
                        alt={
                            preview ? 'Selected photo preview' : 'Current photo'
                        }
                    />
                ) : (
                    <ImagePlus aria-hidden="true" />
                )}
            </div>
            <div className="wb-image-field-controls">
                {uploadEnabled ? (
                    <>
                        <div className="wb-image-field-actions">
                            <label
                                htmlFor={name}
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    'wb-image-field-choose cursor-pointer',
                                )}
                            >
                                <Camera aria-hidden="true" />
                                {label}
                            </label>
                            {preview && actions}
                            {preview && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={clearSelection}
                                >
                                    Cancel selected photo
                                </Button>
                            )}
                        </div>
                        <p
                            id={`${name}-help`}
                            className="text-muted-foreground text-xs leading-5"
                        >
                            {preview && 'Save to use this photo. '}
                            JPEG, PNG or WebP, up to {maxUploadMb} MB.
                            {round
                                ? ' Your photo will be cropped to a square.'
                                : ' One image. Make sure any text is readable.'}{' '}
                            You can also drop it here.
                        </p>
                    </>
                ) : (
                    <p className="text-sm font-medium">{label}</p>
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
        </div>
    );
}

export function UploadProgress({ percentage }: { percentage?: number }) {
    if (percentage === undefined) return null;

    return (
        <div className="grid gap-1.5" role="status">
            <div
                className="wb-upload-progress"
                role="progressbar"
                aria-label="Photo upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
            >
                <span style={{ width: `${percentage}%` }} />
            </div>
            <p className="text-muted-foreground text-xs">
                {percentage < 100
                    ? `Uploading photo… ${percentage}%`
                    : 'Upload received. Saving your photo…'}
            </p>
        </div>
    );
}
