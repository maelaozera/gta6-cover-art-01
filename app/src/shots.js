// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover / portrait / square show the cover alone,
// full-frame, in that post size. `photo` picks the sample and `caption`
// the title. window.__shotReady is set once the scene has painted.
import { defaultState } from './cover.js';

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (!shot) {
  window.__shotReady = true;
} else {
  const studio = window.ViceCoast;
  const caption = query.get('caption') || 'Neon Shore';
  const photo = query.get('photo') || 'pier';
  const state = defaultState();
  state.title = caption.toUpperCase();
  state.subtitle = 'a vice coast story';
  state.badge = 'VICE COAST';
  state.layout = 'grid9';
  state.grade = 'vice';
  studio.setState(state);

  const finish = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      studio.renderNow();
      window.__shotReady = true;
    }));
  };

  if (shot === 'editor') {
    studio.setExportSize(1080, 1080);
    studio.loadAllSamples().then(() => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(finish);
      } else {
        finish();
      }
    });
  } else if (shot === 'cover' || shot === 'portrait' || shot === 'square') {
    document.body.classList.add('shot');
    const size = shot === 'portrait'
      ? { w: 1080, h: 1350 }
      : shot === 'square' ? { w: 1080, h: 1080 } : { w: 1920, h: 1080 };
    studio.setExportSize(size.w, size.h);
    studio.loadSample(photo).then(() => {
      studio.loadSample(photo === 'pier' ? 'boulevard' : 'pier').then(() => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(finish);
        } else {
          finish();
        }
      });
    });
  } else {
    finish();
  }
}
