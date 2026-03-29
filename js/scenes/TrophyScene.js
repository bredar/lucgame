// === Trophy Scene ===
class TrophyScene extends Phaser.Scene {
  constructor() { super('Trophy'); }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f1b47, 0x0f1b47, 0x26d0ce, 0x26d0ce, 1);
    bg.fillRect(0, 0, W, H);

    const progress = GameProgress.load();
    const unlockedCount = GameProgress.getUnlockedBadges(progress.totalStars);

    // Title
    this.add.text(W / 2, 30, 'Trophäen', {
      fontFamily: 'Nunito', fontSize: '32px', fontStyle: '900', color: '#ffffff',
      shadow: { offsetY: 2, color: '#00000066', blur: 6, fill: true }
    }).setOrigin(0.5, 0);

    // Total stars
    this.add.text(W / 2, 75, `\u2B50 ${progress.totalStars} Sterne`, {
      fontFamily: 'Nunito', fontSize: '22px', fontStyle: '900', color: '#FFD700',
    }).setOrigin(0.5, 0);

    // Badge grid
    const cols = 5;
    const cellW = Math.min(70, (W - 40) / cols);
    const cellH = cellW + 20;
    const gridW = cols * cellW;
    const startX = (W - gridW) / 2 + cellW / 2;
    const startY = 130;

    BADGES.forEach((badge, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * cellW;
      const by = startY + row * cellH;
      const unlocked = i < unlockedCount;

      // Background
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, unlocked ? 0.12 : 0.04);
      bg.fillRoundedRect(bx - cellW * 0.4, by - cellW * 0.3, cellW * 0.8, cellH * 0.85, 10);

      if (unlocked) {
        this.add.text(bx, by, badge.icon, { fontSize: '32px' }).setOrigin(0.5);
        // Entrance animation
        const icon = this.add.text(bx, by, badge.icon, { fontSize: '32px' }).setOrigin(0.5).setScale(0);
        this.tweens.add({
          targets: icon, scale: 1, duration: 400, delay: i * 80, ease: 'Back.easeOut'
        });
      } else {
        this.add.text(bx, by, '\uD83D\uDD12', { fontSize: '20px', color: '#ffffff44' }).setOrigin(0.5);
      }

      this.add.text(bx, by + cellW * 0.35, badge.name, {
        fontFamily: 'Nunito', fontSize: '10px', fontStyle: '700',
        color: unlocked ? '#ffffffcc' : '#ffffff44', align: 'center'
      }).setOrigin(0.5, 0);
    });

    // Back button
    const backBtn = this.add.container(W / 2, H - 50);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffffff, 0.12);
    btnBg.lineStyle(2, 0xffffff, 0.25);
    btnBg.fillRoundedRect(-80, -22, 160, 44, 14);
    btnBg.strokeRoundedRect(-80, -22, 160, 44, 14);
    const btnLabel = this.add.text(0, 0, 'Zurück', {
      fontFamily: 'Nunito', fontSize: '20px', fontStyle: '900', color: '#ffffff'
    }).setOrigin(0.5);
    backBtn.add([btnBg, btnLabel]);
    backBtn.setSize(160, 44);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.scene.start('Menu'));
  }
}
