  // Animated square grid background with a diagonally moving Game of Life glider
(function () {
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const canvas = document.getElementById('life-bg');
  const ctx = canvas.getContext('2d', { alpha: true });

  // Visual config
  const CONFIG = {
    cellSize: 24, // CSS pixels per cell
    gridColor: 'rgba(0,0,0,0.08)',
    gridLineWidth: 1,
    liveColor: 'rgba(0, 102, 255, 0.35)',
    bgColor: 'rgba(255,255,255,0)', // transparent
    simIntervalMs: 100 // simulation tick rate
  };

  let cols = 0;
  let rows = 0;
  let board = null; // Uint8Array of size cols*rows
  let gen = 0; // generation counter
  let rafId = null;
  let lastTick = 0;

  function cssToDevice(v) { return Math.round(v * DPR); }

  function resize() {
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = cssToDevice(w);
    canvas.height = cssToDevice(h);

    // Recompute grid size based on CSS pixels per cell
    cols = Math.max(5, Math.floor(w / CONFIG.cellSize));
    rows = Math.max(5, Math.floor(h / CONFIG.cellSize));

    // Initialize a fresh board and seed the glider near the top center
    board = new Uint8Array(cols * rows);
    seedGliderTopCenter();
    draw();
  }

  function idx(x, y) { return y * cols + x; }

  function wrapX(x) { return (x + cols) % cols; }
  function wrapY(y) { return (y + rows) % rows; }

  function set(x, y, v) {
    board[idx(wrapX(x), wrapY(y))] = v ? 1 : 0;
  }

  function get(x, y) {
    return board[idx(wrapX(x), wrapY(y))];
  }

  // Standard glider that naturally moves down-right (period 4)
  // We will cancel horizontal drift every 4 generations by shifting left.
  function seedGliderTopCenter() {
    board.fill(0);
    const cx = Math.floor(cols / 2) - 1; // center-ish
    const cy = 2;
    // Glider pattern (down-right):
    //  . # .
    //  . . #
    //  # # #
    const pts = [
      [cx + 1, cy + 0],
      [cx + 2, cy + 1],
      [cx + 0, cy + 2],
      [cx + 1, cy + 2],
      [cx + 2, cy + 2]
    ];
    for (const [x, y] of pts) set(x, y, 1);
    gen = 0;
  }

  function nextGen() {
    const next = new Uint8Array(cols * rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = 0;
        // count neighbors
        n += get(x - 1, y - 1);
        n += get(x + 0, y - 1);
        n += get(x + 1, y - 1);
        n += get(x - 1, y + 0);
        n += get(x + 1, y + 0);
        n += get(x - 1, y + 1);
        n += get(x + 0, y + 1);
        n += get(x + 1, y + 1);
        const alive = get(x, y);
        next[idx(x, y)] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
    board = next;
    gen++;
  }

  function liveCenterY() {
    let sumY = 0, count = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (board[idx(x, y)]) { sumY += y; count++; }
      }
    }
    if (count === 0) return null;
    return Math.round(sumY / count);
  }

  function drawGrid() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill bg if desired (left transparent here)
    // ctx.fillStyle = CONFIG.bgColor;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = CONFIG.gridLineWidth * DPR;
    ctx.strokeStyle = CONFIG.gridColor;

    const step = cssToDevice(CONFIG.cellSize);
    // Vertical lines
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      const px = x * step + 0.5 * DPR; // align to device pixel for crispness
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
    }
    // Horizontal lines
    for (let y = 0; y <= rows; y++) {
      const py = y * step + 0.5 * DPR;
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawCells() {
    ctx.save();
    const step = cssToDevice(CONFIG.cellSize);
    ctx.fillStyle = CONFIG.liveColor;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!board[idx(x, y)]) continue;
        const px = x * step;
        const py = y * step;
        ctx.fillRect(px + 1 * DPR, py + 1 * DPR, step - 2 * DPR, step - 2 * DPR);
      }
    }
    ctx.restore();
  }

  function draw() {
    drawGrid();
    drawCells();
  }

  function loop(ts) {
    if (!lastTick) lastTick = ts;
    const dt = ts - lastTick;
    if (dt >= CONFIG.simIntervalMs) {
      nextGen();
      draw();
      lastTick = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(rafId);
    lastTick = 0;
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    resize();
  });

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resize();
      start();
    });
  } else {
    resize();
    start();
  }
})();
