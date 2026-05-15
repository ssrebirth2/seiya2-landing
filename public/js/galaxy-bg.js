(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("galaxy-stars");
  const nebulaWrap = document.getElementById("galaxy-nebulas");

  let stars = [];
  let shooting = null;
  let nextShooting = 0;
  let rafId = null;
  let w = 0;
  let h = 0;

  function initStars() {
    const count = Math.min(220, Math.floor((w * h) / 9000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.35,
        base: Math.random() * 0.35 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.008,
        driftX: (Math.random() - 0.5) * 0.08,
        driftY: (Math.random() - 0.5) * 0.06,
      });
    }
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    initStars();
  }

  function spawnShooting(now) {
    if (now < nextShooting) return;
    nextShooting = now + 4000 + Math.random() * 8000;
    const fromLeft = Math.random() > 0.5;
    shooting = {
      x: fromLeft ? -40 : w + 40,
      y: Math.random() * h * 0.5 + h * 0.1,
      vx: fromLeft ? 10 + Math.random() * 6 : -(10 + Math.random() * 6),
      vy: 2 + Math.random() * 3,
      life: 1,
      len: 60 + Math.random() * 80,
    };
  }

  function drawFrame(now) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const t = now * 0.001;

    for (const s of stars) {
      s.x += s.driftX;
      s.y += s.driftY;
      if (s.x < 0) s.x += w;
      if (s.x > w) s.x -= w;
      if (s.y < 0) s.y += h;
      if (s.y > h) s.y -= h;

      const twinkle = s.base + Math.sin(t * s.speed * 60 + s.phase) * 0.4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.15, Math.min(0.95, twinkle))})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    spawnShooting(now);
    if (shooting) {
      shooting.x += shooting.vx;
      shooting.y += shooting.vy;
      shooting.life -= 0.018;

      const grad = ctx.createLinearGradient(
        shooting.x,
        shooting.y,
        shooting.x - shooting.vx * 4,
        shooting.y - shooting.vy * 4
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${shooting.life * 0.9})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(
        shooting.x - shooting.vx * (shooting.len / 12),
        shooting.y - shooting.vy * (shooting.len / 12)
      );
      ctx.stroke();

      if (shooting.life <= 0 || shooting.x < -120 || shooting.x > w + 120) {
        shooting = null;
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  function drawStatic() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${s.base})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function bindMouseParallax() {
    if (!nebulaWrap || reducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const max = 18;

    window.addEventListener(
      "mousemove",
      (e) => {
        const nx = (e.clientX / w - 0.5) * 2;
        const ny = (e.clientY / h - 0.5) * 2;
        targetX = nx * max;
        targetY = ny * max;
      },
      { passive: true }
    );

    function smoothFollow() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      nebulaWrap.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      requestAnimationFrame(smoothFollow);
    }
    smoothFollow();
  }

  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (reducedMotion) drawStatic();
      }, 120);
    },
    { passive: true }
  );

  resize();

  if (reducedMotion) {
    drawStatic();
    return;
  }

  rafId = requestAnimationFrame(drawFrame);
  bindMouseParallax();
})();
