// Vice Coast Cover Studio — cover render engine.
// Draws the whole cover onto any 2D canvas: multi-panel layouts, gradient-map
// colour grades, print effects and genre lettering. No network, no libraries.

export const LAYOUTS = ['grid9', 'hero3', 'panels4', 'fullbleed', 'tilted'];
export const GRADES = ['sunset', 'neon', 'vice', 'dusk', 'mono'];

// Gradient-map stops: [position 0..1, red, green, blue]. Luminance in, grade out.
export const GRADE_STOPS = {
  sunset: [[0, 32, 12, 64], [0.3, 122, 24, 96], [0.6, 255, 46, 136], [0.85, 255, 154, 60], [1, 255, 210, 60]],
  neon: [[0, 4, 4, 18], [0.3, 88, 0, 190], [0.6, 41, 230, 216], [0.85, 255, 46, 136], [1, 255, 255, 255]],
  vice: [[0, 6, 42, 46], [0.3, 0, 150, 130], [0.55, 255, 94, 138], [0.8, 255, 154, 60], [1, 255, 240, 200]],
  dusk: [[0, 11, 16, 53], [0.35, 75, 42, 133], [0.65, 198, 93, 123], [0.9, 242, 166, 90], [1, 255, 226, 160]],
  mono: [[0, 0, 0, 0], [0.5, 118, 118, 122], [1, 255, 255, 255]],
};

// Title gradient per grade: [top, middle, bottom].
export const TITLE_GRADIENTS = {
  sunset: ['#fff6c8', '#ff9a3c', '#ff2e88'],
  neon: ['#ffffff', '#29e6d8', '#ff2e88'],
  vice: ['#ffffff', '#ffd23c', '#ff5e8a'],
  dusk: ['#ffffff', '#f2a65a', '#c65d7b'],
  mono: ['#ffffff', '#e8e8e8', '#9a9a9a'],
};

export const RANDOM_TITLES = [
  'NEON SHORE', 'VICE COAST', 'PALM HEIST', 'SUNSET RUN', 'TURBO TIDE',
  'MIDNIGHT PIER', 'CHROME DAWN', 'HOTEL VICE', 'BOULEVARD KINGS', 'LAST LAP',
];

export function defaultState() {
  const panels = [];
  for (let i = 0; i < 9; i++) {
    panels.push({ photo: i % 2, ox: 0, oy: 0, zoom: 1.15 });
  }
  return {
    layout: 'grid9',
    grade: 'vice',
    intensity: 0.75,
    grain: 0.35,
    vignette: 0.55,
    halftone: 0,
    ink: true,
    title: 'NEON SHORE',
    subtitle: 'a vice coast story',
    badge: 'VICE COAST',
    stars: 5,
    panels,
  };
}

export function panelCount(layout) {
  if (layout === 'grid9') return 9;
  if (layout === 'hero3' || layout === 'panels4') return 4;
  if (layout === 'tilted') return 3;
  return 1;
}

// Panel rectangles in cover pixels. Each: {x, y, w, h, rot} (rot in radians).
export function layoutPanels(layout, W, H) {
  const gap = Math.max(3, Math.round(Math.min(W, H) * 0.008));
  const m = Math.max(3, Math.round(Math.min(W, H) * 0.012));
  const innerW = W - m * 2;
  const innerH = H - m * 2;
  const box = (fx, fy, fw, fh, rot = 0) => ({
    x: m + fx * innerW, y: m + fy * innerH,
    w: fw * innerW, h: fh * innerH, rot,
  });
  if (layout === 'grid9') {
    const cw = (1 - 2 * gap / innerW) / 3;
    const ch = (1 - 2 * gap / innerH) / 3;
    const out = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push(box(c * (cw + gap / innerW), r * (ch + gap / innerH), cw, ch));
      }
    }
    return out;
  }
  if (layout === 'hero3') {
    return [
      box(0, 0, 0.615, 0.615),
      box(0.625, 0, 0.375, 0.3025),
      box(0.625, 0.3125, 0.375, 0.3025),
      box(0, 0.625, 1, 0.375),
    ];
  }
  if (layout === 'panels4') {
    const cw = (1 - gap / innerW) / 2;
    const ch = (1 - gap / innerH) / 2;
    return [
      box(0, 0, cw, ch), box(cw + gap / innerW, 0, cw, ch),
      box(0, ch + gap / innerH, cw, ch), box(cw + gap / innerW, ch + gap / innerH, cw, ch),
    ];
  }
  if (layout === 'tilted') {
    const pw = 0.52, ph = 0.6;
    return [
      box(0.06, 0.06, pw, ph, -0.12),
      box(0.42, 0.02, pw, ph, 0.1),
      box(0.24, 0.3, pw, ph, -0.04),
    ];
  }
  return [box(0, 0, 1, 1)]; // fullbleed
}

