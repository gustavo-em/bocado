#!/usr/bin/env node
/**
 * Bocado brand assets — single source of truth for the symbol geometry.
 *
 * Writes the SVG masters in assets/brand/ and rasterises every platform
 * asset from the same numbers, so the vector on disk and the PNG in the
 * launcher can never drift apart. Edit the geometry here, never the outputs.
 *
 *   node scripts/generate-brand-assets.mjs            # everything
 *   node scripts/generate-brand-assets.mjs --size-test # docs/design/brand-size-test.png
 *
 * The symbol ("o bocado") lives in the Android adaptive-icon frame: 108 × 108
 * dp, safe zone = circle Ø 66 dp centred at (54, 54). Every other output is a
 * scaled placement of that frame. There is no size-specific cut: the mark is
 * one solid disc with one bite, and it has no thin feature to protect.
 *
 * Only `sharp` (already a devDependency) is used; no other packages.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// process.argv[1] rather than import.meta.url: the project's ESLint parser
// does not accept import.meta, and Node always hands us an absolute path here.
const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_APPICON = path.join(
  ROOT,
  'ios',
  'Bocado',
  'Images.xcassets',
  'AppIcon.appiconset',
);
const DESIGN_DIR = path.join(ROOT, 'docs', 'design');

// --- Palette (mirrors src/theme/colors.ts; keep in sync by hand) ------------
const COLOR = {
  bone: '#F7F4EE', // light background
  ink: '#1B1D21', // light ink
  indigo: '#2F3A8C', // light accent
  line: '#E3DFD6', // light hairline
  graphite: '#15161A', // dark background
  inkDark: '#ECEAE4', // dark ink
  indigoDark: '#93A0F2', // dark accent
};

// --- Geometry ---------------------------------------------------------------
/**
 * The symbol in the 108-frame: one ink disc with one circular bite taken out
 * of it. One closed path, one fill, one idea — "o bocado", the mouthful.
 *
 *   R 26        → Ø 52, Material's circle keyline for a round mark
 *   r 13, d 21  → the bite opens 59.4° of the rim and eats in to 8 dp from the
 *                 centre. Smaller and it is a nibble; a bite centre outside
 *                 the disc (d ≥ R) would leave a crescent, which reads moon.
 *   axis −45°   → up and to the right, the only angle the mark is drawn at
 *   offset 2.5  → the bitten shape's area centroid sits 5.0 dp opposite the
 *                 bite (lens area 366.0 of the disc's 2123.7). Half of that is
 *                 corrected: fully corrected, a circular mark reads visibly
 *                 off-centre in the frame; uncorrected, it reads bottom-left
 *                 heavy. Farthest point from (54, 54) is 28.5 ≤ 33 dp, so the
 *                 mark stays inside the adaptive icon's safe zone.
 *
 * The previous mark ("tigela e bocado", a walled half-ring with a dot inside)
 * is recorded in docs/BRAND.md §4.6 together with the reason it was replaced.
 */
const MARK = { R: 26, r: 13, d: 21, axisDeg: -45, offset: 2.5 };
/** The mark's bounding box is the host disc itself: 52 × 52 in frame units. */
const MARK_WIDTH = 2 * MARK.R;

const DEG = Math.PI / 180;

/** Unit vector of the bite axis, in SVG coordinates (y grows downward). */
const AXIS = {
  x: Math.cos(MARK.axisDeg * DEG),
  y: Math.sin(MARK.axisDeg * DEG),
};

const n = v => Number(v.toFixed(3)).toString();

/**
 * The symbol at scale `k` with the host disc's centre on (cx, cy).
 *
 * With `frame`, (cx, cy) receives the 108-frame's centre (54, 54) instead and
 * the disc takes its optical offset from there — which is what every icon
 * output wants, since the offset is a correction inside that frame. Without
 * it the disc lands exactly on the point given, which is what the splash and
 * the lockup want, where the mark's own box is what must be placed.
 */
function markAt(k, cx, cy, { frame = false } = {}) {
  const ox = frame ? cx + MARK.offset * AXIS.x * k : cx;
  const oy = frame ? cy + MARK.offset * AXIS.y * k : cy;
  return {
    cx: ox,
    cy: oy,
    R: MARK.R * k,
    r: MARK.r * k,
    bx: ox + MARK.d * AXIS.x * k,
    by: oy + MARK.d * AXIS.y * k,
  };
}

