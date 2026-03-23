'use strict';

/* ── DOM refs ─────────────────────────── */
const cursorDot    = document.getElementById('cursorDot');
const cursorRing   = document.getElementById('cursorRing');
const navbar       = document.getElementById('navbar');
const navToggle    = document.getElementById('navToggle');
const navLinks     = document.getElementById('navLinks');
const threadCanvas = document.getElementById('threadCanvas');
const seg1Path     = document.getElementById('seg1Path');
const seg1Shadow   = document.getElementById('seg1Shadow');
const seg2Path     = document.getElementById('seg2Path');
const seg2Shadow   = document.getElementById('seg2Shadow');
const seg3Path     = document.getElementById('seg3Path');
const seg3Shadow   = document.getElementById('seg3Shadow');
const nodesGroup   = document.getElementById('nodesGroup');

/* ── State ────────────────────────────── */
let docH = 0, segs = [], nodes = [];
let mx = 0, my = 0;

/* ══════════════════════════════════════
   CURSOR
══════════════════════════════════════ */
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursorDot.style.left  = mx + 'px';
  cursorDot.style.top   = my + 'px';
  cursorRing.style.left = mx + 'px';
  cursorRing.style.top  = my + 'px';
  checkProximity();
});

document.querySelectorAll('a,button,.project-card,.skill-category,.cert-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorRing.style.width   = '54px';
    cursorRing.style.height  = '54px';
    cursorRing.style.opacity = '.22';
    cursorDot.style.transform = 'translate(-50%,-50%) scale(1.5)';
  });
  el.addEventListener('mouseleave', () => {
    cursorRing.style.width   = '36px';
    cursorRing.style.height  = '36px';
    cursorRing.style.opacity = '.45';
    cursorDot.style.transform = 'translate(-50%,-50%) scale(1)';
  });
});

/* ══════════════════════════════════════
   NAV
══════════════════════════════════════ */
window.addEventListener('scroll', onScroll, { passive: true });

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ══════════════════════════════════════
   SCROLL REVEAL
   Uses IntersectionObserver.
   Also does an immediate viewport check
   on load so nothing is left hidden.
══════════════════════════════════════ */
function revealAll() {
  document.querySelectorAll('.reveal').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 1.05) {
      el.classList.add('visible');
    }
  });
}

const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ══════════════════════════════════════
   THREAD HELPERS
══════════════════════════════════════ */
function docRect(el) {
  const r  = el.getBoundingClientRect();
  const sy = window.scrollY;
  return {
    top:    r.top    + sy,
    bottom: r.bottom + sy,
    left:   r.left,
    right:  r.right,
    midX:   r.left + r.width  * 0.5,
    midY:   r.top  + r.height * 0.5 + sy,
    width:  r.width,
    height: r.height,
  };
}

function initSeg(pathEl, shadowEl, d) {
  pathEl.setAttribute('d',   d);
  shadowEl.setAttribute('d', d);
  const len = pathEl.getTotalLength();
  pathEl.style.strokeDasharray  = len;
  pathEl.style.strokeDashoffset = len;
  pathEl.style.opacity = '0';
  return len;
}

function makeNode(cx, cy, t) {
  const ns   = 'http://www.w3.org/2000/svg';
  const g    = document.createElementNS(ns, 'g');
  g.classList.add('t-node-group');
  const ring = document.createElementNS(ns, 'circle');
  ring.classList.add('t-node-ring');
  ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', '5');
  const core = document.createElementNS(ns, 'circle');
  core.classList.add('t-node-core');
  core.setAttribute('cx', cx); core.setAttribute('cy', cy); core.setAttribute('r', '2.5');
  g.appendChild(ring); g.appendChild(core);
  nodesGroup.appendChild(g);
  return { el: g, t };
}

