import { WORDS } from './words.js';
import { speak } from './speech.js';
import { loadProgress, saveProgress } from './progress.js';
import { showScreen } from './ui.js';

// === Constants ===
const WORDS_PER_GAME = 10;
const GRAVITY = 0.7;
const JUMP_VY = -14;
const DUCK_H_RATIO = 0.45;     // how short Tinti is when ducking
const GATE_SPEED = 3.5;        // how fast gates scroll left
const GATE_GAP = 320;          // px between gates in a group
const GROUP_GAP = 220;         // px between word groups
const TINTI_DRAW_SCALE = 2.5;

// === State ===
let canvas, ctx, W, H, groundY;
let running = false;
let animFrame = null;
let score = 0;
let currentWord = null;
let wordQueue = [];
let gates = [];         // {x, word, isTarget, state, gateH, gateY}
let particles = [];
let decorations = [];
let bgStars = [];
let tinti = null;
let onExit = null;
let totalWordsAnswered = 0;
let gameSpeed = 1;
let nextGroupX = 0;
let waitingForWord = false;
let inputLocked = false;
let comboCount = 0;

// Input
let keys = {};
let touchAction = null;   // 'jump' | 'duck'

// === Init ===
export function startPlatformer(exitCallback) {
  onExit = exitCallback;
  canvas = document.getElementById('platformer-canvas');
  ctx = canvas.getContext('2d');

  // IMPORTANT: show screen FIRST so canvas has dimensions
  showScreen('platformer-screen');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const progress = loadProgress();
  const maxLevel = progress.unlockedLevel || 1;
  const available = WORDS.filter(w => w.minLevel <= maxLevel);
  wordQueue = shuffle(available).slice(0, WORDS_PER_GAME + 5);

  score = 0;
  totalWordsAnswered = 0;
  gates = [];
  particles = [];
  decorations = [];
  comboCount = 0;
  gameSpeed = 1;
  nextGroupX = W + 200;
  waitingForWord = false;
  inputLocked = false;
  keys = {};
  touchAction = null;

  bgStars = [];
  for (let i = 0; i < 40; i++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H * 0.45, size: 0.8 + Math.random() * 2, tw: Math.random() * Math.PI * 2 });
  }

  for (let dx = 0; dx < W * 3; dx += 60 + Math.random() * 100) {
    decorations.push({ x: dx, type: Math.random() > 0.5 ? 'bush' : 'flower', seed: Math.random() });
  }

  const tintiH = 48 * TINTI_DRAW_SCALE;
  tinti = {
    x: W * 0.15,
    y: groundY - tintiH,
    baseY: groundY - tintiH,
    vy: 0,
    w: 40 * TINTI_DRAW_SCALE,
    h: tintiH,
    ducking: false,
    jumping: false,
    happy: 0,
    hurt: 0,
    walkCycle: 0,
    squash: 0,
  };

  updateScoreDisplay();

  // Input handlers — register on all levels to ensure we catch keys
  document.addEventListener('keydown', onKeyDown, true);  // capture phase
  document.addEventListener('keyup', onKeyUp, true);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('click', onCanvasClick);

  // Ensure canvas can receive focus
  canvas.tabIndex = 0;
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';
  // Focus after a small delay to ensure the screen is visible
  setTimeout(() => canvas.focus(), 100);

  document.getElementById('platformer-replay-btn').onclick = (e) => {
    e.stopPropagation();
    if (currentWord) speak(currentWord.target);
    setTimeout(() => canvas.focus(), 50);
  };
  document.getElementById('btn-back-platformer').onclick = (e) => {
    e.stopPropagation();
    stopPlatformer();
  };

  // On-screen control buttons
  const btnJump = document.getElementById('btn-jump');
  const btnDuck = document.getElementById('btn-duck');

  btnJump.addEventListener('pointerdown', (e) => { e.preventDefault(); doJump(); });
  btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); doJump(); }, { passive: false });

  btnDuck.addEventListener('pointerdown', (e) => { e.preventDefault(); doDuck(true); });
  btnDuck.addEventListener('touchstart', (e) => { e.preventDefault(); doDuck(true); }, { passive: false });
  btnDuck.addEventListener('pointerup', () => doDuck(false));
  btnDuck.addEventListener('pointerleave', () => doDuck(false));
  btnDuck.addEventListener('touchend', () => doDuck(false));

  running = true;
  nextWord();
  gameLoop();
}

