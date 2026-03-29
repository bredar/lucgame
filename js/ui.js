import { LEVELS, ENCOURAGEMENTS, BADGES } from './words.js';
import { loadProgress, getUnlockedBadges } from './progress.js';

// === Screen Management ===
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// === Start Screen ===
export function renderStartScreen() {
  showScreen('start-screen');
}

// === Level Select ===
export function renderLevelSelect(onSelectLevel) {
  const progress = loadProgress();
  const list = document.getElementById('level-list');
  list.innerHTML = '';

  LEVELS.forEach(level => {
    const card = document.createElement('div');
    card.className = 'level-card';

    const isLocked = level.id > progress.unlockedLevel;
    const isCurrent = level.id === progress.unlockedLevel;
    const bestScore = progress.levelScores[level.id];

    if (isLocked) card.classList.add('locked');
    if (isCurrent) card.classList.add('current');

    card.innerHTML = `
      <div class="level-icon">${level.icon}</div>
      <div class="level-info">
        <div class="level-name">Level ${level.id}: ${level.name}</div>
        ${bestScore !== undefined ? `<div class="level-score">Bester Score: ${bestScore}%</div>` : ''}
      </div>
      ${isLocked ? '<div class="level-lock">\uD83D\uDD12</div>' : ''}
    `;

    if (!isLocked) {
      card.addEventListener('click', () => onSelectLevel(level.id));
    }

    list.appendChild(card);
  });

  showScreen('level-screen');
}

// === Game Round ===
export function renderRound(round, roundIndex, totalRounds, stars, onChoice) {
  document.getElementById('stars-counter').textContent = `\u2B50 ${stars}`;
  document.getElementById('round-counter').textContent = `${roundIndex + 1} / ${totalRounds}`;

  const choices = document.getElementById('choices');
  choices.innerHTML = '';

  round.options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = option;
    btn.addEventListener('click', () => onChoice(option, btn));
    choices.appendChild(btn);
  });
}

export function updateSpeechBubble(text, speaking = false) {
  const bubble = document.getElementById('speech-bubble');
  bubble.textContent = text;
  bubble.classList.toggle('speaking', speaking);
}

export function markCorrect(btn) {
  btn.classList.add('correct');
  disableChoices();
}

export function markWrong(btn) {
  btn.classList.add('wrong');
}

export function highlightCorrectAnswer(target) {
  const choices = document.getElementById('choices');
  [...choices.children].forEach(btn => {
    if (btn.textContent === target) {
      btn.classList.add('correct');
    }
    btn.classList.add('disabled');
  });
}

function disableChoices() {
  const choices = document.getElementById('choices');
  [...choices.children].forEach(btn => btn.classList.add('disabled'));
}

// === Tinti Animations ===
export function tintiHappy() {
  const tinti = document.querySelector('#game-screen .tinti');
  tinti.classList.add('happy');
  setTimeout(() => tinti.classList.remove('happy'), 800);
}

export function tintiFlip() {
  const tinti = document.querySelector('#game-screen .tinti');
  tinti.classList.add('flip');
  setTimeout(() => tinti.classList.remove('flip'), 1200);
}

// === Star Burst ===
export function showStarBurst() {
  const container = document.getElementById('star-burst');
  container.innerHTML = '';

  for (let i = 0; i < 8; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '\u2B50';
    const angle = (i / 8) * Math.PI * 2;
    const dist = 60 + Math.random() * 40;
    star.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    star.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    container.appendChild(star);
  }

  setTimeout(() => { container.innerHTML = ''; }, 900);
}

// === Streak ===
export function showStreak(count) {
  const popup = document.getElementById('streak-popup');
  popup.textContent = `${count}x Streak! \uD83D\uDD25`;
  popup.classList.remove('show');
  void popup.offsetWidth; // force reflow
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 1300);
}

// === Flash ===
export function flashScreen(type) {
  const overlay = document.getElementById('flash-overlay');
  overlay.classList.remove('flash-green', 'flash-orange');
  void overlay.offsetWidth;
  overlay.classList.add(type === 'correct' ? 'flash-green' : 'flash-orange');
  setTimeout(() => overlay.classList.remove('flash-green', 'flash-orange'), 350);
}

// === Level Complete ===
export function renderLevelComplete(score, levelId, onNext, onReplay) {
  const starsDisplay = document.getElementById('stars-display');
  starsDisplay.textContent = '\u2B50'.repeat(score.stars);

  document.getElementById('score-text').textContent =
    `${score.correct} von ${score.total} richtig (${score.percent}%)`;

  const encouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  document.getElementById('encouragement').textContent = encouragement;

  const btnNext = document.getElementById('btn-next');
  const btnReplay = document.getElementById('btn-replay-level');

  if (score.percent >= 80 && levelId < 5) {
    btnNext.style.display = '';
    btnNext.onclick = onNext;
  } else {
    btnNext.style.display = 'none';
  }

  btnReplay.onclick = onReplay;

  showScreen('complete-screen');
}

// === Trophy Screen ===
export function renderTrophyScreen(onBack) {
  const progress = loadProgress();
  const unlockedCount = getUnlockedBadges(progress.totalStars);

  document.getElementById('total-stars').textContent = `\u2B50 ${progress.totalStars}`;

  const grid = document.getElementById('badge-grid');
  grid.innerHTML = '';

  BADGES.forEach((badge, i) => {
    const el = document.createElement('div');
    el.className = 'badge' + (i < unlockedCount ? '' : ' locked');
    el.innerHTML = `
      <span class="badge-icon">${i < unlockedCount ? badge.icon : ''}</span>
      <span>${badge.name}</span>
    `;
    grid.appendChild(el);
  });

  document.getElementById('btn-back-trophies').onclick = onBack;
  showScreen('trophy-screen');
}

// === Bubbles ===
export function createBubbles() {
  const container = document.getElementById('bubbles');
  container.innerHTML = '';

  for (let i = 0; i < 12; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = 10 + Math.random() * 40;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${6 + Math.random() * 10}s`;
    bubble.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(bubble);
  }
}
