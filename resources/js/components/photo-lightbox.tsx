import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type {
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/utils';
import type { GalleryPhoto } from '@/types';
import '../../css/photos.css';

export type LightboxPhoto = Pick<
    GalleryPhoto,
    'url' | 'width' | 'height' | 'caption'
>;

type Props = {
    photos: LightboxPhoto[];
    /** The photo on screen, or null while the viewer is closed. */
    index: number | null;
    onIndexChange: (index: number) => void;
    onClose: () => void;
    /** Receives the photo shown last; prevent the event to move focus yourself. */
    onCloseAutoFocus?: (event: Event, index: number) => void;
};

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type View = { scale: number; x: number; y: number };
type Box = { frame: Size; fit: Size; center: Point };
type Gesture =
    | {
          kind: 'pending' | 'pan' | 'swipe' | 'dismiss';
          start: Point;
          time: number;
          view: View;
          box: Box;
          onImage: boolean;
          mouse: boolean;
      }
    | {
          kind: 'pinch';
          distance: number;
          middle: Point;
          view: View;
          box: Box;
      };

const IDENTITY: View = { scale: 1, x: 0, y: 0 };
const STILL: Point = { x: 0, y: 0 };
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

/** Frame and fitted photo size from the DOM, so handlers never use stale renders. */
function measure(
    frame: HTMLElement | null,
    image: HTMLImageElement | null,
): Box | null {
    if (!frame || !image) return null;
    const rect = frame.getBoundingClientRect();
    return {
        frame: { width: rect.width, height: rect.height },
        fit: { width: image.offsetWidth, height: image.offsetHeight },
        center: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        },
    };
}

/** Keep a zoomed photo covering its frame instead of drifting off screen. */
function contain(view: View, box: Box): View {
    const scale = clamp(view.scale, 1, MAX_SCALE);
    const limitX = Math.max(0, (box.fit.width * scale - box.frame.width) / 2);
    const limitY = Math.max(0, (box.fit.height * scale - box.frame.height) / 2);
    return {
        scale,
        x: clamp(view.x, -limitX, limitX),
        y: clamp(view.y, -limitY, limitY),
    };
}

/** Scale around a point given relative to the frame centre, keeping it in place. */
function zoomAround(view: View, scale: number, point: Point): View {
    const ratio = scale / view.scale;
    return {
        scale,
        x: point.x - (point.x - view.x) * ratio,
        y: point.y - (point.y - view.y) * ratio,
    };
}

function relative(point: Point, box: Box): Point {
    return { x: point.x - box.center.x, y: point.y - box.center.y };
}

