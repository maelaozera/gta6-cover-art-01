// Vice Coast Cover Studio — editor wiring.
// Owns the state, the undo history, photo uploads, panel editing on the
// preview canvas and the one-click PNG exports. Rendering lives in cover.js.
import {
  defaultState, drawCover, renderCover, layoutPanels, hitPanel,
  panelCount, GRADES, LAYOUTS, RANDOM_TITLES,
} from './cover.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const thumbsEl = document.getElementById('thumbs');

export const SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

let state = defaultState();
let photos = []; // HTMLImageElement list, in load order
let selectedPanel = -1;
let undoStack = [];
let redoStack = [];
let dragging = null; // {panel, lastX, lastY} while a panel photo is dragged

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncHistoryButtons();
}

function applySnapshot(json) {
  state = JSON.parse(json);
  syncControlsFromState();
  render();
}

function syncHistoryButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// Preview canvas follows the selected export aspect: square, portrait or wide.
let exportSize = { w: 1080, h: 1080 };
function sizePreview() {
  // In a shot scene the canvas is the whole frame: paint at window size.
  if (document.body.classList.contains('shot')) {
    canvas.width = Math.max(2, window.innerWidth);
    canvas.height = Math.max(2, window.innerHeight);
    return;
  }
  const longSide = 900;
  const ratio = exportSize.w / exportSize.h;
  if (ratio >= 1) {
    canvas.width = longSide;
    canvas.height = Math.round(longSide / ratio);
  } else {
    canvas.height = longSide;
    canvas.width = Math.round(longSide * ratio);
  }
}

function render() {
  sizePreview();
  drawCover(ctx, canvas.width, canvas.height, state, photos);
  // Highlight the selected panel with a cyan frame.
  if (selectedPanel >= 0 && selectedPanel < panelCount(state.layout)) {
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const r = rects[selectedPanel];
    ctx.save();
    ctx.strokeStyle = '#29e6d8';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

function renderSoon() {
  requestAnimationFrame(render);
}

// ---------- Photos ----------

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    photos.push(img);
    refreshThumbs();
    render();
    setStatus(`Loaded ${file.name} — photo ${photos.length}.`);
  } catch {
    setStatus(`Could not read ${file.name}. Try another image file.`);
  }
}

async function loadSample(name) {
  if (!SAMPLES[name]) return;
  try {
    const img = await loadImage(SAMPLES[name]);
    photos.push(img);
    refreshThumbs();
    render();
  } catch {
    setStatus(`Sample photo ${name} did not load.`);
  }
}

async function loadAllSamples() {
  for (const name of Object.keys(SAMPLES)) {
    if (!photos.some((p) => p.src && p.src.endsWith(SAMPLES[name]))) {
      await loadSample(name);
    }
  }
  setStatus('Sample photos loaded — pick a layout and export.');
}

