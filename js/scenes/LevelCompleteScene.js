// === Level Complete Scene ===
class LevelCompleteScene extends Phaser.Scene {
  constructor() { super('LevelComplete'); }

  init(data) {
    this.levelId = data.levelId || 1;
    this.stars = data.stars || 0;
    this.correct = data.correct || 0;
    this.total = data.total || 0;
    this.percent = data.percent || 0;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const passed = this.percent >= 80;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f1b47, 0x0f1b47, 0x26d0ce, 0x26d0ce, 1);
    bg.fillRect(0, 0, W, H);

    // Stars display
    let starStr = '';
    for (let i = 0; i < this.stars; i++) starStr += '\u2B50';
    if (starStr.length === 0) starStr = '-';

    this.add.text(W / 2, H * 0.12, starStr, {
      fontSize: Math.min(36, 500 / Math.max(this.stars, 1)) + 'px',
    }).setOrigin(0.5).setAlpha(0);

    // Animate stars appearing one by one
    for (let i = 0; i < Math.min(this.stars, 20); i++) {
      const sx = W / 2 + (i - this.stars / 2) * 28;
      const star = this.add.text(sx, H * 0.12, '\u2B50', { fontSize: '28px' })
        .setOrigin(0.5).setScale(0).setAlpha(0);
      this.tweens.add({
        targets: star, scale: 1, alpha: 1,
        duration: 300, delay: 200 + i * 100, ease: 'Back.easeOut'
      });
    }

    // Score text
    this.add.text(W / 2, H * 0.22, `${this.correct} von ${this.total} richtig (${this.percent}%)`, {
      fontFamily: 'Nunito', fontSize: '22px', fontStyle: '700', color: '#ffffffcc',
      shadow: { offsetY: 2, color: '#00000044', blur: 4, fill: true }
    }).setOrigin(0.5);

    // Garfield cat (drawn with graphics)
    this.drawGarfield(W / 2, H * 0.42);

    // Encouragement
    const msg = ENCOURAGEMENTS[Phaser.Math.Between(0, ENCOURAGEMENTS.length - 1)];
    const msgText = this.add.text(W / 2, H * 0.6, msg, {
      fontFamily: 'Nunito', fontSize: '28px', fontStyle: '900', color: '#FFD700',
      shadow: { offsetY: 2, color: '#00000066', blur: 6, fill: true },
      align: 'center', wordWrap: { width: W * 0.8 }
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: msgText, scale: 1, duration: 500, delay: 800, ease: 'Back.easeOut'
    });

    // Buttons
    const btnY = H * 0.74;

    if (passed && this.levelId < MAX_LEVEL) {
      this.createButton(W / 2, btnY, 'Nächstes Level', 0xFFD700, 0xFFA500, () => {
        this.scene.start('Quiz', { levelId: this.levelId + 1 });
      });
      this.createButton(W / 2, btnY + 65, 'Nochmal', 0x3388aa, 0x226688, () => {
        this.scene.start('Quiz', { levelId: this.levelId });
      }, true);
    } else {
      this.createButton(W / 2, btnY, 'Nochmal', 0xFFD700, 0xFFA500, () => {
        this.scene.start('Quiz', { levelId: this.levelId });
      });
    }

    this.createButton(W / 2, H * 0.9, 'Zurück zum Menü', 0x3388aa, 0x226688, () => {
      this.scene.start('Menu');
    }, true);
  }

  drawGarfield(x, y) {
    const g = this.add.graphics();

    // Body
    g.fillStyle(0xFF8C00);
    g.fillEllipse(x, y + 20, 90, 70);
    // Stripes
    g.lineStyle(3, 0x000000, 0.1);
    for (let sx = -20; sx <= 20; sx += 12) {
      g.beginPath();
      g.moveTo(x + sx, y - 5);
      g.lineTo(x + sx, y + 45);
      g.strokePath();
    }
    // Belly
    g.fillStyle(0xFFDAB9);
    g.fillEllipse(x, y + 25, 45, 35);

    // Head
    g.fillStyle(0xFF8C00);
    g.fillEllipse(x, y - 25, 70, 55);

    // Ears
    [-20, 20].forEach(ex => {
      g.fillStyle(0xFF8C00);
      g.fillTriangle(x + ex - 10, y - 45, x + ex + 10, y - 45, x + ex, y - 65);
      g.fillStyle(0xFFB366);
      g.fillTriangle(x + ex - 5, y - 47, x + ex + 5, y - 47, x + ex, y - 58);
    });

    // Eyes
    [-12, 12].forEach(ex => {
      g.fillStyle(0xffffff);
      g.fillEllipse(x + ex, y - 28, 16, 18);
      g.fillStyle(0x222222);
      g.fillCircle(x + ex + 1, y - 26, 5);
    });

    // Nose
    g.fillStyle(0xc0392b);
    g.fillEllipse(x, y - 18, 8, 5);

    // Mouth
    g.lineStyle(2, 0x333333);
    g.beginPath();
    g.arc(x, y - 10, 8, 0, Math.PI);
    g.strokePath();

    // Entrance animation
    g.setPosition(0, 80);
    g.setAlpha(0);
    this.tweens.add({
      targets: g, y: 0, alpha: 1, duration: 600, delay: 400, ease: 'Back.easeOut'
    });
  }

  createButton(x, y, text, color1, color2, onClick, ghost = false) {
    const W = 260;
    const H = 52;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    if (ghost) {
      bg.fillStyle(0xffffff, 0.12);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.fillRoundedRect(-W / 2, -H / 2, W, H, 14);
      bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 14);
    } else {
      bg.fillStyle(color2);
      bg.fillRoundedRect(-W / 2, -H / 2 + 4, W, H, 14);
      bg.fillStyle(color1);
      bg.fillRoundedRect(-W / 2, -H / 2, W, H - 4, 14);
    }

    const label = this.add.text(0, ghost ? 0 : -2, text, {
      fontFamily: 'Nunito', fontSize: '20px', fontStyle: '900',
      color: ghost ? '#ffffff' : '#333333'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(W, H);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => container.setScale(0.95));
    container.on('pointerup', () => { container.setScale(1); onClick(); });
    container.on('pointerout', () => container.setScale(1));

    return container;
  }
}