// Hit test in cover pixels, honouring panel rotation. Returns panel index or -1.
export function hitPanel(layout, W, H, px, py) {
  const rects = layoutPanels(layout, W, H);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const cos = Math.cos(-r.rot), sin = Math.sin(-r.rot);
    const dx = px - cx, dy = py - cy;
    const lx = dx * cos - dy * sin + cx;
    const ly = dx * sin + dy * cos + cy;
    if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return i;
  }
  return -1;
}

function buildLut(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const k = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(a[1 + c] + (b[1 + c] - a[1 + c]) * k);
    }
  }
  return lut;
}

function gradeImageData(imageData, lut, intensity) {
  const d = imageData.data;
  const mix = Math.min(1, Math.max(0, intensity));
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const j = lum * 3;
    d[i] = d[i] + (lut[j] - d[i]) * mix;
    d[i + 1] = d[i + 1] + (lut[j + 1] - d[i + 1]) * mix;
    d[i + 2] = d[i + 2] + (lut[j + 2] - d[i + 2]) * mix;
  }
  return imageData;
}

let noiseCanvas = null;
function getNoiseCanvas() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 160;
  noiseCanvas.height = 160;
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

let dotCanvas = null;
function getDotCanvas() {
  if (dotCanvas) return dotCanvas;
  dotCanvas = document.createElement('canvas');
  dotCanvas.width = 9;
  dotCanvas.height = 9;
  const dctx = dotCanvas.getContext('2d');
  dctx.fillStyle = '#000';
  dctx.beginPath();
  dctx.arc(4.5, 4.5, 2, 0, Math.PI * 2);
  dctx.fill();
  return dotCanvas;
}

function drawPlaceholder(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3a1c5e');
  g.addColorStop(1, '#7a1e4d');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let d = -rect.h; d < rect.w; d += 26) {
    ctx.beginPath();
    ctx.moveTo(rect.x + d, rect.y);
    ctx.lineTo(rect.x + d + rect.h, rect.y + rect.h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.max(12, rect.w * 0.09)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawLettering(ctx, W, H, state) {
  const stops = TITLE_GRADIENTS[state.grade] || TITLE_GRADIENTS.vice;
  const titleY = H * 0.86;
  let size = Math.min(W * 0.13, H * 0.16);
  const title = (state.title || 'VICE COAST').toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 18 && ctx.measureText(title).width > W * 0.94) {
    size *= 0.92;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  // Scrim so the title always reads over the art.
  const scrim = ctx.createLinearGradient(0, H * 0.62, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,20,0)');
  scrim.addColorStop(0.55, 'rgba(10,4,20,0.55)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  const grad = ctx.createLinearGradient(0, titleY - size, 0, titleY + size * 0.12);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14041f';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.shadowColor = 'rgba(255,46,136,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(title, W / 2, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (state.subtitle) {
    const subSize = Math.max(14, size * 0.3);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,46,136,0.9)';
    ctx.shadowBlur = subSize * 0.35;
    ctx.fillText(state.subtitle, W / 2, titleY + subSize * 1.25);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Badge ribbon, top right.
  if (state.badge) {
    const bs = Math.max(13, W * 0.021);
    ctx.font = `${bs}px Anton, sans-serif`;
    const tw = ctx.measureText(state.badge).width;
    const bw = tw + bs * 1.6, bh = bs * 2.1;
    const bx = W - bw - W * 0.03, by = H * 0.035;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-0.1);
    const bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    bg.addColorStop(0, '#ff2e88');
    bg.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, bs * 0.08);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.badge, 0, bs * 0.08);
    ctx.restore();
  }

  // Heat meter: five stars, bottom right.
  const starSize = Math.max(14, H * 0.032);
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const stars = '★'.repeat(5);
  const sx = W - W * 0.03, sy = H - H * 0.03;
  const starsWidth = ctx.measureText(stars).width;
  ctx.fillStyle = 'rgba(20,4,31,0.55)';
  ctx.fillText('☆☆☆☆☆', sx + 1, sy + 1);
  ctx.fillStyle = '#ffd23c';
  ctx.fillText('★'.repeat(Math.max(0, Math.min(5, state.stars || 0))), sx, sy);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.max(10, starSize * 0.5)}px Anton, sans-serif`;
  ctx.fillText('HEAT', sx - starsWidth - 8, sy);

  // Studio credit, bottom left.
  ctx.textAlign = 'left';
  ctx.font = `${Math.max(10, W * 0.011)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('VICE COAST COVER STUDIO · EST. 2026', W * 0.03, H - H * 0.03);
}