export function stopPlatformer() {
  running = false;
  if (animFrame) cancelAnimationFrame(animFrame);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('keyup', onKeyUp, true);
  canvas.removeEventListener('keydown', onKeyDown);
  canvas.removeEventListener('keyup', onKeyUp);
  canvas.removeEventListener('touchstart', onTouchStart);
  canvas.removeEventListener('touchend', onTouchEnd);
  canvas.removeEventListener('click', onCanvasClick);
  window.removeEventListener('resize', resizeCanvas);
  hideMsg();
  if (onExit) onExit();
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio;
  W = canvas.parentElement.clientWidth;
  H = canvas.parentElement.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = H * 0.82;
}

// === Input ===
function onKeyDown(e) {
  if (!running || e.repeat) return;
  keys[e.code] = true;

  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    doJump();
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    doDuck(true);
  }
}

function onKeyUp(e) {
  if (!running) return;
  keys[e.code] = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    doDuck(false);
  }
}

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const y = touch.clientY - rect.top;

  // Top half = jump, bottom half = duck
  if (y < H * 0.5) {
    touchAction = 'jump';
    doJump();
  } else {
    touchAction = 'duck';
    doDuck(true);
  }
}

function onTouchEnd() {
  if (touchAction === 'duck') {
    doDuck(false);
  }
  touchAction = null;
}

function onCanvasClick(e) {
  // Click = jump (for mouse users)
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  if (y < H * 0.5) {
    doJump();
  } else {
    // Quick duck
    doDuck(true);
    setTimeout(() => doDuck(false), 300);
  }
}

function doJump() {
  if (inputLocked) return;
  if (tinti.y >= tinti.baseY - 2) {
    tinti.vy = JUMP_VY;
    tinti.jumping = true;
    tinti.ducking = false;
  }
}

function doDuck(active) {
  if (inputLocked) return;
  tinti.ducking = active;
}

// === Word Management ===
async function nextWord() {
  if (totalWordsAnswered >= WORDS_PER_GAME) {
    inputLocked = true;
    showMsg(`Geschafft! ${score} Sterne! \u2B50`);
    const progress = loadProgress();
    progress.totalStars += score;
    saveProgress(progress);
    setTimeout(() => stopPlatformer(), 2500);
    return;
  }

  if (wordQueue.length === 0) {
    const progress = loadProgress();
    const maxLevel = progress.unlockedLevel || 1;
    const available = WORDS.filter(w => w.minLevel <= maxLevel);
    wordQueue = shuffle(available).slice(0, 10);
  }

  currentWord = wordQueue.shift();
  waitingForWord = true;

  // Spawn gate group
  spawnGateGroup(currentWord);

  const wordEl = document.getElementById('platformer-word');
  wordEl.textContent = '\uD83D\uDD0A ...';
  await speak(currentWord.target);
  wordEl.textContent = 'Welches Wort?';
  waitingForWord = false;
}

function spawnGateGroup(wordData) {
  const options = shuffle([wordData.target, ...wordData.distractors]);

  // Ensure we have at least 2 gates
  if (options.length < 2) {
    const extra = WORDS.filter(w => w.target !== wordData.target && !wordData.distractors.includes(w.target));
    if (extra.length > 0) options.push(extra[Math.floor(Math.random() * extra.length)].target);
  }

  const startX = Math.max(nextGroupX, W + 100);

  options.forEach((word, i) => {
    const isTarget = word === wordData.target;

    // Target gate: has an opening at jump height (top gate, jump through)
    // Distractor gate: has an opening at duck height (bottom gate, duck under)
    // OR: target = opening at ground level (run through), distractor = wall you must jump over
    // Let's make it: target = archway you run/jump THROUGH, distractor = wall you must DUCK under

    // Actually simpler: gates are walls. Target has a hole you jump through. Distractor has a hole at ground = duck through.
    // Even simpler for a kid:
    //   - Richtig: Springe hindurch! (Tor hat Öffnung oben, man muss springen)
    //   - Falsch: Duck dich! (Tor blockiert oben, Öffnung unten)
    // NEIN — das wäre unfair wenn man nicht weiss welches richtig ist.

    // Better approach: ALL gates are walls coming at you.
    // The TARGET word gate: jump to pass through (it has a gap at jump height)
    // The WRONG word gates: duck to pass under them (they float above ground)

    // Simplest clear mechanic:
    //   Target gate = on the ground, must JUMP over it
    //   Wrong gates = hanging from top, must DUCK under them

    gates.push({
      x: startX + i * GATE_GAP,
      word,
      isTarget,
      state: 'active',  // active, passed, hit
      // Target: ground obstacle (jump over). Wrong: ceiling obstacle (duck under).
      type: isTarget ? 'ground' : 'ceiling',
    });
  });

  nextGroupX = startX + options.length * GATE_GAP + GROUP_GAP;
}

