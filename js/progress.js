// === Progress (global) ===
window.GameProgress = {
  STORAGE_KEY: 'tinti-lesen-progress',

  DEFAULT: {
    currentLevel: 1,
    unlockedLevel: 1,
    totalStars: 0,
    levelScores: {},
  },

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) return { ...this.DEFAULT, ...JSON.parse(data) };
    } catch (e) {}
    return { ...this.DEFAULT };
  },

  save(progress) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {}
  },

  updateAfterLevel(progress, levelId, percent, stars) {
    progress.totalStars += stars;
    const best = progress.levelScores[levelId] || 0;
    if (percent > best) progress.levelScores[levelId] = percent;
    if (percent >= 80 && levelId >= progress.unlockedLevel && levelId < MAX_LEVEL) {
      progress.unlockedLevel = levelId + 1;
    }
    progress.currentLevel = levelId;
    this.save(progress);
    return progress;
  },

  getUnlockedBadges(totalStars) {
    return Math.min(Math.floor(totalStars / 10), 10);
  },
};
