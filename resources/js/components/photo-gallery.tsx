import type { GalleryPhoto } from '@/types';

/**
 * Photos beside a contribution's text. Numbered and uncropped, in the author's
 * order, so the text can refer to "Photo 2".
 */
export function PhotoGallery({ photos }: { photos?: GalleryPhoto[] }) {
    if (!photos?.length) return null;

    return (
        <ol className="wb-photo-gallery" aria-label="Photos">
            {photos.map((photo, index) => (
                <li key={photo.url}>
                    <figure>
                        <a
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open photo ${index + 1} at full size`}
                        >
                            <img
                                src={photo.url}
                                width={photo.width}
                                height={photo.height}
                                alt={photo.caption ?? ''}
                                loading="lazy"
                            />
                        </a>
                        <figcaption>
                            <span className="font-medium">
                                Photo {index + 1}
                            </span>
                            {photo.caption && <> · {photo.caption}</>}
                        </figcaption>
                    </figure>
                </li>
            ))}
        </ol>
    );
}
