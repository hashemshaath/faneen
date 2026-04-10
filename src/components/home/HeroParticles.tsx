import { useEffect, useRef, memo } from "react";

const COLORS = ["rgba(212,175,55,0.4)", "rgba(212,175,55,0.2)", "rgba(255,255,255,0.15)"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

/** Detect device capability and return an appropriate particle count */
function getParticleCount(): number {
  // Check for reduced motion preference
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 8;
  }

  const cores = navigator.hardwareConcurrency || 2;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    || (typeof window !== 'undefined' && window.innerWidth < 768);
  const memGB = (navigator as any).deviceMemory || 4; // Device Memory API (Chrome)

  // Low-end: ≤2 cores, or ≤2 GB RAM, or mobile with ≤4 cores
  if (cores <= 2 || memGB <= 2 || (isMobile && cores <= 4)) {
    return 12;
  }
  // Mid-range mobile
  if (isMobile) {
    return 20;
  }
  // Mid-range desktop
  if (cores <= 4 || memGB <= 4) {
    return 30;
  }
  // High-end
  return 45;
}

/** Decide max connection distance threshold (squared) based on count */
function getConnectionThreshold(count: number): number {
  if (count <= 12) return 0;      // Skip lines entirely on low-end
  if (count <= 20) return 8000;
  return 12000;
}

export const HeroParticles = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const fpsRef = useRef({ frames: 0, last: performance.now(), fps: 60 });
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const particleCount = getParticleCount();
    const connThreshold = getConnectionThreshold(particleCount);
    const MOUSE_RADIUS = 120;
    const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
    const MOUSE_FORCE = 0.08;

    let dpr = Math.min(window.devicePixelRatio, 2);
    if (particleCount <= 20) dpr = Math.min(dpr, 1.5);
    if (particleCount <= 12) dpr = 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking on the parent section (hero)
    const section = canvas.parentElement;
    const handleMouseMove = (e: MouseEvent) => {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    // Touch support
    const handleTouchMove = (e: TouchEvent) => {
      if (!section || !e.touches[0]) return;
      const rect = section.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
      mouseRef.current.active = true;
    };
    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    if (section) {
      section.addEventListener("mousemove", handleMouseMove, { passive: true });
      section.addEventListener("mouseleave", handleMouseLeave);
      section.addEventListener("touchmove", handleTouchMove, { passive: true });
      section.addEventListener("touchend", handleTouchEnd);
    }

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    if (particlesRef.current.length === 0 || particlesRef.current.length !== particleCount) {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2 - 0.05,
        r: Math.random() * 2 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
      }));
    }

    const particles = particlesRef.current;
    let skipFrame = false;

    const draw = () => {
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 1000) {
        fpsRef.current.fps = fpsRef.current.frames;
        fpsRef.current.frames = 0;
        fpsRef.current.last = now;
      }

      if (fpsRef.current.fps < 30) {
        skipFrame = !skipFrame;
        if (skipFrame) { rafRef.current = requestAnimationFrame(draw); return; }
      }

      ctx.clearRect(0, 0, w(), h());
      const cw = w(), ch = h();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseActive = mouseRef.current.active;

      for (const p of particles) {
        // Mouse repulsion/attraction
        if (mouseActive) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < MOUSE_RADIUS_SQ && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Damping to prevent runaway velocity
        p.vx *= 0.995;
        p.vy *= 0.995;

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.y < -10) { p.y = ch + 10; p.x = Math.random() * cw; }
        if (p.x < -10) p.x = cw + 10;
        if (p.x > cw + 10) p.x = -10;

        const currentAlpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));

        // Glow near mouse
        let radius = p.r;
        if (mouseActive) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < MOUSE_RADIUS_SQ) {
            const proximity = 1 - Math.sqrt(distSq) / MOUSE_RADIUS;
            radius = p.r + proximity * 2;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${currentAlpha})`);
        ctx.fill();
      }

      // Mouse glow ring
      if (mouseActive && fpsRef.current.fps >= 25) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS * 0.7);
        gradient.addColorStop(0, "rgba(212,175,55,0.06)");
        gradient.addColorStop(1, "rgba(212,175,55,0)");
        ctx.beginPath();
        ctx.arc(mx, my, MOUSE_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Connection lines + mouse-to-particle lines
      if (connThreshold > 0 && fpsRef.current.fps >= 25) {
        for (let i = 0; i < particles.length; i++) {
          // Line from mouse to nearby particles
          if (mouseActive) {
            const dx = particles[i].x - mx;
            const dy = particles[i].y - my;
            const dist = dx * dx + dy * dy;
            if (dist < MOUSE_RADIUS_SQ) {
              const opacity = (1 - Math.sqrt(dist) / MOUSE_RADIUS) * 0.15;
              ctx.beginPath();
              ctx.moveTo(mx, my);
              ctx.lineTo(particles[i].x, particles[i].y);
              ctx.strokeStyle = `rgba(212,175,55,${opacity})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }

          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = dx * dx + dy * dy;
            if (dist < connThreshold) {
              const opacity = (1 - dist / connThreshold) * 0.08;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(212,175,55,${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(draw);
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
      if (section) {
        section.removeEventListener("mousemove", handleMouseMove);
        section.removeEventListener("mouseleave", handleMouseLeave);
        section.removeEventListener("touchmove", handleTouchMove);
        section.removeEventListener("touchend", handleTouchEnd);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      aria-hidden="true"
    />
  );
});

HeroParticles.displayName = "HeroParticles";