// The one call that draws a complete cover. ctx is a 2D context, W/H its size.
export function drawCover(ctx, W, H, state, photos) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Backdrop gradient behind the panels.
  const stops = GRADE_STOPS[state.grade] || GRADE_STOPS.vice;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, `rgb(${stops[0][1]},${stops[0][2]},${stops[0][3]})`);
  bg.addColorStop(1, `rgb(${stops[2][1]},${stops[2][2]},${stops[2][3]})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const rects = layoutPanels(state.layout, W, H);
  const lut = buildLut(stops);
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });

  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, ox: 0, oy: 0, zoom: 1.15 };
    const img = photos[panel.photo];
    const frame = state.layout === 'tilted' ? Math.round(Math.min(W, H) * 0.018) : 0;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    } else {
      ctx.translate(rect.x, rect.y);
    }
    if (state.layout === 'tilted') {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = Math.round(W * 0.02);
      ctx.shadowOffsetY = Math.round(H * 0.012);
      ctx.fillStyle = '#fdf8ef';
      ctx.fillRect(-frame, -frame, rect.w + frame * 2, rect.h + frame * 2 + frame * 2.4);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(0, 0, rect.w, rect.h);
    ctx.clip();
    if (img && img.complete && img.naturalWidth > 0) {
      work.width = Math.max(2, Math.min(960, Math.round(rect.w)));
      work.height = Math.max(2, Math.round(work.width * rect.h / rect.w));
      const scale = Math.max(work.width / img.naturalWidth, work.height / img.naturalHeight) * panel.zoom;
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      wctx.clearRect(0, 0, work.width, work.height);
      wctx.drawImage(
        img,
        (work.width - dw) / 2 + panel.ox * work.width,
        (work.height - dh) / 2 + panel.oy * work.height,
        dw, dh,
      );
      if (state.intensity > 0) {
        const data = wctx.getImageData(0, 0, work.width, work.height);
        wctx.putImageData(gradeImageData(data, lut, state.intensity), 0, 0);
      }
      ctx.drawImage(work, 0, 0, rect.w, rect.h);
    } else {
      drawPlaceholder(ctx, { x: 0, y: 0, w: rect.w, h: rect.h });
    }
    ctx.restore();

    if (state.ink && state.layout !== 'tilted') {
      ctx.save();
      if (rect.rot) {
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate(rect.rot);
        ctx.translate(-rect.w / 2, -rect.h / 2);
      } else {
        ctx.translate(rect.x, rect.y);
      }
      ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.006);
      ctx.strokeStyle = '#0a0512';
      ctx.strokeRect(0, 0, rect.w, rect.h);
      ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.0016);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      const inset = Math.max(2, Math.min(W, H) * 0.006);
      ctx.strokeRect(inset, inset, rect.w - inset * 2, rect.h - inset * 2);
      ctx.restore();
    }
  });

  // Print effects over the whole cover.
  if (state.halftone > 0) {
    ctx.save();
    ctx.globalAlpha = state.halftone * 0.5;
    ctx.fillStyle = ctx.createPattern(getDotCanvas(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.grain > 0) {
    ctx.save();
    ctx.globalAlpha = state.grain * 0.45;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getNoiseCanvas(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette > 0) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.35,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${state.vignette * 0.85})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  drawLettering(ctx, W, H, state);
  ctx.restore();
}

// Render a cover to a fresh canvas at exact export size.
export function renderCover(width, height, state, photos) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), width, height, state, photos);
  return canvas;
}
