"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { LanguageToggle, useLanguage } from "./LanguageProvider";

// The reference pose uses a 100-unit sphere; eye coordinates are their centers.
const signature = { x: -0.65, y: -0.25 };
const eyeRoll = 9.35;
const rollRadians = (eyeRoll * Math.PI) / 180;
const eyes = [
  { x: 19.7, y: 41.8, width: 10.6 },
  { x: 48.6, y: 45.6, width: 13.2 },
].map((eye) => {
  // Undo the reference roll before placing each eye on the sphere's surface.
  const dx = (eye.x - 50) / 50;
  const dy = (eye.y - 50) / 50;
  const x = dx * Math.cos(rollRadians) + dy * Math.sin(rollRadians);
  const y = -dx * Math.sin(rollRadians) + dy * Math.cos(rollRadians);
  return { ...eye, x, y, z: Math.sqrt(1 - x * x - y * y) };
});

function GrokMascot() {
  const { t } = useLanguage();
  const mascotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = mascotRef.current;
    if (!element) return;
    const mascot = element;
    const gaze = mascot.querySelector<SVGGElement>(".grok-gaze")!;
    const positions =
      mascot.querySelectorAll<SVGGElement>(".grok-eye-position");
    const pupils = mascot.querySelectorAll<SVGRectElement>(".grok-eye");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glances = [
      signature,
      { x: 0.65, y: -0.1 },
      { x: 0, y: 0 },
      signature,
    ];
    let frame = 0;
    let visible = true;
    let hovered = false;
    let pose = { ...signature };
    let velocity = { x: 0, y: 0 };
    let pointer: { x: number; y: number } | null = null;
    let lastPointer = -Infinity;
    let previous = performance.now();
    let idleStart = previous;
    let nextBlink = previous + 2800;
    let blinkStart = -Infinity;
    let blinkCount = 0;
    let reactionStart = -Infinity;

    function paint(now: number, still = false) {
      const yaw = (pose.x - signature.x) * 0.6;
      const pitch = (pose.y - signature.y) * 0.45;
      const roll = -Math.max(-1, Math.min(1, pose.x / 0.65)) * eyeRoll;
      gaze.setAttribute("transform", `rotate(${eyeRoll} 50 50)`);
      mascot.style.setProperty("--head-roll", `${roll - eyeRoll}deg`);
      let blink = 1;
      if (!still) {
        if (now >= nextBlink) {
          blinkStart = now;
          blinkCount += 1;
          nextBlink = now + (blinkCount % 2 ? 4100 : 5300);
        }
        const elapsed = now - blinkStart;
        // Alternate single and double blinks, each closing and opening in 120ms.
        const phase =
          elapsed < 120
            ? elapsed
            : blinkCount % 2 === 0 && elapsed >= 200 && elapsed < 320
              ? elapsed - 200
              : -1;
        if (phase >= 0) blink = 1 - 0.92 * Math.sin((phase / 120) * Math.PI);
      }
      const reactionAge = (now - reactionStart) / 1000;
      const bounce =
        !still && reactionAge < 1
          ? Math.sin(reactionAge * 18) * Math.exp(-reactionAge * 5)
          : 0;
      const bob = still ? 0 : Math.sin((now - idleStart) / 1300) * 0.7;
      mascot.style.setProperty("--head-x", `${-(pose.y - signature.y) * 5}deg`);
      mascot.style.setProperty("--head-y", `${(pose.x - signature.x) * 6}deg`);
      mascot.style.setProperty("--bob", `${bob - bounce * 6}px`);
      mascot.style.setProperty("--bounce", `${1 + bounce * 0.07}`);
      eyes.forEach((eye, i) => {
        const x = eye.x * Math.cos(yaw) + eye.z * Math.sin(yaw);
        const z = -eye.x * Math.sin(yaw) + eye.z * Math.cos(yaw);
        const y = eye.y * Math.cos(pitch) + z * Math.sin(pitch);
        // Orthographic projection: width contracts with the local surface yaw.
        const width =
          eye.width *
          Math.max(0.25, Math.sqrt(1 - x * x) / Math.sqrt(1 - eye.x * eye.x));
        positions[i].setAttribute(
          "transform",
          `translate(${50 + x * 50} ${50 + y * 50})`,
        );
        pupils[i].setAttribute("x", `${-width / 2}`);
        pupils[i].setAttribute("width", `${width}`);
        pupils[i].setAttribute("rx", `${width / 2}`);
        const squint =
          !still && (hovered || reactionAge < 0.35)
            ? i === 0
              ? 0.5
              : 0.75
            : 1;
        pupils[i].style.transform = `scaleY(${blink * squint})`;
      });
    }

    function tick(now: number) {
      const dt = Math.min((now - previous) / 1000, 0.032);
      previous = now;
      let target =
        glances[
          Math.max(0, Math.floor((now - idleStart) / 4200)) % glances.length
        ];
      if (pointer && now - lastPointer < 1800) {
        const box = mascot.getBoundingClientRect();
        target = {
          x: Math.max(
            -1,
            Math.min(
              1,
              (pointer.x - box.left - box.width / 2) / (innerWidth * 0.38),
            ),
          ),
          y: Math.max(
            -1,
            Math.min(
              1,
              (pointer.y - box.top - box.height / 2) / (innerHeight * 0.45),
            ),
          ),
        };
      }
      // A damped spring follows page-wide cursor movement without React renders.
      for (const axis of ["x", "y"] as const) {
        velocity[axis] +=
          ((target[axis] - pose[axis]) * 95 - velocity[axis] * 18) * dt;
        pose[axis] += velocity[axis] * dt;
      }
      paint(now);
      frame = requestAnimationFrame(tick);
    }
    function syncMotion() {
      cancelAnimationFrame(frame);
      previous = performance.now();
      if (motion.matches) {
        pose = { ...signature };
        velocity = { x: 0, y: 0 };
        pointer = null;
        paint(previous, true);
      } else if (visible && !document.hidden) {
        nextBlink = previous + 2800;
        idleStart = previous;
        paint(previous);
        frame = requestAnimationFrame(tick);
      }
    }
    function track(event: globalThis.PointerEvent) {
      if (event.pointerType === "touch" || motion.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      lastPointer = performance.now();
      idleStart = lastPointer + 1800;
    }
    function leaveWindow(event: globalThis.PointerEvent) {
      if (!event.relatedTarget) pointer = null;
    }
    function greet() {
      hovered = true;
      reactionStart = performance.now();
    }
    function leave() {
      hovered = false;
    }
    function react() {
      reactionStart = performance.now();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    });
    observer.observe(mascot);
    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("pointerout", leaveWindow);
    document.addEventListener("visibilitychange", syncMotion);
    motion.addEventListener("change", syncMotion);
    mascot.addEventListener("pointerenter", greet);
    mascot.addEventListener("pointerleave", leave);
    mascot.addEventListener("pointerdown", react);
    syncMotion();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerout", leaveWindow);
      document.removeEventListener("visibilitychange", syncMotion);
      motion.removeEventListener("change", syncMotion);
      mascot.removeEventListener("pointerenter", greet);
      mascot.removeEventListener("pointerleave", leave);
      mascot.removeEventListener("pointerdown", react);
    };
  }, []);

  return (
    <span
      ref={mascotRef}
      className="grok-showcase"
      role="img"
      aria-label={t(
        "Grok Bot black orb mascot with two white pill eyes",
        "Grok Bot 黑色球形吉祥物，两只白色胶囊眼睛",
      )}
    >
      <span className="grok-depth">
        <span className="grok-orb" />
        <span className="grok-rim" />
        <svg className="grok-face" viewBox="0 0 100 100" aria-hidden="true">
          <g className="grok-gaze" transform="rotate(9.35 50 50)">
            {eyes.map((eye, i) => (
              <g
                className="grok-eye-position"
                transform={`translate(${50 + eye.x * 50} ${50 + eye.y * 50})`}
                key={i}
              >
                <rect
                  className="grok-eye"
                  x={-eye.width / 2}
                  y={-13.9}
                  width={eye.width}
                  height={27.8}
                  rx={eye.width / 2}
                  fill="#ffffff"
                />
              </g>
            ))}
          </g>
        </svg>
      </span>
    </span>
  );
}