/**
 * The two points where the bite circle crosses the disc's rim — the ends of
 * the bite's mouth. The first is the one on the positive side of the axis.
 */
function biteEnds({ cx, cy, R, r, bx, by }) {
  const dx = bx - cx;
  const dy = by - cy;
  const d = Math.hypot(dx, dy);
  const a = (d * d + R * R - r * r) / (2 * d);
  const h = Math.sqrt(Math.max(0, R * R - a * a));
  const ux = dx / d;
  const uy = dy / d;
  const px = cx + a * ux;
  const py = cy + a * uy;
  return [
    { x: px - h * uy, y: py + h * ux },
    { x: px + h * uy, y: py - h * ux },
  ];
}

/**
 * The mark: the rim the long way round (300.6°, so large-arc), then back
 * along the part of the bite circle that lies inside the disc (193.9°, also
 * large-arc, swept the other way — that is the notch). One closed path, no
 * counterform and no island, so the stencil and the monochrome layer are this
 * same path with a different fill.
 */
function lunePath(g) {
  const [i1, i2] = biteEnds(g);
  return [
    `M${n(i1.x)} ${n(i1.y)}`,
    `A${n(g.R)} ${n(g.R)} 0 1 1 ${n(i2.x)} ${n(i2.y)}`,
    `A${n(g.r)} ${n(g.r)} 0 1 0 ${n(i1.x)} ${n(i1.y)}`,
    'Z',
  ].join('');
}

/**
 * The piece that was bitten off: exactly the lens the mark is missing, so the
 * two together tile back into a whole disc. This is what leaves in the
 * opening — it is the mark's own removed area, not a decoration.
 */
function morselPath(g) {
  const [i1, i2] = biteEnds(g);
  return [
    `M${n(i2.x)} ${n(i2.y)}`,
    `A${n(g.R)} ${n(g.R)} 0 0 1 ${n(i1.x)} ${n(i1.y)}`,
    `A${n(g.r)} ${n(g.r)} 0 0 0 ${n(i2.x)} ${n(i2.y)}`,
    'Z',
  ].join('');
}

/** The mark as it is everywhere except the launch window: already bitten. */
function symbolMarkup(g, fill) {
  return `  <path fill="${fill}" d="${lunePath(g)}"/>`;
}

/**
 * The disc before the bite, drawn as one circle rather than lune + morsel so
 * no antialiased seam shows on a launch window that may sit there a while.
 */
function wholeMarkup(g, fill) {
  return `  <circle fill="${fill}" cx="${n(g.cx)}" cy="${n(g.cy)}" r="${n(
    g.R,
  )}"/>`;
}

const GENERATED =
  '<!-- Generated by scripts/generate-brand-assets.mjs. Edit the geometry there, not this file. -->';

