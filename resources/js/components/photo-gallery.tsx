import { Expand } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { PhotoLightbox } from '@/components/photo-lightbox';
import type { GalleryPhoto } from '@/types';
import '../../css/photos.css';

/**
 * Photos below a contribution's text, as one mosaic in the author's order.
 * Each opens in a full-screen viewer with its description. Numbers stay
 * visible so the text can refer to "Photo 2".
 */
export function PhotoGallery({ photos }: { photos?: GalleryPhoto[] }) {
    const [open, setOpen] = useState<number | null>(null);
    const tiles = useRef<(HTMLAnchorElement | null)[]>([]);
    if (!photos?.length) return null;

    const count = photos.length;
    // A single photo keeps its own shape, between portrait and wide panorama.
    const style =
        count === 1
            ? ({
                  '--wb-photo-ratio': Math.min(
                      2.4,
                      Math.max(0.56, photos[0].width / photos[0].height),
                  ),
              } as CSSProperties)
            : undefined;

    function openPhoto(event: MouseEvent<HTMLAnchorElement>, index: number) {
        // Modified clicks keep the browser's own behaviour, such as a new tab.
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        event.preventDefault();
        setOpen(index);
    }

    return (
        <>
            <ol
                className="wb-photo-gallery"
                data-count={count}
                aria-label={count === 1 ? 'Photo' : `${count} photos`}
                style={style}
            >
                {photos.map((photo, index) => (
                    <li key={photo.url}>
                        <a
                            ref={(node) => {
                                tiles.current[index] = node;
                            }}
                            href={photo.url}
                            aria-haspopup="dialog"
                            aria-label={`Open photo${count > 1 ? ` ${index + 1} of ${count}` : ''}${photo.caption ? `: ${photo.caption}` : ''}`}
                            onClick={(event) => openPhoto(event, index)}
                        >
                            <img
                                src={photo.url}
                                width={photo.width}
                                height={photo.height}
                                alt={photo.caption ?? ''}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                            />
                            {count > 1 && (
                                <span
                                    className="wb-photo-number"
                                    aria-hidden="true"
                                >
                                    {index + 1}
                                </span>
                            )}
                            <span
                                className="wb-photo-expand"
                                aria-hidden="true"
                            >
                                <Expand />
                            </span>
                            {photo.caption && (
                                <span
                                    className="wb-photo-caption"
                                    aria-hidden="true"
                                >
                                    {photo.caption}
                                </span>
                            )}
                        </a>
                    </li>
                ))}
            </ol>
            <PhotoLightbox
                photos={photos}
                index={open}
                onIndexChange={setOpen}
                onClose={() => setOpen(null)}
                onCloseAutoFocus={(event, index) => {
                    const tile = tiles.current[index];
                    if (!tile) return;
                    event.preventDefault();
                    tile.focus();
                }}
            />
        </>
    );
}