// === Collision ===
function checkGateCollisions() {
  const tintiLeft = tinti.x + 10;
  const tintiRight = tinti.x + tinti.w - 10;
  const isJumping = tinti.y < tinti.baseY - 20;
  const isDucking = tinti.ducking && !isJumping;
  const tintiTop = isDucking ? tinti.y + tinti.h * (1 - DUCK_H_RATIO) : tinti.y;
  const tintiBottom = tinti.y + tinti.h;

  for (const g of gates) {
    if (g.state !== 'active') continue;

    const gateLeft = g.x;
    const gateRight = g.x + 60;

    // Check if tinti is passing through gate zone
    if (tintiRight > gateLeft && tintiLeft < gateRight) {
      if (g.type === 'ground') {
        // Ground obstacle: block from y=groundY-obstacleH to y=groundY
        const obstH = 80;
        const obstTop = groundY - obstH;
        // Collision if tinti's bottom is below obstTop and tinti is not jumping high enough
        if (tintiBottom > obstTop + 10 && !isJumping) {
          hitGate(g);
        }
      } else {
        // Ceiling obstacle: block from y=0 to y=ceilingBottom
        const ceilBottom = groundY - 55;
        // Collision if tinti's top is above ceilBottom (not ducking enough)
        if (tintiTop < ceilBottom && !isDucking) {
          hitGate(g);
        }
      }
    }

    // Mark as passed once it's behind tinti
    if (g.state === 'active' && gateRight < tintiLeft) {
      passGate(g);
    }
  }
}

function hitGate(gate) {
  gate.state = 'hit';

  if (gate.isTarget) {
    // Hit the target gate (should have jumped!) — wrong action
    comboCount = 0;
    tinti.hurt = 25;
    showMsg('Spring über das richtige Wort! \u2B50');
    spawnHitParticles(gate.x, groundY - 60, '#FF9800');
    totalWordsAnswered++;
    updateScoreDisplay();

    // Re-speak after a moment
    setTimeout(async () => {
      if (currentWord) await speak(currentWord.target);
      hideMsg();
      setTimeout(() => nextWord(), 500);
    }, 800);
  } else {
    // Hit a wrong gate (should have ducked!) — wrong action
    comboCount = 0;
    tinti.hurt = 25;
    showMsg('Duck dich unter falschen Wörtern!');
    spawnHitParticles(gate.x, groundY - 60, '#FF9800');
    totalWordsAnswered++;
    updateScoreDisplay();

    setTimeout(async () => {
      if (currentWord) await speak(currentWord.target);
      hideMsg();
      setTimeout(() => nextWord(), 500);
    }, 800);
  }

  // Lock briefly
  inputLocked = true;
  setTimeout(() => { inputLocked = false; }, 600);
}

function passGate(gate) {
  gate.state = 'passed';

  if (gate.isTarget) {
    // Successfully jumped over target gate!
    score++;
    comboCount++;
    tinti.happy = 30;
    totalWordsAnswered++;
    updateScoreDisplay();

    spawnHitParticles(gate.x + 30, groundY - 100, '#FFD700');
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: gate.x + 30 + (Math.random() - 0.5) * 40,
        y: groundY - 80 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3,
        life: 1.2, size: 18, type: 'star',
      });
    }

    if (comboCount >= 3 && comboCount % 3 === 0) {
      showMsg(`${comboCount}x Streak! \uD83D\uDD25`);
      setTimeout(hideMsg, 1200);
    } else {
      showMsg('Richtig! \u2B50');
      setTimeout(hideMsg, 800);
    }

    // Next word after all gates in this group pass
    const activeGates = gates.filter(g => g.state === 'active');
    if (activeGates.length === 0) {
      setTimeout(() => nextWord(), 600);
    }
  }
  // Wrong gates passing = good (ducked successfully), no action needed
}

