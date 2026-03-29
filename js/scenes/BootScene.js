// === Boot Scene: preload all assets ===
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Loading bar
    const bar = this.add.graphics();
    const text = this.add.text(W / 2, H / 2 - 40, 'Laden...', {
      fontFamily: 'Nunito', fontSize: '28px', fontStyle: '900', color: '#FFD700'
    }).setOrigin(0.5);

    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0x1a2980, 1);
      bar.fillRect(W * 0.2, H / 2, W * 0.6, 30);
      bar.fillStyle(0xFFD700, 1);
      bar.fillRect(W * 0.2, H / 2, W * 0.6 * p, 30);
    });

    this.load.on('complete', () => { bar.destroy(); text.destroy(); });

    // Load all word audio files
    const allTargets = [...new Set(WORDS.map(w => w.target))];
    allTargets.forEach(word => {
      const key = wordAudioKey(word);
      this.load.audio(key, `assets/audio/${word.toLowerCase()}.mp3`);
    });

    // Prompt phrases
    this.load.audio('prompt_druecke', 'assets/audio/druecke_auf.mp3');
    this.load.audio('prompt_schiesse', 'assets/audio/schiesse_ab.mp3');
    this.load.audio('prompt_hoerzu', 'assets/audio/hoer_zu.mp3');
    this.load.audio('prompt_fahrezu', 'assets/audio/fahre_zu.mp3');
    this.load.audio('prompt_richtig', 'assets/audio/richtig.mp3');
    this.load.audio('prompt_falsch', 'assets/audio/falsch.mp3');
  }

  create() {
    this.scene.start('Menu');
  }
}
