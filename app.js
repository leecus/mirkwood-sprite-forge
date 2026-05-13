const $ = (selector) => document.querySelector(selector);

const els = {
  fileInput: $("#fileInput"),
  dropZone: $("#dropZone"),
  fileLabel: $("#fileLabel"),
  imageMeta: $("#imageMeta"),
  sheetCanvas: $("#sheetCanvas"),
  previewCanvas: $("#previewCanvas"),
  canvasShell: $("#canvasShell"),
  sheetStatus: $("#sheetStatus"),
  currentInfo: $("#currentInfo"),
  pointerInfo: $("#pointerInfo"),
  frameBadge: $("#frameBadge"),
  cssOutput: $("#cssOutput"),
  toast: $("#toast"),
  playBtn: $("#playBtn"),
  prevBtn: $("#prevBtn"),
  nextBtn: $("#nextBtn"),
  autoGridBtn: $("#autoGridBtn"),
  resetRangeBtn: $("#resetRangeBtn"),
  exportStripBtn: $("#exportStripBtn"),
  exportGifBtn: $("#exportGifBtn"),
  exportFramesBtn: $("#exportFramesBtn"),
  copyCssBtn: $("#copyCssBtn"),
  downloadJsonBtn: $("#downloadJsonBtn"),
  downloadFrameBtn: $("#downloadFrameBtn"),
  gridModeBtn: $("#gridModeBtn"),
  freeModeBtn: $("#freeModeBtn"),
  detectSpritesBtn: $("#detectSpritesBtn"),
  splitVerticalBtn: $("#splitVerticalBtn"),
  splitHorizontalBtn: $("#splitHorizontalBtn"),
  deleteFrameBtn: $("#deleteFrameBtn"),
  clearFramesBtn: $("#clearFramesBtn"),
  sampleMatteBtn: $("#sampleMatteBtn"),
  downloadCutoutBtn: $("#downloadCutoutBtn"),
  matteStatus: $("#matteStatus"),
  sliceModeStatus: $("#sliceModeStatus"),
  gridSliceControls: $("#gridSliceControls"),
  freeSliceControls: $("#freeSliceControls"),
  tabButtons: document.querySelectorAll("[data-tab-target]"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  sensitivityValue: $("#sensitivityValue"),
  matteThresholdValue: $("#matteThresholdValue"),
  matteFeatherValue: $("#matteFeatherValue"),
  fpsValue: $("#fpsValue"),
  scaleValue: $("#scaleValue"),
};

const inputs = {
  frameWidth: $("#frameWidth"),
  frameHeight: $("#frameHeight"),
  marginX: $("#marginX"),
  marginY: $("#marginY"),
  gapX: $("#gapX"),
  gapY: $("#gapY"),
  columns: $("#columns"),
  rows: $("#rows"),
  startFrame: $("#startFrame"),
  frameCount: $("#frameCount"),
  fps: $("#fps"),
  scale: $("#scale"),
  detectSensitivity: $("#detectSensitivity"),
  detectPadding: $("#detectPadding"),
  detectMinArea: $("#detectMinArea"),
  removeBackground: $("#removeBackground"),
  matteThreshold: $("#matteThreshold"),
  matteFeather: $("#matteFeather"),
  showGrid: $("#showGrid"),
  showIndex: $("#showIndex"),
  reverse: $("#reverse"),
  pingpong: $("#pingpong"),
};

const state = {
  image: null,
  imageUrl: "",
  imageName: "sprite",
  sourceFileName: "sprite.png",
  sliceMode: "grid",
  freeFrames: [],
  removeBackground: false,
  matteThreshold: 48,
  matteFeather: 0,
  matteSample: null,
  autoMatteColor: null,
  sampleMatte: false,
  ignoreNextClick: false,
  frameWidth: 64,
  frameHeight: 64,
  marginX: 0,
  marginY: 0,
  gapX: 0,
  gapY: 0,
  columns: 1,
  rows: 1,
  startFrame: 0,
  frameCount: 1,
  fps: 12,
  scale: 4,
  detectSensitivity: 36,
  detectPadding: 2,
  detectMinArea: 64,
  showGrid: true,
  showIndex: true,
  reverse: false,
  pingpong: false,
  playing: false,
  playhead: 0,
  lastTick: 0,
  dragStart: null,
  dragCurrent: null,
  didDrag: false,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function intFrom(input, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) ? value : fallback;
}

function cleanName(fileName) {
  const name = fileName.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_") || "sprite";
  return /^\d/.test(name) ? `sprite_${name}` : name;
}

function cssUrl(fileName) {
  return fileName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function setImageRequiredState() {
  document.querySelectorAll("[data-requires-image]").forEach((element) => {
    element.disabled = !state.image;
  });
}

function readControls() {
  const maxImageWidth = state.image ? state.image.width : 4096;
  const maxImageHeight = state.image ? state.image.height : 4096;

  state.frameWidth = clamp(intFrom(inputs.frameWidth, state.frameWidth), 1, maxImageWidth);
  state.frameHeight = clamp(intFrom(inputs.frameHeight, state.frameHeight), 1, maxImageHeight);
  state.marginX = clamp(intFrom(inputs.marginX, state.marginX), 0, maxImageWidth - 1);
  state.marginY = clamp(intFrom(inputs.marginY, state.marginY), 0, maxImageHeight - 1);
  state.gapX = clamp(intFrom(inputs.gapX, state.gapX), 0, maxImageWidth);
  state.gapY = clamp(intFrom(inputs.gapY, state.gapY), 0, maxImageHeight);

  const maxCols = getMaxColumns();
  const maxRows = getMaxRows();
  state.columns = clamp(intFrom(inputs.columns, state.columns), 1, Math.max(1, maxCols));
  state.rows = clamp(intFrom(inputs.rows, state.rows), 1, Math.max(1, maxRows));

  const total = getAllFrames().length || 1;
  state.startFrame = clamp(intFrom(inputs.startFrame, state.startFrame), 0, Math.max(0, total - 1));
  state.frameCount = clamp(intFrom(inputs.frameCount, state.frameCount), 1, Math.max(1, total - state.startFrame));
  state.fps = clamp(intFrom(inputs.fps, state.fps), 1, 60);
  state.scale = clamp(intFrom(inputs.scale, state.scale), 1, 12);
  state.detectSensitivity = clamp(intFrom(inputs.detectSensitivity, state.detectSensitivity), 8, 120);
  state.detectPadding = clamp(intFrom(inputs.detectPadding, state.detectPadding), 0, 64);
  state.detectMinArea = clamp(intFrom(inputs.detectMinArea, state.detectMinArea), 4, maxImageWidth * maxImageHeight);
  state.removeBackground = inputs.removeBackground.checked;
  state.matteThreshold = clamp(intFrom(inputs.matteThreshold, state.matteThreshold), 8, 180);
  state.matteFeather = clamp(intFrom(inputs.matteFeather, state.matteFeather), 0, 3);
  state.showGrid = inputs.showGrid.checked;
  state.showIndex = inputs.showIndex.checked;
  state.reverse = inputs.reverse.checked;
  state.pingpong = inputs.pingpong.checked;
  state.playhead = clamp(state.playhead, 0, Math.max(0, getPlaybackFrames().length - 1));
}

function syncControls() {
  inputs.frameWidth.value = state.frameWidth;
  inputs.frameHeight.value = state.frameHeight;
  inputs.marginX.value = state.marginX;
  inputs.marginY.value = state.marginY;
  inputs.gapX.value = state.gapX;
  inputs.gapY.value = state.gapY;
  inputs.columns.value = state.columns;
  inputs.rows.value = state.rows;
  inputs.startFrame.value = state.startFrame;
  inputs.frameCount.value = state.frameCount;
  inputs.fps.value = state.fps;
  inputs.scale.value = state.scale;
  inputs.detectSensitivity.value = state.detectSensitivity;
  inputs.detectPadding.value = state.detectPadding;
  inputs.detectMinArea.value = state.detectMinArea;
  inputs.removeBackground.checked = state.removeBackground;
  inputs.matteThreshold.value = state.matteThreshold;
  inputs.matteFeather.value = state.matteFeather;
  inputs.showGrid.checked = state.showGrid;
  inputs.showIndex.checked = state.showIndex;
  inputs.reverse.checked = state.reverse;
  inputs.pingpong.checked = state.pingpong;
  els.gridModeBtn.classList.toggle("is-active", state.sliceMode === "grid");
  els.freeModeBtn.classList.toggle("is-active", state.sliceMode === "free");
  els.sliceModeStatus.textContent = state.sliceMode === "grid" ? "网格" : "自由框";
  els.sheetCanvas.classList.toggle("is-free-mode", state.sliceMode === "free");
  els.sheetCanvas.classList.toggle("is-sampling", state.sampleMatte);
  els.gridSliceControls.classList.toggle("is-hidden", state.sliceMode !== "grid");
  els.freeSliceControls.classList.toggle("is-hidden", state.sliceMode !== "free");
  document.querySelectorAll("#gridControls input").forEach((input) => {
    input.disabled = state.sliceMode !== "grid";
  });
  $("#gridControls").classList.toggle("grid-disabled", state.sliceMode !== "grid");
  const selectedFrame = currentFrame();
  const canEditFreeFrame = Boolean(state.image && state.sliceMode === "free" && selectedFrame);
  els.splitVerticalBtn.disabled = !canEditFreeFrame || selectedFrame.width < 8;
  els.splitHorizontalBtn.disabled = !canEditFreeFrame || selectedFrame.height < 8;
  els.deleteFrameBtn.disabled = !canEditFreeFrame;
  els.clearFramesBtn.disabled = !state.image || state.sliceMode !== "free" || getAllFrames().length === 0;
  els.matteStatus.textContent = state.removeBackground ? "开启" : "关闭";
  els.sampleMatteBtn.textContent = state.sampleMatte ? "点击背景" : "取背景点";
  els.fpsValue.textContent = state.fps;
  els.scaleValue.textContent = `${state.scale}x`;
  els.sensitivityValue.textContent = state.detectSensitivity;
  els.matteThresholdValue.textContent = state.matteThreshold;
  els.matteFeatherValue.textContent = state.matteFeather;
}

function getMaxColumns() {
  if (!state.image) return 1;
  const usable = state.image.width - state.marginX;
  if (usable < state.frameWidth) return 1;
  return Math.floor((usable + state.gapX) / (state.frameWidth + state.gapX));
}

function getMaxRows() {
  if (!state.image) return 1;
  const usable = state.image.height - state.marginY;
  if (usable < state.frameHeight) return 1;
  return Math.floor((usable + state.gapY) / (state.frameHeight + state.gapY));
}

function getGridFrames() {
  if (!state.image) return [];
  const frames = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.columns; col += 1) {
      const x = state.marginX + col * (state.frameWidth + state.gapX);
      const y = state.marginY + row * (state.frameHeight + state.gapY);
      if (x + state.frameWidth <= state.image.width && y + state.frameHeight <= state.image.height) {
        frames.push({
          index: frames.length,
          col,
          row,
          x,
          y,
          width: state.frameWidth,
          height: state.frameHeight,
        });
      }
    }
  }
  return frames;
}

