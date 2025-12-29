"use client";

import { useEffect, useRef } from "react";

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

const BALL_COUNT = 8;
const GRAVITY = 900;
const RESTITUTION = 0.82;
const COLORS = [
  "#ffd6e8",
  "#d8e2dc",
  "#ffe5b9",
  "#e8f9fd",
  "#d6f6ff",
  "#d4c1ec",
  "#fbe7c6",
  "#c8f7c5",
];

const RADII = [16, 12, 18, 14, 20, 13, 22, 15];

const clampBall = (ball: Ball, width: number, height: number) => {
  ball.x = Math.min(Math.max(ball.x, ball.radius), Math.max(ball.radius, width - ball.radius));
  ball.y = Math.min(Math.max(ball.y, ball.radius), Math.max(ball.radius, height - ball.radius));
};

const createBalls = (width: number, height: number) =>
  Array.from({ length: BALL_COUNT }, (_, index) => {
    const radius = RADII[index % RADII.length];
    return {
      x: (width / (BALL_COUNT + 1)) * (index + 1),
      y: Math.max(radius + 12, height * 0.35 + Math.random() * height * 0.2),
      vx: (Math.random() - 0.5) * 120,
      vy: -80 - Math.random() * 60,
      radius,
      color: COLORS[index % COLORS.length],
    } satisfies Ball;
  });

export function BouncingBalls() {
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
        ballsRef.current = createBalls(rect.width, rect.height);
      } else {
        ballsRef.current.forEach((ball) => clampBall(ball, rect.width, rect.height));
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
      backdrop.addColorStop(0, "rgba(226, 232, 240, 0.42)");
      backdrop.addColorStop(1, "rgba(148, 163, 184, 0.18)");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      ballsRef.current.forEach((ball) => {
        const glow = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.2, ball.x, ball.y, ball.radius * 1.3);
        glow.addColorStop(0, `${ball.color}dd`);
        glow.addColorStop(1, `${ball.color}33`);
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[240px] w-full overflow-hidden rounded-lg bg-gradient-to-br from-white/90 via-slate-100/70 to-sky-50/60 shadow-inner backdrop-blur-md dark:from-slate-900/60 dark:via-slate-900/70 dark:to-slate-950/60"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(99,102,241,0.14),transparent_40%)]" />
    </div>
  );
}