function refreshThumbs() {
  thumbsEl.innerHTML = '';
  photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Photo ${i + 1}`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    const label = document.createElement('span');
    label.className = 'n';
    label.textContent = String(i + 1);
    btn.append(thumb, label);
    btn.addEventListener('click', () => {
      if (selectedPanel >= 0) {
        pushHistory();
        state.panels[selectedPanel].photo = i;
        syncPanelEditor();
        render();
      } else {
        setStatus('Click a panel on the preview first, then pick a photo for it.');
      }
    });
    thumbsEl.append(btn);
  });
  refreshPanelPhotoOptions();
}

// ---------- Controls ----------

function bindRange(id, valId, get, set, format) {
  const input = document.getElementById(id);
  const val = document.getElementById(valId);
  input.addEventListener('input', () => {
    pushHistory();
    set(Number(input.value));
    val.textContent = format(Number(input.value));
    renderSoon();
  });
  return { input, val };
}

const intensityCtl = bindRange('intensity', 'intensityVal',
  () => state.intensity, (v) => { state.intensity = v / 100; }, (v) => `${v}%`);
const grainCtl = bindRange('grain', 'grainVal',
  () => state.grain, (v) => { state.grain = v / 100; }, (v) => `${v}%`);
const vignetteCtl = bindRange('vignette', 'vignetteVal',
  () => state.vignette, (v) => { state.vignette = v / 100; }, (v) => `${v}%`);
const halftoneCtl = bindRange('halftone', 'halftoneVal',
  () => state.halftone, (v) => { state.halftone = v / 100; }, (v) => `${v}%`);

document.getElementById('ink').addEventListener('change', (e) => {
  pushHistory();
  state.ink = e.target.checked;
  render();
});

function bindText(id, get, set) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    set(input.value);
    renderSoon();
  });
  input.addEventListener('change', pushHistory);
  return input;
}

const titleInput = bindText('titleInput', () => state.title, (v) => { state.title = v; });
const subtitleInput = bindText('subtitleInput', () => state.subtitle, (v) => { state.subtitle = v; });
const badgeInput = bindText('badgeInput', () => state.badge, (v) => { state.badge = v; });

const starsInput = document.getElementById('stars');
const starsVal = document.getElementById('starsVal');
starsInput.addEventListener('input', () => {
  pushHistory();
  state.stars = Number(starsInput.value);
  starsVal.textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
  renderSoon();
});

document.querySelectorAll('#layoutGrid .layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.layout === btn.dataset.layout) return;
    pushHistory();
    state.layout = btn.dataset.layout;
    selectedPanel = -1;
    syncLayoutButtons();
    syncPanelEditor();
    render();
  });
});

document.querySelectorAll('#gradeRow .grade-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.grade === btn.dataset.grade) return;
    pushHistory();
    state.grade = btn.dataset.grade;
    syncGradeButtons();
    render();
  });
});

function syncLayoutButtons() {
  document.querySelectorAll('#layoutGrid .layout-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.layout === state.layout));
  });
}

function syncGradeButtons() {
  document.querySelectorAll('#gradeRow .grade-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.grade === state.grade));
  });
}

function syncControlsFromState() {
  intensityCtl.input.value = Math.round(state.intensity * 100);
  intensityCtl.val.textContent = `${Math.round(state.intensity * 100)}%`;
  grainCtl.input.value = Math.round(state.grain * 100);
  grainCtl.val.textContent = `${Math.round(state.grain * 100)}%`;
  vignetteCtl.input.value = Math.round(state.vignette * 100);
  vignetteCtl.val.textContent = `${Math.round(state.vignette * 100)}%`;
  halftoneCtl.input.value = Math.round(state.halftone * 100);
  halftoneCtl.val.textContent = `${Math.round(state.halftone * 100)}%`;
  document.getElementById('ink').checked = state.ink;
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  starsInput.value = state.stars;
  starsVal.textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
  syncLayoutButtons();
  syncGradeButtons();
  syncPanelEditor();
}

// ---------- Panel editor ----------

const panelEditor = document.getElementById('panelEditor');
const panelHint = document.getElementById('panelHint');
const panelName = document.getElementById('panelName');
const panelPhoto = document.getElementById('panelPhoto');
const panelZoom = document.getElementById('panelZoom');
const panelZoomVal = document.getElementById('panelZoomVal');

function refreshPanelPhotoOptions() {
  const current = selectedPanel >= 0 ? state.panels[selectedPanel].photo : 0;
  panelPhoto.innerHTML = '';
  photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1}`;
    panelPhoto.append(opt);
  });
  if (photos.length === 0) {
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = 'No photos yet';
    panelPhoto.append(opt);
  }
  panelPhoto.value = String(Math.min(current, Math.max(0, photos.length - 1)));
}

function syncPanelEditor() {
  const count = panelCount(state.layout);
  if (selectedPanel < 0 || selectedPanel >= count) {
    panelEditor.hidden = true;
    panelHint.hidden = false;
    return;
  }
  panelEditor.hidden = false;
  panelHint.hidden = true;
  const panel = state.panels[selectedPanel];
  panelName.textContent = `Panel ${selectedPanel + 1} of ${count}`;
  panelZoom.value = Math.round(panel.zoom * 100);
  panelZoomVal.textContent = `${panel.zoom.toFixed(2)}×`;
  refreshPanelPhotoOptions();
}

panelPhoto.addEventListener('change', () => {
  if (selectedPanel < 0) return;
  pushHistory();
  state.panels[selectedPanel].photo = Number(panelPhoto.value);
  render();
});

panelZoom.addEventListener('input', () => {
  if (selectedPanel < 0) return;
  state.panels[selectedPanel].zoom = Number(panelZoom.value) / 100;
  panelZoomVal.textContent = `${state.panels[selectedPanel].zoom.toFixed(2)}×`;
  renderSoon();
});
panelZoom.addEventListener('change', pushHistory);

