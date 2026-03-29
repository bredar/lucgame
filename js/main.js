// === Phaser 3 Game Config ===
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0f1b47',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, QuizScene, ShooterScene, LevelCompleteScene, TrophyScene],
  audio: {
    disableWebAudio: false,
  },
  input: {
    activePointers: 2,
  },
};

const game = new Phaser.Game(config);
