"use client";

import { useEffect, useRef } from "react";
import type { ColorScheme } from "@/hooks/useColorScheme";

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

type BouncingBallsProps = {
  scheme: ColorScheme;
};

type Palette = {
  ballColors: string[];
  backdropFrom: string;
  backdropTo: string;
  haloA: string;
  haloB: string;
};

const BALL_COUNT = 9;
const GRAVITY = 900;
const RESTITUTION = 0.83;
const RADII = [14, 11, 17, 13, 19, 15, 22, 12, 16];

const LIGHT_PALETTE: Palette = {
  ballColors: [
    "#ad5234",
    "#2f5f82",
    "#3d775d",
    "#9f6f37",
    "#7a4759",
    "#2c546e",
    "#965839",
    "#3d6956",
    "#7f4e38",
  ],
  backdropFrom: "rgba(255, 252, 246, 0.72)",
  backdropTo: "rgba(229, 238, 244, 0.36)",
  haloA: "rgba(181, 90, 49, 0.16)",
  haloB: "rgba(47, 95, 130, 0.14)",
};

const DARK_PALETTE: Palette = {
  ballColors: [
    "#d8a183",
    "#8fb8d4",
    "#93c3ac",
    "#d8ba83",
    "#c99aab",
    "#96b6cf",
    "#d4a58b",
    "#9bc7b2",
    "#d0af98",
  ],
  backdropFrom: "rgba(44, 51, 65, 0.78)",
  backdropTo: "rgba(31, 39, 53, 0.86)",
  haloA: "rgba(220, 163, 135, 0.14)",
  haloB: "rgba(143, 184, 212, 0.12)",
};

const getPalette = (scheme: ColorScheme): Palette =>
  scheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const clampBall = (ball: Ball, width: number, height: number) => {
  ball.x = Math.min(Math.max(ball.x, ball.radius), Math.max(ball.radius, width - ball.radius));
  ball.y = Math.min(Math.max(ball.y, ball.radius), Math.max(ball.radius, height - ball.radius));
};

const createBalls = (width: number, height: number, palette: Palette) =>
  Array.from({ length: BALL_COUNT }, (_, index) => {
    const radius = RADII[index % RADII.length];
    return {
      x: (width / (BALL_COUNT + 1)) * (index + 1),
      y: Math.max(radius + 12, height * 0.35 + Math.random() * height * 0.2),
      vx: (Math.random() - 0.5) * 120,
      vy: -80 - Math.random() * 60,
      radius,
      color: palette.ballColors[index % palette.ballColors.length],
    } satisfies Ball;
  });