function getFreeFrames() {
  if (!state.image) return [];
  return state.freeFrames
    .filter((frame) => frame.width > 0 && frame.height > 0)
    .map((frame, index) => ({
      index,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    }));
}

function getAllFrames() {
  return state.sliceMode === "free" ? getFreeFrames() : getGridFrames();
}

function getActiveFrames() {
  return getAllFrames().slice(state.startFrame, state.startFrame + state.frameCount);
}

function getPlaybackFrames() {
  let frames = getActiveFrames();
  if (state.reverse) frames = frames.slice().reverse();
  if (state.pingpong && frames.length > 2) {
    frames = frames.concat(frames.slice(1, -1).reverse());
  }
  return frames;
}

function currentFrame() {
  const frames = getPlaybackFrames();
  if (!frames.length) return null;
  return frames[state.playhead % frames.length];
}

function getCellSize(frames = getPlaybackFrames()) {
  if (state.sliceMode === "grid") {
    return { width: state.frameWidth, height: state.frameHeight };
  }

  return frames.reduce(
    (size, frame) => ({
      width: Math.max(size.width, frame.width),
      height: Math.max(size.height, frame.height),
    }),
    { width: 1, height: 1 },
  );
}

function normalizeRect(start, end) {
  const minX = Math.max(0, Math.min(start.x, end.x));
  const minY = Math.max(0, Math.min(start.y, end.y));
  const maxX = Math.min(state.image.width, Math.max(start.x, end.x));
  const maxY = Math.min(state.image.height, Math.max(start.y, end.y));
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(0, Math.ceil(maxX - minX)),
    height: Math.max(0, Math.ceil(maxY - minY)),
  };
}

