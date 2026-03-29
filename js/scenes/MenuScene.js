// === Menu Scene with Level Select ===
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f1b47, 0x0f1b47, 0x26d0ce, 0x26d0ce, 1);
    bg.fillRect(0, 0, W, H);

    // Bubbles
    for (let i = 0; i < 15; i++) {
      const bx = Phaser.Math.Between(0, W);
      const by = Phaser.Math.Between(H, H + 300);
      const size = Phaser.Math.Between(4, 14);
      const bubble = this.add.circle(bx, by, size, 0xffffff, 0.07);
      this.tweens.add({
        targets: bubble, y: -20, x: bx + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(5000, 12000), repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
        onRepeat: () => { bubble.x = Phaser.Math.Between(0, W); bubble.y = H + 20; }
      });
    }

    // Tinti
    this.drawTinti(W / 2, H * 0.14);

    // Title
    this.add.text(W / 2, H * 0.27, 'Hallo Luc! 👋', {
      fontFamily: 'Nunito', fontSize: '36px', fontStyle: '900', color: '#ffffff',
      shadow: { offsetY: 3, color: '#00000066', blur: 8, fill: true }
    }).setOrigin(0.5);

    // Level select
    const progress = GameProgress.load();
    const startY = H * 0.36;
    const rowH = Math.min(52, (H * 0.5) / MAX_LEVEL);

    LEVELS.forEach((level, i) => {
      const y = startY + i * rowH;
      const isLocked = level.id > progress.unlockedLevel;
      const isCurrent = level.id === progress.unlockedLevel;
      const bestScore = progress.levelScores[level.id];

      const row = this.add.container(W / 2, y);

      // Background
      const rowBg = this.add.graphics();
      const rowW = Math.min(380, W - 40);
      rowBg.fillStyle(0xffffff, isLocked ? 0.03 : 0.1);
      rowBg.fillRoundedRect(-rowW / 2, -rowH / 2 + 3, rowW, rowH - 6, 12);

      if (isCurrent) {
        rowBg.lineStyle(2, 0xFFD700, 0.7);
        rowBg.strokeRoundedRect(-rowW / 2, -rowH / 2 + 3, rowW, rowH - 6, 12);
      }

      // Icon
      const icon = this.add.text(-rowW / 2 + 24, 0, level.icon, {
        fontSize: '24px'
      }).setOrigin(0.5);

      // Name
      const name = this.add.text(-rowW / 2 + 56, -2, `Level ${level.id}: ${level.name}`, {
        fontFamily: 'Nunito', fontSize: '16px', fontStyle: '900',
        color: isLocked ? '#ffffff44' : '#ffffff'
      }).setOrigin(0, 0.5);

      // Score or lock
      let rightText;
      if (isLocked) {
        rightText = this.add.text(rowW / 2 - 20, 0, '🔒', { fontSize: '18px' }).setOrigin(1, 0.5);
      } else if (bestScore !== undefined) {
        rightText = this.add.text(rowW / 2 - 20, 0, `${bestScore}%`, {
          fontFamily: 'Nunito', fontSize: '15px', fontStyle: '700',
          color: bestScore >= 80 ? '#4CAF50' : '#FFD700'
        }).setOrigin(1, 0.5);
      } else {
        rightText = this.add.text(rowW / 2 - 20, 0, '—', {
          fontFamily: 'Nunito', fontSize: '15px', color: '#ffffff44'
        }).setOrigin(1, 0.5);
      }

      row.add([rowBg, icon, name, rightText]);

      if (!isLocked) {
        row.setSize(rowW, rowH - 6);
        row.setInteractive({ useHandCursor: true });
        row.on('pointerdown', () => row.setScale(0.97));
        row.on('pointerup', () => {
          row.setScale(1);
          this.showLevelActions(level.id);
        });
        row.on('pointerout', () => row.setScale(1));
      }
    });

    // Trophy button at bottom
    this.createButton(W / 2, H * 0.92, 'Trophäen', 0x3388aa, 0x226688, () => {
      this.scene.start('Trophy');
    }, true);
  }

  showLevelActions(levelId) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, W, H);
    overlay.setDepth(30).setInteractive();

    const panel = this.add.container(W / 2, H / 2).setDepth(31);
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a2980, 0.95);
    panelBg.fillRoundedRect(-160, -110, 320, 220, 20);
    panelBg.lineStyle(2, 0xFFD700, 0.5);
    panelBg.strokeRoundedRect(-160, -110, 320, 220, 20);
    panel.add(panelBg);

    const level = LEVELS.find(l => l.id === levelId);
    const title = this.add.text(0, -80, `${level.icon} Level ${levelId}: ${level.name}`, {
      fontFamily: 'Nunito', fontSize: '20px', fontStyle: '900', color: '#FFD700'
    }).setOrigin(0.5);
    panel.add(title);

    // Quiz button
    const quizBtn = this.createPanelButton(0, -25, 'Wörter-Quiz', 0xFFD700, 0xFFA500, () => {
      overlay.destroy(); panel.destroy();
      this.scene.start('Quiz', { levelId });
    });
    panel.add(quizBtn);

    // Shooter button
    const shootBtn = this.createPanelButton(0, 35, 'Zugstrecke 🚂', 0x1565C0, 0x0D47A1, () => {
      overlay.destroy(); panel.destroy();
      this.scene.start('Shooter', {
        levelId, quizStars: 0, quizPercent: 0, quizCorrect: 0, quizTotal: 0,
      });
    });
    panel.add(shootBtn);

    // Cancel
    const cancelBtn = this.add.text(0, 90, '❌ Schließen', {
      fontFamily: 'Nunito', fontSize: '16px', fontStyle: '700', color: '#ffffff88'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => { overlay.destroy(); panel.destroy(); });
    panel.add(cancelBtn);

    overlay.on('pointerdown', () => { overlay.destroy(); panel.destroy(); });
  }

  createPanelButton(x, y, text, color1, color2, onClick) {
    const W = 220, H = 46;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color2);
    bg.fillRoundedRect(-W / 2, -H / 2 + 3, W, H, 12);
    bg.fillStyle(color1);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H - 3, 12);

    const label = this.add.text(0, -2, text, {
      fontFamily: 'Nunito', fontSize: '18px', fontStyle: '900',
      color: color1 === 0xFFD700 ? '#333333' : '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(W, H);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => container.setScale(0.95));
    container.on('pointerup', () => { container.setScale(1); onClick(); });
    container.on('pointerout', () => container.setScale(1));
    return container;
  }

  drawTinti(x, y) {
    const g = this.add.graphics();
    const s = 1.4;
    g.fillStyle(0xFF6B35);
    g.fillEllipse(x, y, 70 * s, 56 * s);
    [-16, 16].forEach(ex => {
      g.fillStyle(0xffffff);
      g.fillEllipse(x + ex * s, y - 4 * s, 18 * s, 20 * s);
      g.fillStyle(0x222222);
      g.fillCircle(x + (ex + 2) * s, y - 2 * s, 6 * s);
      g.fillStyle(0xffffff);
      g.fillCircle(x + (ex + 4) * s, y - 4 * s, 2.5 * s);
    });
    g.lineStyle(2.5, 0xc0392b);
    g.beginPath();
    g.arc(x, y + 12 * s, 7 * s, 0.2, Math.PI - 0.2);
    g.strokePath();
    for (let i = 0; i < 8; i++) {
      const tx = ((i - 3.5) / 7) * 50 * s;
      g.fillStyle(0xFF6B35);
      g.fillRoundedRect(x + tx - 4 * s, y + 24 * s, 8 * s, 30 * s, 4 * s);
    }
    this.tweens.add({
      targets: g, y: -5, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  createButton(x, y, text, color1, color2, onClick, ghost = false) {
    const W = 200, H = 44;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    if (ghost) {
      bg.fillStyle(0xffffff, 0.12);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.fillRoundedRect(-W / 2, -H / 2, W, H, 14);
      bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 14);
    } else {
      bg.fillStyle(color2);
      bg.fillRoundedRect(-W / 2, -H / 2 + 3, W, H, 14);
      bg.fillStyle(color1);
      bg.fillRoundedRect(-W / 2, -H / 2, W, H - 3, 14);
    }
    const label = this.add.text(0, ghost ? 0 : -1, text, {
      fontFamily: 'Nunito', fontSize: '18px', fontStyle: '900',
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