function middleOf(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Full-screen photo viewer: arrows, keyboard, swipe, pinch/double-tap zoom,
 * swipe down to close. Built on the existing Radix dialog for focus handling.
 */
export function PhotoLightbox({
    photos,
    index,
    onIndexChange,
    onClose,
    onCloseAutoFocus,
}: Props) {
    // Keep the last photo on screen while the viewer fades out.
    const [lastIndex, setLastIndex] = useState(index ?? 0);
    if (index !== null && index !== lastIndex) setLastIndex(index);
    const count = photos.length;
    const current = clamp(index ?? lastIndex, 0, Math.max(0, count - 1));
    const photo = photos[current];

    const [view, setView] = useState<View>(IDENTITY);
    const [drag, setDrag] = useState<Point>(STILL);
    const [settling, setSettling] = useState(false);
    const [enter, setEnter] = useState<'next' | 'previous' | null>(null);
    const [chrome, setChrome] = useState(true);
    const [loaded, setLoaded] = useState<string[]>([]);
    const [failed, setFailed] = useState<string[]>([]);

    const content = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLDivElement>(null);
    const image = useRef<HTMLImageElement>(null);
    const pointers = useRef(new Map<number, Point>());
    const gesture = useRef<Gesture | null>(null);
    const lastTap = useRef<{ time: number; point: Point } | null>(null);
    const tapTimer = useRef<number | undefined>(undefined);

    const zoomed = view.scale > 1.01;
    const hasCaptions = photos.some((item) => item.caption);
    const hasFooter = count > 1 || hasCaptions;

    function show(target: number, direction: 'next' | 'previous') {
        if (count < 2) return;
        window.clearTimeout(tapTimer.current);
        setEnter(direction);
        setView(IDENTITY);
        setDrag(STILL);
        setSettling(false);
        onIndexChange((target + count) % count);
    }

    function step(offset: 1 | -1) {
        show(current + offset, offset === 1 ? 'next' : 'previous');
    }

    function close() {
        window.clearTimeout(tapTimer.current);
        onClose();
    }

    function zoomTo(scale: number, point: Point = STILL) {
        const box = measure(frame.current, image.current);
        if (!box) return;
        setSettling(true);
        setView((currentView) =>
            contain(
                zoomAround(currentView, clamp(scale, 1, MAX_SCALE), point),
                box,
            ),
        );
    }

    function toggleZoom(point: Point = STILL) {
        const box = measure(frame.current, image.current);
        if (!box || !photo) return;
        if (zoomed) {
            setSettling(true);
            setView(IDENTITY);
            return;
        }
        // Enough to read a screenshot: at least twice the fitted size, or its real pixels.
        const target = clamp(photo.width / box.fit.width, 2, MAX_SCALE);
        setSettling(true);
        setView(contain(zoomAround(IDENTITY, target, point), box));
    }

    // Wheel listeners must be non-passive to keep the page behind the viewer still.
    const stage = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const box = measure(frame.current, image.current);
            if (!box) return;
            setSettling(false);
            if (event.ctrlKey) {
                // Trackpad pinch and Ctrl + wheel zoom around the pointer.
                const point = relative(
                    { x: event.clientX, y: event.clientY },
                    box,
                );
                setView((currentView) =>
                    contain(
                        zoomAround(
                            currentView,
                            clamp(
                                currentView.scale *
                                    Math.exp(-event.deltaY * 0.01),
                                1,
                                MAX_SCALE,
                            ),
                            point,
                        ),
                        box,
                    ),
                );
                return;
            }
            setView((currentView) =>
                currentView.scale > 1.01
                    ? contain(
                          {
                              ...currentView,
                              x: currentView.x - event.deltaX,
                              y: currentView.y - event.deltaY,
                          },
                          box,
                      )
                    : currentView,
            );
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, []);

    function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const box = measure(frame.current, image.current);
        if (!box) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        setSettling(false);
        const [first, second] = [...pointers.current.values()];
        if (pointers.current.size === 2 && first && second) {
            window.clearTimeout(tapTimer.current);
            setDrag(STILL);
            gesture.current = {
                kind: 'pinch',
                distance: Math.max(
                    1,
                    Math.hypot(first.x - second.x, first.y - second.y),
                ),
                middle: relative(middleOf(first, second), box),
                view,
                box,
            };
            return;
        }
        if (pointers.current.size > 1) return;
        gesture.current = {
            kind: 'pending',
            start: { x: event.clientX, y: event.clientY },
            time: event.timeStamp,
            view,
            box,
            onImage: event.target === image.current,
            mouse: event.pointerType === 'mouse',
        };
    }

    function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        const active = gesture.current;
        if (!active) return;
        if (active.kind === 'pinch') {
            const [first, second] = [...pointers.current.values()];
            if (!first || !second) return;
            const scale = clamp(
                active.view.scale *
                    (Math.hypot(first.x - second.x, first.y - second.y) /
                        active.distance),
                0.8,
                MAX_SCALE,
            );
            // The point first held between the fingers stays between them.
            const middle = relative(middleOf(first, second), active.box);
            const ratio = scale / active.view.scale;
            setView({
                scale,
                x: middle.x - (active.middle.x - active.view.x) * ratio,
                y: middle.y - (active.middle.y - active.view.y) * ratio,
            });
            return;
        }
        const dx = event.clientX - active.start.x;
        const dy = event.clientY - active.start.y;
        if (active.kind === 'pending') {
            if (Math.hypot(dx, dy) < 8) return;
            window.clearTimeout(tapTimer.current);
            lastTap.current = null;
            active.kind =
                active.view.scale > 1.01
                    ? 'pan'
                    : Math.abs(dx) > Math.abs(dy)
                      ? 'swipe'
                      : 'dismiss';
        }
        if (active.kind === 'pan') {
            setView(
                contain(
                    {
                        ...active.view,
                        x: active.view.x + dx,
                        y: active.view.y + dy,
                    },
                    active.box,
                ),
            );
        } else if (active.kind === 'swipe') {
            setDrag({ x: count > 1 ? dx : dx * 0.25, y: 0 });
        } else if (active.kind === 'dismiss') {
            setDrag({ x: 0, y: dy > 0 ? dy : dy * 0.25 });
        }
    }

    function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
        if (!pointers.current.delete(event.pointerId)) return;
        const active = gesture.current;
        if (!active) return;
        setSettling(true);
        if (active.kind === 'pinch') {
            // The remaining finger is ignored until it lifts too.
            gesture.current = null;
            setView((currentView) =>
                currentView.scale < 1.05
                    ? IDENTITY
                    : contain(currentView, active.box),
            );
            return;
        }
        gesture.current = null;
        const dx = event.clientX - active.start.x;
        const dy = event.clientY - active.start.y;
        const elapsed = Math.max(1, event.timeStamp - active.time);
        if (active.kind === 'swipe') {
            const flick = Math.abs(dx) / elapsed > 0.45 && Math.abs(dx) > 24;
            if (count > 1 && (dx < -70 || (flick && dx < 0))) step(1);
            else if (count > 1 && (dx > 70 || (flick && dx > 0))) step(-1);
            else setDrag(STILL);
            return;
        }
        if (active.kind === 'dismiss') {
            if (dy > 120 || (dy > 30 && dy / elapsed > 0.5)) close();
            else setDrag(STILL);
            return;
        }
        if (active.kind === 'pan') return;
        const point = relative(
            { x: event.clientX, y: event.clientY },
            active.box,
        );
        if (active.mouse) {
            // A click on the photo zooms; a click on the dark surround closes.
            if (active.onImage) toggleZoom(point);
            else close();
            return;
        }
        const previous = lastTap.current;
        if (
            previous &&
            event.timeStamp - previous.time < DOUBLE_TAP_MS &&
            Math.hypot(
                event.clientX - previous.point.x,
                event.clientY - previous.point.y,
            ) < 40
        ) {
            window.clearTimeout(tapTimer.current);
            lastTap.current = null;
            toggleZoom(point);
            return;
        }
        lastTap.current = {
            time: event.timeStamp,
            point: { x: event.clientX, y: event.clientY },
        };
        const onImage = active.onImage || zoomed;
        tapTimer.current = window.setTimeout(() => {
            lastTap.current = null;
            if (onImage) setChrome((shown) => !shown);
            else close();
        }, DOUBLE_TAP_MS);
    }

    function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
        pointers.current.delete(event.pointerId);
        const active = gesture.current;
        gesture.current = null;
        setSettling(true);
        setDrag(STILL);
        if (active)
            setView((currentView) =>
                currentView.scale < 1.05
                    ? IDENTITY
                    : contain(currentView, active.box),
            );
    }

    function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        switch (event.key) {
            case 'ArrowRight':
                step(1);
                break;
            case 'ArrowLeft':
                step(-1);
                break;
            case 'Home':
                if (current !== 0) show(0, 'previous');
                break;
            case 'End':
                if (current !== count - 1) show(count - 1, 'next');
                break;
            case '+':
            case '=':
                zoomTo(view.scale * 1.5);
                break;
            case '-':
                zoomTo(view.scale / 1.5);
                break;
            case '0':
                setSettling(true);
                setView(IDENTITY);
                break;
            default:
                return;
        }
        event.preventDefault();
    }

    const dismissing = drag.y !== 0;
    const isLoaded = photo ? loaded.includes(photo.url) : false;
    const hasFailed = photo ? failed.includes(photo.url) : false;
    const ratio = photo ? photo.width / photo.height : 1;

    return (
        <DialogPrimitive.Root
            open={index !== null}
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="wb-lightbox-backdrop"
                    style={
                        dismissing
                            ? {
                                  opacity:
                                      1 -
                                      Math.min(0.75, Math.abs(drag.y) / 360),
                              }
                            : undefined
                    }
                />
                <DialogPrimitive.Content
                    ref={content}
                    tabIndex={-1}
                    className="wb-lightbox"
                    data-chrome={chrome && !dismissing ? 'shown' : 'hidden'}
                    data-has-footer={hasFooter}
                    onKeyDown={onKeyDown}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        content.current?.focus();
                    }}
                    onCloseAutoFocus={(event) => {
                        onCloseAutoFocus?.(event, current);
                        setView(IDENTITY);
                        setDrag(STILL);
                        setEnter(null);
                        setChrome(true);
                        setSettling(false);
                        pointers.current.clear();
                        gesture.current = null;
                    }}
                >
                    <DialogPrimitive.Title className="sr-only">
                        {count === 1 ? 'Photo' : 'Photos'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {count > 1
                            ? 'Use the left and right arrow keys to move between photos, plus and minus to zoom, and Escape to close.'
                            : 'Use plus and minus to zoom and Escape to close.'}
                    </DialogPrimitive.Description>
                    <div
                        ref={stage}
                        className="wb-lightbox-stage"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerCancel}
                    >
                        <div ref={frame} className="wb-lightbox-frame">
                            <div
                                className={cn(
                                    'wb-lightbox-slide',
                                    settling && 'is-settling',
                                )}
                                data-enter={enter ?? undefined}
                                style={
                                    drag.x || drag.y
                                        ? {
                                              transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
                                          }
                                        : undefined
                                }
                            >
                                {photo && (
                                    <img
                                        key={photo.url}
                                        ref={image}
                                        src={photo.url}
                                        width={photo.width}
                                        height={photo.height}
                                        alt={
                                            photo.caption ??
                                            `Photo ${current + 1}`
                                        }
                                        draggable={false}
                                        decoding="async"
                                        className={cn(
                                            'wb-lightbox-image',
                                            zoomed && 'is-zoomed',
                                            settling && 'is-settling',
                                        )}
                                        style={{
                                            width: `min(100cqw, ${ratio} * 100cqh, ${photo.width}px)`,
                                            height: 'auto',
                                            aspectRatio: `${photo.width} / ${photo.height}`,
                                            transform:
                                                view.scale !== 1 ||
                                                view.x ||
                                                view.y
                                                    ? `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`
                                                    : undefined,
                                        }}
                                        onLoad={() =>
                                            setLoaded((urls) =>
                                                urls.includes(photo.url)
                                                    ? urls
                                                    : [...urls, photo.url],
                                            )
                                        }
                                        onError={() =>
                                            setFailed((urls) =>
                                                urls.includes(photo.url)
                                                    ? urls
                                                    : [...urls, photo.url],
                                            )
                                        }
                                    />
                                )}
                            </div>
                            {photo && !isLoaded && !hasFailed && (
                                <LoaderCircle
                                    className="wb-lightbox-spinner"
                                    aria-hidden="true"
                                />
                            )}
                            {hasFailed && (
                                <p className="wb-lightbox-error" role="alert">
                                    This photo could not be loaded. Check your
                                    connection and try again.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="wb-lightbox-bar">
                        <p className="wb-lightbox-counter" aria-hidden="true">
                            {count > 1 ? `${current + 1} / ${count}` : ''}
                        </p>
                        <div className="wb-lightbox-tools">
                            <button
                                type="button"
                                className="wb-lightbox-button"
                                onClick={() => toggleZoom()}
                                aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                                title={zoomed ? 'Zoom out' : 'Zoom in'}
                            >
                                {zoomed ? (
                                    <ZoomOut aria-hidden="true" />
                                ) : (
                                    <ZoomIn aria-hidden="true" />
                                )}
                            </button>
                            <DialogPrimitive.Close
                                className="wb-lightbox-button"
                                aria-label="Close photos"
                                title="Close (Esc)"
                            >
                                <X aria-hidden="true" />
                            </DialogPrimitive.Close>
                        </div>
                    </div>
                    {count > 1 && (
                        <>
                            <button
                                type="button"
                                className="wb-lightbox-button wb-lightbox-nav"
                                data-side="previous"
                                onClick={() => step(-1)}
                                aria-label="Previous photo"
                                title="Previous photo"
                            >
                                <ChevronLeft aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="wb-lightbox-button wb-lightbox-nav"
                                data-side="next"
                                onClick={() => step(1)}
                                aria-label="Next photo"
                                title="Next photo"
                            >
                                <ChevronRight aria-hidden="true" />
                            </button>
                        </>
                    )}
                    {hasFooter && (
                        <div className="wb-lightbox-footer">
                            {hasCaptions && (
                                <p className="wb-lightbox-caption">
                                    {photo?.caption}
                                </p>
                            )}
                            {count > 1 && (
                                <div
                                    className="wb-lightbox-thumbs"
                                    role="group"
                                    aria-label="Choose a photo"
                                >
                                    {photos.map((item, position) => (
                                        <button
                                            key={item.url}
                                            type="button"
                                            className="wb-lightbox-thumb"
                                            aria-label={`Photo ${position + 1}`}
                                            aria-current={position === current}
                                            onClick={() =>
                                                position !== current &&
                                                show(
                                                    position,
                                                    position > current
                                                        ? 'next'
                                                        : 'previous',
                                                )
                                            }
                                        >
                                            <img
                                                src={item.url}
                                                alt=""
                                                decoding="async"
                                                draggable={false}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <p
                        className="sr-only"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {photo
                            ? `Photo ${current + 1} of ${count}${photo.caption ? `: ${photo.caption}` : ''}`
                            : ''}
                    </p>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
