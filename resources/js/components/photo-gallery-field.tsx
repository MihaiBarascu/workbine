import { usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    ImagePlus,
    LoaderCircle,
    X,
} from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import InputError from '@/components/input-error';
import { PhotoLightbox } from '@/components/photo-lightbox';
import { PHOTO_FILES_EVENT } from '@/lib/photo-files';
import { cn } from '@/lib/utils';
import type { EditablePhoto } from '@/types';
import '../../css/photos.css';

const LIMIT = 6;
const CAPTION_LIMIT = 140;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Props = {
    /** Form field name: `photos`, or `method_photos` beside a new topic. */
    name: string;
    initialPhotos?: EditablePhoto[];
    errors: Record<string, string | undefined>;
};

type Photo = EditablePhoto & { caption: string; preview?: string };
type Upload = { key: number; file: File; preview: string; progress: number };
type Outcome = 'done' | 'failed' | 'aborted';

/**
 * Uploads each photo as soon as it is chosen, dropped or pasted, then submits
 * only ids, order and captions with the form. `{name}_present` tells the
 * server this form manages the gallery, so an empty list means "no photos".
 */
export function PhotoGalleryField({ name, initialPhotos = [], errors }: Props) {
    const { media } = usePage().props;
    const [photos, setPhotos] = useState<Photo[]>(() =>
        initialPhotos.map((photo) => ({
            ...photo,
            caption: photo.caption ?? '',
        })),
    );
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [error, setError] = useState('');
    const [viewing, setViewing] = useState<number | null>(null);
    const [dragging, setDragging] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<number | null>(null);
    const [filesOver, setFilesOver] = useState(false);
    // Upload bookkeeping that must not wait for a render.
    const live = useRef({
        queue: [] as Upload[],
        request: null as { key: number; xhr: XMLHttpRequest } | null,
        busy: false,
        nextKey: 0,
        previews: new Set<string>(),
    });
    const wrapper = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const serverError = Object.entries(errors).find(
        ([key]) => key === name || key.startsWith(`${name}.`),
    )?.[1];
    const room = LIMIT - photos.length - uploads.length;
    const enabled = Boolean(media?.enabled);

    function discard(preview: string) {
        URL.revokeObjectURL(preview);
        live.current.previews.delete(preview);
    }

    function send(item: Upload): Promise<Outcome> {
        return new Promise((resolve) => {
            // XMLHttpRequest rather than fetch: it reports upload progress.
            const xhr = new XMLHttpRequest();
            live.current.request = { key: item.key, xhr };
            xhr.open('POST', '/editor/images');
            xhr.responseType = 'json';
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('X-XSRF-TOKEN', cookie('XSRF-TOKEN'));
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const progress = Math.round((event.loaded / event.total) * 100);
                setUploads((current) =>
                    current.map((upload) =>
                        upload.key === item.key
                            ? { ...upload, progress }
                            : upload,
                    ),
                );
            };
            xhr.onload = () => {
                const result = xhr.response as
                    | (EditablePhoto & {
                          errors?: { image?: string[] };
                      })
                    | null;
                if (xhr.status >= 200 && xhr.status < 300 && result?.id) {
                    setPhotos((current) => [
                        ...current,
                        { ...result, caption: '', preview: item.preview },
                    ]);
                    resolve('done');
                    return;
                }
                setError(
                    result?.errors?.image?.[0] ??
                        (xhr.status === 429
                            ? 'Too many photo uploads. Please try again later.'
                            : 'A photo could not be uploaded. Please try again.'),
                );
                resolve('failed');
            };
            xhr.onerror = () => {
                setError('A photo could not be uploaded. Please try again.');
                resolve('failed');
            };
            xhr.onabort = () => resolve('aborted');
            const data = new FormData();
            data.append('image', item.file);
            xhr.send(data);
        });
    }

    async function drain() {
        const state = live.current;
        if (state.busy) return;
        state.busy = true;
        // One at a time: the server processes a single image at once.
        while (state.queue.length) {
            const item = state.queue[0];
            const outcome = await send(item);
            state.request = null;
            state.queue.shift();
            if (outcome !== 'done') discard(item.preview);
            if (outcome === 'failed') {
                // Stop after a refusal; the member decides what to try again.
                for (const rest of state.queue) discard(rest.preview);
                state.queue = [];
                setUploads([]);
                break;
            }
            setUploads((current) =>
                current.filter((upload) => upload.key !== item.key),
            );
        }
        state.busy = false;
    }

    function upload(files: File[]) {
        if (!files.length) return;
        const accepted = files.filter(
            (file) =>
                TYPES.includes(file.type) &&
                file.size <= media.maxUploadMb * 1024 * 1024,
        );
        let message =
            accepted.length < files.length
                ? `Choose JPEG, PNG or WebP photos up to ${media.maxUploadMb} MB each.`
                : '';
        if (accepted.length > room) {
            message =
                room > 0
                    ? `You can add up to ${LIMIT} photos. Only the first ${room} will be added.`
                    : `You can add up to ${LIMIT} photos. Remove one to add another.`;
        }
        setError(message);
        const items = accepted.slice(0, Math.max(room, 0)).map((file) => {
            const preview = URL.createObjectURL(file);
            live.current.previews.add(preview);
            return {
                key: live.current.nextKey++,
                file,
                preview,
                progress: 0,
            };
        });
        if (!items.length) return;
        live.current.queue.push(...items);
        setUploads((current) => [...current, ...items]);
        void drain();
    }

    function cancel(key: number) {
        const state = live.current;
        if (state.request?.key === key) {
            // drain() removes it once the request reports the abort.
            state.request.xhr.abort();
            return;
        }
        const item = state.queue.find((upload) => upload.key === key);
        state.queue = state.queue.filter((upload) => upload.key !== key);
        if (item) discard(item.preview);
        setUploads((current) => current.filter((upload) => upload.key !== key));
    }

    function focusLater(selector: string) {
        requestAnimationFrame(() =>
            (
                wrapper.current?.querySelector<HTMLElement>(selector) ??
                wrapper.current?.querySelector<HTMLElement>(
                    '.wb-photo-add-button',
                ) ??
                fileInput.current
            )?.focus(),
        );
    }

    function remove(index: number) {
        const photo = photos[index];
        if (!photo) return;
        if (photo.preview) discard(photo.preview);
        setPhotos((current) => current.filter((item) => item.id !== photo.id));
        // Focus stays in the gallery instead of falling back to the page.
        focusLater(
            `[data-photo-index="${Math.min(index, photos.length - 2)}"] .wb-photo-card-remove`,
        );
    }

    function move(from: number, to: number) {
        if (from === to || to < 0 || to >= photos.length) return;
        const id = photos[from]?.id;
        setPhotos((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
        // A button that becomes disabled at either end would drop focus.
        if (to === 0 || to === photos.length - 1)
            focusLater(
                `[data-photo-id="${id}"] [data-move="${to === 0 ? 'later' : 'earlier'}"]`,
            );
    }

    const guardSubmit = useEffectEvent((event: Event) => {
        if (!live.current.busy) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setError('Wait for your photos to finish uploading.');
    });
    const receiveFiles = useEffectEvent((event: Event) => {
        const files = (event as CustomEvent<File[]>).detail;
        if (!enabled || !Array.isArray(files) || !files.length) return;
        event.preventDefault();
        upload(files);
    });

    useEffect(() => {
        const form = wrapper.current?.closest('form');
        const state = live.current;
        const onSubmit = (event: Event) => guardSubmit(event);
        const onFiles = (event: Event) => receiveFiles(event);
        form?.addEventListener('submit', onSubmit, true);
        form?.addEventListener(PHOTO_FILES_EVENT, onFiles);
        return () => {
            form?.removeEventListener('submit', onSubmit, true);
            form?.removeEventListener(PHOTO_FILES_EVENT, onFiles);
            state.request?.xhr.abort();
            state.queue = [];
            for (const preview of state.previews) URL.revokeObjectURL(preview);
            state.previews.clear();
        };
    }, []);

    function carriesFiles(event: DragEvent) {
        return enabled && event.dataTransfer.types.includes('Files');
    }

    function reorderTarget(event: DragEvent<HTMLLIElement>, index: number) {
        if (dragging === null) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(index);
    }

    return (
        <div
            ref={wrapper}
            className="wb-photo-field"
            data-files-over={filesOver}
            onDragOver={(event) => {
                if (!carriesFiles(event)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = room > 0 ? 'copy' : 'none';
                setFilesOver(true);
            }}
            onDragLeave={(event) => {
                if (
                    !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                    )
                )
                    setFilesOver(false);
            }}
            onDrop={(event) => {
                if (!carriesFiles(event)) return;
                event.preventDefault();
                setFilesOver(false);
                upload(Array.from(event.dataTransfer.files));
            }}
            onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter(
                    (file) => file.type.startsWith('image/'),
                );
                if (!enabled || !files.length) return;
                event.preventDefault();
                upload(files);
            }}
        >
            <input type="hidden" name={`${name}_present`} value="1" />
            <div>
                <p className="text-sm font-medium">
                    Photos{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </p>
                <p
                    id={`${name}-help`}
                    className="text-muted-foreground text-sm leading-6"
                >
                    Up to {LIMIT} photos, shown below your text in this order.
                    Describe what each one shows; add a step number if it helps.
                </p>
            </div>
            {(photos.length > 0 || uploads.length > 0 || enabled) && (
                <ol
                    className="wb-photo-field-grid"
                    data-empty={photos.length + uploads.length === 0}
                    aria-label="Your photos"
                >
                    {photos.map((photo, index) => (
                        <li
                            key={photo.id}
                            className={cn(
                                'wb-photo-card',
                                dragging === index && 'is-dragging',
                                dragging !== null &&
                                    dragging !== index &&
                                    dropTarget === index &&
                                    'is-drop-target',
                            )}
                            data-photo-id={photo.id}
                            data-photo-index={index}
                            onDragOver={(event) => reorderTarget(event, index)}
                            onDragEnter={(event) => reorderTarget(event, index)}
                            onDrop={(event) => {
                                if (dragging === null) return;
                                event.preventDefault();
                                event.stopPropagation();
                                move(dragging, index);
                                setDragging(null);
                                setDropTarget(null);
                            }}
                        >
                            <input
                                type="hidden"
                                name={`${name}[${index}][id]`}
                                value={photo.id}
                            />
                            <div
                                className="wb-photo-card-media"
                                draggable={photos.length > 1}
                                onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData(
                                        'text/plain',
                                        `Photo ${index + 1}`,
                                    );
                                    setDragging(index);
                                }}
                                onDragEnd={() => {
                                    setDragging(null);
                                    setDropTarget(null);
                                }}
                            >
                                <button
                                    type="button"
                                    className="wb-photo-card-view"
                                    onClick={() => setViewing(index)}
                                    aria-label={`View photo ${index + 1}`}
                                    title="View larger"
                                >
                                    <img
                                        src={photo.preview ?? photo.url}
                                        width={photo.width}
                                        height={photo.height}
                                        alt=""
                                        draggable={false}
                                    />
                                </button>
                                <span
                                    className="wb-photo-number"
                                    aria-hidden="true"
                                >
                                    {index + 1}
                                </span>
                                <button
                                    type="button"
                                    className="wb-photo-card-tool wb-photo-card-remove"
                                    onClick={() => remove(index)}
                                    aria-label={`Remove photo ${index + 1}`}
                                    title="Remove photo"
                                >
                                    <X aria-hidden="true" />
                                </button>
                                {photos.length > 1 && (
                                    <div className="wb-photo-card-order">
                                        <button
                                            type="button"
                                            className="wb-photo-card-tool"
                                            data-move="earlier"
                                            disabled={index === 0}
                                            onClick={() =>
                                                move(index, index - 1)
                                            }
                                            aria-label={`Move photo ${index + 1} earlier`}
                                            title="Move earlier"
                                        >
                                            <ArrowLeft aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            className="wb-photo-card-tool"
                                            data-move="later"
                                            disabled={
                                                index === photos.length - 1
                                            }
                                            onClick={() =>
                                                move(index, index + 1)
                                            }
                                            aria-label={`Move photo ${index + 1} later`}
                                            title="Move later"
                                        >
                                            <ArrowRight aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <label
                                htmlFor={`${name}-${photo.id}-caption`}
                                className="wb-photo-card-label"
                            >
                                Photo {index + 1} description
                            </label>
                            <textarea
                                id={`${name}-${photo.id}-caption`}
                                name={`${name}[${index}][caption]`}
                                value={photo.caption}
                                rows={2}
                                maxLength={CAPTION_LIMIT}
                                placeholder="What this photo shows"
                                className="wb-photo-card-caption"
                                onKeyDown={(event) => {
                                    // One line of text; Enter must not add a break.
                                    if (
                                        event.key === 'Enter' &&
                                        !event.nativeEvent.isComposing
                                    )
                                        event.preventDefault();
                                }}
                                onChange={(event) => {
                                    const caption = event.target.value.replace(
                                        /\s*[\r\n]+\s*/g,
                                        ' ',
                                    );
                                    setPhotos((current) =>
                                        current.map((item) =>
                                            item.id === photo.id
                                                ? { ...item, caption }
                                                : item,
                                        ),
                                    );
                                }}
                            />
                            {photo.caption.length > CAPTION_LIMIT - 30 && (
                                <p
                                    className="wb-photo-card-count"
                                    aria-live="polite"
                                >
                                    {CAPTION_LIMIT - photo.caption.length}{' '}
                                    characters left
                                </p>
                            )}
                        </li>
                    ))}
                    {uploads.map((item) => (
                        <li
                            key={`upload-${item.key}`}
                            className="wb-photo-card is-uploading"
                        >
                            <div className="wb-photo-card-media">
                                <img src={item.preview} alt="" />
                                <div className="wb-photo-card-progress">
                                    <LoaderCircle aria-hidden="true" />
                                    <span>
                                        {item.progress >= 100
                                            ? 'Processing…'
                                            : uploads[0]?.key === item.key
                                              ? `Uploading ${item.progress}%`
                                              : 'Waiting…'}
                                    </span>
                                    <span
                                        className="wb-photo-card-bar"
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="wb-photo-card-tool wb-photo-card-remove"
                                    onClick={() => cancel(item.key)}
                                    aria-label={`Cancel uploading ${item.file.name}`}
                                    title="Cancel upload"
                                >
                                    <X aria-hidden="true" />
                                </button>
                            </div>
                            <p className="wb-photo-card-file">
                                {item.file.name}
                            </p>
                        </li>
                    ))}
                    {enabled && room > 0 && (
                        <li className="wb-photo-add">
                            <button
                                type="button"
                                className="wb-photo-add-button"
                                onClick={() => fileInput.current?.click()}
                                aria-describedby={`${name}-add-hint`}
                            >
                                <ImagePlus aria-hidden="true" />
                                <span>Add photos</span>
                            </button>
                            <p
                                id={`${name}-add-hint`}
                                className="wb-photo-add-hint"
                            >
                                {photos.length + uploads.length === 0
                                    ? `Drop photos here or paste a screenshot. JPEG, PNG or WebP, up to ${media.maxUploadMb} MB each.`
                                    : `${room} more ${room === 1 ? 'photo' : 'photos'} possible`}
                            </p>
                        </li>
                    )}
                </ol>
            )}
            {enabled && room > 0 && (
                <input
                    ref={fileInput}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Upload photos"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        upload(files);
                    }}
                />
            )}
            {!enabled && (
                <p className="text-muted-foreground text-sm">
                    Photo uploads are currently unavailable. You can still
                    publish your text.
                </p>
            )}
            <p role="status" className="sr-only">
                {uploads.length
                    ? `Uploading ${uploads.length === 1 ? 'a photo' : `${uploads.length} photos`}.`
                    : ''}
            </p>
            <InputError message={error || serverError} />
            <PhotoLightbox
                photos={photos.map((photo) => ({
                    url: photo.preview ?? photo.url,
                    width: photo.width,
                    height: photo.height,
                    caption: photo.caption || null,
                }))}
                index={viewing}
                onIndexChange={setViewing}
                onClose={() => setViewing(null)}
            />
        </div>
    );
}

function cookie(name: string) {
    const value = window.document.cookie
        .split('; ')
        .find((item) => item.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.slice(name.length + 1)) : '';
}
