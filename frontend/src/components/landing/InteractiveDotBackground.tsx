import { useEffect, useRef } from 'react';

export function InteractiveDotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Ajustar resolución interna para pantallas de alta densidad (Retina)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Ajustar tamaño CSS
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Escalar el contexto para que el dibujo coincida con las coordenadas CSS
      ctx.scale(dpr, dpr);
      
      width = rect.width;
      height = rect.height;
      initDots();
    };

    let dots: { x: number; y: number; baseRadius: number; radius: number }[] = [];
    const spacing = 45;
    const mouse = { x: -1000, y: -1000 };

    function initDots() {
      dots = [];
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          // Aumentado de 1.2 a 1.8 para que sean más visibles a simple vista
          dots.push({ x: x + spacing / 2, y: y + spacing / 2, baseRadius: 1.8, radius: 1.8 });
        }
      }
    }

    let animationFrameId: number;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let currentRadius = dot.baseRadius;
        
        // Color base un poco más oscuro para que contraste con el fondo claro
        let r = 215, g = 210, b = 200;

        if (dist < 120) {
          const factor = (120 - dist) / 120;
          // Mayor crecimiento al pasar el mouse
          currentRadius = dot.baseRadius + (factor * 3.0);
          
          // Transición hacia un naranja suave
          r = 215 + (factor * (255 - 215)); 
          g = 210 - (factor * (210 - 160)); 
          b = 200 - (factor * (200 - 80));
        }

        dot.radius += (currentRadius - dot.radius) * 0.15;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},1)`;

        if (dist < 120) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(255, 200, 140, 0.4)";
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Como el canvas está fixed a pantalla completa, 
      // podemos usar clientX/Y directamente sin restar el rect.
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    
    // Configuración inicial
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full object-cover z-0"
      style={{ pointerEvents: 'auto' }}
    />
  );
}
