import { usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EditablePhoto } from '@/types';

const LIMIT = 6;
const CAPTION_LIMIT = 140;

type Props = {
    /** Form field name: `photos`, or `method_photos` beside a new topic. */
    name: string;
    initialPhotos?: EditablePhoto[];
    errors: Record<string, string | undefined>;
};

type Photo = EditablePhoto & { caption: string };

/**
 * Uploads each photo as soon as it is chosen, then submits only ids, order and
 * captions with the form. `{name}_present` tells the server this form manages
 * the gallery, so an empty list means "no photos".
 */
export function PhotoGalleryField({ name, initialPhotos = [], errors }: Props) {
    const { media } = usePage().props;
    const [photos, setPhotos] = useState<Photo[]>(() =>
        initialPhotos.map((photo) => ({
            ...photo,
            caption: photo.caption ?? '',
        })),
    );
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const busy = useRef(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const serverError = Object.entries(errors).find(
        ([key]) => key === name || key.startsWith(`${name}.`),
    )?.[1];

    useEffect(() => {
        const form = wrapper.current?.closest('form');
        const guard = (event: Event) => {
            if (!busy.current) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            setError('Wait for your photos to finish uploading.');
        };
        form?.addEventListener('submit', guard, true);
        return () => form?.removeEventListener('submit', guard, true);
    }, []);

    async function upload(files: File[]) {
        if (busy.current) return;
        const room = LIMIT - photos.length;
        if (files.length > room) {
            setError(
                `You can add up to ${LIMIT} photos. Only the first ${room} will be added.`,
            );
        } else {
            setError('');
        }
        busy.current = true;
        setUploading(true);
        // One at a time: the server processes a single image at once.
        for (const file of files.slice(0, Math.max(room, 0))) {
            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(
                    file.type,
                ) ||
                file.size > media.maxUploadMb * 1024 * 1024
            ) {
                setError(
                    `Choose JPEG, PNG or WebP photos up to ${media.maxUploadMb} MB each.`,
                );
                continue;
            }
            try {
                const data = new FormData();
                data.append('image', file);
                const response = await fetch('/editor/images', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': cookie('XSRF-TOKEN'),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: data,
                });
                const result = await response.json();
                if (!response.ok) {
                    setError(
                        result.errors?.image?.[0] ??
                            (response.status === 429
                                ? 'Too many photo uploads. Please try again later.'
                                : 'A photo could not be uploaded. Please try again.'),
                    );
                    break;
                }
                setPhotos((current) => [
                    ...current,
                    { ...result, caption: '' },
                ]);
            } catch {
                setError('A photo could not be uploaded. Please try again.');
                break;
            }
        }
        busy.current = false;
        setUploading(false);
    }

    function move(index: number, offset: -1 | 1) {
        setPhotos((current) => {
            const next = [...current];
            [next[index], next[index + offset]] = [
                next[index + offset],
                next[index],
            ];
            return next;
        });
    }

    return (
        <div ref={wrapper} className="grid gap-3">
            <input type="hidden" name={`${name}_present`} value="1" />
            <div>
                <p className="text-sm font-medium">Photos (optional)</p>
                <p
                    id={`${name}-help`}
                    className="text-muted-foreground text-sm leading-6"
                >
                    Up to {LIMIT} photos, shown below your text in this order.
                    Describe what each one shows; add a step number if it helps.
                </p>
            </div>
            {photos.length > 0 && (
                <ol className="grid gap-3">
                    {photos.map((photo, index) => (
                        <li
                            key={photo.id}
                            className="bg-muted/40 grid gap-3 rounded-lg border p-3 sm:grid-cols-[7rem_minmax(0,1fr)]"
                        >
                            <input
                                type="hidden"
                                name={`${name}[${index}][id]`}
                                value={photo.id}
                            />
                            <img
                                src={photo.url}
                                width={photo.width}
                                height={photo.height}
                                alt=""
                                className="bg-muted h-24 w-28 rounded-md border object-contain"
                            />
                            <div className="grid min-w-0 gap-2">
                                <label
                                    htmlFor={`${name}-${photo.id}-caption`}
                                    className="text-sm font-medium"
                                >
                                    Photo {index + 1} description
                                </label>
                                <Input
                                    id={`${name}-${photo.id}-caption`}
                                    name={`${name}[${index}][caption]`}
                                    value={photo.caption}
                                    maxLength={CAPTION_LIMIT}
                                    placeholder="What this photo shows"
                                    onChange={(event) =>
                                        setPhotos((current) =>
                                            current.map((item) =>
                                                item.id === photo.id
                                                    ? {
                                                          ...item,
                                                          caption:
                                                              event.target
                                                                  .value,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={index === 0}
                                        onClick={() => move(index, -1)}
                                        aria-label={`Move photo ${index + 1} earlier`}
                                    >
                                        <ArrowUp aria-hidden="true" />
                                        Earlier
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={index === photos.length - 1}
                                        onClick={() => move(index, 1)}
                                        aria-label={`Move photo ${index + 1} later`}
                                    >
                                        <ArrowDown aria-hidden="true" />
                                        Later
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setPhotos((current) =>
                                                current.filter(
                                                    (item) =>
                                                        item.id !== photo.id,
                                                ),
                                            )
                                        }
                                        aria-label={`Remove photo ${index + 1}`}
                                    >
                                        <X aria-hidden="true" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            {media?.enabled ? (
                photos.length < LIMIT && (
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => fileInput.current?.click()}
                        >
                            <ImagePlus aria-hidden="true" />
                            {uploading ? 'Uploading…' : 'Add photos'}
                        </Button>
                        <input
                            ref={fileInput}
                            type="file"
                            multiple
                            className="sr-only"
                            tabIndex={-1}
                            aria-label="Upload photos"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                                const files = Array.from(
                                    event.target.files ?? [],
                                );
                                event.target.value = '';
                                if (files.length) void upload(files);
                            }}
                        />
                    </div>
                )
            ) : (
                <p className="text-muted-foreground text-sm">
                    Photo uploads are currently unavailable. You can still
                    publish your text.
                </p>
            )}
            <p role="status" className="text-muted-foreground text-sm">
                {uploading ? 'Uploading your photos…' : ''}
            </p>
            <InputError message={error || serverError} />
        </div>
    );
}

function cookie(name: string) {
    const value = window.document.cookie
        .split('; ')
        .find((item) => item.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.slice(name.length + 1)) : '';
}