function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1, color, size: 3 + Math.random() * 4, type: 'burst',
    });
  }
}

// === Game Loop ===
function gameLoop() {
  if (!running) return;
  update();
  render();
  animFrame = requestAnimationFrame(gameLoop);
}

function update() {
  const time = performance.now() * 0.001;

  // Tinti physics
  tinti.vy += GRAVITY;
  tinti.y += tinti.vy;
  if (tinti.y >= tinti.baseY) {
    tinti.y = tinti.baseY;
    tinti.vy = 0;
    if (tinti.jumping) {
      tinti.jumping = false;
      tinti.squash = 8;
    }
  }

  tinti.walkCycle += 0.1;
  if (tinti.squash > 0) tinti.squash *= 0.85;
  if (tinti.happy > 0) tinti.happy--;
  if (tinti.hurt > 0) tinti.hurt--;

  // Move gates
  const speed = GATE_SPEED * gameSpeed;
  gates.forEach(g => { g.x -= speed; });

  // Remove old gates
  gates = gates.filter(g => g.x > -100);

  // Collisions
  checkGateCollisions();

  // Extend decorations
  const lastDeco = decorations[decorations.length - 1];
  if (lastDeco && lastDeco.x < W * 3 + nextGroupX) {
    for (let i = 0; i < 5; i++) {
      decorations.push({ x: lastDeco.x + 60 + Math.random() * 100, type: Math.random() > 0.5 ? 'bush' : 'flower', seed: Math.random() });
    }
  }
  // Scroll decorations
  decorations.forEach(d => { d.x -= speed * 0.6; });
  decorations = decorations.filter(d => d.x > -80);

  // Particles
  particles.forEach(p => {
    p.x -= speed * 0.3; // move with world a bit
    p.x += p.vx;
    p.y += p.vy;
    if (p.type !== 'trail') p.vy += 0.12;
    p.life -= 0.02;
  });
  particles = particles.filter(p => p.life > 0);
}