function svgDoc({ width, height, viewBox, body, extraAttrs = '' }) {
  const size =
    width !== undefined ? ` width="${width}" height="${height ?? width}"` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    GENERATED,
    `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="${viewBox}"${extraAttrs}>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

// --- SVG masters ------------------------------------------------------------
function markSvg({ mono = false } = {}) {
  const g = markAt(1, 54, 54, { frame: true });
  return svgDoc({
    viewBox: '0 0 108 108',
    body: [
      '  <!-- Grid: 108×108 dp, safe zone Ø66 at (54,54). Disc R26 centred at',
      '       (55.768, 52.232) — 2.5 dp along the −45° bite axis. Bite r13 at',
      '       d21 on the same axis. Margins: 28.5 dp from the frame centre to',
      '       the farthest point, 23.5 dp of clear frame around the disc. -->',
      symbolMarkup(g, mono ? 'currentColor' : COLOR.ink),
    ].join('\n'),
  });
}

function iconForegroundSvg() {
  return svgDoc({
    width: 108,
    viewBox: '0 0 108 108',
    body: [
      '  <!-- Adaptive icon foreground. Safe zone: circle Ø66 at (54,54). Disc Ø52 = Material circle keyline. -->',
      symbolMarkup(markAt(1, 54, 54, { frame: true }), COLOR.ink),
    ].join('\n'),
  });
}

function iconBackgroundSvg() {
  return svgDoc({
    width: 108,
    viewBox: '0 0 108 108',
    body: `  <rect width="108" height="108" fill="${COLOR.bone}"/>`,
  });
}

/**
 * iOS 1024. The launcher shows 72 of the 108 dp on Android; here the whole
 * square is visible, so 72 dp ↔ 1024 px keeps the symbol the same size on
 * both home screens. No rounded corners: the system applies the mask.
 */
const IOS_K = 1024 / 72;
function iosIconSvg({ appearance = 'light' } = {}) {
  const g = markAt(IOS_K, 512, 512, { frame: true });
  if (appearance === 'tinted') {
    // Grayscale on transparent: iOS maps luminance to the user's tint.
    return svgDoc({
      width: 1024,
      viewBox: '0 0 1024 1024',
      body: symbolMarkup(g, '#FFFFFF'),
    });
  }
  if (appearance === 'dark') {
    // Transparent ground: iOS paints its own dark gradient behind it.
    return svgDoc({
      width: 1024,
      viewBox: '0 0 1024 1024',
      body: symbolMarkup(g, COLOR.inkDark),
    });
  }
  return svgDoc({
    width: 1024,
    viewBox: '0 0 1024 1024',
    body: [
      `  <rect width="1024" height="1024" fill="${COLOR.bone}"/>`,
      symbolMarkup(g, COLOR.ink),
    ].join('\n'),
  });
}

/**
 * Splash symbol, 96 × 96 dp, the disc 56 dp wide (launcher shows it at ~35 dp;
 * the splash may be larger but must stay quiet).
 *
 * The launch window draws the disc *whole*: the opening is where the bite is
 * taken, so the app's own overlay continues from this exact image. The disc is
 * centred on the asset rather than placed in the 108-frame, because the window
 * centres the bitmap and the overlay centres its mark — anything else and the
 * mark would jump by the optical offset the moment JavaScript takes over.
 */
/**
 * The one number the opening is built on. `src/app/SplashOverlay.tsx` draws
 * the mark at exactly this, and both launch-window assets below are authored
 * so the platform lands on it too — otherwise the disc changes size the
 * instant JavaScript takes over.
 */
const SPLASH_MARK_DP = 56;
const SPLASH_K = SPLASH_MARK_DP / MARK_WIDTH;
function splashSvg({ dark = false } = {}) {
  const g = markAt(SPLASH_K, 48, 48);
  return svgDoc({
    width: 96,
    viewBox: '0 0 96 96',
    body: wholeMarkup(g, dark ? COLOR.inkDark : COLOR.ink),
  });
}

/**
 * The same disc for the Android 12+ SplashScreen API, which does not honour a
 * bitmap's intrinsic size: it scales `windowSplashScreenAnimatedIcon` to fill
 * its own icon canvas. With an icon background colour set — as `values-v31`
 * does — that canvas is 240 × 240 dp, and the platform documents 160 dp as the
 * largest circle the artwork may occupy.
 *
 * So the canvas is authored at 240 dp with the disc still `SPLASH_MARK_DP`
 * wide inside it. Scaled 1:1 onto the canvas, the disc reaches the screen at
 * 56 dp on API 31+ exactly as it does through the pre-31 layer list, and the
 * hand-over to the overlay is the same size on both paths. Feeding the 96 dp
 * asset here instead would have blown the disc up to 140 dp.
 */
const SPLASH_ICON_V31_DP = 240;
function splashIconV31PngSvg(px, { dark }) {
  const g = markAt((px / SPLASH_ICON_V31_DP) * SPLASH_K, px / 2, px / 2);
  return svgDoc({
    width: px,
    viewBox: `0 0 ${px} ${px}`,
    body: wholeMarkup(g, dark ? COLOR.inkDark : COLOR.ink),
  });
}

/**
 * Lockup: symbol + "bocado" in Fraunces 144 Soft Regular, referenced by
 * font-family (not embedded). Font size 200, and the mark is the bitten "o":
 * Ø 0.464 em, its floor on the baseline and its top on the x-height, each
 * overshooting 0.01 em exactly like a round lowercase letter. Measured from
 * the TTF: x-height 0.444 em, ascender 0.736 em, "bocado" advance 2.838 em.
 */
const LOCKUP = (() => {
  const em = 200;
  const ascender = 0.736 * em; // 147.2
  const xHeight = 0.444 * em; // 88.8
  const baseline = ascender; // the ascender line is y = 0
  const overshoot = 0.01 * em; // 2
  const diameter = xHeight + 2 * overshoot; // 0.464 em
  const k = diameter / MARK_WIDTH;
  const radius = diameter / 2;
  const g = markAt(k, radius, baseline + overshoot - radius);
  const gap = 0.22 * em; // 44
  const textX = diameter + gap;
  const textWidth = 2.838 * em;
  return {
    em,
    g,
    baseline,
    textX,
    width: Math.ceil(textX + textWidth),
    height: Math.ceil(baseline + 0.02 * em),
  };
})();

function lockupSvg({ mono = false } = {}) {
  const { em, g, baseline, textX, width, height } = LOCKUP;
  const fill = mono ? 'currentColor' : COLOR.ink;
  return svgDoc({
    viewBox: `0 0 ${width} ${height}`,
    body: [
      symbolMarkup(g, fill),
      `  <text x="${n(textX)}" y="${n(
        baseline,
      )}" font-family="Fraunces144Soft-Regular, 'Fraunces 144 Soft', Fraunces, Georgia, serif" font-weight="400" font-size="${em}" letter-spacing="${n(
        -0.015 * em,
      )}" fill="${fill}">bocado</text>`,
    ].join('\n'),
  });
}

