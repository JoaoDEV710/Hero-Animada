// CURSOR //

  /* ── CANVAS ENGINE ── */
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
 
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGrid();
  }
 
  /* ── DOT GRID ── */
  const SPACING = 44;
  let dots = [];
 
  function buildGrid() {
    dots = [];
    const cols = Math.ceil(W / SPACING) + 1;
    const rows = Math.ceil(H / SPACING) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          ox: c * SPACING,
          oy: r * SPACING,
          x: c * SPACING,
          y: r * SPACING,
          size: 1.2,
          alpha: 0.12,
        });
      }
    }
  }
 
  /* ── TRAIL PARTICLES ── */
  const particles = [];
  const MAX_P = 150;
  const greens = ['rgba(10,255,110,', 'rgba(0,201,74,', 'rgba(0,255,153,', 'rgba(57,255,20,'];
 
  class Particle {
    constructor(x, y, fast) {
      this.x = x; this.y = y;
      this.size = Math.random() * 3 + 0.8;
      this.color = greens[Math.floor(Math.random() * greens.length)];
      this.alpha = Math.random() * 0.8 + 0.3;
      const spd = fast ? 5 : 1.6;
      this.vx = (Math.random() - 0.5) * spd;
      this.vy = (Math.random() - 0.5) * spd;
      this.life = 1;
      this.decay = Math.random() * 0.018 + (fast ? 0.018 : 0.007);
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.vx *= 0.96; this.vy *= 0.96;
      this.life -= this.decay;
      this.size *= 0.993;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
      ctx.fillStyle = this.color + (this.life * this.alpha) + ')';
      ctx.fill();
    }
  }
 
  /* ── RIPPLE RINGS (canvas-based) ── */
  const rings = [];
  class Ring {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.r = 0; this.life = 1;
    }
    update() { this.r += 5; this.life -= 0.022; }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(10,255,110,${this.life * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
 
  /* ── MAIN LOOP ── */
  let mx = W / 2, my = H / 2;
  const INFLUENCE = 130;
  const PUSH = 28;
 
  function loop() {
    ctx.clearRect(0, 0, W, H);
 
    /* Draw dot grid — each dot reacts to mouse */
    for (const d of dots) {
      const dx = d.ox - mx, dy = d.oy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
 
      if (dist < INFLUENCE) {
        const force = (1 - dist / INFLUENCE);
        const angle = Math.atan2(dy, dx);
        // push dot away from cursor
        d.x = d.ox + Math.cos(angle) * force * PUSH;
        d.y = d.oy + Math.sin(angle) * force * PUSH;
        d.size = 1.2 + force * 3.5;
        d.alpha = 0.12 + force * 0.75;
      } else {
        // spring back
        d.x += (d.ox - d.x) * 0.12;
        d.y += (d.oy - d.y) * 0.12;
        d.size += (1.2 - d.size) * 0.12;
        d.alpha += (0.12 - d.alpha) * 0.12;
      }
 
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(10,255,110,${d.alpha})`;
      ctx.fill();
    }
 
    /* Draw connection lines between close dots near cursor */
    const nearby = dots.filter(d => {
      const dx = d.ox - mx, dy = d.oy - my;
      return Math.sqrt(dx * dx + dy * dy) < INFLUENCE * 1.1;
    });
    for (let i = 0; i < nearby.length; i++) {
      for (let j = i + 1; j < nearby.length; j++) {
        const a = nearby[i], b = nearby[j];
        const dd = Math.hypot(a.x - b.x, a.y - b.y);
        if (dd < SPACING * 1.6) {
          const strength = (1 - dd / (SPACING * 1.6)) * 0.25;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(10,255,110,${strength})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
 
    /* Particles */
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update(); p.draw();
      if (p.life <= 0) particles.splice(i, 1);
    }
 
    /* Rings */
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.update(); r.draw();
      if (r.life <= 0) rings.splice(i, 1);
    }
 
    requestAnimationFrame(loop);
  }
 
  resize();
  window.addEventListener('resize', resize);
  loop();
 
  /* ── MOUSE TRACKING ── */
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  let lastSpawn = 0;
 
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
 
    gsap.set(cursor, { x: mx, y: my });
    gsap.to(ring, { x: mx, y: my, duration: 0.22, ease: 'power2.out' });
 
    const now = Date.now();
    if (now - lastSpawn > 22 && particles.length < MAX_P) {
      for (let i = 0; i < 2; i++) {
        particles.push(new Particle(mx + (Math.random() - 0.5) * 6, my + (Math.random() - 0.5) * 6, false));
      }
      lastSpawn = now;
    }
  });
 
  /* Click — canvas rings + burst */
  window.addEventListener('click', e => {
    rings.push(new Ring(e.clientX, e.clientY));
    rings.push(new Ring(e.clientX, e.clientY));
    setTimeout(() => rings.push(new Ring(e.clientX, e.clientY)), 120);
 
    for (let i = 0; i < 22; i++) {
      particles.push(new Particle(e.clientX, e.clientY, true));
    }
  });
 
  /* ── GSAP INTRO TIMELINE ── */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
 
  tl.from('nav', { y: -30, opacity: 0, duration: 0.7 })
    .to('.badge', { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
    .to('.headline-word', {
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power4.out'
    }, '-=0.2')
    .to('.sub', { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
    .to('.buttons', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.scroll-hint', { opacity: 1, duration: 0.5 }, '-=0.2');
 
  /* ── MAGNETIC BUTTONS ── */
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(btn, { x: dx * 0.25, y: dy * 0.25, duration: 0.3, ease: 'power2.out' });
      // Enlarge cursor ring on button hover
      gsap.to(ring, { scale: 1.8, opacity: 0.4, duration: 0.25 });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(ring, { scale: 1, opacity: 1, duration: 0.25 });
    });
  });