function createCheckerPattern(ctx, size, a = "#d8ded2", b = "#eef2ec") {
  const patternCanvas = document.createElement("canvas");
  const patternCtx = patternCanvas.getContext("2d");
  patternCanvas.width = size * 2;
  patternCanvas.height = size * 2;
  patternCtx.fillStyle = b;
  patternCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
  patternCtx.fillStyle = a;
  patternCtx.fillRect(0, 0, size, size);
  patternCtx.fillRect(size, size, size, size);
  return ctx.createPattern(patternCanvas, "repeat");
}

function drawEmptyCanvas() {
  const canvas = els.sheetCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = 960;
  canvas.height = 540;
  ctx.fillStyle = createCheckerPattern(ctx, 18);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#171916";
  ctx.font = "700 28px Avenir Next, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("拖入精灵图开始切片", canvas.width / 2, canvas.height / 2 - 8);
  ctx.fillStyle = "#5f665d";
  ctx.font = "16px ui-monospace, monospace";
  ctx.fillText("frame grid / animation preview / export", canvas.width / 2, canvas.height / 2 + 26);
}

function drawSheet() {
  const canvas = els.sheetCanvas;
  const ctx = canvas.getContext("2d");

  if (!state.image) {
    drawEmptyCanvas();
    return;
  }

  canvas.width = state.image.width;
  canvas.height = state.image.height;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = createCheckerPattern(ctx, 12);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0);

  const allFrames = getAllFrames();
  const active = getActiveFrames();
  const activeIndexes = new Set(active.map((frame) => frame.index));
  const selected = currentFrame();

  if (state.showGrid) {
    const lineWidth = Math.max(1, Math.round(Math.min(state.frameWidth, state.frameHeight) / 96));
    ctx.lineWidth = lineWidth;
    allFrames.forEach((frame) => {
      ctx.strokeStyle = activeIndexes.has(frame.index)
        ? "rgba(11, 157, 143, 0.78)"
        : "rgba(23, 25, 22, 0.28)";
      ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);

      if (state.showIndex && allFrames.length <= 300 && frame.width >= 18 && frame.height >= 18) {
        ctx.fillStyle = activeIndexes.has(frame.index) ? "rgba(11, 157, 143, 0.92)" : "rgba(23, 25, 22, 0.5)";
        ctx.font = `${Math.max(10, Math.min(18, Math.floor(frame.height * 0.18)))}px ui-monospace, monospace`;
        ctx.fillText(frame.index, frame.x + 5, frame.y + 14);
      }
    });
  }

  if (selected) {
    ctx.save();
    ctx.fillStyle = "rgba(230, 84, 63, 0.16)";
    ctx.strokeStyle = "#e6543f";
    ctx.lineWidth = Math.max(2, Math.round(Math.min(selected.width, selected.height) / 48));
    ctx.fillRect(selected.x, selected.y, selected.width, selected.height);
    ctx.strokeRect(selected.x + 0.5, selected.y + 0.5, selected.width - 1, selected.height - 1);
    ctx.restore();
  }

  if (state.sliceMode === "free" && state.dragStart && state.dragCurrent) {
    const rect = normalizeRect(state.dragStart, state.dragCurrent);
    if (rect.width > 0 && rect.height > 0) {
      ctx.save();
      ctx.setLineDash([8, 5]);
      ctx.fillStyle = "rgba(198, 147, 24, 0.14)";
      ctx.strokeStyle = "#c69318";
      ctx.lineWidth = 2;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
      ctx.restore();
    }
  }
}

function drawPreview() {
  const canvas = els.previewCanvas;
  const ctx = canvas.getContext("2d");
  const frame = currentFrame();

  if (!state.image || !frame) {
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = createCheckerPattern(ctx, 16, "#e2e8dc", "#fffef7");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#5f665d";
    ctx.font = "15px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("no frame", canvas.width / 2, canvas.height / 2);
    return;
  }

  const cell = getCellSize();
  const drawWidth = state.sliceMode === "free" ? cell.width : frame.width;
  const drawHeight = state.sliceMode === "free" ? cell.height : frame.height;
  const dx = state.sliceMode === "free" ? Math.floor((cell.width - frame.width) / 2) * state.scale : 0;
  const dy = state.sliceMode === "free" ? (cell.height - frame.height) * state.scale : 0;

  canvas.width = drawWidth * state.scale;
  canvas.height = drawHeight * state.scale;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    state.image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    dx,
    dy,
    frame.width * state.scale,
    frame.height * state.scale,
  );
  applyBackgroundMatte(canvas);
}

function updateTextStatus() {
  const allFrames = getAllFrames();
  const playback = getPlaybackFrames();
  const frame = currentFrame();
  const activePosition = playback.length ? state.playhead + 1 : 0;

  els.frameBadge.textContent = `${activePosition} / ${playback.length}`;
  const modeLabel = state.sliceMode === "grid" ? "网格" : "自由框";
  els.sheetStatus.textContent = state.image ? `${modeLabel} ${allFrames.length} 帧` : "等待图片";
  els.playBtn.textContent = state.playing ? "暂停" : "播放";
  els.currentInfo.textContent = frame
    ? `当前帧：#${frame.index}  x:${frame.x} y:${frame.y}  ${frame.width}x${frame.height}`
    : "当前帧：-";
}

