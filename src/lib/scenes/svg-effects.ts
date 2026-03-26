// ─── SVG Effects Library ─────────────────────────────────────
// Reusable filters, gradients, and patterns for illustration-quality SVG scenes

// ═══════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════

export function dropShadow(id: string, dx = 2, dy = 3, blur = 4, color = 'rgba(0,0,0,0.3)'): string {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${blur}" flood-color="${color}"/>
  </filter>`;
}

export function gaussianBlur(id: string, stdDev = 2): string {
  return `<filter id="${id}"><feGaussianBlur stdDeviation="${stdDev}"/></filter>`;
}

export function softGlow(id: string, stdDev = 6, color = '#FFFFFF'): string {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${stdDev}" result="blur"/>
    <feFlood flood-color="${color}" flood-opacity="0.6" result="color"/>
    <feComposite in="color" in2="blur" operator="in" result="glow"/>
    <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
}

export function innerShadow(id: string, dx = 0, dy = 2, blur = 3, color = 'rgba(0,0,0,0.4)'): string {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
    <feGaussianBlur stdDeviation="${blur}"/>
    <feOffset dx="${dx}" dy="${dy}" result="shadow"/>
    <feFlood flood-color="${color}"/>
    <feComposite in2="shadow" operator="in"/>
    <feComposite in2="SourceGraphic" operator="over"/>
  </filter>`;
}

export function turbulenceTexture(id: string, baseFreq = 0.05, numOctaves = 3, scale = 8): string {
  return `<filter id="${id}">
    <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="${numOctaves}" seed="1"/>
    <feDisplacementMap in="SourceGraphic" scale="${scale}"/>
  </filter>`;
}

export function woodTexture(id: string): string {
  return `<filter id="${id}">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="4" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="4"/>
  </filter>`;
}

export function waterRipple(id: string): string {
  return `<filter id="${id}">
    <feTurbulence type="turbulence" baseFrequency="0.015 0.08" numOctaves="3" seed="2"/>
    <feDisplacementMap in="SourceGraphic" scale="6"/>
  </filter>`;
}

export function pencilSketch(id: string): string {
  return `<filter id="${id}">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="5" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/>
  </filter>`;
}

// ═══════════════════════════════════════════════════════════════
// GRADIENTS
// ═══════════════════════════════════════════════════════════════

export interface GradientStop {
  offset: string;
  color: string;
  opacity?: number;
}

export function linearGradient(id: string, stops: GradientStop[], x1 = '0%', y1 = '0%', x2 = '0%', y2 = '100%'): string {
  const stopsStr = stops.map(s =>
    `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`
  ).join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsStr}</linearGradient>`;
}

export function radialGradient(id: string, stops: GradientStop[], cx = '50%', cy = '50%', r = '50%'): string {
  const stopsStr = stops.map(s =>
    `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`
  ).join('');
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stopsStr}</radialGradient>`;
}

// Pre-built gradient templates
export function skyGradient(id: string, topColor: string, midColor: string, bottomColor: string): string {
  return linearGradient(id, [
    { offset: '0%', color: topColor },
    { offset: '50%', color: midColor },
    { offset: '100%', color: bottomColor },
  ]);
}

export function sunsetSkyGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#0B0033' },
    { offset: '15%', color: '#1A0544' },
    { offset: '30%', color: '#4A1259' },
    { offset: '50%', color: '#B7336E' },
    { offset: '65%', color: '#E85D4A' },
    { offset: '80%', color: '#F4A236' },
    { offset: '92%', color: '#FFD176' },
    { offset: '100%', color: '#FFF3C4' },
  ]);
}

export function nightSkyGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#0a0a2e' },
    { offset: '40%', color: '#16213e' },
    { offset: '70%', color: '#1a1a4e' },
    { offset: '100%', color: '#2a1a5e' },
  ]);
}

export function daySkyGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#1e90ff' },
    { offset: '40%', color: '#5bb5f5' },
    { offset: '70%', color: '#87CEEB' },
    { offset: '100%', color: '#B0E0FF' },
  ]);
}

export function waterGradient(id: string, lightColor = '#1a6b8a', darkColor = '#0a3d5c'): string {
  return linearGradient(id, [
    { offset: '0%', color: lightColor },
    { offset: '50%', color: darkColor },
    { offset: '100%', color: lightColor, opacity: 0.8 },
  ]);
}

export function groundGradient(id: string, topColor = '#4a7c3f', bottomColor = '#2d5a27'): string {
  return linearGradient(id, [
    { offset: '0%', color: topColor },
    { offset: '100%', color: bottomColor },
  ]);
}

export function sunGlowGradient(id: string, innerColor = '#FFFFFF', outerColor = '#FFD700'): string {
  return radialGradient(id, [
    { offset: '0%', color: innerColor, opacity: 1 },
    { offset: '40%', color: outerColor, opacity: 0.6 },
    { offset: '100%', color: outerColor, opacity: 0 },
  ]);
}

