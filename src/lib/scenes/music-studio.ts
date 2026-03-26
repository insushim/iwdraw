import { SVGElementData } from '../engine/types';
import { SeededRandom } from '../engine/random';
import {
  createRect, createCircle, createEllipse, createPath,
  createLine, createGroup, createText,
} from '../engine/primitives';
import {
  combineDefs, indoorDefs, wallGradient, floorGradient, linearGradient,
  radialGradient, fabricPattern, lampGlowGradient,
} from './svg-effects';
import { resetComponentId } from './svg-components';

let _uid = 0;
function uid(p = 'ms') { return `${p}_${++_uid}_${Date.now().toString(36)}`; }

export function generateMusicStudio(rng: SeededRandom, w: number, h: number): { elements: SVGElementData[]; defs: string } {
  _uid = 0;
  resetComponentId();
  const elements: SVGElementData[] = [];

  // ── Color palette ──
  const wallBase = rng.pick(['#1A1A2E', '#1E1E1E', '#2A1A3E', '#1A2A2A', '#222222']);
  const wallDark = rng.pick(['#0A0A1E', '#0E0E0E', '#1A0A2E', '#0A1A1A']);
  const floorBase = rng.pick(['#2A2A2A', '#333333', '#252525']);
  const floorDark = rng.pick(['#1A1A1A', '#202020', '#151515']);
  const panelColor = rng.pick(['#3A2A4A', '#2A3A4A', '#4A3A2A', '#3A3A3A', '#2A2A3A']);
  const panelLight = rng.pick(['#5A4A6A', '#4A5A6A', '#6A5A4A', '#5A5A5A']);
  const consoleColor = rng.pick(['#333333', '#2A2A2A', '#3A3A3A']);
  const monitorBg = rng.pick(['#0A0A1A', '#0A1A0A', '#1A0A1A']);
  const ledColor = rng.pick(['#00FF00', '#FF0000', '#0088FF', '#FF8800', '#FF00FF']);
  const ledColor2 = rng.pick(['#FF0000', '#00FF00', '#0088FF', '#FF8800']);

  // ── SVG Defs ──
  const defs = combineDefs(
    indoorDefs(),
    wallGradient('wallGrad', wallBase, wallDark),
    floorGradient('floorGrad', floorBase, floorDark),
    fabricPattern('panelPat', panelColor),
    linearGradient('consoleFace', [
      { offset: '0%', color: '#444' },
      { offset: '50%', color: '#555' },
      { offset: '100%', color: '#333' },
    ]),
    radialGradient('ledGlow', [
      { offset: '0%', color: ledColor, opacity: 0.5 },
      { offset: '100%', color: ledColor, opacity: 0 },
    ]),
    radialGradient('ledGlow2', [
      { offset: '0%', color: ledColor2, opacity: 0.4 },
      { offset: '100%', color: ledColor2, opacity: 0 },
    ]),
    lampGlowGradient('ambientGlow', '#4A4A8A'),
    linearGradient('guitarBody', [
      { offset: '0%', color: '#8B4513' },
      { offset: '50%', color: '#A0522D' },
      { offset: '100%', color: '#6B3410' },
    ]),
    linearGradient('drumShell', [
      { offset: '0%', color: '#1A1A1A' },
      { offset: '50%', color: '#333' },
      { offset: '100%', color: '#1A1A1A' },
    ], '0%', '0%', '100%', '0%'),
  );

  const wallBottom = h * 0.7;

  // ════════════════════════════════════════════
  //  LAYER 0 — Dark walls & floor
  // ════════════════════════════════════════════

  // Wall
  elements.push(createRect(0, 0, w, wallBottom, 'url(#wallGrad)', { layer: 0, category: 'wall', modifiable: false }));

  // Acoustic panels on walls
  const panelRows = 2;
  const panelCols = rng.nextInt(8, 12);
  const panelW2 = (w - 20) / panelCols;
  const panelH2 = wallBottom * 0.25;
  for (let row = 0; row < panelRows; row++) {
    for (let col = 0; col < panelCols; col++) {
      const px = 10 + col * panelW2;
      const py = 10 + row * (panelH2 + 10);
      // Alternate panel colors for visual interest
      const pColor = (row + col) % 2 === 0 ? panelColor : panelLight;
      elements.push(createRect(px, py, panelW2 - 4, panelH2, pColor, {
        layer: 0, category: 'panel', modifiable: false, opacity: 0.7,
      }));
      // Foam texture lines
      for (let line = 0; line < 3; line++) {
        elements.push(createRect(px + 2, py + 3 + line * (panelH2 / 3), panelW2 - 8, 1, panelLight, {
          layer: 0, category: 'panel', modifiable: false, opacity: 0.2,
        }));
      }
    }
  }

  // Floor (dark carpet)
  elements.push(createRect(0, wallBottom, w, h - wallBottom, 'url(#floorGrad)', { layer: 0, category: 'floor', modifiable: false }));
  // Baseboard
  elements.push(createRect(0, wallBottom - 2, w, 4, '#333', { layer: 0, category: 'wall', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 1 — LED strip lights
  // ════════════════════════════════════════════

  // LED strip along ceiling
  elements.push(createRect(0, 0, w, 3, ledColor, { layer: 1, category: 'led', modifiable: true, id: uid('ledTop'), opacity: 0.6 }));
  elements.push(createRect(0, 0, w, 8, 'url(#ledGlow)', { layer: 1, category: 'led', modifiable: false, opacity: 0.3 }));

  // LED strip along bottom of wall
  elements.push(createRect(0, wallBottom - 4, w, 2, ledColor2, { layer: 1, category: 'led', modifiable: true, id: uid('ledBot'), opacity: 0.5 }));
  elements.push(createRect(0, wallBottom - 12, w, 10, 'url(#ledGlow2)', { layer: 1, category: 'led', modifiable: false, opacity: 0.2 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Mixing console / desk
  // ════════════════════════════════════════════

  const consX = w * 0.2;
  const consY = h * 0.5;
  const consW = w * 0.45;
  const consH = h * 0.14;

  // Console desk/table
  elements.push(createRect(consX - 8, consY + consH * 0.3, consW + 16, wallBottom - consY - consH * 0.3, '#2A2A2A', {
    layer: 2, category: 'console', modifiable: false, filter: 'url(#shadow)',
  }));
  // Console surface (angled)
  elements.push(createPath(consX, consY,
    `M${consX},${consY + consH} L${consX},${consY + consH * 0.3} L${consX + consW},${consY} L${consX + consW},${consY + consH} Z`,
    'url(#consoleFace)', { layer: 2, category: 'console', modifiable: true, id: uid('console'), filter: 'url(#shadow)' }));

  // Fader channels
  const channelCount = rng.nextInt(10, 16);
  const channelW = consW / channelCount;
  for (let ch = 0; ch < channelCount; ch++) {
    const cx = consX + ch * channelW + 3;
    const cy = consY + consH * 0.35;
    // Fader slot
    elements.push(createRect(cx + channelW * 0.3, cy, channelW * 0.15, consH * 0.55, '#222', {
      layer: 3, category: 'fader', modifiable: false,
    }));
    // Fader knob position
    const knobY = cy + rng.nextFloat(consH * 0.1, consH * 0.4);
    elements.push(createRect(cx + channelW * 0.15, knobY, channelW * 0.5, 3, '#888', {
      layer: 3, category: 'fader', modifiable: false,
    }));
    // Channel LED meter (small colored rect)
    const meterH = rng.nextFloat(3, consH * 0.2);
    elements.push(createRect(cx + channelW * 0.1, cy - meterH - 2, channelW * 0.15, meterH,
      meterH > consH * 0.12 ? '#FF0000' : '#00FF00', {
        layer: 3, category: 'meter', modifiable: false, opacity: 0.7,
      }));
  }

  // Master fader section (right side)
  elements.push(createRect(consX + consW - channelW * 2, consY + consH * 0.2, channelW * 1.8, consH * 0.7, '#2A2A2A', {
    layer: 3, category: 'console', modifiable: false, stroke: '#444', strokeWidth: 0.5,
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Studio monitors (speakers)
  // ════════════════════════════════════════════

  const monW = w * 0.08;
  const monH = h * 0.18;

  // Left monitor
  const lMonX = consX - monW - 10;
  const lMonY = consY - monH * 0.3;
  elements.push(createRect(lMonX, lMonY, monW, monH, '#1A1A1A', {
    layer: 2, category: 'monitor', modifiable: true, id: uid('lmon'), filter: 'url(#shadow)',
  }));
  // Tweeter
  elements.push(createCircle(lMonX + monW / 2, lMonY + monH * 0.25, monW * 0.18, '#333', {
    layer: 2, category: 'monitor', modifiable: false,
  }));
  elements.push(createCircle(lMonX + monW / 2, lMonY + monH * 0.25, monW * 0.08, '#555', { layer: 2, opacity: 0.6 }));
  // Woofer
  elements.push(createCircle(lMonX + monW / 2, lMonY + monH * 0.6, monW * 0.3, '#2A2A2A', {
    layer: 2, category: 'monitor', modifiable: false, stroke: '#444', strokeWidth: 1,
  }));
  elements.push(createCircle(lMonX + monW / 2, lMonY + monH * 0.6, monW * 0.12, '#333', { layer: 2 }));
  // LED indicator
  elements.push(createCircle(lMonX + monW / 2, lMonY + monH * 0.88, 2, ledColor, { layer: 3, opacity: 0.8 }));

  // Right monitor
  const rMonX = consX + consW + 10;
  elements.push(createRect(rMonX, lMonY, monW, monH, '#1A1A1A', {
    layer: 2, category: 'monitor', modifiable: true, id: uid('rmon'), filter: 'url(#shadow)',
  }));
  elements.push(createCircle(rMonX + monW / 2, lMonY + monH * 0.25, monW * 0.18, '#333', { layer: 2 }));
  elements.push(createCircle(rMonX + monW / 2, lMonY + monH * 0.25, monW * 0.08, '#555', { layer: 2, opacity: 0.6 }));
  elements.push(createCircle(rMonX + monW / 2, lMonY + monH * 0.6, monW * 0.3, '#2A2A2A', {
    layer: 2, stroke: '#444', strokeWidth: 1,
  }));
  elements.push(createCircle(rMonX + monW / 2, lMonY + monH * 0.6, monW * 0.12, '#333', { layer: 2 }));
  elements.push(createCircle(rMonX + monW / 2, lMonY + monH * 0.88, 2, ledColor, { layer: 3, opacity: 0.8 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Computer screen
  // ════════════════════════════════════════════

  const scrX = consX + consW * 0.2;
  const scrY = consY - h * 0.22;
  const scrW = consW * 0.6;
  const scrH = h * 0.18;

  // Monitor stand
  elements.push(createRect(scrX + scrW * 0.4, scrY + scrH, scrW * 0.2, 12, '#555', { layer: 2, category: 'screen', modifiable: false }));
  elements.push(createRect(scrX + scrW * 0.3, scrY + scrH + 12, scrW * 0.4, 4, '#666', { layer: 2, category: 'screen', modifiable: false }));
  // Screen bezel
  elements.push(createRect(scrX, scrY, scrW, scrH, '#222', {
    layer: 2, category: 'screen', modifiable: true, id: uid('screen'), filter: 'url(#shadow)',
  }));
  // Screen display (DAW waveforms)
  elements.push(createRect(scrX + 4, scrY + 3, scrW - 8, scrH - 6, monitorBg, {
    layer: 2, category: 'screen', modifiable: false,
  }));
  // DAW tracks (colored horizontal bars)
  const trackColors = ['#4A90D9', '#D94A4A', '#4AD94A', '#D9D94A', '#D94AD9', '#4AD9D9'];
  const trackCount = rng.nextInt(5, 8);
  const trackH = (scrH - 14) / trackCount;
  for (let t = 0; t < trackCount; t++) {
    const ty = scrY + 6 + t * trackH;
    const trackStart = rng.nextFloat(0, scrW * 0.3);
    const trackLen = rng.nextFloat(scrW * 0.3, scrW * 0.65);
    elements.push(createRect(scrX + 6 + trackStart, ty + 1, trackLen, trackH - 3, trackColors[t % trackColors.length], {
      layer: 3, category: 'daw', modifiable: false, opacity: 0.5,
    }));
    // Waveform lines in track
    for (let wl = 0; wl < 8; wl++) {
      const wx = scrX + 6 + trackStart + wl * (trackLen / 8);
      const wh = rng.nextFloat(1, trackH * 0.4);
      elements.push(createRect(wx, ty + trackH / 2 - wh, 1, wh * 2, trackColors[t % trackColors.length], {
        layer: 3, category: 'daw', modifiable: false, opacity: 0.6,
      }));
    }
  }
  // Playhead
  elements.push(createRect(scrX + scrW * 0.4, scrY + 5, 1, scrH - 10, '#FFF', {
    layer: 3, category: 'daw', modifiable: false, opacity: 0.5,
  }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Guitars on wall
  // ════════════════════════════════════════════

  // Acoustic guitar
  const gx1 = w * 0.04;
  const gy1 = wallBottom * 0.25;
  // Neck
  elements.push(createRect(gx1 + 8, gy1 - 30, 6, 55, '#5C3317', {
    layer: 2, category: 'guitar', modifiable: false,
  }));
  // Headstock
  elements.push(createRect(gx1 + 6, gy1 - 38, 10, 10, '#3A2010', { layer: 2, category: 'guitar', modifiable: false }));
  // Tuning pegs
  for (let tp = 0; tp < 3; tp++) {
    elements.push(createCircle(gx1 + 4, gy1 - 34 + tp * 3, 1.5, '#DAA520', { layer: 3 }));
    elements.push(createCircle(gx1 + 18, gy1 - 34 + tp * 3, 1.5, '#DAA520', { layer: 3 }));
  }
  // Body
  elements.push(createEllipse(gx1 + 11, gy1 + 32, 18, 24, 'url(#guitarBody)', {
    layer: 2, category: 'guitar', modifiable: true, id: uid('aguitar'), filter: 'url(#shadow)',
  }));
  // Sound hole
  elements.push(createCircle(gx1 + 11, gy1 + 28, 7, '#1A0A00', { layer: 2, category: 'guitar', modifiable: false }));
  elements.push(createCircle(gx1 + 11, gy1 + 28, 8, 'none', { layer: 2, stroke: '#DAA520', strokeWidth: 0.8, opacity: 0.6 }));
  // Strings
  for (let s = 0; s < 6; s++) {
    elements.push(createLine(gx1 + 8 + s, gy1 - 28, gx1 + 6 + s * 1.5, gy1 + 48, '#E8E0D0', {
      strokeWidth: 0.4, layer: 3, opacity: 0.5,
    }));
  }
  // Bridge
  elements.push(createRect(gx1 + 4, gy1 + 42, 14, 3, '#3A2010', { layer: 2, category: 'guitar', modifiable: false }));

  // Electric guitar
  const gx2 = w * 0.9;
  const gy2 = wallBottom * 0.2;
  // Neck
  elements.push(createRect(gx2 + 3, gy2 - 25, 5, 50, '#5C3317', { layer: 2, category: 'guitar', modifiable: false }));
  // Headstock
  elements.push(createPath(gx2, gy2,
    `M${gx2 + 1},${gy2 - 25} L${gx2 - 2},${gy2 - 38} L${gx2 + 13},${gy2 - 38} L${gx2 + 10},${gy2 - 25}`,
    '#1A1A1A', { layer: 2, category: 'guitar', modifiable: false }));
  // Body (strat-like shape)
  elements.push(createPath(gx2, gy2,
    `M${gx2 - 4},${gy2 + 25} Q${gx2 - 12},${gy2 + 30} ${gx2 - 10},${gy2 + 45} Q${gx2 - 6},${gy2 + 55} ${gx2 + 5},${gy2 + 55} Q${gx2 + 18},${gy2 + 55} ${gx2 + 20},${gy2 + 40} Q${gx2 + 22},${gy2 + 30} ${gx2 + 15},${gy2 + 25} Z`,
    rng.pick(['#CC0000', '#000000', '#336699', '#FFFFFF', '#FFD700']), {
      layer: 2, category: 'guitar', modifiable: true, id: uid('eguitar'), filter: 'url(#shadow)',
    }));
  // Pickups
  elements.push(createRect(gx2, gy2 + 32, 12, 4, '#333', { layer: 2, category: 'guitar', modifiable: false }));
  elements.push(createRect(gx2, gy2 + 40, 12, 4, '#333', { layer: 2, category: 'guitar', modifiable: false }));
  // Knobs
  elements.push(createCircle(gx2 + 14, gy2 + 48, 2.5, '#333', { layer: 3, stroke: '#555', strokeWidth: 0.5 }));
  elements.push(createCircle(gx2 + 8, gy2 + 50, 2.5, '#333', { layer: 3, stroke: '#555', strokeWidth: 0.5 }));

  // ════════════════════════════════════════════
  //  LAYER 2 — Keyboard (on stand)
  // ════════════════════════════════════════════

  const kbX = w * 0.04;
  const kbY = h * 0.6;
  const kbW = w * 0.18;
  const kbH = h * 0.04;

  // Keyboard stand legs
  elements.push(createLine(kbX + 8, kbY + kbH, kbX + 4, wallBottom, '#555', { strokeWidth: 3, layer: 2 }));
  elements.push(createLine(kbX + kbW - 8, kbY + kbH, kbX + kbW - 4, wallBottom, '#555', { strokeWidth: 3, layer: 2 }));
  // Keyboard body
  elements.push(createRect(kbX, kbY, kbW, kbH, '#222', {
    layer: 2, category: 'keyboard', modifiable: true, id: uid('keys'), filter: 'url(#shadow)',
  }));
  // White keys
  const keyCount = 24;
  const keyW2 = kbW / keyCount;
  for (let k = 0; k < keyCount; k++) {
    elements.push(createRect(kbX + k * keyW2 + 0.5, kbY + kbH * 0.15, keyW2 - 1, kbH * 0.8, '#F0F0F0', {
      layer: 3, category: 'keyboard', modifiable: false,
    }));
  }
  // Black keys
  const blackPattern = [1, 1, 0, 1, 1, 1, 0]; // pattern repeats per octave
  for (let k = 0; k < keyCount - 1; k++) {
    if (blackPattern[k % 7]) {
      elements.push(createRect(kbX + (k + 0.6) * keyW2, kbY + kbH * 0.15, keyW2 * 0.7, kbH * 0.5, '#111', {
        layer: 3, category: 'keyboard', modifiable: false,
      }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 2 — Drum kit (right side)
  // ════════════════════════════════════════════

  const drumX = w * 0.72;
  const drumY = h * 0.58;

  // Bass drum
  elements.push(createEllipse(drumX + 20, drumY + 20, 28, 25, 'url(#drumShell)', {
    layer: 2, category: 'drums', modifiable: true, id: uid('bass'), filter: 'url(#shadow)',
  }));
  // Bass drum head
  elements.push(createEllipse(drumX + 20, drumY + 20, 24, 21, '#F5F0E8', { layer: 2, category: 'drums', modifiable: false }));
  // Logo on bass drum
  elements.push(createCircle(drumX + 20, drumY + 20, 10, 'none', {
    layer: 2, category: 'drums', modifiable: false, stroke: '#333', strokeWidth: 1, opacity: 0.4,
  }));

  // Snare drum
  elements.push(createEllipse(drumX - 8, drumY + 10, 14, 5, '#888', {
    layer: 2, category: 'drums', modifiable: true, id: uid('snare'),
  }));
  elements.push(createRect(drumX - 22, drumY + 10, 28, 8, '#666', { layer: 2, category: 'drums', modifiable: false }));
  elements.push(createEllipse(drumX - 8, drumY + 18, 14, 5, '#777', { layer: 2, category: 'drums', modifiable: false }));

  // Hi-hat
  elements.push(createEllipse(drumX - 24, drumY + 5, 12, 4, '#DAA520', {
    layer: 2, category: 'drums', modifiable: true, id: uid('hihat'),
  }));
  elements.push(createEllipse(drumX - 24, drumY + 3, 12, 4, '#C0A030', { layer: 2, category: 'drums', modifiable: false, opacity: 0.8 }));
  // Hi-hat stand
  elements.push(createRect(drumX - 25, drumY + 5, 2, wallBottom - drumY - 5, '#888', { layer: 2, category: 'drums', modifiable: false }));

  // Tom-toms
  elements.push(createEllipse(drumX + 5, drumY - 5, 10, 4, '#888', { layer: 2, category: 'drums', modifiable: false }));
  elements.push(createEllipse(drumX + 25, drumY - 5, 10, 4, '#888', { layer: 2, category: 'drums', modifiable: false }));
  elements.push(createEllipse(drumX + 40, drumY + 10, 12, 4, '#888', { layer: 2, category: 'drums', modifiable: false }));

  // Crash cymbal
  elements.push(createEllipse(drumX + 45, drumY - 10, 14, 5, '#DAA520', {
    layer: 2, category: 'drums', modifiable: true, id: uid('crash'), opacity: 0.8,
  }));
  elements.push(createRect(drumX + 44, drumY - 10, 2, wallBottom - drumY + 10 - 5, '#888', { layer: 2, category: 'drums', modifiable: false }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Microphone on stand
  // ════════════════════════════════════════════

  const micX = w * 0.16;
  const micY = h * 0.3;

  // Mic stand (tripod base)
  elements.push(createRect(micX - 1, micY, 2, wallBottom - micY, '#666', { layer: 2, category: 'mic', modifiable: false }));
  // Tripod feet
  elements.push(createLine(micX, wallBottom, micX - 15, wallBottom + 3, '#666', { strokeWidth: 2, layer: 2 }));
  elements.push(createLine(micX, wallBottom, micX + 15, wallBottom + 3, '#666', { strokeWidth: 2, layer: 2 }));
  // Mic boom arm
  elements.push(createLine(micX, micY + 5, micX + 15, micY - 10, '#666', { strokeWidth: 2, layer: 2 }));
  // Microphone body
  elements.push(createEllipse(micX + 17, micY - 15, 6, 10, '#555', {
    layer: 3, category: 'mic', modifiable: true, id: uid('mic'), filter: 'url(#shadow)',
  }));
  // Mic grille
  elements.push(createEllipse(micX + 17, micY - 19, 5.5, 6, '#888', { layer: 3, category: 'mic', modifiable: false }));
  // Mic grille lines
  for (let gl = 0; gl < 4; gl++) {
    elements.push(createRect(micX + 13, micY - 22 + gl * 2.5, 8, 0.5, '#666', { layer: 3, opacity: 0.5 }));
  }

  // Pop filter
  if (rng.chance(0.6)) {
    elements.push(createCircle(micX + 28, micY - 15, 10, 'none', {
      layer: 3, category: 'mic', modifiable: true, id: uid('popf'), stroke: '#555', strokeWidth: 0.8, opacity: 0.4,
    }));
    elements.push(createLine(micX + 18, micY - 5, micX + 28, micY - 5, '#555', { strokeWidth: 1, layer: 3, opacity: 0.4 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Headphones
  // ════════════════════════════════════════════

  const hpX = consX + consW * 0.05;
  const hpY = consY + consH + 5;

  // Headband
  elements.push(createPath(hpX, hpY,
    `M${hpX},${hpY + 5} Q${hpX + 10},${hpY - 10} ${hpX + 20},${hpY + 5}`,
    'none', { stroke: '#333', strokeWidth: 3, layer: 3, category: 'headphones', modifiable: true, id: uid('hp') }));
  // Ear cups
  elements.push(createEllipse(hpX, hpY + 8, 6, 8, '#222', {
    layer: 3, category: 'headphones', modifiable: false, stroke: '#444', strokeWidth: 1,
  }));
  elements.push(createEllipse(hpX + 20, hpY + 8, 6, 8, '#222', {
    layer: 3, category: 'headphones', modifiable: false, stroke: '#444', strokeWidth: 1,
  }));
  // Padding
  elements.push(createEllipse(hpX, hpY + 8, 4, 6, '#1A1A1A', { layer: 3, opacity: 0.6 }));
  elements.push(createEllipse(hpX + 20, hpY + 8, 4, 6, '#1A1A1A', { layer: 3, opacity: 0.6 }));

  // ════════════════════════════════════════════
  //  LAYER 3 — Cables on floor
  // ════════════════════════════════════════════

  for (let c = 0; c < rng.nextInt(2, 4); c++) {
    const cx1 = rng.nextFloat(w * 0.1, w * 0.7);
    const cy1 = rng.nextFloat(wallBottom + 5, h * 0.9);
    const cx2 = cx1 + rng.nextFloat(40, 120);
    const cy2 = cy1 + rng.nextFloat(-15, 15);
    const cableColor = rng.pick(['#333', '#444', '#222', '#555']);
    elements.push(createPath(cx1, cy1,
      `M${cx1},${cy1} Q${(cx1 + cx2) / 2},${cy1 + rng.nextFloat(10, 25)} ${cx2},${cy2}`,
      'none', { stroke: cableColor, strokeWidth: 2, layer: 1, category: 'cable', modifiable: false, opacity: 0.5 }));
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Vinyl records
  // ════════════════════════════════════════════

  const vinylX = w * 0.88;
  const vinylY = h * 0.58;
  // Record leaning against wall
  for (let v = 0; v < rng.nextInt(2, 4); v++) {
    const vx = vinylX + v * 6;
    const vy = vinylY + v * 2;
    const sleeveColor = rng.pick(['#1A1A1A', '#CC0000', '#0044AA', '#222', '#884400']);
    // Sleeve
    elements.push(createRect(vx, vy, 28, 28, sleeveColor, {
      layer: 3, category: 'vinyl', modifiable: v === 0, id: v === 0 ? uid('vinyl') : uid('vs'),
      filter: v === 0 ? 'url(#softShadow)' : undefined,
    }));
    // Record peeking out
    if (v === 0) {
      elements.push(createCircle(vx + 14, vy + 2, 13, '#111', { layer: 3, category: 'vinyl', modifiable: false }));
      elements.push(createCircle(vx + 14, vy + 2, 4, sleeveColor, { layer: 3, category: 'vinyl', modifiable: false, opacity: 0.8 }));
      // Grooves
      elements.push(createCircle(vx + 14, vy + 2, 8, 'none', { layer: 3, stroke: '#222', strokeWidth: 0.3, opacity: 0.5 }));
      elements.push(createCircle(vx + 14, vy + 2, 11, 'none', { layer: 3, stroke: '#222', strokeWidth: 0.3, opacity: 0.5 }));
    }
  }

  // ════════════════════════════════════════════
  //  LAYER 3 — Amp on floor
  // ════════════════════════════════════════════

  if (rng.chance(0.7)) {
    const ampX = w * 0.86;
    const ampY = wallBottom + 2;
    const ampW2 = 35;
    const ampH2 = 30;
    elements.push(createRect(ampX, ampY, ampW2, ampH2, '#1A1A1A', {
      layer: 2, category: 'amp', modifiable: true, id: uid('amp'), filter: 'url(#shadow)',
    }));
    // Speaker grille
    elements.push(createRect(ampX + 3, ampY + 10, ampW2 - 6, ampH2 - 14, '#222', {
      layer: 2, category: 'amp', modifiable: false,
    }));
    // Grille pattern
    for (let gl = 0; gl < 4; gl++) {
      elements.push(createRect(ampX + 5, ampY + 13 + gl * 5, ampW2 - 10, 1, '#333', { layer: 2, opacity: 0.4 }));
    }
    // Knobs
    for (let k = 0; k < 3; k++) {
      elements.push(createCircle(ampX + 8 + k * 10, ampY + 5, 3, '#444', {
        layer: 3, category: 'amp', modifiable: false, stroke: '#555', strokeWidth: 0.5,
      }));
    }
    // Power LED
    elements.push(createCircle(ampX + ampW2 - 8, ampY + 5, 1.5, '#FF0000', { layer: 3, opacity: 0.8 }));
  }

  return { elements, defs };
}