function buildCssSnippet() {
  const frames = getPlaybackFrames();
  if (!state.image || !frames.length) {
    return "/* 导入精灵图后生成 CSS */";
  }

  const duration = Math.max(0.01, frames.length / state.fps).toFixed(3);
  const cell = getCellSize(frames);

  if (state.sliceMode === "free" || state.removeBackground) {
    const stripName = `${state.imageName}_strip_${frames.length}f.png`;
    return `.sprite-animation {
  width: ${cell.width}px;
  height: ${cell.height}px;
  background-image: url("${cssUrl(stripName)}");
  background-repeat: no-repeat;
  image-rendering: pixelated;
  animation: ${state.imageName}-play ${duration}s steps(${frames.length}) infinite;
}

@keyframes ${state.imageName}-play {
  from { background-position: 0 0; }
  to { background-position: -${cell.width * frames.length}px 0; }
}`;
  }

  const frameWidth = state.frameWidth;
  const frameHeight = state.frameHeight;
  const keyframes = frames
    .map((frame, index) => {
      const percent = frames.length === 1 ? 0 : (index / (frames.length - 1)) * 100;
      return `  ${percent.toFixed(3)}% { background-position: -${frame.x}px -${frame.y}px; }`;
    })
    .join("\n");

  return `.sprite-animation {
  width: ${frameWidth}px;
  height: ${frameHeight}px;
  background-image: url("${cssUrl(state.sourceFileName)}");
  background-repeat: no-repeat;
  image-rendering: pixelated;
  animation: ${state.imageName}-play ${duration}s steps(1, end) infinite;
}

@keyframes ${state.imageName}-play {
${keyframes}
}`;
}

function updateOutput() {
  els.cssOutput.value = buildCssSnippet();
}

function render() {
  setImageRequiredState();
  syncControls();
  drawSheet();
  drawPreview();
  updateTextStatus();
  updateOutput();
}

function guessGrid(width, height) {
  if (height > 0 && width % height === 0) {
    const cols = width / height;
    if (cols > 1 && cols <= 64) {
      return { frameWidth: height, frameHeight: height, columns: cols, rows: 1 };
    }
  }

  if (width > 0 && height % width === 0) {
    const rows = height / width;
    if (rows > 1 && rows <= 64) {
      return { frameWidth: width, frameHeight: width, columns: 1, rows };
    }
  }

  let best = { frameWidth: width, frameHeight: height, columns: 1, rows: 1, score: -Infinity };
  for (let cols = 1; cols <= 12; cols += 1) {
    for (let rows = 1; rows <= 12; rows += 1) {
      if (cols * rows < 2 || width % cols !== 0 || height % rows !== 0) continue;
      const frameWidth = width / cols;
      const frameHeight = height / rows;
      const aspect = frameWidth / frameHeight;
      if (aspect < 0.45 || aspect > 2.2) continue;

      const count = cols * rows;
      const countScore = -Math.abs(Math.log2(count / 16)) * 5;
      const sizeScore = -Math.abs(Math.log2(Math.max(frameWidth, frameHeight) / 96)) * 2;
      const aspectScore = -Math.abs(Math.log2(aspect)) * 4;
      const squareBonus = cols === rows ? 1.2 : 0;
      const score = countScore + sizeScore + aspectScore + squareBonus;

      if (score > best.score) {
        best = { frameWidth, frameHeight, columns: cols, rows, score };
      }
    }
  }

  return best;
}

function getImageData() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = state.image.width;
  canvas.height = state.image.height;
  ctx.drawImage(state.image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function sampleBackground(data, width, height) {
  const radius = Math.max(1, Math.min(10, Math.floor(Math.min(width, height) / 16)));
  const corners = [
    [0, 0],
    [width - radius, 0],
    [0, height - radius],
    [width - radius, height - radius],
  ];
  const sum = { r: 0, g: 0, b: 0, a: 0, count: 0 };

  corners.forEach(([startX, startY]) => {
    for (let y = startY; y < Math.min(height, startY + radius); y += 1) {
      for (let x = startX; x < Math.min(width, startX + radius); x += 1) {
        const offset = (y * width + x) * 4;
        sum.r += data[offset];
        sum.g += data[offset + 1];
        sum.b += data[offset + 2];
        sum.a += data[offset + 3];
        sum.count += 1;
      }
    }
  });

  return {
    r: sum.r / sum.count,
    g: sum.g / sum.count,
    b: sum.b / sum.count,
    a: sum.a / sum.count,
  };
}

function colorDistanceSq(data, offset, color) {
  const dr = data[offset] - color.r;
  const dg = data[offset + 1] - color.g;
  const db = data[offset + 2] - color.b;
  const da = data[offset + 3] - color.a;
  return dr * dr + dg * dg + db * db + da * da * 0.25;
}

function getMatteColor() {
  if (state.matteSample) return state.matteSample;
  if (state.autoMatteColor) return state.autoMatteColor;
  const imageData = getImageData();
  state.autoMatteColor = sampleBackground(imageData.data, imageData.width, imageData.height);
  return state.autoMatteColor;
}

function shouldRemovePixel(data, offset, backgroundColor, thresholdSq) {
  if (data[offset + 3] <= 24) return true;
  return colorDistanceSq(data, offset, backgroundColor) <= thresholdSq;
}

function featherMatteEdge(data, mask, width, height) {
  const radius = state.matteFeather;
  if (radius <= 0) return;

  const nextAlpha = new Uint8ClampedArray(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    nextAlpha[pixel] = data[pixel * 4 + 3];
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (mask[pixel]) continue;

      let touchesBackground = false;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
          if (mask[yy * width + xx]) {
            touchesBackground = true;
            break;
          }
        }
        if (touchesBackground) break;
      }

      if (touchesBackground) {
        nextAlpha[pixel] = Math.round(nextAlpha[pixel] * (1 - radius * 0.14));
      }
    }
  }

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    data[pixel * 4 + 3] = nextAlpha[pixel];
  }
}