// --- Raster helpers ---------------------------------------------------------
async function writeText(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}

async function rasterise(svg, file) {
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  return file;
}

/** Symbol on a transparent square of `px`, frame 108 ↔ px. */
function foregroundPngSvg(px) {
  const k = px / 108;
  const g = markAt(k, px / 2, px / 2, { frame: true });
  return svgDoc({
    width: px,
    viewBox: `0 0 ${px} ${px}`,
    body: symbolMarkup(g, COLOR.ink),
  });
}

/**
 * Legacy launcher icon (API 24–25): a 44/48 shape on a transparent canvas,
 * bone fill with a hairline so it keeps an edge on white wallpapers. The
 * symbol is scaled as if the shape were the 72 dp visible area of the
 * adaptive icon, so both generations look the same size on the home screen.
 */
function legacyPngSvg(px, { round }) {
  const shape = (44 / 48) * px;
  const inset = (px - shape) / 2;
  const k = shape / 72;
  const g = markAt(k, px / 2, px / 2, { frame: true });
  const stroke = Math.max(1, px / 48);
  const ground = round
    ? `  <circle cx="${n(px / 2)}" cy="${n(px / 2)}" r="${n(
        shape / 2 - stroke / 2,
      )}" fill="${COLOR.bone}" stroke="${COLOR.line}" stroke-width="${n(
        stroke,
      )}"/>`
    : `  <rect x="${n(inset + stroke / 2)}" y="${n(
        inset + stroke / 2,
      )}" width="${n(shape - stroke)}" height="${n(shape - stroke)}" rx="${n(
        shape * 0.2,
      )}" fill="${COLOR.bone}" stroke="${COLOR.line}" stroke-width="${n(
        stroke,
      )}"/>`;
  return svgDoc({
    width: px,
    viewBox: `0 0 ${px} ${px}`,
    body: [ground, symbolMarkup(g, COLOR.ink)].join('\n'),
  });
}

function splashPngSvg(px, { dark }) {
  const k = (px / 96) * SPLASH_K;
  const g = markAt(k, px / 2, px / 2);
  return svgDoc({
    width: px,
    viewBox: `0 0 ${px} ${px}`,
    body: wholeMarkup(g, dark ? COLOR.inkDark : COLOR.ink),
  });
}

// --- Android XML -------------------------------------------------------------
const ADAPTIVE_XML = ({ monochrome }) =>
  [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    '    <background android:drawable="@color/ic_launcher_background"/>',
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>',
    ...(monochrome
      ? [
          '    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>',
        ]
      : []),
    '</adaptive-icon>',
    '',
  ].join('\n');

const BACKGROUND_COLOR_XML = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<resources>',
  `    <color name="ic_launcher_background">${COLOR.bone}</color>`,
  '</resources>',
  '',
].join('\n');

