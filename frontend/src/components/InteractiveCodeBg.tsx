import React, { useEffect, useRef } from 'react';

export default function InteractiveCodeBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Security/code themed characters
    const CHARACTERS = '01ABCDEF{}[]<>/\\|#@!$%^&*()_+=-:;'.split('');

    interface GridCharacter {
      char: string;
      originX: number;
      originY: number;
      x: number;
      y: number;
      opacity: number;
    }

    let grid: GridCharacter[] = [];
    const gridSpacing = 20;

    const initGrid = () => {
      grid = [];
      const cols = Math.ceil(width / gridSpacing) + 2;
      const rows = Math.ceil(height / gridSpacing) + 2;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          const originX = c * gridSpacing - gridSpacing / 2;
          const originY = r * gridSpacing - gridSpacing / 2;
          // Subtle opacity range: 0.035 to 0.16
          const opacity = Math.random() * (0.16 - 0.035) + 0.035;
          grid.push({ char, originX, originY, x: originX, y: originY, opacity });
        }
      }
    };

    initGrid();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isActive = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      // Match the app's workbench background
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const repulsionRadius = 90;
      const maxPush = 22;
      const lerpSpeed = 0.10;

      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      grid.forEach((p) => {
        let targetX = p.originX;
        let targetY = p.originY;

        if (mouse.isActive) {
          const dx = p.originX - mouse.x;
          const dy = p.originY - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < repulsionRadius) {
            const force = (repulsionRadius - distance) / repulsionRadius;
            const pushDist = force * maxPush;
            const angle = Math.atan2(dy, dx);
            targetX = p.originX + Math.cos(angle) * pushDist;
            targetY = p.originY + Math.sin(angle) * pushDist;
          }
        }

        p.x += (targetX - p.x) * lerpSpeed;
        p.y += (targetY - p.y) * lerpSpeed;

        // Characters near mouse get a cyan highlight
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mouse.isActive && mdist < repulsionRadius * 1.6) {
          const highlight = 1 - mdist / (repulsionRadius * 1.6);
          ctx.fillStyle = `rgba(6, 182, 212, ${p.opacity + highlight * 0.22})`;
        } else {
          // Subtle indigo-slate tint matching app palette
          ctx.fillStyle = `rgba(99, 120, 180, ${p.opacity})`;
        }

        ctx.globalAlpha = 1;
        ctx.fillText(p.char, p.x, p.y);
      });

      // Radial vignette — center stays visible, edges fade to dark
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.12,
        width / 2, height / 2, height * 0.82
      );
      gradient.addColorStop(0, 'rgba(11,15,25,0)');
      gradient.addColorStop(1, 'rgba(11,15,25,0.90)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