function applyBackgroundMatte(canvas, force = false) {
  if (!force && !state.removeBackground) return canvas;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const total = width * height;
  const mask = new Uint8Array(total);
  const queue = new Int32Array(total);
  const backgroundColor = getMatteColor();
  const thresholdSq = state.matteThreshold * state.matteThreshold;
  let head = 0;
  let tail = 0;

  const enqueue = (pixel) => {
    if (pixel < 0 || pixel >= total || mask[pixel]) return;
    const offset = pixel * 4;
    if (!shouldRemovePixel(data, offset, backgroundColor, thresholdSq)) return;
    mask[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const current = queue[head];
    head += 1;
    const x = current % width;
    const y = Math.floor(current / width);

    if (x > 0) enqueue(current - 1);
    if (x < width - 1) enqueue(current + 1);
    if (y > 0) enqueue(current - width);
    if (y < height - 1) enqueue(current + width);
  }

  featherMatteEdge(data, mask, width, height);

  for (let pixel = 0; pixel < total; pixel += 1) {
    if (mask[pixel]) {
      data[pixel * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function sampleMatteColor(point) {
  const imageData = getImageData();
  const x = clamp(point.x, 0, imageData.width - 1);
  const y = clamp(point.y, 0, imageData.height - 1);
  const offset = (y * imageData.width + x) * 4;
  state.matteSample = {
    r: imageData.data[offset],
    g: imageData.data[offset + 1],
    b: imageData.data[offset + 2],
    a: imageData.data[offset + 3],
  };
  state.sampleMatte = false;
  state.ignoreNextClick = true;
  render();
  toast(`背景色：rgb(${state.matteSample.r}, ${state.matteSample.g}, ${state.matteSample.b})`);
}

function hasTransparentPixels(data) {
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 245) return true;
  }
  return false;
}

function createForegroundMask(imageData) {
  const { data, width, height } = imageData;
  const total = width * height;
  const mask = new Uint8Array(total);
  const bg = sampleBackground(data, width, height);
  const usesAlpha = hasTransparentPixels(data);
  const thresholdSq = state.detectSensitivity * state.detectSensitivity;

  for (let pixel = 0; pixel < total; pixel += 1) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    if (alpha <= 24) continue;

    if (usesAlpha && bg.a < 245) {
      mask[pixel] = 1;
      continue;
    }

    const dr = data[offset] - bg.r;
    const dg = data[offset + 1] - bg.g;
    const db = data[offset + 2] - bg.b;
    const da = alpha - bg.a;
    if (dr * dr + dg * dg + db * db + da * da > thresholdSq) {
      mask[pixel] = 1;
    }
  }

  return mask;
}

function findComponentBoxes(imageData) {
  const { width, height } = imageData;
  const mask = createForegroundMask(imageData);
  const queue = new Int32Array(width * height);
  const boxes = [];

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel]) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    queue[tail] = pixel;
    tail += 1;
    mask[pixel] = 0;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      area += 1;

      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const left = current - 1;
      const right = current + 1;
      const up = current - width;
      const down = current + width;

      if (x > 0 && mask[left]) {
        queue[tail] = left;
        tail += 1;
        mask[left] = 0;
      }
      if (x < width - 1 && mask[right]) {
        queue[tail] = right;
        tail += 1;
        mask[right] = 0;
      }
      if (y > 0 && mask[up]) {
        queue[tail] = up;
        tail += 1;
        mask[up] = 0;
      }
      if (y < height - 1 && mask[down]) {
        queue[tail] = down;
        tail += 1;
        mask[down] = 0;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    if (area >= state.detectMinArea && boxWidth >= 4 && boxHeight >= 4) {
      boxes.push({ x: minX, y: minY, width: boxWidth, height: boxHeight, area });
    }
  }

  return boxes;
}

function expandBox(box, padding) {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(state.image.width, box.x + box.width + padding);
  const bottom = Math.min(state.image.height, box.y + box.height + padding);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    area: box.area,
  };
}

function boxesTouch(a, b, gap) {
  return (
    a.x <= b.x + b.width + gap &&
    a.x + a.width + gap >= b.x &&
    a.y <= b.y + b.height + gap &&
    a.y + a.height + gap >= b.y
  );
}

function mergeBoxes(boxes) {
  const gap = Math.max(3, state.detectPadding * 2);
  const merged = boxes.slice();
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!boxesTouch(merged[i], merged[j], gap)) continue;

        const right = Math.max(merged[i].x + merged[i].width, merged[j].x + merged[j].width);
        const bottom = Math.max(merged[i].y + merged[i].height, merged[j].y + merged[j].height);
        merged[i] = {
          x: Math.min(merged[i].x, merged[j].x),
          y: Math.min(merged[i].y, merged[j].y),
          width: right - Math.min(merged[i].x, merged[j].x),
          height: bottom - Math.min(merged[i].y, merged[j].y),
          area: merged[i].area + merged[j].area,
        };
        merged.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return merged;
}

function sortFrames(frames) {
  return frames.sort((a, b) => {
    const rowTolerance = Math.max(a.height, b.height) * 0.45;
    if (Math.abs(a.y - b.y) > rowTolerance) return a.y - b.y;
    return a.x - b.x;
  });
}

function detectFreeFrames() {
  const imageData = getImageData();
  const boxes = findComponentBoxes(imageData)
    .map((box) => expandBox(box, state.detectPadding))
    .filter((box) => box.width >= 4 && box.height >= 4);
  return sortFrames(mergeBoxes(boxes)).map(({ x, y, width, height }) => ({
    x,
    y,
    width,
    height,
  }));
}

function setSliceMode(mode) {
  state.sliceMode = mode;
  state.playhead = 0;
  resetRange();
}

function applyDetectedFrames() {
  if (!state.image) return;
  readControls();
  const frames = detectFreeFrames();
  state.sliceMode = "free";
  state.freeFrames = frames;
  state.startFrame = 0;
  state.frameCount = Math.max(1, frames.length);
  state.playhead = 0;
  render();
  toast(frames.length ? `识别到 ${frames.length} 帧` : "没有识别到独立帧");
}