/**
 * The window the app opens on: the brand ground with the symbol in the middle
 * and nothing else. It is also what the status and navigation bars take, so
 * the launch and the first screen are one surface.
 */
const SPLASH_COLOR_XML = dark =>
  [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Generated by scripts/generate-brand-assets.mjs; mirrors src/theme/colors.ts. -->',
    '<resources>',
    `    <color name="splash_background">${
      dark ? COLOR.graphite : COLOR.bone
    }</color>`,
    '</resources>',
    '',
  ].join('\n');

/**
 * The launch window itself. The density buckets already hold the light and
 * night symbol, so one layer list serves both: the colour and the bitmap are
 * each resolved for the configuration in play.
 */
const SPLASH_DRAWABLE_XML = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<!-- Generated by scripts/generate-brand-assets.mjs. -->',
  '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">',
  '    <item android:drawable="@color/splash_background"/>',
  '    <item>',
  '        <bitmap android:gravity="center" android:src="@drawable/splash_icon"/>',
  '    </item>',
  '</layer-list>',
  '',
].join('\n');

/** Themed-icon layer: the system recolours it, so the fill is nominal. */
function monochromeVectorXml() {
  const g = markAt(1, 54, 54, { frame: true });
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Generated by scripts/generate-brand-assets.mjs from the same geometry as assets/brand/bocado-mark-mono.svg. -->',
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:width="108dp"',
    '    android:height="108dp"',
    '    android:viewportWidth="108"',
    '    android:viewportHeight="108">',
    `    <path android:fillColor="#FF000000" android:pathData="${lunePath(
      g,
    )}"/>`,
    '</vector>',
    '',
  ].join('\n');
}

// --- iOS Contents.json -------------------------------------------------------
const IOS_CONTENTS = {
  images: [
    {
      filename: 'AppIcon.png',
      idiom: 'universal',
      platform: 'ios',
      size: '1024x1024',
    },
    {
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
      filename: 'AppIcon-Dark.png',
      idiom: 'universal',
      platform: 'ios',
      size: '1024x1024',
    },
    {
      appearances: [{ appearance: 'luminosity', value: 'tinted' }],
      filename: 'AppIcon-Tinted.png',
      idiom: 'universal',
      platform: 'ios',
      size: '1024x1024',
    },
  ],
  info: { author: 'xcode', version: 1 },
};

// --- Density tables ----------------------------------------------------------
const DENSITIES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

