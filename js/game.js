import { WORDS, LEVELS } from './words.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRound(levelId) {
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return [];

  // Filter words available for this level
  const available = WORDS.filter(w =>
    w.minLevel <= levelId && level.confusionTypes.includes(w.confusionType)
  );

  const shuffled = shuffle(available);
  const selected = shuffled.slice(0, level.wordsPerRound);

  return selected.map(word => {
    // Build options: target + main distractor + extra fillers
    const options = [word.target, ...word.distractors];

    // Add extra distractors from pool if needed
    const extraPool = available
      .filter(w => w.target !== word.target && !word.distractors.includes(w.target))
      .map(w => w.target);

    const shuffledExtra = shuffle(extraPool);
    let idx = 0;
    while (options.length < level.options && idx < shuffledExtra.length) {
      if (!options.includes(shuffledExtra[idx])) {
        options.push(shuffledExtra[idx]);
      }
      idx++;
    }

    return {
      target: word.target,
      options: shuffle(options),
    };
  });
}

export function calculateScore(results) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const stars = results.filter(r => r.firstTry).length;

  return { correct, total, percent, stars };
}