function applyGridGuess() {
  if (!state.image) return;
  const guess = guessGrid(state.image.width, state.image.height);
  state.sliceMode = "grid";
  state.frameWidth = Math.max(1, guess.frameWidth);
  state.frameHeight = Math.max(1, guess.frameHeight);
  state.marginX = 0;
  state.marginY = 0;
  state.gapX = 0;
  state.gapY = 0;
  state.columns = Math.max(1, guess.columns);
  state.rows = Math.max(1, guess.rows);
  state.startFrame = 0;
  state.frameCount = Math.max(1, state.columns * state.rows);
  state.playhead = 0;
  render();
}

function resetRange() {
  const allFrames = getAllFrames();
  state.startFrame = 0;
  state.frameCount = Math.max(1, allFrames.length);
  state.playhead = 0;
  render();
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("请选择图片文件");
    return;
  }

  const image = new Image();
  const url = URL.createObjectURL(file);

  image.onload = () => {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.image = image;
    state.imageUrl = url;
    state.imageName = cleanName(file.name);
    state.sourceFileName = file.name;
    state.freeFrames = [];
    state.matteSample = null;
    state.autoMatteColor = null;
    state.sampleMatte = false;
    state.playing = false;
    state.lastTick = 0;
    els.fileLabel.textContent = file.name;
    els.imageMeta.textContent = `${image.width} x ${image.height}px`;
    applyGridGuess();
    toast("图片已导入");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    toast("图片读取失败");
  };

  image.src = url;
}

function drawFrameToCanvas(frame, scale = 1) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = frame.width * scale;
  canvas.height = frame.height * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    state.image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return applyBackgroundMatte(canvas);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function downloadCanvas(canvas, fileName) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, fileName);
  }, "image/png");
}

function exportCurrentFrame() {
  const frame = currentFrame();
  if (!state.image || !frame) return;
  downloadCanvas(drawFrameToCanvas(frame), `${state.imageName}_frame_${String(frame.index).padStart(3, "0")}.png`);
}

function exportFrames() {
  const frames = getPlaybackFrames();
  if (!state.image || !frames.length) return;
  frames.forEach((frame, index) => {
    const canvas = drawFrameToCanvas(frame);
    window.setTimeout(() => {
      downloadCanvas(canvas, `${state.imageName}_${String(index + 1).padStart(3, "0")}.png`);
    }, index * 80);
  });
  toast(`正在导出 ${frames.length} 帧`);
}

function exportStrip() {
  const frames = getPlaybackFrames();
  if (!state.image || !frames.length) return;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const cell = getCellSize(frames);
  canvas.width = cell.width * frames.length;
  canvas.height = cell.height;
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, index) => {
    const frameCanvas = drawFrameToCanvas(frame);
    const dx = state.sliceMode === "free" ? index * cell.width + Math.floor((cell.width - frame.width) / 2) : index * cell.width;
    const dy = state.sliceMode === "free" ? cell.height - frame.height : 0;
    ctx.drawImage(
      frameCanvas,
      dx,
      dy,
      frame.width,
      frame.height,
    );
  });
  downloadCanvas(canvas, `${state.imageName}_strip_${frames.length}f.png`);
}

function writeAscii(bytes, text) {
  for (let index = 0; index < text.length; index += 1) {
    bytes.push(text.charCodeAt(index));
  }
}

function writeShort(bytes, value) {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function createGifPalette() {
  const palette = [0, 0, 0];
  for (let r = 0; r < 6; r += 1) {
    for (let g = 0; g < 6; g += 1) {
      for (let b = 0; b < 7; b += 1) {
        palette.push(
          Math.round((r / 5) * 255),
          Math.round((g / 5) * 255),
          Math.round((b / 6) * 255),
        );
      }
    }
  }
  while (palette.length < 256 * 3) {
    palette.push(0, 0, 0);
  }
  return palette;
}

function colorToGifIndex(r, g, b, alpha) {
  if (alpha < 128) return 0;
  const rr = Math.round((r / 255) * 5);
  const gg = Math.round((g / 255) * 5);
  const bb = Math.round((b / 255) * 6);
  return 1 + rr * 42 + gg * 7 + bb;
}

function canvasToGifIndexes(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const indexes = new Uint8Array(canvas.width * canvas.height);

  for (let pixel = 0; pixel < indexes.length; pixel += 1) {
    const offset = pixel * 4;
    indexes[pixel] = colorToGifIndex(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
      imageData.data[offset + 3],
    );
  }

  return indexes;
}

function packGifCodes(codes, minCodeSize) {
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  codes.forEach(({ code, size }) => {
    bitBuffer |= code << bitCount;
    bitCount += size;

    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  });

  if (bitCount > 0) {
    bytes.push(bitBuffer & 0xff);
  }

  return bytes;
}

function lzwEncode(indexes, minCodeSize = 8) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const codeSize = minCodeSize + 1;
  const maxLiteralRun = 240;
  const codes = [];
  let runLength = 0;

  codes.push({ code: clearCode, size: codeSize });
  indexes.forEach((index) => {
    if (runLength >= maxLiteralRun) {
      codes.push({ code: clearCode, size: codeSize });
      runLength = 0;
    }

    codes.push({ code: index, size: codeSize });
    runLength += 1;
  });
  codes.push({ code: endCode, size: codeSize });

  return packGifCodes(codes, minCodeSize);
}

function writeGifSubBlocks(bytes, data) {
  for (let index = 0; index < data.length; index += 255) {
    const block = data.slice(index, index + 255);
    bytes.push(block.length, ...block);
  }
  bytes.push(0);
}

function createFrameCanvas(frame, cell) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const frameCanvas = drawFrameToCanvas(frame);
  const dx = state.sliceMode === "free" ? Math.floor((cell.width - frame.width) / 2) : 0;
  const dy = state.sliceMode === "free" ? cell.height - frame.height : 0;

  canvas.width = cell.width;
  canvas.height = cell.height;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frameCanvas, dx, dy, frame.width, frame.height);
  return canvas;
}

