// === Train Track Builder: Build tracks to the correct word station ===
const CELL_EMPTY = 0, CELL_TRACK = 1, CELL_STATION = 2, CELL_START = 3, CELL_OBSTACLE = 4, CELL_DECO = 5;

const TRACK_DIFF = {
  1: { cols: 7, rows: 4, obstacles: 2 },
  2: { cols: 7, rows: 5, obstacles: 3 },
  3: { cols: 8, rows: 5, obstacles: 4 },
  4: { cols: 9, rows: 5, obstacles: 5 },
  5: { cols: 10, rows: 6, obstacles: 6 },
  6: { cols: 11, rows: 6, obstacles: 8 },
  7: { cols: 12, rows: 7, obstacles: 10 },
};

class ShooterScene extends Phaser.Scene {
  constructor() { super('Shooter'); }

  init(data) {
    this.levelId = data.levelId || 1;
    this.quizStars = data.quizStars || 0;
    this.quizCorrect = data.quizCorrect || 0;
    this.quizTotal = data.quizTotal || 0;
    this.level = LEVELS.find(l => l.id === this.levelId);
  }

  create() {
    this.W = this.cameras.main.width;
    this.H = this.cameras.main.height;

    this.trackStars = 0;
    this.wordsHandled = 0;
    this.totalWords = this.level.shooterWords;
    this.currentWord = null;
    this.gameOver = false;
    this.answered = false;
    this.cabViewActive = false;

    const available = WORDS.filter(w =>
      w.minLevel <= this.levelId && this.level.confusionTypes.includes(w.confusionType)
    );
    this.wordQueue = shuffleArray(available).slice(0, this.totalWords + 5);

    // Grid config
    const diff = TRACK_DIFF[Math.min(this.levelId, 7)] || TRACK_DIFF[7];
    this.COLS = diff.cols;
    this.ROWS = diff.rows;
    this.numObstacles = diff.obstacles;
    this.CELL = Math.max(44, Math.min(76, Math.floor(Math.min(this.W / (this.COLS + 1), (this.H - 90) / (this.ROWS + 1)))));
    this.gridW = this.COLS * this.CELL;
    this.gridH = this.ROWS * this.CELL;
    this.ox = Math.floor((this.W - this.gridW) / 2);
    this.oy = Math.floor((this.H - this.gridH) / 2) + 15;

    // Background — countryside green
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x7CB342, 0x558B2F, 0x33691E, 0x2E7D32, 1);
    bg.fillRect(0, 0, this.W, this.H);