/* ══════════════════════════════════════
   BUILD THREAD
   Reads live DOM positions.
   3 segments: Hero→About, Projects, Contact
══════════════════════════════════════ */
function buildThread() {
  docH = document.documentElement.scrollHeight;
  const vw = window.innerWidth;

  /* Size canvas */
  threadCanvas.setAttribute('viewBox', `0 0 ${vw} ${docH}`);
  threadCanvas.setAttribute('width',  vw);
  threadCanvas.setAttribute('height', docH);
  threadCanvas.style.height = docH + 'px';

  nodesGroup.innerHTML = '';
  nodes = []; segs = [];

  const photoFrame  = document.getElementById('heroPhotoFrame');
  const aboutSec    = document.getElementById('about');
  const projectsSec = document.getElementById('projects');
  const cards       = Array.from(document.querySelectorAll('.project-card'));
  const contactSec  = document.getElementById('contact');

  if (!photoFrame || !aboutSec || !projectsSec || !contactSec) return;

  const photo    = docRect(photoFrame);
  const about    = docRect(aboutSec);
  const projects = docRect(projectsSec);
  const contact  = docRect(contactSec);

  const L  = vw * 0.07;
  const ML = vw * 0.20;
  const C  = vw * 0.50;
  const MR = vw * 0.76;
  const R  = vw * 0.92;
  const T  = Math.max(1, docH - window.innerHeight);

  /* ─────────────────────────────────────
     SEG 1 — Hero photo → About
     Single smooth cubic bezier, one stroke
  ───────────────────────────────────── */
  {
    const sx   = photo.right - 10;
    const sy   = photo.midY;
    const ex   = ML;
    const ey   = about.bottom - about.height * 0.12;
    const cp1x = R;
    const cp1y = sy + (ey - sy) * 0.28;
    const cp2x = L;
    const cp2y = sy + (ey - sy) * 0.72;

    const d = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`;

    const len    = initSeg(seg1Path, seg1Shadow, d);
    const sStart = Math.max(0, (sy - window.innerHeight * 0.55) / T);
    const sEnd   = Math.min(1, ey / T);

    segs.push({ path: seg1Path, len, start: sStart, end: sEnd });

    const mid = seg1Path.getPointAtLength(len * 0.5);
    nodes.push(makeNode(mid.x, mid.y, (sStart + sEnd) * 0.5));
  }

  /* ─────────────────────────────────────
     SEG 2 — Projects: weaves between cards
  ───────────────────────────────────── */
  {
    const pEntryY = projects.top  + 80;
    const pExitY  = projects.bottom - 60;
    let   cardPath = '';

    cards.forEach((card, i) => {
      const cr      = docRect(card);
      const isLeft  = i % 2 === 0;
      const cx      = isLeft ? cr.left + 60 : cr.right - 60;
      const cy      = cr.midY;
      const cpX     = isLeft ? MR : ML;
      cardPath += `C ${cpX} ${cy - 80}, ${cx} ${cy - 20}, ${cx} ${cy} `;
      nodes.push(makeNode(cx, cy,
        (projects.top + (i + 0.5) * projects.height / Math.max(cards.length, 1)) / T
      ));
    });

    const lastCard = cards[cards.length - 1];
    const lcr      = lastCard ? docRect(lastCard) : { midY: pExitY };

    const d = `
      M ${C} ${pEntryY}
      C ${ML} ${pEntryY + 50}, ${MR} ${pEntryY + 90}, ${C} ${pEntryY + 120}
      ${cardPath}
      C ${C} ${lcr.midY + 50}, ${MR} ${pExitY - 40}, ${C} ${pExitY}
    `.replace(/\s+/g, ' ').trim();

    const len    = initSeg(seg2Path, seg2Shadow, d);
    const sStart = Math.max(0, (projects.top - window.innerHeight * 0.5) / T);
    const sEnd   = Math.min(1, (projects.bottom + 40) / T);

    segs.push({ path: seg2Path, len, start: sStart, end: sEnd });
  }

  /* ─────────────────────────────────────
     SEG 3 — Contact section
  ───────────────────────────────────── */
  {
    const cEntryY = contact.top  + 50;
    const cMidY   = contact.midY;
    const cExitY  = contact.bottom + 30;

    const d = `
      M ${MR} ${cEntryY}
      C ${R}  ${cEntryY + 40}, ${MR} ${cMidY - 60}, ${C} ${cMidY - 20}
      C ${ML} ${cMidY + 20},   ${C}  ${cMidY + 60}, ${C} ${cExitY}
    `.replace(/\s+/g, ' ').trim();

    const len    = initSeg(seg3Path, seg3Shadow, d);
    const sStart = Math.max(0, (contact.top - window.innerHeight * 0.5) / T);
    const sEnd   = Math.min(1, cExitY / T);

    segs.push({ path: seg3Path, len, start: sStart, end: sEnd });
    nodes.push(makeNode(C, cMidY - 20, (sStart + sEnd) * 0.45));
  }

  draw();
}

/* ══════════════════════════════════════
   DRAW — called on every scroll tick
   Each segment draws within its own
   scroll range with smooth fade in/out
══════════════════════════════════════ */
function draw() {
  const pct = Math.min(window.scrollY / Math.max(1, docH - window.innerHeight), 1);

  segs.forEach(seg => {
    const local = Math.min(Math.max((pct - seg.start) / (seg.end - seg.start), 0), 1);
    seg.path.style.strokeDashoffset = seg.len - seg.len * local;
    const fi = Math.min(local / 0.06, 1);
    const fo = local > 0.94 ? 1 - (local - 0.94) / 0.06 : 1;
    seg.path.style.opacity = (fi * fo * 0.82).toFixed(3);
  });

  nodes.forEach(nd => nd.el.classList.toggle('active', pct >= nd.t));
}

/* ══════════════════════════════════════
   PROXIMITY GLOW
══════════════════════════════════════ */
let proxTimer = null;
function checkProximity() {
  const docY = my + window.scrollY;
  let   minD = Infinity;
  segs.forEach(seg => {
    if (!seg.len) return;
    const step = seg.len / 50;
    for (let i = 0; i <= 50; i++) {
      const pt = seg.path.getPointAtLength(i * step);
      const d  = Math.sqrt((pt.x - mx) ** 2 + (pt.y - docY) ** 2);
      if (d < minD) minD = d;
    }
  });
  const g = document.querySelector('#threadGlow feGaussianBlur');
  if (!g) return;
  if (minD < 80) {
    g.setAttribute('stdDeviation', (2.5 + (1 - minD / 80) * 5).toFixed(1));
    clearTimeout(proxTimer);
    proxTimer = setTimeout(() => g.setAttribute('stdDeviation', '2.5'), 350);
  }
}

/* ══════════════════════════════════════
   SCROLL HANDLER
══════════════════════════════════════ */
function onScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  draw();
}

/* ══════════════════════════════════════
   RESIZE
══════════════════════════════════════ */
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(buildThread, 160);
});

/* ══════════════════════════════════════
   INIT — wait for full layout paint
══════════════════════════════════════ */
window.addEventListener('load', () => {
  revealAll();             // show anything already in viewport
  setTimeout(() => {
    buildThread();         // build thread after layout stable
    revealAll();           // catch any missed elements
  }, 150);
});

/* ══════════════════════════════════════
   ACTIVE NAV HIGHLIGHT
   Underlines the nav link of the section
   currently in view while scrolling.
══════════════════════════════════════ */
const sections  = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

function setActiveNav() {
  const scrollY  = window.scrollY + window.innerHeight * 0.35;
  let   current  = '';

  sections.forEach(sec => {
    const top    = sec.offsetTop;
    const height = sec.offsetHeight;
    if (scrollY >= top && scrollY < top + height) {
      current = sec.getAttribute('id');
    }
  });

  navAnchors.forEach(a => {
    a.classList.remove('nav-active');
    if (a.getAttribute('href') === '#' + current) {
      a.classList.add('nav-active');
    }
  });
}

window.addEventListener('scroll', setActiveNav, { passive: true });
setActiveNav(); // run once on load