function encodeGif(frames, cell, delayCs) {
  const bytes = [];
  const palette = createGifPalette();

  writeAscii(bytes, "GIF89a");
  writeShort(bytes, cell.width);
  writeShort(bytes, cell.height);
  bytes.push(0xf7, 0, 0);
  bytes.push(...palette);

  bytes.push(0x21, 0xff, 0x0b);
  writeAscii(bytes, "NETSCAPE2.0");
  bytes.push(0x03, 0x01);
  writeShort(bytes, 0);
  bytes.push(0);

  frames.forEach((frame) => {
    const frameCanvas = createFrameCanvas(frame, cell);
    const indexes = canvasToGifIndexes(frameCanvas);
    const lzwBytes = lzwEncode(indexes, 8);

    bytes.push(0x21, 0xf9, 0x04, 0x09);
    writeShort(bytes, delayCs);
    bytes.push(0, 0);

    bytes.push(0x2c);
    writeShort(bytes, 0);
    writeShort(bytes, 0);
    writeShort(bytes, cell.width);
    writeShort(bytes, cell.height);
    bytes.push(0);
    bytes.push(8);
    writeGifSubBlocks(bytes, lzwBytes);
  });

  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

function exportGif() {
  const frames = getPlaybackFrames();
  if (!state.image || !frames.length) return;

  const cell = getCellSize(frames);
  const delayCs = clamp(Math.round(100 / state.fps), 2, 100);
  const blob = encodeGif(frames, cell, delayCs);
  downloadBlob(blob, `${state.imageName}_${frames.length}f_${state.fps}fps.gif`);
  toast(`已导出 ${frames.length} 帧 GIF`);
}

function downloadCutoutImage() {
  if (!state.image) return;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = state.image.width;
  canvas.height = state.image.height;
  ctx.drawImage(state.image, 0, 0);
  applyBackgroundMatte(canvas, true);
  downloadCanvas(canvas, `${state.imageName}_cutout.png`);
}

function downloadJson() {
  const frames = getActiveFrames().map((frame) => ({
    index: frame.index,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    durationMs: Math.round(1000 / state.fps),
  }));
  const payload = {
    image: state.sourceFileName,
    mode: state.sliceMode,
    frameWidth: state.frameWidth,
    frameHeight: state.frameHeight,
    cell: getCellSize(),
    removeBackground: state.removeBackground,
    matteThreshold: state.matteThreshold,
    matteFeather: state.matteFeather,
    fps: state.fps,
    reverse: state.reverse,
    pingpong: state.pingpong,
    frames,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${state.imageName}_animation.json`);
}

async function copyCss() {
  const css = els.cssOutput.value;
  try {
    await navigator.clipboard.writeText(css);
  } catch {
    els.cssOutput.focus();
    els.cssOutput.select();
    document.execCommand("copy");
  }
  toast("CSS 已复制");
}

function stepPlayhead(delta) {
  const frames = getPlaybackFrames();
  if (!frames.length) return;
  state.playhead = (state.playhead + delta + frames.length) % frames.length;
  state.lastTick = 0;
  render();
}

function pointerToCanvas(event) {
  const rect = els.sheetCanvas.getBoundingClientRect();
  return {
    x: clamp(Math.floor(((event.clientX - rect.left) / rect.width) * els.sheetCanvas.width), 0, els.sheetCanvas.width),
    y: clamp(Math.floor(((event.clientY - rect.top) / rect.height) * els.sheetCanvas.height), 0, els.sheetCanvas.height),
  };
}

function findFrameAt(point) {
  return getAllFrames().find(
    (frame) =>
      point.x >= frame.x &&
      point.x < frame.x + frame.width &&
      point.y >= frame.y &&
      point.y < frame.y + frame.height,
  );
}

function selectFrame(frame) {
  if (!frame) return;
  const playback = getPlaybackFrames();
  const playbackIndex = playback.findIndex((item) => item.index === frame.index);
  if (playbackIndex >= 0) {
    state.playhead = playbackIndex;
  } else {
    state.startFrame = frame.index;
    state.frameCount = Math.max(1, getAllFrames().length - frame.index);
    state.playhead = 0;
  }
  state.lastTick = 0;
  render();
}

function addFreeFrame(rect) {
  if (rect.width < 4 || rect.height < 4) return;
  state.sliceMode = "free";
  state.freeFrames.push(rect);
  state.freeFrames = sortFrames(state.freeFrames);
  const frameIndex = state.freeFrames.findIndex(
    (frame) => frame.x === rect.x && frame.y === rect.y && frame.width === rect.width && frame.height === rect.height,
  );
  state.startFrame = 0;
  state.frameCount = state.freeFrames.length;
  state.playhead = Math.max(0, frameIndex);
  state.lastTick = 0;
  render();
}

function replaceFreeFrame(frameIndex, frames, selectFrameIndex = 0) {
  state.freeFrames.splice(frameIndex, 1, ...frames);
  state.freeFrames = sortFrames(state.freeFrames);
  const selected = frames[selectFrameIndex] || frames[0];
  const selectedIndex = state.freeFrames.findIndex(
    (frame) =>
      frame.x === selected.x &&
      frame.y === selected.y &&
      frame.width === selected.width &&
      frame.height === selected.height,
  );
  state.startFrame = 0;
  state.frameCount = Math.max(1, state.freeFrames.length);
  state.playhead = Math.max(0, selectedIndex);
  state.lastTick = 0;
  render();
}

function splitFrame(frame, axis, point = null) {
  if (state.sliceMode !== "free" || !frame) return;
  const frameIndex = frame.index;
  const minSize = 4;

  if (axis === "vertical") {
    if (frame.width < minSize * 2) return;
    const fallbackX = frame.x + frame.width / 2;
    const splitX = clamp(Math.round(point ? point.x : fallbackX), frame.x + minSize, frame.x + frame.width - minSize);
    const left = { x: frame.x, y: frame.y, width: splitX - frame.x, height: frame.height };
    const right = { x: splitX, y: frame.y, width: frame.x + frame.width - splitX, height: frame.height };
    replaceFreeFrame(frameIndex, [left, right]);
    toast("已纵向拆分");
    return;
  }

  if (frame.height < minSize * 2) return;
  const fallbackY = frame.y + frame.height / 2;
  const splitY = clamp(Math.round(point ? point.y : fallbackY), frame.y + minSize, frame.y + frame.height - minSize);
  const top = { x: frame.x, y: frame.y, width: frame.width, height: splitY - frame.y };
  const bottom = { x: frame.x, y: splitY, width: frame.width, height: frame.y + frame.height - splitY };
  replaceFreeFrame(frameIndex, [top, bottom]);
  toast("已横向拆分");
}

function splitCurrentFrame(axis) {
  splitFrame(currentFrame(), axis);
}

function deleteCurrentFrame() {
  if (state.sliceMode !== "free") return;
  const frame = currentFrame();
  if (!frame) return;
  state.freeFrames.splice(frame.index, 1);
  state.playhead = clamp(state.playhead, 0, Math.max(0, state.freeFrames.length - 1));
  resetRange();
}

function clearFreeFrames() {
  state.freeFrames = [];
  state.playhead = 0;
  resetRange();
}

function showInspectorTab(tabId) {
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  els.tabPanels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function bindEvents() {
  els.fileInput.addEventListener("change", (event) => {
    loadFile(event.target.files[0]);
    event.target.value = "";
  });

  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("is-dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    loadFile(event.dataTransfer.files[0]);
  });

  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", () => {
      readControls();
      render();
    });
  });

  els.gridModeBtn.addEventListener("click", () => setSliceMode("grid"));
  els.freeModeBtn.addEventListener("click", () => setSliceMode("free"));
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showInspectorTab(button.dataset.tabTarget));
  });
  els.detectSpritesBtn.addEventListener("click", applyDetectedFrames);
  els.splitVerticalBtn.addEventListener("click", () => splitCurrentFrame("vertical"));
  els.splitHorizontalBtn.addEventListener("click", () => splitCurrentFrame("horizontal"));
  els.deleteFrameBtn.addEventListener("click", deleteCurrentFrame);
  els.clearFramesBtn.addEventListener("click", clearFreeFrames);
  els.autoGridBtn.addEventListener("click", applyGridGuess);
  els.resetRangeBtn.addEventListener("click", resetRange);
  els.prevBtn.addEventListener("click", () => stepPlayhead(-1));
  els.nextBtn.addEventListener("click", () => stepPlayhead(1));
  els.playBtn.addEventListener("click", () => {
    state.playing = !state.playing;
    state.lastTick = 0;
    render();
  });

  els.exportStripBtn.addEventListener("click", exportStrip);
  els.exportGifBtn.addEventListener("click", exportGif);
  els.exportFramesBtn.addEventListener("click", exportFrames);
  els.downloadFrameBtn.addEventListener("click", exportCurrentFrame);
  els.downloadCutoutBtn.addEventListener("click", downloadCutoutImage);
  els.downloadJsonBtn.addEventListener("click", downloadJson);
  els.copyCssBtn.addEventListener("click", copyCss);
  els.sampleMatteBtn.addEventListener("click", () => {
    if (!state.image) return;
    state.sampleMatte = true;
    render();
    toast("点击画布里的背景位置");
  });

  els.sheetCanvas.addEventListener("mousemove", (event) => {
    if (!state.image) return;
    const point = pointerToCanvas(event);
    els.pointerInfo.textContent = `坐标：${point.x}, ${point.y}`;
    if (state.sliceMode === "free" && state.dragStart) {
      state.dragCurrent = point;
      state.didDrag =
        Math.abs(state.dragCurrent.x - state.dragStart.x) > 3 ||
        Math.abs(state.dragCurrent.y - state.dragStart.y) > 3;
      render();
    }
  });

  els.sheetCanvas.addEventListener("mouseleave", () => {
    els.pointerInfo.textContent = "坐标：-";
  });

  els.sheetCanvas.addEventListener("mousedown", (event) => {
    if (state.sampleMatte) {
      event.preventDefault();
      return;
    }
    if (!state.image || state.sliceMode !== "free") return;
    event.preventDefault();
    state.dragStart = pointerToCanvas(event);
    state.dragCurrent = state.dragStart;
    state.didDrag = false;
  });

  window.addEventListener("mouseup", (event) => {
    if (state.image && state.sampleMatte) {
      sampleMatteColor(pointerToCanvas(event));
      return;
    }

    if (!state.image || state.sliceMode !== "free" || !state.dragStart) return;
    state.dragCurrent = pointerToCanvas(event);
    const rect = normalizeRect(state.dragStart, state.dragCurrent);
    const wasDrag = state.didDrag;
    state.dragStart = null;
    state.dragCurrent = null;
    state.didDrag = false;

    if (wasDrag) {
      addFreeFrame(rect);
      return;
    }

    const hit = findFrameAt(rect);
    if (hit && event.altKey) {
      splitFrame(hit, event.shiftKey ? "horizontal" : "vertical", rect);
    } else if (hit) {
      selectFrame(hit);
    } else {
      render();
    }
  });

  els.sheetCanvas.addEventListener("click", (event) => {
    if (!state.image) return;
    if (state.ignoreNextClick) {
      state.ignoreNextClick = false;
      return;
    }
    if (state.sliceMode === "free") return;
    const point = pointerToCanvas(event);
    selectFrame(findFrameAt(point));
  });
}

function tick(time) {
  if (state.playing && state.image) {
    const interval = 1000 / state.fps;
    if (!state.lastTick) state.lastTick = time;
    const elapsed = time - state.lastTick;
    if (elapsed >= interval) {
      const frames = getPlaybackFrames();
      if (frames.length) {
        const steps = Math.floor(elapsed / interval);
        state.playhead = (state.playhead + steps) % frames.length;
        state.lastTick = time - (elapsed % interval);
        render();
      }
    }
  }
  window.requestAnimationFrame(tick);
}

bindEvents();
render();
window.requestAnimationFrame(tick);