export function lampGlowGradient(id: string, color = '#FFF3B0'): string {
  return radialGradient(id, [
    { offset: '0%', color: color, opacity: 0.9 },
    { offset: '50%', color: color, opacity: 0.3 },
    { offset: '100%', color: color, opacity: 0 },
  ]);
}

export function snowGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#FFFFFF' },
    { offset: '50%', color: '#E8F0FE' },
    { offset: '100%', color: '#D0E0F0' },
  ]);
}

export function sandGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#F5DEB3' },
    { offset: '40%', color: '#E8C88A' },
    { offset: '100%', color: '#D4A556' },
  ]);
}

export function autumnGradient(id: string): string {
  return linearGradient(id, [
    { offset: '0%', color: '#FF6B35' },
    { offset: '35%', color: '#D4442A' },
    { offset: '65%', color: '#B8352A' },
    { offset: '100%', color: '#8B2500' },
  ]);
}

export function wallGradient(id: string, topColor = '#F5F0E8', bottomColor = '#E8E0D0'): string {
  return linearGradient(id, [
    { offset: '0%', color: topColor },
    { offset: '100%', color: bottomColor },
  ]);
}

export function floorGradient(id: string, color1 = '#8B6E4E', color2 = '#6E5638'): string {
  return linearGradient(id, [
    { offset: '0%', color: color1 },
    { offset: '100%', color: color2 },
  ], '0%', '0%', '100%', '0%');
}

// ═══════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════

export function stripePattern(id: string, color1: string, color2: string, width = 8): string {
  return `<pattern id="${id}" width="${width * 2}" height="${width * 2}" patternUnits="userSpaceOnUse">
    <rect width="${width}" height="${width * 2}" fill="${color1}"/>
    <rect x="${width}" width="${width}" height="${width * 2}" fill="${color2}"/>
  </pattern>`;
}

export function dotPattern(id: string, color: string, bg: string, radius = 2, spacing = 10): string {
  return `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
    <rect width="${spacing}" height="${spacing}" fill="${bg}"/>
    <circle cx="${spacing / 2}" cy="${spacing / 2}" r="${radius}" fill="${color}"/>
  </pattern>`;
}

export function brickPattern(id: string, mortarColor = '#C0A080', brickColor = '#B5533C'): string {
  return `<pattern id="${id}" width="40" height="20" patternUnits="userSpaceOnUse">
    <rect width="40" height="20" fill="${mortarColor}"/>
    <rect x="1" y="1" width="18" height="8" rx="1" fill="${brickColor}"/>
    <rect x="21" y="1" width="18" height="8" rx="1" fill="${brickColor}"/>
    <rect x="10" y="11" width="18" height="8" rx="1" fill="${brickColor}"/>
    <rect x="30" y="11" width="9" height="8" rx="1" fill="${brickColor}"/>
    <rect x="0" y="11" width="9" height="8" rx="1" fill="${brickColor}"/>
  </pattern>`;
}

export function woodGrainPattern(id: string, baseColor = '#8B6E4E'): string {
  const lighter = lightenColor(baseColor, 15);
  const darker = darkenColor(baseColor, 10);
  return `<pattern id="${id}" width="60" height="10" patternUnits="userSpaceOnUse">
    <rect width="60" height="10" fill="${baseColor}"/>
    <line x1="0" y1="2" x2="60" y2="2.5" stroke="${darker}" stroke-width="0.5" opacity="0.4"/>
    <line x1="0" y1="5" x2="60" y2="4.8" stroke="${lighter}" stroke-width="0.3" opacity="0.3"/>
    <line x1="0" y1="7.5" x2="60" y2="7.8" stroke="${darker}" stroke-width="0.4" opacity="0.3"/>
  </pattern>`;
}

export function grassPattern(id: string, baseColor = '#3a7d2e'): string {
  const light = lightenColor(baseColor, 20);
  const dark = darkenColor(baseColor, 15);
  return `<pattern id="${id}" width="20" height="12" patternUnits="userSpaceOnUse">
    <rect width="20" height="12" fill="${baseColor}"/>
    <path d="M2,12 Q2,6 4,4" stroke="${dark}" stroke-width="1" fill="none" opacity="0.5"/>
    <path d="M8,12 Q8,5 10,2" stroke="${light}" stroke-width="0.8" fill="none" opacity="0.5"/>
    <path d="M14,12 Q14,7 16,5" stroke="${dark}" stroke-width="0.7" fill="none" opacity="0.4"/>
    <path d="M18,12 Q19,8 17,3" stroke="${light}" stroke-width="0.6" fill="none" opacity="0.3"/>
  </pattern>`;
}

