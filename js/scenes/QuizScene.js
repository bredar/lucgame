// === Quiz Scene: hear word, pick correct answer ===
class QuizScene extends Phaser.Scene {
  constructor() { super('Quiz'); }

  init(data) {
    this.levelId = data.levelId || 1;
    this.level = LEVELS.find(l => l.id === this.levelId);
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f1b47, 0x0f1b47, 0x26d0ce, 0x26d0ce, 1);
    bg.fillRect(0, 0, W, H);

    // Bubbles
    for (let i = 0; i < 10; i++) {
      const bx = Phaser.Math.Between(0, W);
      const by = Phaser.Math.Between(H, H + 200);
      const size = Phaser.Math.Between(3, 12);
      const bubble = this.add.circle(bx, by, size, 0xffffff, 0.06);
      this.tweens.add({
        targets: bubble, y: -20, duration: Phaser.Math.Between(6000, 14000),
        repeat: -1, delay: Phaser.Math.Between(0, 4000),
        onRepeat: () => { bubble.x = Phaser.Math.Between(0, W); bubble.y = H + 20; }
      });
    }

    // Generate round
    this.generateRound();

    this.roundIndex = 0;
    this.results = [];
    this.stars = 0;
    this.streak = 0;

    // HUD
    this.starsText = this.add.text(20, 16, '\u2B50 0', {
      fontFamily: 'Nunito', fontSize: '24px', fontStyle: '900', color: '#FFD700',
      shadow: { offsetY: 2, color: '#00000066', blur: 4, fill: true }
    });
    this.roundText = this.add.text(W / 2, 16, '', {
      fontFamily: 'Nunito', fontSize: '18px', fontStyle: '700', color: '#ffffffaa'
    }).setOrigin(0.5, 0);

    // Replay button
    this.replayBtn = this.add.text(W - 20, 16, '\uD83D\uDD0A', {
      fontSize: '32px'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.replayBtn.on('pointerdown', () => this.playCurrentWord());

    // Back/cancel button
    const backBtn = this.add.text(20, H - 16, '\u274C Abbrechen', {
      fontFamily: 'Nunito', fontSize: '16px', fontStyle: '700', color: '#ffffff88',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Menu'));

    // Tinti (small)
    this.tintiContainer = this.add.container(W / 2, H * 0.22);
    this.drawSmallTinti(this.tintiContainer);

    // Speech bubble
    this.speechBubble = this.add.container(W / 2, H * 0.38);
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 0.95);
    bubbleBg.fillRoundedRect(-120, -22, 240, 44, 20);
    // Triangle
    bubbleBg.fillTriangle(-8, -22, 8, -22, 0, -32);
    this.speechText = this.add.text(0, 0, 'Hör genau zu!', {
      fontFamily: 'Nunito', fontSize: '18px', fontStyle: '700', color: '#333333'
    }).setOrigin(0.5);
    this.speechBubble.add([bubbleBg, this.speechText]);

    // Choice buttons container
    this.choicesContainer = this.add.container(0, 0);

    // Start first round
    this.playWord();
  }

  generateRound() {
    const available = WORDS.filter(w =>
      w.minLevel <= this.levelId && this.level.confusionTypes.includes(w.confusionType)
    );
    const shuffled = shuffleArray(available);
    this.rounds = shuffled.slice(0, this.level.quizWords).map(word => {
      const options = [word.target, ...word.distractors];
      const extraPool = available
        .filter(w => w.target !== word.target && !word.distractors.includes(w.target))
        .map(w => w.target);
      const extra = shuffleArray(extraPool);
      let idx = 0;
      while (options.length < this.level.options && idx < extra.length) {
        if (!options.includes(extra[idx])) options.push(extra[idx]);
        idx++;
      }
      return { target: word.target, options: shuffleArray(options) };
    });
  }

  async playWord() {
    if (this.roundIndex >= this.rounds.length) {
      this.finishQuiz();
      return;
    }

    const round = this.rounds[this.roundIndex];
    this.currentTarget = round.target;
    this.answered = false;

    this.roundText.setText(`${this.roundIndex + 1} / ${this.rounds.length}`);
    this.starsText.setText(`\u2B50 ${this.stars}`);
    this.speechText.setText('Hör genau zu!');

    // Show choices
    this.showChoices(round.options);

    // Play prompt: "Drücke auf das Wort..." then the word itself
    await this.delay(200);
    try { this.sound.play('prompt_druecke'); } catch(e) {}
    this.speechText.setText('Drücke auf das Wort...');
    await this.delay(2000);
    this.playCurrentWord();
    if (this.level.speakTwice) {
      await this.delay(1500);
      this.playCurrentWord();
    }

    await this.delay(1000);
    this.speechText.setText('Welches Wort?');
  }

  playCurrentWord() {
    if (!this.currentTarget) return;
    const key = wordAudioKey(this.currentTarget);
    try { this.sound.play(key); } catch (e) {}
  }

  showChoices(options) {
    this.choicesContainer.removeAll(true);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const btnW = Math.min(280, W * 0.42);
    const btnH = 72;
    const gap = 14;
    const startY = H * 0.52;
    const cols = options.length <= 2 ? 1 : 2;
    const rows = Math.ceil(options.length / cols);

    options.forEach((word, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * btnW + (cols - 1) * gap;
      const x = W / 2 - totalW / 2 + col * (btnW + gap) + btnW / 2;
      const y = startY + row * (btnH + gap);

      const btn = this.createChoiceButton(x, y, btnW, btnH, word);
      this.choicesContainer.add(btn);
    });
  }

  createChoiceButton(x, y, w, h, word) {
    const container = this.add.container(x, y);

    // 3D platform look
    const shadow = this.add.graphics();
    shadow.fillStyle(0x6B3F1F);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 12);
    const face = this.add.graphics();
    face.fillStyle(0x8B6914);
    face.fillRoundedRect(-w / 2, -h / 2, w, h - 6, 12);
    // Highlight
    const hi = this.add.graphics();
    hi.fillStyle(0xA07828);
    hi.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, 8, 4);

    const label = this.add.text(0, -3, word, {
      fontFamily: 'Nunito', fontSize: '28px', fontStyle: '900', color: '#ffffff',
      shadow: { offsetY: 2, color: '#00000044', blur: 2, fill: true }
    }).setOrigin(0.5);

    container.add([shadow, face, hi, label]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });
    container.word = word;
    container._face = face;
    container._shadow = shadow;
    container._label = label;

