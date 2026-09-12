import { useEffect, useRef } from 'react';
import globe from '../../images/community-globe.webp';

/** Decorative light and connections. Never intercepts clicks or drives React renders. */
export function CommunityUniverse() {
    const scene = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const element = scene.current;
        const surface = canvas.current;
        if (!element || !surface) return;
        const ctx = surface.getContext('2d');
        if (!ctx) return;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const fine = window.matchMedia('(pointer: fine)');
        let frame = 0;
        let visible = true;
        let width = 1;
        let height = 1;
        let pointer = { x: -1000, y: -1000 };
        let drift = { x: 0, y: 0 };
        let previous = 0;
        const stars = Array.from({ length: 56 }, (_, i) => ({
            x: ((i * 73 + 19) % 101) / 100,
            y: ((i * 37 + 11) % 97) / 100,
            size: 0.7 + (i % 4) * 0.3,
        }));
        const resize = () => {
            width = element.clientWidth;
            height = element.clientHeight;
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            surface.width = Math.round(width * ratio);
            surface.height = Math.round(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        };
        const draw = (time: number) => {
            frame = 0;
            if (!visible || document.hidden || motion.matches || !fine.matches)
                return;
            frame = requestAnimationFrame(draw);
            if (time - previous < 32) return;
            previous = time;
            ctx.clearRect(0, 0, width, height);
            const active =
                pointer.x >= 0 && pointer.y >= 0 && pointer.y < height;
            drift.x +=
                ((active ? (pointer.x / width - 0.5) * 12 : 0) - drift.x) *
                0.055;
            drift.y +=
                ((active ? (pointer.y / height - 0.5) * 8 : 0) - drift.y) *
                0.055;
            element.style.setProperty('--universe-x', `${drift.x}px`);
            element.style.setProperty('--universe-y', `${drift.y}px`);
            if (active) {
                const glow = ctx.createRadialGradient(
                    pointer.x,
                    pointer.y,
                    0,
                    pointer.x,
                    pointer.y,
                    190,
                );
                glow.addColorStop(0, 'rgba(160,211,255,0.28)');
                glow.addColorStop(1, 'rgba(160,211,255,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, width, height);
            }
            stars.forEach((star, i) => {
                const x = star.x * width + Math.sin(time / 4500 + i) * 5;
                const y = star.y * height + Math.cos(time / 5200 + i) * 4;
                const distance = Math.hypot(x - pointer.x, y - pointer.y);
                if (active && distance < 150) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(pointer.x, pointer.y);
                    ctx.strokeStyle = `rgba(111,171,231,${(1 - distance / 150) * 0.48})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(
                    x,
                    y,
                    star.size * (distance < 150 ? 1.6 : 1),
                    0,
                    Math.PI * 2,
                );
                ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(time / 1800 + i) * 0.25})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#b9ddff';
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        };
        const start = () => {
            if (
                !frame &&
                visible &&
                !document.hidden &&
                !motion.matches &&
                fine.matches
            )
                frame = requestAnimationFrame(draw);
        };
        const preference = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            ctx.clearRect(0, 0, width, height);
            element.style.setProperty('--universe-x', '0px');
            element.style.setProperty('--universe-y', '0px');
            start();
        };
        const move = (event: PointerEvent) => {
            if (event.pointerType === 'touch' || motion.matches) return;
            const bounds = element.getBoundingClientRect();
            pointer = {
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            };
        };
        const leave = () => {
            pointer = { x: -1000, y: -1000 };
        };
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (!visible) {
                cancelAnimationFrame(frame);
                frame = 0;
            } else start();
        });
        const sizeObserver = new ResizeObserver(resize);
        resize();
        observer.observe(element);
        sizeObserver.observe(element);
        start();
        window.addEventListener('pointermove', move, { passive: true });
        document.documentElement.addEventListener('pointerleave', leave);
        document.addEventListener('visibilitychange', preference);
        motion.addEventListener('change', preference);
        fine.addEventListener('change', preference);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            sizeObserver.disconnect();
            window.removeEventListener('pointermove', move);
            document.documentElement.removeEventListener('pointerleave', leave);
            document.removeEventListener('visibilitychange', preference);
            motion.removeEventListener('change', preference);
            fine.removeEventListener('change', preference);
        };
    }, []);
    return (
        <div className="wb-universe" ref={scene} aria-hidden="true">
            <img
                src={globe}
                width="1536"
                height="1024"
                alt=""
                fetchPriority="high"
            />
            <canvas ref={canvas} />
            <div className="wb-universe-fade" />
        </div>
    );
}