// --- Main --------------------------------------------------------------------
async function generateAll() {
  const written = [];
  const w = async (file, content) =>
    written.push(await writeText(file, content));
  const r = async (svg, file) => written.push(await rasterise(svg, file));

  // SVG masters
  await w(path.join(BRAND_DIR, 'bocado-mark.svg'), markSvg());
  await w(
    path.join(BRAND_DIR, 'bocado-mark-mono.svg'),
    markSvg({ mono: true }),
  );
  await w(
    path.join(BRAND_DIR, 'bocado-icon-foreground.svg'),
    iconForegroundSvg(),
  );
  await w(
    path.join(BRAND_DIR, 'bocado-icon-background.svg'),
    iconBackgroundSvg(),
  );
  await w(path.join(BRAND_DIR, 'bocado-icon-ios.svg'), iosIconSvg());
  await w(path.join(BRAND_DIR, 'bocado-lockup.svg'), lockupSvg());
  await w(
    path.join(BRAND_DIR, 'bocado-lockup-mono.svg'),
    lockupSvg({ mono: true }),
  );
  await w(path.join(BRAND_DIR, 'bocado-splash.svg'), splashSvg());

  // Android rasters
  for (const [bucket, scale] of DENSITIES) {
    const dir = path.join(ANDROID_RES, `mipmap-${bucket}`);
    await r(
      foregroundPngSvg(108 * scale),
      path.join(dir, 'ic_launcher_foreground.png'),
    );
    await r(
      legacyPngSvg(48 * scale, { round: false }),
      path.join(dir, 'ic_launcher.png'),
    );
    await r(
      legacyPngSvg(48 * scale, { round: true }),
      path.join(dir, 'ic_launcher_round.png'),
    );
    await r(
      splashPngSvg(96 * scale, { dark: false }),
      path.join(ANDROID_RES, `drawable-${bucket}`, 'splash_icon.png'),
    );
    await r(
      splashPngSvg(96 * scale, { dark: true }),
      path.join(ANDROID_RES, `drawable-night-${bucket}`, 'splash_icon.png'),
    );
    await r(
      splashIconV31PngSvg(SPLASH_ICON_V31_DP * scale, { dark: false }),
      path.join(ANDROID_RES, `drawable-${bucket}`, 'splash_icon_v31.png'),
    );
    await r(
      splashIconV31PngSvg(SPLASH_ICON_V31_DP * scale, { dark: true }),
      path.join(ANDROID_RES, `drawable-night-${bucket}`, 'splash_icon_v31.png'),
    );
  }

  // Android XML
  await w(
    path.join(ANDROID_RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
    ADAPTIVE_XML({ monochrome: false }),
  );
  await w(
    path.join(ANDROID_RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
    ADAPTIVE_XML({ monochrome: false }),
  );
  await w(
    path.join(ANDROID_RES, 'mipmap-anydpi-v33', 'ic_launcher.xml'),
    ADAPTIVE_XML({ monochrome: true }),
  );
  await w(
    path.join(ANDROID_RES, 'mipmap-anydpi-v33', 'ic_launcher_round.xml'),
    ADAPTIVE_XML({ monochrome: true }),
  );
  await w(
    path.join(ANDROID_RES, 'values', 'ic_launcher_background.xml'),
    BACKGROUND_COLOR_XML,
  );
  await w(
    path.join(ANDROID_RES, 'drawable', 'ic_launcher_monochrome.xml'),
    monochromeVectorXml(),
  );
  await w(
    path.join(ANDROID_RES, 'values', 'splash.xml'),
    SPLASH_COLOR_XML(false),
  );
  await w(
    path.join(ANDROID_RES, 'values-night', 'splash.xml'),
    SPLASH_COLOR_XML(true),
  );
  await w(
    path.join(ANDROID_RES, 'drawable', 'splash_background.xml'),
    SPLASH_DRAWABLE_XML,
  );
  await w(
    path.join(ANDROID_RES, 'drawable-night', 'splash_background.xml'),
    SPLASH_DRAWABLE_XML,
  );

  // iOS
  await r(iosIconSvg(), path.join(IOS_APPICON, 'AppIcon.png'));
  await r(
    iosIconSvg({ appearance: 'dark' }),
    path.join(IOS_APPICON, 'AppIcon-Dark.png'),
  );
  await r(
    iosIconSvg({ appearance: 'tinted' }),
    path.join(IOS_APPICON, 'AppIcon-Tinted.png'),
  );
  await w(
    path.join(IOS_APPICON, 'Contents.json'),
    JSON.stringify(IOS_CONTENTS, null, 2) + '\n',
  );

  return written;
}

/**
 * Contact sheet for the brand tests, at real pixel sizes (no magnification):
 * iOS 29/40/60 pt @1x on light, mid-grey and dark grounds; Android 48 px
 * with circle and squircle masks; mono black/white and a stencil cut.
 */
async function sizeTest() {
  const tiles = [];
  const iosTile = (px, ground) => {
    const k = px / 1024;
    const g = markAt(IOS_K * k, px / 2, px / 2, { frame: true });
    const rx = px * 0.2237;
    return svgDoc({
      width: px,
      viewBox: `0 0 ${px} ${px}`,
      body: [
        `  <clipPath id="m"><rect width="${px}" height="${px}" rx="${n(
          rx,
        )}"/></clipPath>`,
        `  <g clip-path="url(#m)"><rect width="${px}" height="${px}" fill="${
          ground === 'dark' ? '#0B0B0D' : COLOR.bone
        }"/>`,
        symbolMarkup(g, ground === 'dark' ? COLOR.inkDark : COLOR.ink),
        '  </g>',
      ].join('\n'),
    });
  };
  const androidTile = (px, shape) => {
    const k = px / 72; // launcher shows 72 dp of the 108 frame at 48 dp
    const g = markAt(k, px / 2, px / 2, { frame: true });
    const mask =
      shape === 'circle'
        ? `<circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}"/>`
        : `<rect width="${px}" height="${px}" rx="${n(px * 0.3)}"/>`;
    return svgDoc({
      width: px,
      viewBox: `0 0 ${px} ${px}`,
      body: [
        `  <clipPath id="m">${mask}</clipPath>`,
        `  <g clip-path="url(#m)"><rect width="${px}" height="${px}" fill="${COLOR.bone}"/>`,
        symbolMarkup(g, COLOR.ink),
        '  </g>',
      ].join('\n'),
    });
  };
  const monoTile = (px, fg, bg) => {
    const k = px / 72;
    const g = markAt(k, px / 2, px / 2, { frame: true });
    return svgDoc({
      width: px,
      viewBox: `0 0 ${px} ${px}`,
      body: [
        `  <rect width="${px}" height="${px}" fill="${bg}"/>`,
        symbolMarkup(g, fg),
      ].join('\n'),
    });
  };
  /**
   * The opening's first frame, drawn the way the app draws it: the mark plus
   * the morsel it is missing. If these two do not tile back into a clean disc,
   * the launch window and the overlay do not match and the hand-over shows.
   */
  const openingTile = px => {
    const k = px / 72;
    const g = markAt(k, px / 2, px / 2, { frame: true });
    return svgDoc({
      width: px,
      viewBox: `0 0 ${px} ${px}`,
      body: [
        `  <rect width="${px}" height="${px}" fill="${COLOR.bone}"/>`,
        `  <path fill="${COLOR.ink}" d="${lunePath(g)}"/>`,
        `  <path fill="${COLOR.ink}" d="${morselPath(g)}"/>`,
      ].join('\n'),
    });
  };
  const stencilTile = px => {
    const k = px / 72;
    const g = markAt(k, px / 2, px / 2, { frame: true });
    return svgDoc({
      width: px,
      viewBox: `0 0 ${px} ${px}`,
      body: [
        `  <mask id="s"><rect width="${px}" height="${px}" fill="#fff"/>${symbolMarkup(
          g,
          '#000',
        )}</mask>`,
        `  <rect width="${px}" height="${px}" fill="${COLOR.ink}" mask="url(#s)"/>`,
      ].join('\n'),
    });
  };

  const push = (svg, size, label) => tiles.push({ svg, size, label });
  for (const px of [29, 40, 60])
    push(iosTile(px, 'light'), px, `iOS ${px} claro`);
  for (const px of [29, 40, 60])
    push(iosTile(px, 'dark'), px, `iOS ${px} escuro`);
  push(androidTile(48, 'circle'), 48, 'Android 48 círculo');
  push(androidTile(48, 'squircle'), 48, 'Android 48 squircle');
  push(androidTile(24, 'circle'), 24, 'Android 24');
  push(monoTile(48, '#000000', '#FFFFFF'), 48, 'mono preto');
  push(monoTile(48, '#FFFFFF', '#000000'), 48, 'mono branco');
  push(stencilTile(48), 48, 'estêncil');
  push(openingTile(48), 48, 'abertura');

  // Lay out on a mid-grey sheet (a typical wallpaper luminance).
  const pad = 24;
  const cell = 96;
  const width = pad * 2 + tiles.length * cell;
  const height = 176;
  const base = sharp({
    create: { width, height, channels: 4, background: '#8A8A8A' },
  });
  const composites = [];
  for (let i = 0; i < tiles.length; i += 1) {
    const { svg, size } = tiles[i];
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    composites.push({
      input: buf,
      left: Math.round(pad + i * cell + (cell - size) / 2),
      top: Math.round((height - 40 - size) / 2),
    });
  }
  const labels = svgDoc({
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    body: tiles
      .map(
        (t, i) =>
          `  <text x="${pad + i * cell + cell / 2}" y="${
            height - 16
          }" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#111">${
            t.label
          }</text>`,
      )
      .join('\n'),
  });
  composites.push({ input: Buffer.from(labels), left: 0, top: 0 });
  const file = path.join(DESIGN_DIR, 'brand-size-test.png');
  await mkdir(DESIGN_DIR, { recursive: true });
  await base.composite(composites).png().toFile(file);
  return [file];
}

const args = new Set(process.argv.slice(2));
const files = args.has('--size-test') ? await sizeTest() : await generateAll();
for (const f of files) console.log(path.relative(ROOT, f));
console.log(`${files.length} files written`);