    // Sky at top
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x64B5F6, 0x64B5F6, 0x81C784, 0x81C784, 1);
    sky.fillRect(0, 0, this.W, this.oy);

    // Clouds
    for (let i = 0; i < 5; i++) {
      const cl = this.add.graphics();
      cl.fillStyle(0xffffff, 0.35);
      const cx = Phaser.Math.Between(20, this.W - 20);
      const cy = Phaser.Math.Between(10, this.oy - 15);
      cl.fillEllipse(cx, cy, 40 + i * 8, 16 + i * 2);
      cl.fillEllipse(cx + 18, cy - 5, 30 + i * 5, 14);
      this.tweens.add({ targets: cl, x: Phaser.Math.Between(-15, 15), duration: 4000 + i * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Grid container
    this.gridContainer = this.add.container(this.ox, this.oy).setDepth(2);

    // Track path state
    this.trackPath = [];
    this.trackEndR = 0;
    this.trackEndC = 0;
    this.startR = 0;
    this.startC = 0;
    this.stations = [];
    this.connectedStation = null;

    // Graphics layers
    this.bgGfx = this.add.graphics();
    this.gridContainer.add(this.bgGfx);
    this.trackGfx = this.add.graphics();
    this.gridContainer.add(this.trackGfx);
    this.highlightGfx = this.add.graphics();
    this.gridContainer.add(this.highlightGfx);
    this.stationContainers = [];

    // HUD
    this.createHUD();

    // Input
    this.input.on('pointerdown', (p) => this.handlePointer(p));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.undoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyDelay = 0;

    // Fahren button (hidden initially)
    this.fahrenBtn = null;

    // Instructions
    const instr = this.add.text(this.W / 2, this.H * 0.45,
      '🚂 Baue Gleise zum richtigen Bahnhof!\nTippen / Pfeiltasten = Gleise legen', {
        fontFamily: 'Nunito', fontSize: '20px', fontStyle: '700', color: '#ffffff',
        align: 'center', shadow: { offsetY: 2, color: '#000000aa', blur: 6, fill: true }
      }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: instr, alpha: 0, delay: 2800, duration: 600, onComplete: () => instr.destroy() });

    this.time.delayedCall(1000, () => this.nextWord());
  }

  update(time, delta) {
    if (this.gameOver || this.answered || this.cabViewActive || !this.grid) return;

    // Keyboard track building
    if (this.keyDelay > 0) { this.keyDelay--; return; }
    let dr = 0, dc = 0;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dr = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dr = 1;
    else if (this.cursors.left.isDown || this.wasd.A.isDown) dc = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dc = 1;
    if (dr || dc) { this.buildTrack(this.trackEndR + dr, this.trackEndC + dc); this.keyDelay = 8; }

    if (Phaser.Input.Keyboard.JustDown(this.undoKey)) this.undoLastTrack();
    if ((Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) && this.connectedStation) {
      this.onFahren();
    }

    // Update highlights
    this.drawHighlights();
  }

  // === HUD ===
  createHUD() {
    this.starsText = this.add.text(14, 8, `⭐ ${this.quizStars}`, {
      fontFamily: 'Nunito', fontSize: '22px', fontStyle: '900', color: '#FFD700',
      shadow: { offsetY: 2, color: '#000000aa', blur: 4, fill: true }
    }).setDepth(50);

    this.wordLabel = this.add.text(this.W / 2, 8, '', {
      fontFamily: 'Nunito', fontSize: '20px', fontStyle: '900', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 14, y: 5 }
    }).setOrigin(0.5, 0).setDepth(50);

    this.progressText = this.add.text(this.W - 14, 8, '', {
      fontFamily: 'Nunito', fontSize: '14px', fontStyle: '700', color: '#ffffff66'
    }).setOrigin(1, 0).setDepth(50);

    this.add.text(this.W - 14, 36, '🔊', { fontSize: '30px' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(50)
      .on('pointerdown', () => this.playCurrentAudio());

    this.add.text(14, this.H - 10, '❌ Abbrechen', {
      fontFamily: 'Nunito', fontSize: '13px', fontStyle: '700', color: '#ffffff55'
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true }).setDepth(50)
    .on('pointerdown', () => this.scene.start('Menu'));
  }

  // === Grid Setup ===
  initGrid() {
    this.grid = [];
    for (let r = 0; r < this.ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.COLS; c++) {
        this.grid[r][c] = { type: CELL_EMPTY, word: null, isTarget: false, decoType: null };
      }
    }

    // Start station
    this.startR = Math.floor(this.ROWS / 2);
    this.startC = 0;
    this.grid[this.startR][this.startC].type = CELL_START;

    // Track starts at start station
    this.trackPath = [{ r: this.startR, c: this.startC }];
    this.trackEndR = this.startR;
    this.trackEndC = this.startC;
    this.connectedStation = null;
  }

  placeStations(options) {
    this.stations = [];
    const minCol = Math.floor(this.COLS * 0.5);
    const positions = [];
    const tried = new Set();

    for (let attempt = 0; attempt < 500 && positions.length < options.length; attempt++) {
      const c = Phaser.Math.Between(minCol, this.COLS - 1);
      const r = Phaser.Math.Between(0, this.ROWS - 1);
      const key = `${r},${c}`;
      if (tried.has(key)) continue;
      tried.add(key);
      if (this.grid[r][c].type !== CELL_EMPTY) continue;

      let tooClose = false;
      for (const p of positions) {
        if (Math.abs(p.r - r) + Math.abs(p.c - c) < 2) { tooClose = true; break; }
      }
      if (tooClose) continue;
      positions.push({ r, c });
    }

    options.forEach((word, i) => {
      if (i >= positions.length) return;
      const { r, c } = positions[i];
      const isTarget = word === this.currentWord.target;
      this.grid[r][c] = { type: CELL_STATION, word, isTarget, decoType: null };
      this.stations.push({ r, c, word, isTarget });
    });
  }

  placeObstacles() {
    let placed = 0;
    for (let attempt = 0; attempt < 300 && placed < this.numObstacles; attempt++) {
      const r = Phaser.Math.Between(0, this.ROWS - 1);
      const c = Phaser.Math.Between(1, this.COLS - 1);
      if (this.grid[r][c].type !== CELL_EMPTY) continue;
      // Don't block near start
      if (c <= 1 && Math.abs(r - this.startR) <= 1) continue;
      // Don't block directly adjacent to any station
      let adjStation = false;
      for (const st of this.stations) {
        if (Math.abs(st.r - r) + Math.abs(st.c - c) <= 1) { adjStation = true; break; }
      }
      if (adjStation) continue;

      this.grid[r][c].type = CELL_OBSTACLE;
      this.grid[r][c].decoType = ['pond', 'mountain', 'bush'][Phaser.Math.Between(0, 2)];

      // Check all stations still reachable AND each station has at least 2 free neighbors
      let ok = true;
      for (const st of this.stations) {
        if (!this.bfsReachable(this.startR, this.startC, st.r, st.c)) { ok = false; break; }
        // Check station has enough free neighbors
        let freeNeighbors = 0;
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = st.r + dr, nc = st.c + dc;
          if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
            const t = this.grid[nr][nc].type;
            if (t !== CELL_OBSTACLE) freeNeighbors++;
          }
        }
        if (freeNeighbors < 2) { ok = false; break; }
      }
      if (!ok) {
        this.grid[r][c] = { type: CELL_EMPTY, word: null, isTarget: false, decoType: null };
      } else {
        placed++;
      }
    }
  }

  bfsReachable(sr, sc, tr, tc) {
    const visited = new Set();
    const queue = [{ r: sr, c: sc }];
    visited.add(`${sr},${sc}`);
    while (queue.length) {
      const { r, c } = queue.shift();
      if (r === tr && c === tc) return true;
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= this.ROWS || nc < 0 || nc >= this.COLS) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        const t = this.grid[nr][nc].type;
        if (t === CELL_OBSTACLE) continue;
        visited.add(key);
        queue.push({ r: nr, c: nc });
      }
    }
    return false;
  }

  placeDecorations() {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c].type !== CELL_EMPTY) continue;
        const seed = (r * 31 + c * 17 + this.wordsHandled * 7) % 40;
        if (seed < 3) {
          this.grid[r][c].decoType = ['tree', 'flower', 'house', 'cow', 'fence'][seed];
        }
      }
    }
  }

  // === Grid Rendering ===
  drawGrid() {
    this.bgGfx.clear();
    const C = this.CELL;
    const g = this.bgGfx;

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const x = c * C, y = r * C;
        const cell = this.grid[r][c];

        // Grass base — subtle variation
        const shade = ((r + c) % 2 === 0) ? 0x66BB6A : 0x5CB860;
        g.fillStyle(shade, 0.5);
        g.fillRect(x + 1, y + 1, C - 2, C - 2);

        // Grid lines (very subtle)
        g.lineStyle(1, 0x4CAF50, 0.15);
        g.strokeRect(x, y, C, C);

        // Obstacles and decorations (don't draw deco on track cells)
        if (cell.type === CELL_OBSTACLE) {
          this.drawObstacle(g, x, y, C, cell.decoType);
        } else if (cell.decoType && cell.type === CELL_EMPTY) {
          this.drawDecoration(g, x, y, C, cell.decoType);
        }
      }
    }

    // Draw stations
    this.clearStationContainers();
    this.drawStartStation();
    for (const st of this.stations) {
      this.drawStation(st);
    }
  }

  drawObstacle(g, x, y, C, type) {
    if (type === 'pond') {
      g.fillStyle(0x29B6F6, 0.5);
      g.fillEllipse(x + C / 2, y + C / 2, C * 0.7, C * 0.5);
      g.fillStyle(0x81D4FA, 0.3);
      g.fillEllipse(x + C * 0.4, y + C * 0.4, C * 0.25, C * 0.15);
    } else if (type === 'mountain') {
      g.fillStyle(0x795548, 0.6);
      g.fillTriangle(x + C * 0.5, y + C * 0.15, x + C * 0.15, y + C * 0.85, x + C * 0.85, y + C * 0.85);
      g.fillStyle(0xffffff, 0.4);
      g.fillTriangle(x + C * 0.5, y + C * 0.15, x + C * 0.4, y + C * 0.35, x + C * 0.6, y + C * 0.35);
    } else {
      // bush
      g.fillStyle(0x2E7D32, 0.6);
      g.fillCircle(x + C * 0.4, y + C * 0.5, C * 0.25);
      g.fillCircle(x + C * 0.6, y + C * 0.45, C * 0.22);
      g.fillStyle(0x388E3C, 0.4);
      g.fillCircle(x + C * 0.5, y + C * 0.4, C * 0.18);
    }
  }

  drawDecoration(g, x, y, C, type) {
    if (type === 'tree') {
      g.fillStyle(0x5D4037, 0.4);
      g.fillRect(x + C * 0.45, y + C * 0.5, C * 0.1, C * 0.35);
      g.fillStyle(0x2E7D32, 0.35);
      g.fillCircle(x + C * 0.5, y + C * 0.35, C * 0.22);
    } else if (type === 'flower') {
      g.fillStyle(0x388E3C, 0.3);
      g.fillRect(x + C * 0.48, y + C * 0.5, 2, C * 0.25);
      const colors = [0xE91E63, 0xFFEB3B, 0xFF5722, 0x9C27B0];
      g.fillStyle(colors[(x + y) % 4], 0.35);
      g.fillCircle(x + C * 0.5, y + C * 0.45, C * 0.1);
    } else if (type === 'house') {
      g.fillStyle(0xBCAAA4, 0.35);
      g.fillRect(x + C * 0.25, y + C * 0.4, C * 0.5, C * 0.45);
      g.fillStyle(0xC62828, 0.35);
      g.fillTriangle(x + C * 0.5, y + C * 0.2, x + C * 0.15, y + C * 0.42, x + C * 0.85, y + C * 0.42);
    } else if (type === 'cow') {
      g.fillStyle(0xffffff, 0.3);
      g.fillEllipse(x + C * 0.5, y + C * 0.55, C * 0.3, C * 0.18);
      g.fillStyle(0x3E2723, 0.2);
      g.fillCircle(x + C * 0.35, y + C * 0.55, C * 0.07);
      g.fillCircle(x + C * 0.55, y + C * 0.5, C * 0.06);
    } else if (type === 'fence') {
      g.lineStyle(2, 0x8D6E63, 0.3);
      g.beginPath(); g.moveTo(x + C * 0.2, y + C * 0.35); g.lineTo(x + C * 0.2, y + C * 0.7); g.strokePath();
      g.beginPath(); g.moveTo(x + C * 0.5, y + C * 0.35); g.lineTo(x + C * 0.5, y + C * 0.7); g.strokePath();
      g.beginPath(); g.moveTo(x + C * 0.8, y + C * 0.35); g.lineTo(x + C * 0.8, y + C * 0.7); g.strokePath();
      g.beginPath(); g.moveTo(x + C * 0.15, y + C * 0.45); g.lineTo(x + C * 0.85, y + C * 0.45); g.strokePath();
      g.beginPath(); g.moveTo(x + C * 0.15, y + C * 0.6); g.lineTo(x + C * 0.85, y + C * 0.6); g.strokePath();
    }
  }

  drawStartStation() {
    const C = this.CELL;
    const x = this.startC * C + C / 2;
    const y = this.startR * C + C / 2;
    const cont = this.add.container(x, y);

    // Building
    const g = this.add.graphics();
    g.fillStyle(0xFF6B35, 0.85);
    g.fillRoundedRect(-C * 0.4, -C * 0.35, C * 0.8, C * 0.55, 4);
    g.fillStyle(0xE55A2B, 0.7);
    g.fillTriangle(0, -C * 0.45, -C * 0.45, -C * 0.3, C * 0.45, -C * 0.3);
    // Door
    g.fillStyle(0x5D4037, 0.6);
    g.fillRect(-C * 0.08, -C * 0.05, C * 0.16, C * 0.25);

    const label = this.add.text(0, C * 0.38, 'START 🚂', {
      fontFamily: 'Nunito', fontSize: '11px', fontStyle: '900', color: '#ffffff',
      shadow: { offsetY: 1, color: '#000000aa', blur: 2, fill: true }
    }).setOrigin(0.5);

    cont.add([g, label]);
    this.gridContainer.add(cont);
    this.stationContainers.push(cont);
  }

  drawStation(st) {
    const C = this.CELL;
    const x = st.c * C + C / 2;
    const y = st.r * C + C / 2;
    const cont = this.add.container(x, y);

    const colors = [0xE53935, 0x1E88E5, 0xFDD835, 0x8E24AA];
    const color = colors[this.stations.indexOf(st) % colors.length];

    const g = this.add.graphics();
    // Building body
    g.fillStyle(color, 0.85);
    g.fillRoundedRect(-C * 0.4, -C * 0.3, C * 0.8, C * 0.5, 4);
    // Roof
    const darker = Phaser.Display.Color.ValueToColor(color).darken(25).color;
    g.fillStyle(darker, 0.8);
    g.fillTriangle(0, -C * 0.42, -C * 0.45, -C * 0.25, C * 0.45, -C * 0.25);
    // Window
    g.fillStyle(0xBBDEFB, 0.5);
    g.fillRect(-C * 0.12, -C * 0.15, C * 0.1, C * 0.1);
    g.fillRect(C * 0.02, -C * 0.15, C * 0.1, C * 0.1);

    // Word label pill
    const tw = Math.max(st.word.length * 9 + 14, 40);
    const pill = this.add.graphics();
    pill.fillStyle(0x000000, 0.65);
    pill.fillRoundedRect(-tw / 2, C * 0.22, tw, 20, 10);

    const label = this.add.text(0, C * 0.32, st.word, {
      fontFamily: 'Nunito', fontSize: '14px', fontStyle: '900', color: '#ffffff',
      shadow: { offsetY: 1, color: '#000000cc', blur: 2, fill: true }
    }).setOrigin(0.5);

    cont.add([g, pill, label]);
    this.gridContainer.add(cont);
    this.stationContainers.push(cont);
    st.container = cont;
  }

  clearStationContainers() {
    this.stationContainers.forEach(c => c.destroy());
    this.stationContainers = [];
  }

  // === Track System ===
  canBuildAt(r, c) {
    if (r < 0 || r >= this.ROWS || c < 0 || c >= this.COLS) return false;
    const t = this.grid[r][c].type;
    // Can't build on obstacles, existing track, start, or stations
    if (t === CELL_OBSTACLE || t === CELL_TRACK || t === CELL_START || t === CELL_STATION) return false;
    // Must be adjacent to track end
    const dr = Math.abs(r - this.trackEndR);
    const dc = Math.abs(c - this.trackEndC);
    return (dr + dc === 1);
  }

  buildTrack(r, c) {
    if (this.answered || this.gameOver) return;
    // If already connected to a station, can't build further — only undo or Fahren
    if (this.connectedStation) return;

    // If it's a station cell adjacent to end, connect to it (don't place track ON station)
    if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
      const cell = this.grid[r][c];
      if (cell.type === CELL_STATION && Math.abs(r - this.trackEndR) + Math.abs(c - this.trackEndC) === 1) {
        // Don't add station to trackPath — just mark as connected
        this.connectedStation = this.stations.find(s => s.r === r && s.c === c);
        this.showFahrenBtn();
        return;
      }
    }

    if (!this.canBuildAt(r, c)) return;

    // Place track (clear deco)
    this.grid[r][c].type = CELL_TRACK;
    this.grid[r][c].decoType = null;
    this.trackPath.push({ r, c });
    this.trackEndR = r;
    this.trackEndC = c;
    this.drawGrid();
    this.drawTrack();

    // Brief place animation
    const px = c * this.CELL + this.CELL / 2;
    const py = r * this.CELL + this.CELL / 2;
    const puff = this.add.circle(px, py, 8, 0x8B4513, 0.3);
    this.gridContainer.add(puff);
    this.tweens.add({ targets: puff, scale: 2, alpha: 0, duration: 250, onComplete: () => puff.destroy() });
  }

  undoLastTrack() {
    if (this.trackPath.length <= 1) return; // can't remove start
    if (this.answered) return;

    this.hideFahrenBtn();
    this.connectedStation = null;

    const last = this.trackPath.pop();
    if (this.grid[last.r][last.c].type === CELL_TRACK) {
      this.grid[last.r][last.c].type = CELL_EMPTY;
    }
    const end = this.trackPath[this.trackPath.length - 1];
    this.trackEndR = end.r;
    this.trackEndC = end.c;
    this.drawTrack();
  }

  drawTrack() {
    this.trackGfx.clear();
    const C = this.CELL;
    const g = this.trackGfx;

    for (let i = 0; i < this.trackPath.length; i++) {
      const { r, c } = this.trackPath[i];
      const cx = c * C + C / 2;
      const cy = r * C + C / 2;

      const prev = i > 0 ? this.trackPath[i - 1] : null;
      const next = i < this.trackPath.length - 1 ? this.trackPath[i + 1] : null;

      this.drawTrackPiece(g, cx, cy, C, prev, { r, c }, next);
    }
  }

  drawTrackPiece(g, cx, cy, C, prev, cur, next) {
    const h = C / 2;
    const dirs = [];

    if (prev) {
      if (prev.r < cur.r) dirs.push('N');
      else if (prev.r > cur.r) dirs.push('S');
      else if (prev.c < cur.c) dirs.push('W');
      else dirs.push('E');
    }
    if (next) {
      if (next.r < cur.r) dirs.push('N');
      else if (next.r > cur.r) dirs.push('S');
      else if (next.c < cur.c) dirs.push('W');
      else dirs.push('E');
    }

    if (dirs.length === 0) return;
    if (dirs.length === 1) dirs.push({ N: 'S', S: 'N', E: 'W', W: 'E' }[dirs[0]]);

    const [d1, d2] = dirs;

    // Track bed (gravel)
    g.fillStyle(0x6D4C41, 0.35);
    g.fillRoundedRect(cx - h + 3, cy - h + 3, C - 6, C - 6, 3);

    const isHoriz = (d1 === 'E' || d1 === 'W') && (d2 === 'E' || d2 === 'W');
    const isVert = (d1 === 'N' || d1 === 'S') && (d2 === 'N' || d2 === 'S');
    const railOff = C * 0.14;  // rail offset from center
    const sleeperW = C * 0.38; // sleeper half-width

    if (isHoriz) {
      // Sleepers
      g.fillStyle(0x8B4513, 0.75);
      for (let s = -h + 5; s < h - 3; s += 9) {
        g.fillRect(cx + s, cy - sleeperW, 5, sleeperW * 2);
      }
      // Rails
      g.fillStyle(0x9E9E9E, 0.85);
      g.fillRect(cx - h + 1, cy - railOff - 1.5, C - 2, 3);
      g.fillRect(cx - h + 1, cy + railOff - 1.5, C - 2, 3);
    } else if (isVert) {
      g.fillStyle(0x8B4513, 0.75);
      for (let s = -h + 5; s < h - 3; s += 9) {
        g.fillRect(cx - sleeperW, cy + s, sleeperW * 2, 5);
      }
      g.fillStyle(0x9E9E9E, 0.85);
      g.fillRect(cx - railOff - 1.5, cy - h + 1, 3, C - 2);
      g.fillRect(cx + railOff - 1.5, cy - h + 1, 3, C - 2);
    } else {
      // CURVE — draw as two straight segments meeting at cell center
      // Entry point: where d1 edge meets cell center line
      // Exit point: where d2 edge meets cell center line
      const edgePoint = (dir) => {
        if (dir === 'N') return { x: cx, y: cy - h };
        if (dir === 'S') return { x: cx, y: cy + h };
        if (dir === 'W') return { x: cx - h, y: cy };
        return { x: cx + h, y: cy };
      };
      const p1 = edgePoint(d1);
      const p2 = edgePoint(d2);

      // Draw sleepers along two line segments (p1→center, center→p2)
      const segments = 8;
      g.fillStyle(0x8B4513, 0.7);
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Quadratic bezier: p1 → cx,cy → p2
        const bx = (1-t)*(1-t)*p1.x + 2*(1-t)*t*cx + t*t*p2.x;
        const by = (1-t)*(1-t)*p1.y + 2*(1-t)*t*cy + t*t*p2.y;
        // Tangent for sleeper orientation
        const tx = 2*(1-t)*(cx-p1.x) + 2*t*(p2.x-cx);
        const ty = 2*(1-t)*(cy-p1.y) + 2*t*(p2.y-cy);
        const len = Math.sqrt(tx*tx + ty*ty) || 1;
        const nx = -ty/len, ny = tx/len; // normal

        if (i % 2 === 0) {
          g.lineStyle(4, 0x8B4513, 0.7);
          g.beginPath();
          g.moveTo(bx + nx*sleeperW, by + ny*sleeperW);
          g.lineTo(bx - nx*sleeperW, by - ny*sleeperW);
          g.strokePath();
        }
      }

      // Two rails as bezier curves (offset from center)
      for (const sign of [-1, 1]) {
        g.lineStyle(3, 0x9E9E9E, 0.85);
        g.beginPath();
        const segs = 12;
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const bx = (1-t)*(1-t)*p1.x + 2*(1-t)*t*cx + t*t*p2.x;
          const by = (1-t)*(1-t)*p1.y + 2*(1-t)*t*cy + t*t*p2.y;
          const tx = 2*(1-t)*(cx-p1.x) + 2*t*(p2.x-cx);
          const ty = 2*(1-t)*(cy-p1.y) + 2*t*(p2.y-cy);
          const len = Math.sqrt(tx*tx + ty*ty) || 1;
          const nx = -ty/len, ny = tx/len;
          const rx = bx + nx * railOff * sign;
          const ry = by + ny * railOff * sign;
          if (i === 0) g.moveTo(rx, ry); else g.lineTo(rx, ry);
        }
        g.strokePath();
      }
    }
  }

  drawHighlights() {
    this.highlightGfx.clear();
    if (this.answered || this.connectedStation) return;

    const C = this.CELL;
    this.highlightGfx.fillStyle(0xFFD700, 0.12);

    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const r = this.trackEndR + dr;
      const c = this.trackEndC + dc;
      if (r < 0 || r >= this.ROWS || c < 0 || c >= this.COLS) continue;
      const t = this.grid[r][c].type;
      if (t === CELL_EMPTY || t === CELL_STATION) {
        this.highlightGfx.fillRoundedRect(c * C + 3, r * C + 3, C - 6, C - 6, 4);
      }
    }

    // Highlight track end
    this.highlightGfx.lineStyle(2, 0xFFD700, 0.4);
    this.highlightGfx.strokeRoundedRect(
      this.trackEndC * C + 1, this.trackEndR * C + 1, C - 2, C - 2, 4
    );
  }

  // === Input ===
  handlePointer(pointer) {
    if (this.gameOver || this.cabViewActive) return;

    const col = Math.floor((pointer.x - this.ox) / this.CELL);
    const row = Math.floor((pointer.y - this.oy) / this.CELL);

    if (col < 0 || col >= this.COLS || row < 0 || row >= this.ROWS) return;

    // Undo if tapping last track piece
    if (this.trackPath.length > 1) {
      const last = this.trackPath[this.trackPath.length - 1];
      if (last.r === row && last.c === col && this.grid[row][col].type === CELL_TRACK) {
        this.undoLastTrack();
        return;
      }
    }

    this.buildTrack(row, col);
  }

  // === Fahren Button ===
  showFahrenBtn() {
    if (this.fahrenBtn) return;
    this.fahrenBtn = this.add.container(this.W / 2, this.H - 45).setDepth(50);
    const bg = this.add.graphics();
    bg.fillStyle(0xE65100);
    bg.fillRoundedRect(-80, -22, 160, 44, 22);
    bg.fillStyle(0xFF6B35);
    bg.fillRoundedRect(-80, -22, 160, 40, 22);
    const text = this.add.text(0, -2, '🚂 Fahren!', {
      fontFamily: 'Nunito', fontSize: '22px', fontStyle: '900', color: '#ffffff'
    }).setOrigin(0.5);
    this.fahrenBtn.add([bg, text]);
    this.fahrenBtn.setSize(160, 44).setInteractive({ useHandCursor: true });
    this.fahrenBtn.on('pointerdown', () => this.onFahren());
    // Bounce in
    this.fahrenBtn.setScale(0);
    this.tweens.add({ targets: this.fahrenBtn, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  hideFahrenBtn() {
    if (this.fahrenBtn) { this.fahrenBtn.destroy(); this.fahrenBtn = null; }
  }

  // === Game Flow ===
  nextWord() {
    if (this.gameOver) return;
    if (this.wordsHandled >= this.totalWords) { this.endGame(); return; }

    if (this.wordQueue.length === 0) {
      const available = WORDS.filter(w =>
        w.minLevel <= this.levelId && this.level.confusionTypes.includes(w.confusionType)
      );
      this.wordQueue = shuffleArray(available).slice(0, 10);
    }

    this.currentWord = this.wordQueue.shift();
    this.wordsHandled++;
    this.answered = false;
    this.connectedStation = null;
    this.hideFahrenBtn();

    this.wordLabel.setText('🔊 Hör zu...');
    this.progressText.setText(`${this.wordsHandled} / ${this.totalWords}`);

    // Fresh grid
    this.initGrid();
    const options = shuffleArray([this.currentWord.target, ...this.currentWord.distractors]);
    if (this.level.options >= 3 && options.length < 3) {
      const extra = WORDS.filter(w => w.target !== this.currentWord.target && !this.currentWord.distractors.includes(w.target) && w.minLevel <= this.levelId);
      for (const e of shuffleArray(extra)) {
        if (options.length >= Math.min(this.level.options, 4)) break;
        if (!options.includes(e.target)) options.push(e.target);
      }
    }
    this.placeStations(options);
    this.placeObstacles();
    this.placeDecorations();
    this.drawGrid();
    this.drawTrack();

    // Audio: "Fahre zu..." then the word
    try { this.sound.play('prompt_fahrezu'); } catch(e) {}
    this.wordLabel.setText('🔊 Fahre zu...');
    this.time.delayedCall(1400, () => {
      this.playCurrentAudio();
      this.wordLabel.setText('🔊 Baue zum richtigen Bahnhof!');
    });
    this.time.delayedCall(3000, () => { if (this.currentWord) this.playCurrentAudio(); });
  }

  onFahren() {
    if (!this.connectedStation || this.answered) return;
    this.answered = true;
    this.hideFahrenBtn();
    this.animateTrainTopDown(() => {
      this.evaluateAnswer();
    });
  }

  evaluateAnswer() {
    if (this.connectedStation.isTarget) {
      this.handleCorrect();
    } else {
      this.handleWrong();
    }
  }

  handleCorrect() {
    this.trackStars++;
    this.starsText.setText(`⭐ ${this.quizStars + this.trackStars}`);
    try { this.sound.play('prompt_richtig'); } catch(e) {}

    // Stars burst
    for (let i = 0; i < 10; i++) {
      const star = this.add.text(this.W / 2 + Phaser.Math.Between(-60, 60), this.H / 2 + Phaser.Math.Between(-40, 40),
        '⭐', { fontSize: '28px' }).setOrigin(0.5).setDepth(60);
      this.tweens.add({
        targets: star, y: star.y - 70 - i * 10, alpha: 0, scale: 1.5,
        duration: 700, delay: i * 40, onComplete: () => star.destroy()
      });
    }

    const msg = this.add.text(this.W / 2, this.H * 0.35, '✅ Richtig!', {
      fontFamily: 'Nunito', fontSize: '36px', fontStyle: '900', color: '#4CAF50',
      shadow: { offsetY: 3, color: '#000000cc', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: msg, y: msg.y - 30, alpha: 0, delay: 1000, duration: 500, onComplete: () => msg.destroy() });

    this.time.delayedCall(1800, () => this.nextWord());
  }

  handleWrong() {
    try { this.sound.play('prompt_falsch'); } catch(e) {}

    const msg = this.add.text(this.W / 2, this.H * 0.35, '❌ Falscher Bahnhof!', {
      fontFamily: 'Nunito', fontSize: '28px', fontStyle: '900', color: '#FF9800',
      shadow: { offsetY: 2, color: '#000000cc', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: msg, y: msg.y - 30, alpha: 0, delay: 1200, duration: 500, onComplete: () => msg.destroy() });

    // Replay correct word
    this.time.delayedCall(600, () => this.playCurrentAudio());

    // Highlight correct station
    for (const st of this.stations) {
      if (st.isTarget && st.container) {
        this.tweens.add({ targets: st.container, scale: 1.3, duration: 250, yoyo: true, repeat: 3 });
      }
    }

    // Reset track for retry
    this.time.delayedCall(2500, () => {
      // Clear track
      for (const p of this.trackPath) {
        if (this.grid[p.r] && this.grid[p.r][p.c] && this.grid[p.r][p.c].type === CELL_TRACK) {
          this.grid[p.r][p.c].type = CELL_EMPTY;
        }
      }
      this.trackPath = [{ r: this.startR, c: this.startC }];
      this.trackEndR = this.startR;
      this.trackEndC = this.startC;
      this.connectedStation = null;
      this.answered = false;
      this.drawTrack();
      this.playCurrentAudio();
    });
  }

  endGame() {
    this.gameOver = true;
    const totalStars = this.quizStars + this.trackStars;
    const totalCorrect = this.quizCorrect + this.trackStars;
    const totalQuestions = this.quizTotal + this.totalWords;
    const percent = Math.round((totalCorrect / totalQuestions) * 100);

    let progress = GameProgress.load();
    progress = GameProgress.updateAfterLevel(progress, this.levelId, percent, totalStars);

    this.time.delayedCall(800, () => {
      this.scene.start('LevelComplete', {
        levelId: this.levelId, stars: totalStars,
        correct: totalCorrect, total: totalQuestions, percent,
      });
    });
  }

  playCurrentAudio() {
    if (!this.currentWord) return;
    try { this.sound.play(wordAudioKey(this.currentWord.target)); } catch(e) {}
  }

  // === Train Animation (Top-Down) ===
  animateTrainTopDown(onComplete) {
    const C = this.CELL;
    // Train sprite
    const train = this.add.container(0, 0);
    const tg = this.add.graphics();
    // Locomotive body
    tg.fillStyle(0xC62828);
    tg.fillRoundedRect(-14, -10, 28, 20, 5);
    tg.fillStyle(0xEF5350, 0.5);
    tg.fillRoundedRect(-10, -8, 20, 10, 3);
    // Chimney
    tg.fillStyle(0x424242);
    tg.fillRect(-4, -16, 8, 8);
    // Wheels
    tg.fillStyle(0x333333);
    tg.fillCircle(-8, 10, 4);
    tg.fillCircle(8, 10, 4);
    train.add(tg);
    this.gridContainer.add(train);
    train.setDepth(15);

    const path = this.trackPath.map(p => ({ x: p.c * C + C / 2, y: p.r * C + C / 2 }));
    // Add the station as final destination
    if (this.connectedStation) {
      path.push({ x: this.connectedStation.c * C + C / 2, y: this.connectedStation.r * C + C / 2 });
    }
    train.setPosition(path[0].x, path[0].y);

    let idx = 0;
    const moveNext = () => {
      if (idx >= path.length - 1) {
        // Smoke puff at end
        train.destroy();
        if (onComplete) onComplete();
        return;
      }
      idx++;
      const angle = Phaser.Math.Angle.Between(path[idx - 1].x, path[idx - 1].y, path[idx].x, path[idx].y);
      tg.setRotation(angle);

      // Smoke puff
      const smoke = this.add.circle(train.x, train.y - 10, 4, 0xBDBDBD, 0.4);
      this.gridContainer.add(smoke);
      this.tweens.add({ targets: smoke, y: smoke.y - 20, alpha: 0, scale: 2, duration: 500, onComplete: () => smoke.destroy() });

      this.tweens.add({
        targets: train, x: path[idx].x, y: path[idx].y,
        duration: 180, ease: 'Linear', onComplete: moveNext
      });
    };
    moveNext();
  }

  // === Cab View (Pseudo-3D with curves from actual track) ===
  startCabView(onComplete) {
    this.cabViewActive = true;
    this.cabContainer = this.add.container(0, 0).setDepth(100);
    this.cabGfx = this.add.graphics();
    this.cabContainer.add(this.cabGfx);

    // Pre-compute turn directions from the track path
    this.cabTurns = [];
    for (let i = 1; i < this.trackPath.length; i++) {
      const prev = this.trackPath[i - 1];
      const cur = this.trackPath[i];
      const next = i < this.trackPath.length - 1 ? this.trackPath[i + 1] : null;
      let turn = 0; // -1 = left, 0 = straight, 1 = right
      if (prev && next) {
        const dxIn = cur.c - prev.c, dyIn = cur.r - prev.r;
        const dxOut = next.c - cur.c, dyOut = next.r - cur.r;
        turn = dxIn * dyOut - dyIn * dxOut; // cross product: -1=left, 1=right
      }
      this.cabTurns.push(turn);
    }

    // Seed random scenery objects for this ride
    this.cabScenery = [];
    for (let i = 0; i < 20; i++) {
      this.cabScenery.push({
        side: i % 2 === 0 ? -1 : 1,
        dist: 0.3 + Math.random() * 0.5, // how far from track
        pos: i / 20, // position along route
        type: ['tree', 'house', 'fence', 'bush', 'cow'][Math.floor(Math.random() * 5)],
        size: 0.7 + Math.random() * 0.6,
      });
    }

    const duration = 4000;
    const startTime = this.time.now;

    const cabUpdate = () => {
      if (!this.cabViewActive) return;
      const elapsed = this.time.now - startTime;
      const t = Math.min(elapsed / duration, 1);
      this.drawCabView(t);

      if (t >= 1) {
        this.showStationSign(() => {
          this.cabContainer.destroy();
          this.cabViewActive = false;
          if (onComplete) onComplete();
        });
        return;
      }
      this.time.delayedCall(16, cabUpdate);
    };
    cabUpdate();
  }

  drawCabView(t) {
    const g = this.cabGfx;
    g.clear();
    const W = this.W, H = this.H;
    const vanishY = H * 0.30;

    // Determine current curve from track turns
    const turnIdx = Math.floor(t * this.cabTurns.length);
    const currentTurn = this.cabTurns[Math.min(turnIdx, this.cabTurns.length - 1)] || 0;
    const curveOffset = currentTurn * W * 0.15; // vanish point shifts left/right
    const vanishX = W / 2 + curveOffset;

    // Camera sway
    const sway = Math.sin(t * 12) * 3;

    // Sky gradient
    g.fillGradientStyle(0x42A5F5, 0x42A5F5, 0xBBDEFB, 0xBBDEFB, 1);
    g.fillRect(0, 0, W, vanishY + 30);

    // Sun
    g.fillStyle(0xFFF176, 0.3);
    g.fillCircle(W * 0.8, vanishY * 0.3, 30);
    g.fillStyle(0xFFF9C4, 0.15);
    g.fillCircle(W * 0.8, vanishY * 0.3, 50);

    // Clouds
    g.fillStyle(0xffffff, 0.25);
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 300 + t * 200) % (W + 200)) - 100;
      g.fillEllipse(cx, vanishY * 0.25 + i * 15, 60, 18);
      g.fillEllipse(cx + 25, vanishY * 0.2 + i * 15, 40, 14);
    }

    // Hills at horizon
    g.fillStyle(0x388E3C, 0.35);
    g.beginPath();
    g.moveTo(0, vanishY + 5);
    for (let x = 0; x <= W; x += 8) {
      const hy = vanishY + 5 - Math.sin((x + t * 60) * 0.015) * 15 - Math.sin((x + t * 40) * 0.035) * 8;
      g.lineTo(x, hy);
    }
    g.lineTo(W, vanishY + 20);
    g.lineTo(0, vanishY + 20);
    g.fill();

    // Ground
    g.fillGradientStyle(0x558B2F, 0x558B2F, 0x7CB342, 0x7CB342, 1);
    g.fillRect(0, vanishY + 5, W, H - vanishY);

    // Rails — curve toward vanish point
    const railSpread = W * 0.3;
    g.lineStyle(4, 0x9E9E9E, 0.8);
    // Left rail
    g.beginPath();
    g.moveTo(vanishX - 5 + sway, vanishY);
    g.lineTo(W / 2 - railSpread + sway, H * 0.88);
    g.strokePath();
    // Right rail
    g.beginPath();
    g.moveTo(vanishX + 5 + sway, vanishY);
    g.lineTo(W / 2 + railSpread + sway, H * 0.88);
    g.strokePath();

    // Sleepers — perspective, moving toward viewer
    for (let i = 0; i < 30; i++) {
      let st = ((i / 30) + t * 4) % 1;
      const depth = st * st; // quadratic for perspective
      const y = vanishY + depth * (H * 0.88 - vanishY);
      const leftX = vanishX - 5 + (W / 2 - railSpread - vanishX + 5) * depth + sway;
      const rightX = vanishX + 5 + (W / 2 + railSpread - vanishX - 5) * depth + sway;
      const thick = 1 + depth * 7;
      g.fillStyle(0x8B4513, 0.25 + depth * 0.55);
      g.fillRect(leftX - 8, y - thick / 2, rightX - leftX + 16, thick);
    }

    // Scenery objects alongside the track
    for (const obj of this.cabScenery) {
      const relPos = (obj.pos - t * 1.5 + 1) % 1; // scroll past
      if (relPos < 0.02 || relPos > 0.85) continue;
      const depth = relPos * relPos;
      const y = vanishY + depth * (H * 0.85 - vanishY);
      const trackEdge = obj.side > 0
        ? vanishX + 5 + (W / 2 + railSpread - vanishX - 5) * depth
        : vanishX - 5 + (W / 2 - railSpread - vanishX + 5) * depth;
      const x = trackEdge + obj.side * (30 + obj.dist * 80 * depth) + sway;
      const sz = depth * 30 * obj.size;
      if (sz < 3) continue;

      if (obj.type === 'tree') {
        g.fillStyle(0x5D4037, 0.7);
        g.fillRect(x - sz * 0.08, y - sz * 1.5, sz * 0.16, sz);
        g.fillStyle(0x2E7D32, 0.7);
        g.fillCircle(x, y - sz * 1.7, sz * 0.5);
      } else if (obj.type === 'house') {
        g.fillStyle(0xBCAAA4, 0.6);
        g.fillRect(x - sz * 0.4, y - sz * 0.8, sz * 0.8, sz * 0.7);
        g.fillStyle(0xC62828, 0.6);
        g.fillTriangle(x, y - sz * 1.2, x - sz * 0.5, y - sz * 0.75, x + sz * 0.5, y - sz * 0.75);
      } else if (obj.type === 'bush') {
        g.fillStyle(0x2E7D32, 0.5);
        g.fillCircle(x, y - sz * 0.3, sz * 0.35);
        g.fillCircle(x + sz * 0.2, y - sz * 0.4, sz * 0.25);
      } else if (obj.type === 'fence') {
        g.lineStyle(Math.max(1, sz * 0.08), 0x8D6E63, 0.5);
        g.beginPath(); g.moveTo(x - sz * 0.4, y - sz * 0.3); g.lineTo(x + sz * 0.4, y - sz * 0.3); g.strokePath();
        g.beginPath(); g.moveTo(x - sz * 0.4, y - sz * 0.5); g.lineTo(x + sz * 0.4, y - sz * 0.5); g.strokePath();
      } else if (obj.type === 'cow') {
        g.fillStyle(0xffffff, 0.5);
        g.fillEllipse(x, y - sz * 0.3, sz * 0.4, sz * 0.2);
        g.fillStyle(0x3E2723, 0.4);
        g.fillCircle(x - sz * 0.1, y - sz * 0.35, sz * 0.06);
      }
    }

    // Dashboard
    g.fillStyle(0x3E2723, 0.9);
    g.fillRoundedRect(0, H * 0.86, W, H * 0.14, { tl: 8, tr: 8, bl: 0, br: 0 });
    // Steering wheel outline
    g.lineStyle(4, 0x5D4037, 0.6);
    g.strokeCircle(W / 2, H * 0.93, 20);
    g.fillStyle(0x5D4037, 0.4);
    g.fillCircle(W / 2, H * 0.93, 6);
    // Speed gauge
    g.fillStyle(0x424242, 0.6);
    g.fillRoundedRect(W * 0.7, H * 0.89, W * 0.2, H * 0.04, 4);
    g.fillStyle(0x4CAF50, 0.7);
    g.fillRoundedRect(W * 0.7, H * 0.89, W * 0.2 * Math.min(t * 2, 1), H * 0.04, 4);
    // Speed text
    const speed = Math.floor(Math.min(t * 2, 1) * 80);
    // Tinti hands on wheel (small)
    g.fillStyle(0xFF6B35, 0.6);
    g.fillCircle(W / 2 - 18, H * 0.92, 6);
    g.fillCircle(W / 2 + 18, H * 0.92, 6);
  }

  showStationSign(onComplete) {
    const word = this.connectedStation ? this.connectedStation.word : '???';
    const isCorrect = this.connectedStation ? this.connectedStation.isTarget : false;

    // Station sign growing from vanish point
    const sign = this.add.container(this.W / 2, this.H * 0.32).setDepth(110);
    const signBg = this.add.graphics();
    signBg.fillStyle(isCorrect ? 0x2E7D32 : 0xBF360C, 0.9);
    signBg.fillRoundedRect(-120, -40, 240, 80, 12);
    signBg.lineStyle(3, 0xFFD700, 0.7);
    signBg.strokeRoundedRect(-120, -40, 240, 80, 12);

    const signText = this.add.text(0, 0, word, {
      fontFamily: 'Nunito', fontSize: '36px', fontStyle: '900',
      color: '#ffffff', shadow: { offsetY: 2, color: '#000000aa', blur: 4, fill: true }
    }).setOrigin(0.5);

    const icon = this.add.text(0, -50, isCorrect ? '✅' : '❌', { fontSize: '32px' }).setOrigin(0.5);

    sign.add([signBg, signText, icon]);
    sign.setScale(0.1);

    this.tweens.add({
      targets: sign, scale: 1, y: this.H * 0.4,
      duration: 600, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          sign.destroy();
          if (onComplete) onComplete();
        });
      }
    });
  }
}