// ---------- Preview interaction: pick a panel, drag its photo, wheel to zoom ----------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const p = canvasPoint(event);
  const hit = hitPanel(state.layout, canvas.width, canvas.height, p.x, p.y);
  if (hit >= 0) {
    selectedPanel = hit;
    dragging = { panel: hit, lastX: p.x, lastY: p.y, moved: false };
    canvas.setPointerCapture(event.pointerId);
    syncPanelEditor();
    render();
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const p = canvasPoint(event);
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[dragging.panel];
  const panel = state.panels[dragging.panel];
  const dx = (p.x - dragging.lastX) / rect.w;
  const dy = (p.y - dragging.lastY) / rect.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) dragging.moved = true;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox + dx));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy + dy));
  dragging.lastX = p.x;
  dragging.lastY = p.y;
  renderSoon();
});

canvas.addEventListener('pointerup', () => {
  if (dragging && dragging.moved) pushHistory();
  dragging = null;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const p = canvasPoint(event);
  const hit = hitPanel(state.layout, canvas.width, canvas.height, p.x, p.y);
  if (hit < 0) return;
  const panel = state.panels[hit];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.92)));
  selectedPanel = hit;
  syncPanelEditor();
  renderSoon();
}, { passive: false });

// ---------- Upload + drag-drop ----------

document.getElementById('photoInput').addEventListener('change', async (event) => {
  for (const file of event.target.files) {
    if (file.type.startsWith('image/')) await addPhotoFile(file);
  }
  event.target.value = '';
});

const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover'].forEach((name) => {
  dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add('over');
  });
});
['dragleave', 'drop'].forEach((name) => {
  dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove('over');
  });
});
dropzone.addEventListener('drop', async (event) => {
  for (const file of event.dataTransfer.files) {
    if (file.type.startsWith('image/')) await addPhotoFile(file);
  }
});
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    document.getElementById('photoInput').click();
  }
});

document.getElementById('sampleAll').addEventListener('click', loadAllSamples);
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));

// ---------- Undo / redo / randomize ----------

document.getElementById('undoBtn').addEventListener('click', () => {
  if (undoStack.length === 0) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncHistoryButtons();
});

document.getElementById('redoBtn').addEventListener('click', () => {
  if (redoStack.length === 0) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncHistoryButtons();
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    document.getElementById('undoBtn').click();
  }
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault();
    document.getElementById('redoBtn').click();
  }
});

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

document.getElementById('randomBtn').addEventListener('click', () => {
  pushHistory();
  state.layout = pick(LAYOUTS);
  state.grade = pick(GRADES);
  state.title = pick(RANDOM_TITLES);
  state.intensity = 0.55 + Math.random() * 0.4;
  state.grain = Math.random() * 0.6;
  state.vignette = 0.3 + Math.random() * 0.5;
  state.halftone = Math.random() < 0.4 ? Math.random() * 0.5 : 0;
  state.stars = 3 + Math.floor(Math.random() * 3);
  state.panels.forEach((panel) => {
    panel.photo = photos.length ? Math.floor(Math.random() * photos.length) : panel.photo;
    panel.zoom = 1 + Math.random() * 0.9;
    panel.ox = (Math.random() - 0.5) * 0.3;
    panel.oy = (Math.random() - 0.5) * 0.3;
  });
  selectedPanel = -1;
  syncControlsFromState();
  render();
  setStatus(`Randomized: ${state.layout}, ${state.grade} grade, “${state.title}”.`);
});

// ---------- Export ----------

function downloadCanvas(exportCanvas, width, height) {
  exportCanvas.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-coast-cover-${width}x${height}.png`);
  }, 'image/png');
}

document.querySelectorAll('#exportRow .export').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.export.split('x').map(Number);
    const out = renderCover(w, h, state, photos);
    downloadCanvas(out, w, h);
  });
});

// ---------- Boot ----------

export function getState() { return state; }
export function setState(next) { state = next; syncControlsFromState(); render(); }
export function getPhotos() { return photos; }
export function renderNow() { render(); }
export function setExportSize(w, h) { exportSize = { w, h }; render(); }

export const studio = {
  getState, setState, getPhotos, renderNow, setExportSize,
  loadSample, loadAllSamples, loadImage,
};

window.ViceCoast = studio;

if (document.fonts && document.fonts.ready) {
  Promise.all([
    document.fonts.load('16px Anton'),
    document.fonts.load('16px Pacifico'),
  ]).then(render).catch(() => render());
  document.fonts.ready.then(render);
}
syncControlsFromState();
render();