export function checkeredPattern(id: string, color1: string, color2: string, size = 15): string {
  return `<pattern id="${id}" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse">
    <rect width="${size * 2}" height="${size * 2}" fill="${color1}"/>
    <rect x="${size}" width="${size}" height="${size}" fill="${color2}"/>
    <rect y="${size}" width="${size}" height="${size}" fill="${color2}"/>
  </pattern>`;
}

export function starfieldPattern(id: string): string {
  return `<pattern id="${id}" width="100" height="100" patternUnits="userSpaceOnUse">
    <rect width="100" height="100" fill="none"/>
    <circle cx="10" cy="15" r="0.8" fill="#FFF" opacity="0.9"/>
    <circle cx="35" cy="8" r="0.5" fill="#FFF" opacity="0.6"/>
    <circle cx="55" cy="30" r="1" fill="#FFE" opacity="0.8"/>
    <circle cx="80" cy="12" r="0.6" fill="#FFF" opacity="0.7"/>
    <circle cx="25" cy="50" r="0.7" fill="#FFF" opacity="0.5"/>
    <circle cx="65" cy="60" r="0.9" fill="#FFE" opacity="0.8"/>
    <circle cx="90" cy="45" r="0.5" fill="#FFF" opacity="0.6"/>
    <circle cx="15" cy="80" r="0.8" fill="#FFF" opacity="0.7"/>
    <circle cx="45" cy="75" r="0.6" fill="#FFE" opacity="0.9"/>
    <circle cx="75" cy="90" r="0.7" fill="#FFF" opacity="0.5"/>
  </pattern>`;
}

export function tilesPattern(id: string, color = '#D4C4A8', groutColor = '#B0A088', size = 20): string {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <rect width="${size}" height="${size}" fill="${groutColor}"/>
    <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="0.5" fill="${color}"/>
  </pattern>`;
}

export function fabricPattern(id: string, color = '#8B4513'): string {
  const lighter = lightenColor(color, 10);
  return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="${color}"/>
    <path d="M0,0 L8,8 M8,0 L0,8" stroke="${lighter}" stroke-width="0.5" opacity="0.3"/>
  </pattern>`;
}

// ═══════════════════════════════════════════════════════════════
// CLIP PATHS & MASKS
// ═══════════════════════════════════════════════════════════════

export function circleClip(id: string, cx: number, cy: number, r: number): string {
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
}

export function rectClip(id: string, x: number, y: number, w: number, h: number, rx = 0): string {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>`;
}

export function fadeOutMask(id: string, direction: 'down' | 'up' | 'left' | 'right' = 'down'): string {
  const coords = {
    down: { x1: '0', y1: '0', x2: '0', y2: '1' },
    up: { x1: '0', y1: '1', x2: '0', y2: '0' },
    left: { x1: '1', y1: '0', x2: '0', y2: '0' },
    right: { x1: '0', y1: '0', x2: '1', y2: '0' },
  }[direction];
  return `<mask id="${id}">
    <rect width="100%" height="100%" fill="url(#${id}_grad)"/>
  </mask>
  <linearGradient id="${id}_grad" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">
    <stop offset="0%" stop-color="white"/>
    <stop offset="100%" stop-color="black"/>
  </linearGradient>`;
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

export function combineDefs(...defs: string[]): string {
  return defs.join('\n');
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0xFF) - Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// PRESET DEFS BUNDLES (common combinations for themes)
// ═══════════════════════════════════════════════════════════════

export function outdoorDefs(): string {
  return combineDefs(
    dropShadow('shadow', 2, 3, 3),
    gaussianBlur('bgBlur', 1.5),
    softGlow('glow', 8),
    dropShadow('softShadow', 1, 2, 2, 'rgba(0,0,0,0.15)'),
  );
}

export function indoorDefs(): string {
  return combineDefs(
    dropShadow('shadow', 2, 3, 3),
    dropShadow('softShadow', 1, 1, 2, 'rgba(0,0,0,0.15)'),
    lampGlowGradient('lampGlow'),
    softGlow('glow', 6, '#FFF3B0'),
    innerShadow('innerSh', 0, 2, 2),
  );
}

export function nightDefs(): string {
  return combineDefs(
    dropShadow('shadow', 2, 4, 4, 'rgba(0,0,0,0.5)'),
    gaussianBlur('bgBlur', 2),
    softGlow('glow', 10, '#B0C4FF'),
    softGlow('warmGlow', 8, '#FFD700'),
    starfieldPattern('stars'),
  );
}

export function fantasyDefs(): string {
  return combineDefs(
    dropShadow('shadow', 2, 3, 3),
    softGlow('magicGlow', 12, '#A855F7'),
    softGlow('glow', 8, '#FFFFFF'),
    gaussianBlur('bgBlur', 1.5),
  );
}