export function BouncingBalls({ scheme }: BouncingBallsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const sizeRef = useRef({ width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ index: number; pointerId: number } | null>(null);
  const dragVelocityRef = useRef({ vx: 0, vy: 0 });
  const lastPointerRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const palette = getPalette(scheme);
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;

    const dpr = window.devicePixelRatio ?? 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      if (ballsRef.current.length === 0) {
        ballsRef.current = createBalls(rect.width, rect.height, palette);
      } else {
        ballsRef.current.forEach((ball, index) => {
          ball.color = palette.ballColors[index % palette.ballColors.length];
          clampBall(ball, rect.width, rect.height);
        });
      }
    };

    resize();

    const getPointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const stepPhysics = (delta: number) => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;

      ballsRef.current.forEach((ball, index) => {
        if (dragStateRef.current?.index === index) {
          clampBall(ball, width, height);
          return;
        }

        ball.vy += GRAVITY * delta;
        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;

        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx) * RESTITUTION;
        } else if (ball.x + ball.radius > width) {
          ball.x = width - ball.radius;
          ball.vx = -Math.abs(ball.vx) * RESTITUTION;
        }

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy) * RESTITUTION;
        } else if (ball.y + ball.radius > height) {
          ball.y = height - ball.radius;
          ball.vy = -Math.abs(ball.vy) * RESTITUTION;
          ball.vx *= 0.985;
          if (Math.abs(ball.vy) < 8) {
            ball.vy = 0;
          }
        }
      });
    };

    const draw = () => {
      const ctx = ctxRef.current;
      const { width, height } = sizeRef.current;
      if (!ctx || !width || !height) return;

      ctx.clearRect(0, 0, width, height);

      const backdrop = ctx.createLinearGradient(0, 0, width, height);
      backdrop.addColorStop(0, palette.backdropFrom);
      backdrop.addColorStop(1, palette.backdropTo);
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      const haloA = ctx.createRadialGradient(
        width * 0.18,
        height * 0.22,
        width * 0.04,
        width * 0.18,
        height * 0.22,
        width * 0.38
      );
      haloA.addColorStop(0, palette.haloA);
      haloA.addColorStop(1, "transparent");
      ctx.fillStyle = haloA;
      ctx.fillRect(0, 0, width, height);

      const haloB = ctx.createRadialGradient(
        width * 0.82,
        height * 0.72,
        width * 0.04,
        width * 0.82,
        height * 0.72,
        width * 0.44
      );
      haloB.addColorStop(0, palette.haloB);
      haloB.addColorStop(1, "transparent");
      ctx.fillStyle = haloB;
      ctx.fillRect(0, 0, width, height);

      ballsRef.current.forEach((ball) => {
        const glow = ctx.createRadialGradient(
          ball.x,
          ball.y,
          ball.radius * 0.2,
          ball.x,
          ball.y,
          ball.radius * 1.3
        );
        glow.addColorStop(0, withAlpha(ball.color, 0.9));
        glow.addColorStop(1, withAlpha(ball.color, 0.24));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let lastFrame = performance.now();
    const tick = (time: number) => {
      const delta = Math.min((time - lastFrame) / 1000, 0.032);
      lastFrame = time;
      stepPhysics(delta);
      draw();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    const handlePointerDown = (event: PointerEvent) => {
      const position = getPointerPosition(event);
      const hitIndex = [...ballsRef.current]
        .map((ball, index) => ({ ball, index }))
        .reverse()
        .find(({ ball }) => {
          const distance = Math.hypot(ball.x - position.x, ball.y - position.y);
          return distance <= ball.radius + 4;
        })?.index;

      if (hitIndex === undefined) return;

      dragStateRef.current = { index: hitIndex, pointerId: event.pointerId };
      dragVelocityRef.current = { vx: 0, vy: 0 };
      lastPointerRef.current = { ...position, time: event.timeStamp };
      ballsRef.current[hitIndex].vx = 0;
      ballsRef.current[hitIndex].vy = 0;
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const position = getPointerPosition(event);
      const { width, height } = sizeRef.current;
      const ball = ballsRef.current[dragState.index];
      const clampedX = Math.min(Math.max(position.x, ball.radius), width - ball.radius);
      const clampedY = Math.min(Math.max(position.y, ball.radius), height - ball.radius);

      const lastPointer = lastPointerRef.current;
      if (lastPointer) {
        const deltaTime = Math.max((event.timeStamp - lastPointer.time) / 1000, 0.001);
        dragVelocityRef.current = {
          vx: (clampedX - lastPointer.x) / deltaTime,
          vy: (clampedY - lastPointer.y) / deltaTime,
        };
      }

      ball.x = clampedX;
      ball.y = clampedY;
      ball.vx = 0;
      ball.vy = 0;

      lastPointerRef.current = { x: clampedX, y: clampedY, time: event.timeStamp };
    };

    const releaseDrag = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const ball = ballsRef.current[dragState.index];
      ball.vx = dragVelocityRef.current.vx;
      ball.vy = dragVelocityRef.current.vy;

      dragStateRef.current = null;
      lastPointerRef.current = null;
      canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", releaseDrag);
    canvas.addEventListener("pointercancel", releaseDrag);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", releaseDrag);
      canvas.removeEventListener("pointercancel", releaseDrag);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheme]);

  return (
    <div
      ref={containerRef}
      className="relative h-[clamp(220px,27vw,290px)] w-full overflow-hidden rounded-[1.05rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_88%,transparent)] shadow-[var(--shadow-soft)]"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="canvas-halo pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,color-mix(in_oklab,var(--accent-main)_18%,transparent),transparent_42%),radial-gradient(circle_at_78%_68%,color-mix(in_oklab,var(--accent-cool)_18%,transparent),transparent_45%)]" />
    </div>
  );
}