export function Brand() {
  const { t } = useLanguage();
  return (
    <Link
      href="/"
      className="brand"
      aria-label={t("Grok Bot — One Hundred home", "Grok Bot — 返回首页")}
    >
      <GrokMascot />
      <span className="brand-copy">
        <span className="brand-badge">
          {t("GROK BOT · 100 TOOLS", "Grok Bot · 100日造物实验")}
        </span>
        <span className="brand-title">
          one hundred<span className="brand-period">.</span>
        </span>
        <span className="brand-caption">
          {t(
            "Discover & build · every day at 03:00",
            "每日凌晨 03:00 自动发掘痛点并构建",
          )}
        </span>
      </span>
    </Link>
  );
}
export function SiteHeader() {
  const { t } = useLanguage();
  return (
    <header className="site-header">
      <Brand />
      <span className="header-caption mono">
        {t("AN INDEPENDENT TOOLMAKING EXPERIMENT", "一场独立的小工具造物实验")}
      </span>
      <div className="header-controls">
        <LanguageToggle />
        <a
          className="repo-link mono"
          href="https://github.com/Leochens/grok-bot-100-tools"
          target="_blank"
          rel="noreferrer"
        >
          {t("OPEN SOURCE", "开源代码")} <ArrowUpRight size={14} />
        </a>
      </div>
    </header>
  );
}
export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <Brand />
      <span>
        {t("Small by design. Yours by default.", "工具小一点，掌控多一点。")}
      </span>
      <span className="mono">
        {t("100 DAYS / 100 SPECIFIC PROBLEMS", "100 天 / 解决 100 个具体问题")}
      </span>
    </footer>
  );
}
