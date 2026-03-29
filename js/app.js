import { LEVELS } from './words.js';
import { generateRound, calculateScore } from './game.js';
import { initSpeech, speak, speakTwice, hasSpeech } from './speech.js';
import { loadProgress, saveProgress, updateAfterRound } from './progress.js';
import {
  showScreen, renderStartScreen, renderLevelSelect,
  renderRound, updateSpeechBubble, markCorrect, markWrong,
  highlightCorrectAnswer, tintiHappy, tintiFlip,
  showStarBurst, showStreak, flashScreen,
  renderLevelComplete, renderTrophyScreen, createBubbles,
} from './ui.js';
import { startPlatformer } from './platformer.js';

// === Audio ===
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type = 'sine', startTime = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + startTime);
  osc.stop(audioCtx.currentTime + startTime + duration);
}

function playCorrectSound() {
  ensureAudio();
  playTone(523, 0.1, 'sine', 0);      // C5
  playTone(659, 0.1, 'sine', 0.1);    // E5
  playTone(784, 0.1, 'sine', 0.2);    // G5
}

function playWrongSound() {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(250, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playLevelUpSound() {
  ensureAudio();
  playTone(523, 0.15, 'sine', 0);
  playTone(659, 0.15, 'sine', 0.15);
  playTone(784, 0.15, 'sine', 0.3);
  playTone(1047, 0.2, 'sine', 0.45);
}

// === Game State ===
let currentLevelId = 1;
let rounds = [];
let roundIndex = 0;
let results = [];
let streak = 0;
let starsThisGame = 0;
let currentTarget = '';
let answered = false;

// === Game Flow ===
async function startLevel(levelId) {
  currentLevelId = levelId;
  const level = LEVELS.find(l => l.id === levelId);
  rounds = generateRound(levelId);
  roundIndex = 0;
  results = [];
  streak = 0;
  starsThisGame = 0;

  showScreen('game-screen');
  await playRound();
}

async function playRound() {
  if (roundIndex >= rounds.length) {
    finishLevel();
    return;
  }

  const round = rounds[roundIndex];
  currentTarget = round.target;
  answered = false;

  renderRound(round, roundIndex, rounds.length, starsThisGame, handleChoice);
  updateSpeechBubble('Hör genau zu!', true);

  const level = LEVELS.find(l => l.id === currentLevelId);
  if (level.speakTwice) {
    await speakTwice(round.target);
  } else {
    await speak(round.target);
  }

  updateSpeechBubble('Welches Wort hörst du?', false);
}

async function handleChoice(chosen, btn) {
  if (answered) return;

  ensureAudio();
  const isCorrect = chosen === currentTarget;
  const isFirstTry = !answered;

  if (isCorrect) {
    answered = true;
    streak++;
    starsThisGame++;
    results.push({ correct: true, firstTry: true });

    markCorrect(btn);
    flashScreen('correct');
    playCorrectSound();
    tintiHappy();
    showStarBurst();

    if (streak > 0 && streak % 3 === 0) {
      tintiFlip();
      showStreak(streak);
    }

    setTimeout(() => {
      roundIndex++;
      playRound();
    }, 1200);
  } else {
    answered = true;
    streak = 0;
    results.push({ correct: false, firstTry: false });

    markWrong(btn);
    flashScreen('wrong');
    playWrongSound();

    // Re-speak and highlight correct
    setTimeout(async () => {
      await speak(currentTarget);
      highlightCorrectAnswer(currentTarget);

      setTimeout(() => {
        roundIndex++;
        playRound();
      }, 1200);
    }, 600);
  }
}

function finishLevel() {
  const score = calculateScore(results);

  let progress = loadProgress();
  progress = updateAfterRound(progress, currentLevelId, score, score.stars);

  playLevelUpSound();

  renderLevelComplete(
    score,
    currentLevelId,
    () => startLevel(currentLevelId + 1),
    () => startLevel(currentLevelId),
  );
}

// === Replay Button ===
function setupReplay() {
  document.getElementById('btn-replay').addEventListener('click', () => {
    ensureAudio();
    if (currentTarget) {
      const level = LEVELS.find(l => l.id === currentLevelId);
      if (level.speakTwice) {
        speakTwice(currentTarget);
      } else {
        speak(currentTarget);
      }
    }
  });
}

// === Init ===
async function init() {
  createBubbles();
  await initSpeech();
  setupReplay();

  document.getElementById('btn-play').addEventListener('click', () => {
    ensureAudio();
    renderLevelSelect(startLevel);
  });

  document.getElementById('btn-platformer').addEventListener('click', () => {
    ensureAudio();
    startPlatformer(() => renderStartScreen());
  });

  document.getElementById('btn-trophies').addEventListener('click', () => {
    renderTrophyScreen(() => renderStartScreen());
  });

  document.getElementById('btn-back-levels').addEventListener('click', () => {
    renderStartScreen();
  });

  renderStartScreen();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