function render() {
  const time = performance.now() * 0.001;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0f1b47');
  skyGrad.addColorStop(0.3, '#1a2980');
  skyGrad.addColorStop(0.65, '#26d0ce');
  skyGrad.addColorStop(1, '#1a8a6b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  bgStars.forEach(s => {
    const alpha = 0.3 + Math.sin(time * 2.5 + s.tw) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 220 + time * 8) % (W + 300)) - 150;
    const cy = 50 + (i % 3) * 35;
    ctx.beginPath();
    ctx.arc(cx, cy, 22 + i * 3, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy - 10, 18 + i * 2, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy - 3, 20 + i * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hills parallax
  ctx.fillStyle = 'rgba(26, 41, 128, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= W; x += 4) {
    const wx = x + time * 5;
    ctx.lineTo(x, groundY - 35 - Math.sin(wx * 0.01) * 25 - Math.sin(wx * 0.025) * 15);
  }
  ctx.lineTo(W, groundY);
  ctx.fill();

  ctx.fillStyle = 'rgba(45, 138, 78, 0.2)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= W; x += 4) {
    const wx = x + time * 12;
    ctx.lineTo(x, groundY - 12 - Math.sin(wx * 0.015) * 18 - Math.sin(wx * 0.035) * 8);
  }
  ctx.lineTo(W, groundY);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#5C3A1E';
  ctx.fillRect(0, groundY, W, H - groundY);
  const grassGrad = ctx.createLinearGradient(0, groundY - 6, 0, groundY + 18);
  grassGrad.addColorStop(0, '#4CAF50');
  grassGrad.addColorStop(0.3, '#388E3C');
  grassGrad.addColorStop(1, '#5C3A1E');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, groundY - 6, W, 24);

  // Grass blades
  ctx.fillStyle = '#66BB6A';
  for (let gx = 0; gx < W; gx += 20) {
    const h2 = 7 + Math.sin(gx * 0.4 + time * 3) * 3;
    ctx.beginPath();
    ctx.moveTo(gx - 3, groundY - 3);
    ctx.lineTo(gx, groundY - 3 - h2);
    ctx.lineTo(gx + 3, groundY - 3);
    ctx.fill();
  }

  // Decorations
  decorations.forEach(d => {
    if (d.x < -60 || d.x > W + 60) return;
    if (d.type === 'bush') {
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(d.x, groundY - 3, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.arc(d.x + 7, groundY - 5, 10, Math.PI, 0);
      ctx.fill();
    } else {
      const sway = Math.sin(time * 2 + d.seed * 10) * 3;
      ctx.strokeStyle = '#388E3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x, groundY - 3);
      ctx.lineTo(d.x + sway, groundY - 18);
      ctx.stroke();
      ctx.fillStyle = ['#FF5722', '#E91E63', '#FFD700', '#9C27B0'][Math.floor(d.seed * 4)];
      ctx.beginPath();
      ctx.arc(d.x + sway, groundY - 20, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // === Draw Gates ===
  gates.forEach(g => {
    if (g.x < -80 || g.x > W + 80) return;
    drawGate(g, time);
  });

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.type === 'star') {
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('\u2B50', p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(0, p.life), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  // === Draw Tinti ===
  drawTinti(time);

  // HUD: controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '700 13px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u2B06 Springen  |  \u2B07 Ducken', W / 2, H - 10);

  // Progress
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(`${totalWordsAnswered} / ${WORDS_PER_GAME}`, W / 2, H - 28);
}

function drawGate(g, time) {
  const gateW = 60;
  const alpha = g.state === 'hit' ? 0.4 : 1;
  ctx.globalAlpha = alpha;

  if (g.type === 'ground') {
    // Ground obstacle: a block sitting on the ground
    const obstH = 80;
    const obstY = groundY - obstH;

    // Pole/wall
    const color = g.state === 'passed' ? '#4CAF50' : g.state === 'hit' ? '#FF9800' : '#C0853C';
    const sideColor = g.state === 'passed' ? '#388E3C' : g.state === 'hit' ? '#E65100' : '#8B5E3C';

    // 3D side
    ctx.fillStyle = sideColor;
    roundRect(ctx, g.x, obstY + 6, gateW, obstH, 8);
    ctx.fill();

    // Front
    ctx.fillStyle = color;
    roundRect(ctx, g.x, obstY, gateW, obstH - 4, 8);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, g.x + 4, obstY + 4, gateW - 8, 8, 4);
    ctx.fill();

    // Word label
    ctx.fillStyle = '#fff';
    ctx.font = '900 22px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.fillText(g.word, g.x + gateW / 2, obstY + obstH / 2);
    ctx.shadowBlur = 0;

    // Arrow hint for active target
    if (g.state === 'active' && g.isTarget) {
      const bobY = Math.sin(time * 4) * 5;
      ctx.font = '24px sans-serif';
      ctx.fillText('\u2B50', g.x + gateW / 2, obstY - 18 + bobY);
    }
  } else {
    // Ceiling obstacle: hangs from top, gap at bottom for ducking
    const ceilBottom = groundY - 55;

    const color = g.state === 'passed' ? '#78909C' : g.state === 'hit' ? '#FF9800' : '#90A4AE';
    const sideColor = g.state === 'passed' ? '#546E7A' : g.state === 'hit' ? '#E65100' : '#607D8B';

    // 3D side
    ctx.fillStyle = sideColor;
    roundRect(ctx, g.x, 0, gateW, ceilBottom + 8, 0);
    ctx.fill();

    // Front
    ctx.fillStyle = color;
    roundRect(ctx, g.x, 0, gateW, ceilBottom, 0);
    ctx.fill();

    // Bottom edge rounded
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.arc(g.x + gateW / 2, ceilBottom, gateW / 2, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(g.x + gateW / 2, ceilBottom - 4, gateW / 2, 0, Math.PI);
    ctx.fill();

    // Danger stripes at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let sy = ceilBottom - 30; sy < ceilBottom; sy += 10) {
      ctx.fillRect(g.x, sy, gateW, 4);
    }

    // Word label
    ctx.fillStyle = '#fff';
    ctx.font = '900 20px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.fillText(g.word, g.x + gateW / 2, ceilBottom - 40);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
}

function drawTinti(time) {
  const isDucking = tinti.ducking && tinti.y >= tinti.baseY - 5;
  const isJumping = tinti.y < tinti.baseY - 5;

  const drawH = isDucking ? tinti.h * DUCK_H_RATIO : tinti.h;
  const drawY = isDucking ? (groundY - drawH) : tinti.y;
  const cx = tinti.x + tinti.w / 2;
  const cy = drawY + drawH * 0.3;

  const bounce = tinti.happy > 0 ? Math.sin(tinti.happy * 0.4) * 4 : 0;
  const hurtShake = tinti.hurt > 0 ? Math.sin(tinti.hurt * 2) * 3 : 0;
  const walkBob = (!isJumping && !isDucking) ? Math.sin(tinti.walkCycle) * 2 : 0;
  const squashX = 1 + tinti.squash * 0.01;
  const squashY = isDucking ? 0.55 : (1 - tinti.squash * 0.008);

  ctx.save();
  ctx.translate(cx + hurtShake, cy + bounce + walkBob);
  ctx.scale(squashX * TINTI_DRAW_SCALE, squashY * TINTI_DRAW_SCALE);

  // Shadow
  if (!isJumping) {
    ctx.save();
    ctx.scale(1 / TINTI_DRAW_SCALE, 1 / TINTI_DRAW_SCALE);
    const shadowDist = groundY - cy - bounce - walkBob;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, shadowDist, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Hurt flash
  if (tinti.hurt > 0 && Math.floor(tinti.hurt) % 4 < 2) {
    ctx.globalAlpha = 0.5;
  }

  // Head glow
  ctx.shadowColor = 'rgba(255, 107, 53, 0.3)';
  ctx.shadowBlur = 12;

  // Head
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, isDucking ? 14 : 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Highlight
  ctx.fillStyle = 'rgba(255,180,100,0.3)';
  ctx.beginPath();
  ctx.ellipse(-5, -5, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  [-8, 8].forEach(ex => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, isDucking ? -1 : -3, 6, isDucking ? 5 : 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const lookX = 1.5;
    const lookY = isJumping ? -2 : 0;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(ex + lookX, (isDucking ? -1 : -1) + lookY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + lookX + 1.5, (isDucking ? -3 : -3) + lookY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mouth
  if (tinti.happy > 0) {
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, isDucking ? 4 : 6, 6, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,100,100,0.3)';
    [-12, 12].forEach(cx => {
      ctx.beginPath();
      ctx.ellipse(cx, isDucking ? 2 : 4, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (tinti.hurt > 0) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(0, isDucking ? 5 : 8, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, isDucking ? 5 : 7, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Tentacles
  const t = time * 3;
  const tentCount = isDucking ? 6 : 8;
  for (let i = 0; i < tentCount; i++) {
    const spread = isDucking ? 1.4 : 1.0;
    const angle = ((i - (tentCount - 1) / 2) / (tentCount - 1)) * spread;
    const sway = Math.sin(t + i * 0.7) * 0.2;
    const walkSway = Math.sin(tinti.walkCycle * 2 + i) * 0.1;
    const tx = Math.sin(angle + sway + walkSway) * (isDucking ? 26 : 22);
    const baseTop = isDucking ? 8 : 14;
    const ty = baseTop + Math.cos(angle) * 2;
    const len = (isDucking ? 10 : 18) + Math.sin(t + i * 1.1) * 3;

    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = isDucking ? 4 : 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx * 0.3, baseTop);
    const cpx = tx * 0.65 + Math.sin(t + i * 0.5) * 3;
    const cpy = ty + len * 0.4;
    ctx.quadraticCurveTo(cpx, cpy, tx + Math.sin(t * 1.3 + i) * 2, ty + len);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,180,130,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(tx + Math.sin(t * 1.3 + i) * 2, ty + len - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// === Helpers ===
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

function updateScoreDisplay() {
  document.getElementById('platformer-score').textContent = `\u2B50 ${score}`;
}

function showMsg(text) {
  const el = document.getElementById('platformer-msg');
  el.textContent = text;
  el.classList.add('visible');
  if (msgTimeout) clearTimeout(msgTimeout);
}

function hideMsg() {
  document.getElementById('platformer-msg').classList.remove('visible');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