    container.on('pointerdown', () => this.handleChoice(word, container));

    return container;
  }

  async handleChoice(chosen, btn) {
    if (this.answered) return;
    this.answered = true;

    // Disable all buttons
    this.choicesContainer.list.forEach(c => c.disableInteractive());

    const isCorrect = chosen === this.currentTarget;

    if (isCorrect) {
      this.streak++;
      this.stars++;
      this.results.push({ correct: true, firstTry: true });
      this.starsText.setText(`\u2B50 ${this.stars}`);

      // Green
      btn._face.clear().fillStyle(0x4CAF50).fillRoundedRect(-btn.width / 2, -btn.height / 2, btn.width, btn.height - 6, 12);
      btn._shadow.clear().fillStyle(0x388E3C).fillRoundedRect(-btn.width / 2, -btn.height / 2 + 6, btn.width, btn.height, 12);

      // Bounce tinti
      this.tweens.add({
        targets: this.tintiContainer, y: this.tintiContainer.y - 20,
        duration: 200, yoyo: true, ease: 'Bounce'
      });

      // Star particles
      for (let i = 0; i < 6; i++) {
        const s = this.add.text(btn.x + Phaser.Math.Between(-30, 30), btn.y, '\u2B50', { fontSize: '24px' }).setOrigin(0.5);
        this.tweens.add({
          targets: s,
          x: s.x + Phaser.Math.Between(-60, 60),
          y: s.y - Phaser.Math.Between(40, 100),
          alpha: 0, scale: 0.3, duration: 700, onComplete: () => s.destroy()
        });
      }

      // Streak
      if (this.streak > 0 && this.streak % 3 === 0) {
        const streakText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.45,
          `${this.streak}x Streak! \uD83D\uDD25`, {
            fontFamily: 'Nunito', fontSize: '32px', fontStyle: '900', color: '#FFD700',
            shadow: { offsetY: 2, color: '#00000066', blur: 6, fill: true }
          }).setOrigin(0.5);
        this.tweens.add({
          targets: streakText, y: streakText.y - 50, alpha: 0, scale: 1.3,
          duration: 1200, onComplete: () => streakText.destroy()
        });
      }

      await this.delay(1100);
      this.roundIndex++;
      this.playWord();
    } else {
      this.streak = 0;
      this.results.push({ correct: false, firstTry: false });

      // Orange
      btn._face.clear().fillStyle(0xFF9800).fillRoundedRect(-btn.width / 2, -btn.height / 2, btn.width, btn.height - 6, 12);
      btn._shadow.clear().fillStyle(0xE65100).fillRoundedRect(-btn.width / 2, -btn.height / 2 + 6, btn.width, btn.height, 12);

      // Shake
      this.tweens.add({
        targets: btn, x: btn.x - 8, duration: 50, yoyo: true, repeat: 3
      });

      await this.delay(600);

      // Replay correct word
      this.playCurrentWord();

      // Highlight correct
      this.choicesContainer.list.forEach(c => {
        if (c.word === this.currentTarget) {
          c._face.clear().fillStyle(0x4CAF50).fillRoundedRect(-c.width / 2, -c.height / 2, c.width, c.height - 6, 12);
          c._shadow.clear().fillStyle(0x388E3C).fillRoundedRect(-c.width / 2, -c.height / 2 + 6, c.width, c.height, 12);
        }
      });

      await this.delay(1600);
      this.roundIndex++;
      this.playWord();
    }
  }

  finishQuiz() {
    const correct = this.results.filter(r => r.correct).length;
    const total = this.results.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Go to shooter phase!
    this.scene.start('Shooter', {
      levelId: this.levelId,
      quizStars: this.stars,
      quizPercent: percent,
      quizCorrect: correct,
      quizTotal: total,
    });
  }

  drawSmallTinti(container) {
    const g = this.add.graphics();
    // Head
    g.fillStyle(0xFF6B35);
    g.fillEllipse(0, 0, 60, 48);
    // Eyes
    [-12, 12].forEach(ex => {
      g.fillStyle(0xffffff);
      g.fillEllipse(ex, -4, 14, 16);
      g.fillStyle(0x222222);
      g.fillCircle(ex + 1, -2, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(ex + 3, -5, 2);
    });
    // Mouth
    g.lineStyle(2, 0xc0392b);
    g.beginPath();
    g.arc(0, 8, 6, 0.2, Math.PI - 0.2);
    g.strokePath();
    // Tentacles
    for (let i = 0; i < 6; i++) {
      const tx = ((i - 2.5) / 5) * 40;
      g.fillStyle(0xFF6B35);
      g.fillRoundedRect(tx - 4, 20, 8, 28, 4);
    }
    container.add(g);
  }

  delay(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
