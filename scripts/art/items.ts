/**
 * Item art: traps and bases (layered sprites on one 600x450 canvas),
 * baits, charms and crafting materials (512x512 thumbnails), and trap-type icons.
 */
import {
  P, OUTLINE as O, el, g, ol, line, circle, ellipse, rect, path, poly, shadow, glint, sparkle,
  hollyLeaf, berries, gear, snowflake, star, shade,
} from './lib.js';

/** Traps and bases share this canvas so they line up when layered (base below, trap on top). */
export const SPRITE_W = 600;
export const SPRITE_H = 450;
/** Y of the top surface of every base; traps stand on this line. */
export const FLOOR = 340;

// ---------------------------------------------------------------- traps

export const traps: Record<string, () => string> = {
  starlit_stocking: () =>
    g(
      {},
      // stocking leg and foot, toe resting on the base
      path('M250 110 L250 260 Q250 335 320 340 L395 340 Q440 340 440 300 Q440 262 398 258 L335 258 L335 110 Z', ol(P.red)),
      path('M262 180 L322 180 M262 220 L322 220', line(8, P.redDark)),
      path('M362 262 Q352 300 372 336', line(8, P.redDark)),
      // white cuff
      rect(232, 76, 122, 50, ol(P.cream), 18),
      circle(256, 96, 6, { fill: P.parchment }), circle(300, 106, 6, { fill: P.parchment }), circle(332, 92, 6, { fill: P.parchment }),
      // drawstring: a strand of tiny star-lights
      path('M232 112 Q180 140 190 190 Q196 220 176 236', line(7, P.goldDark)),
      path('M354 112 Q398 132 386 170', line(7, P.goldDark)),
      ...([[204, 132], [186, 172], [190, 208], [374, 124], [390, 156]] as const).map(([x, y]) =>
        g({}, circle(x, y, 15, { fill: P.goldBright, opacity: 0.35 }), star(x, y, 11, ol(P.goldBright, 4)))),
      circle(176, 244, 28, { fill: P.goldBright, opacity: 0.3 }),
      star(176, 244, 22, ol(P.goldBright, 6)),
      glint(270, 150, 0.8),
    ),

  jack_in_the_box: () =>
    g(
      {},
      // spring and lid
      path('M300 205 q-30 -12 0 -24 q30 -12 0 -24 q-30 -12 0 -24 q30 -12 0 -24', line(12, P.silverDark)),
      path('M300 205 q-30 -12 0 -24 q30 -12 0 -24 q-30 -12 0 -24 q30 -12 0 -24', line(5, P.silver)),
      // jaws on top of spring: a toothy lid
      path('M226 110 L374 110 L360 70 L240 70 Z', ol(P.gold)),
      path('M240 110 L252 128 L264 110 L276 128 L288 110 L300 128 L312 110 L324 128 L336 110 L348 128 L360 110', ol(P.cream, 6)),
      star(300, 88, 14, ol(P.red, 5)),
      // box
      rect(212, 205, 176, 140, ol(P.red), 10),
      rect(212, 205, 176, 26, ol(P.gold), 8),
      rect(212, 318, 176, 26, ol(P.gold), 8),
      star(300, 275, 30, ol(P.goldBright, 7)),
      // crank
      path('M388 270 L430 270 L430 236', line(12, P.ink)),
      path('M388 270 L430 270 L430 236', line(6, P.brass)),
      circle(430, 230, 13, ol(P.red, 7)),
      glint(236, 250, 0.7),
    ),

  star_lantern: () =>
    g(
      {},
      // beam of starlight spilling down onto the base
      path('M262 250 L160 340 L440 340 L338 250 Z', { fill: P.goldBright, opacity: 0.5 }),
      // hanging ring and cap
      circle(300, 74, 18, line(10, P.ink)), circle(300, 74, 18, line(5, P.brass)),
      path('M246 128 L300 92 L354 128 Z', ol(P.brass)),
      // glass body with brass frame
      rect(244, 128, 112, 150, ol(P.nightMid), 14),
      circle(300, 202, 50, { fill: P.nightLight }),
      star(300, 202, 40, ol(P.goldBright, 7)),
      star(300, 202, 16, { fill: P.white }),
      path('M256 140 L256 266', line(8, P.white)),
      path('M244 128 L244 278 M356 128 L356 278 M300 128 L300 140 M300 264 L300 278', line(10, P.brass)),
      // open shutters
      path('M244 136 L204 156 L204 262 L244 272 Z', ol(P.brass, 8)),
      path('M356 136 L396 156 L396 262 L356 272 Z', ol(P.brass, 8)),
      // base plate resting on the floor
      path('M230 278 L370 278 L384 340 L216 340 Z', ol(P.goldDark)),
      sparkle(178, 214, 14, P.goldBright), sparkle(424, 190, 12, P.goldBright), sparkle(410, 300, 9, P.white),
    ),

  icicle_jar: () =>
    g(
      {},
      // jar body
      path('M220 150 Q206 150 206 172 L206 312 Q206 342 236 342 L364 342 Q394 342 394 312 L394 172 Q394 150 380 150 Z', ol(P.frostLight)),
      path('M222 180 L222 310', line(14, P.white)),
      // icicle teeth round the rim
      path('M214 150 L226 196 L240 150 L254 210 L270 150 L284 190 L300 150 L316 214 L330 150 L346 196 L360 150 L374 206 L388 150', ol(P.frost, 6)),
      // rim and lid ring
      rect(204, 124, 192, 32, ol(P.frostDark), 10),
      rect(234, 100, 132, 26, ol(P.silver), 8),
      snowflake(300, 270, 38, P.frostDark, 7),
      sparkle(370, 250, 14, P.white),
      sparkle(248, 300, 10, P.white),
      // frosty mist
      ellipse(300, 340, 110, 10, { fill: P.white, opacity: 0.6 }),
    ),

  nutcracker_jaws: () =>
    g(
      {},
      // tall hat
      rect(232, 60, 136, 90, ol(P.red), 10),
      rect(222, 140, 156, 22, ol(P.gold), 8),
      star(300, 102, 20, ol(P.goldBright, 6)),
      // face
      rect(236, 160, 128, 70, ol(P.cookieLight), 8),
      circle(272, 190, 9, { fill: P.ink }), circle(328, 190, 9, { fill: P.ink }),
      path('M256 176 L286 182 M344 176 L314 182', line(7)),
      // wooden jaws, open
      path('M226 230 L374 230 L374 262 L226 262 Z', ol(P.cream)),
      path('M232 262 L244 282 L256 262 L268 282 L280 262 L292 282 L304 262 L316 282 L328 262 L340 282 L352 262 L364 282 L370 262', ol(P.white, 6)),
      path('M226 300 L374 300 L374 342 L226 342 Z', ol(P.cocoaLight)),
      path('M232 300 L244 284 L256 300 L268 284 L280 300 L292 284 L304 300 L316 284 L328 300 L340 284 L352 300 L364 284 L370 300', ol(P.white, 6)),
      // lever arm
      path('M374 320 L452 250', line(18, P.ink)),
      path('M374 320 L452 250', line(9, P.cocoa)),
      circle(452, 250, 12, ol(P.gold, 7)),
      // white beard tufts on sides
      circle(222, 246, 16, ol(P.white, 7)), circle(378, 246, 16, ol(P.white, 7)),
    ),

  constellation_wreath: () => {
    const stars: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = 300 + Math.cos(a) * 100;
      const y = 220 + Math.sin(a) * 100;
      const big = i % 2 === 0;
      stars.push(g({}, circle(x, y, big ? 30 : 20, { fill: P.goldBright, opacity: 0.3 }), star(x, y, big ? 24 : 15, ol(big ? P.goldBright : P.gold, 6))));
    }
    // a little constellation of lines joining some of the stars
    const pts = [0, 2, 3, 5, 7].map((i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      return `${(300 + Math.cos(a) * 100).toFixed(1)} ${(220 + Math.sin(a) * 100).toFixed(1)}`;
    });
    return g(
      {},
      // ring of night-blue enchanted wrapping
      circle(300, 220, 100, line(46, P.ink)),
      circle(300, 220, 100, line(34, P.nightMid)),
      circle(300, 220, 100, { ...line(6, P.nightLight), 'stroke-dasharray': '4 18' }),
      path(`M${pts.join(' L')}`, { ...line(3, P.white), opacity: 0.7 }),
      ...stars,
      // gold bow at the bottom resting on the base
      path('M300 318 L248 296 L250 342 Z', ol(P.gold, 8)),
      path('M300 318 L352 296 L350 342 Z', ol(P.gold, 8)),
      circle(300, 318, 14, ol(P.goldDark, 8)),
      path('M292 330 L276 346 M308 330 L324 346', line(10, P.ink)),
      sparkle(300, 220, 16, P.white),
    );
  },

  snow_globe_prison: () =>
    g(
      {},
      // plinth
      path('M220 340 L238 286 L362 286 L380 340 Z', ol(P.cocoa)),
      rect(232, 296, 136, 14, { fill: P.gold }),
      // glass
      circle(300, 190, 112, ol(P.frostLight)),
      // snow drift inside
      path('M198 236 Q240 214 280 232 Q320 248 360 226 Q390 214 400 232 Q392 280 300 302 Q210 282 198 236 Z', { fill: P.white }),
      // tiny barred door
      path('M276 248 L276 192 Q300 166 324 192 L324 248 Z', ol(P.nightLight, 7)),
      path('M288 186 L288 248 M300 178 L300 248 M312 186 L312 248', line(5, P.silver)),
      // drifting flakes
      circle(236, 150, 6, { fill: P.white }), circle(352, 130, 7, { fill: P.white }), circle(380, 190, 5, { fill: P.white }),
      circle(258, 104, 5, { fill: P.white }), circle(220, 200, 5, { fill: P.white }), circle(330, 160, 4, { fill: P.white }),
      path('M232 112 Q256 92 286 88', line(14, P.white)),
      circle(300, 190, 112, { fill: 'none', stroke: P.ink, 'stroke-width': O }),
    ),

  carol_horn: () =>
    g(
      {},
      // flared bell and tube
      path('M200 250 L400 150 L400 310 Z', ol(P.goldBright)),
      path('M200 250 Q150 250 150 210 Q150 170 190 170 L200 190', line(14, P.goldDark)),
      ellipse(400, 230, 26, 80, ol(P.goldDark, 8)),
      ellipse(400, 230, 14, 56, { fill: P.ink }),
      path('M200 250 L250 244 M250 250 L250 244', line(4, P.goldDark)),
      // ribbon and a rising note
      path('M230 215 Q250 260 230 300', line(10, P.pink)),
      path('M450 120 L450 70 L490 62 L490 108', line(8, P.goldBright)), circle(440, 124, 12, { fill: P.goldBright }), circle(480, 112, 12, { fill: P.goldBright }),
      glint(300, 190, 0.8),
    ),

  tidepool_pail: () =>
    g(
      {},
      // pail body and rim
      path('M214 340 L236 190 L364 190 L386 340 Z', ol(P.silver)),
      path('M226 250 L374 250 M222 290 L378 290', line(8, P.silverDark)),
      path('M228 190 Q300 168 372 190', line(14, P.silverDark)),
      // water with a wave
      path('M236 190 Q262 150 300 168 Q336 186 364 190 Z', ol('#2fa3b8')),
      path('M250 176 Q276 148 304 164', line(8, P.white)),
      // handle
      path('M236 200 Q300 90 364 200', line(10, P.cocoa)),
      // pearls
      circle(268, 120, 14, ol(P.white, 6)), circle(312, 98, 11, ol(P.white, 6)), circle(344, 134, 9, ol(P.white, 6)),
      glint(262, 114, 0.6),
    ),

  sleigh_bell_snapper: () =>
    g(
      {},
      // hinge spring
      path('M300 320 q-26 -10 0 -20 q26 -10 0 -20', line(10, P.silverDark)),
      // lower bell half (jaw)
      path('M190 300 Q190 342 300 342 Q410 342 410 300 Z', ol(P.goldDark)),
      path('M200 300 L216 282 L232 300 L248 282 L264 300 L280 282 L296 300 L312 282 L328 300 L344 282 L360 300 L376 282 L392 300', ol(P.white, 6)),
      // upper bell half, flipped open
      path('M196 236 Q196 112 300 112 Q404 112 404 236 Z', ol(P.gold)),
      path('M206 236 L222 254 L238 236 L254 254 L270 236 L286 254 L302 236 L318 254 L334 236 L350 254 L366 236 L382 254 L396 236', ol(P.white, 6)),
      path('M206 196 Q300 176 394 196', line(9, P.goldDark)),
      circle(300, 102, 16, ol(P.gold, 8)),
      // red ribbon
      path('M300 120 L256 92 L262 132 Z', ol(P.red, 7)),
      path('M300 120 L344 92 L338 132 Z', ol(P.red, 7)),
      glint(248, 160, 0.9),
      sparkle(430, 170, 14), sparkle(164, 230, 11),
    ),
};

// ---------------------------------------------------------------- bases

/** Shared slab outline: top face at FLOOR, front face below. */
function slab(top: string, front: string, x0 = 140, x1 = 460, depth = 70) {
  return g(
    {},
    shadow(300, FLOOR + depth + 12, (x1 - x0) / 2 + 20, 14),
    path(`M${x0} ${FLOOR} L${x0} ${FLOOR + depth} Q${x0} ${FLOOR + depth + 10} ${x0 + 10} ${FLOOR + depth + 10} L${x1 - 10} ${FLOOR + depth + 10} Q${x1} ${FLOOR + depth + 10} ${x1} ${FLOOR + depth} L${x1} ${FLOOR} Z`, ol(front)),
    path(`M${x0} ${FLOOR} L${x0 + 40} ${FLOOR - 40} L${x1 - 40} ${FLOOR - 40} L${x1} ${FLOOR} Z`, ol(top)),
  );
}

export const bases: Record<string, () => string> = {
  cardboard_box: () =>
    g(
      {},
      slab('#d1a46b', '#b5854d'),
      path('M300 300 L300 420', line(30, P.parchment)),
      path('M300 300 L300 420', line(30, P.ink, )),
      path('M300 300 L300 420', line(22, '#e8d3a0')),
      path('M170 360 L210 360 M180 384 L230 384', line(6, '#8e6434')),
      path('M384 398 q12 -14 24 0', line(6, '#8e6434')),
    ),

  gingerbread_slab: () =>
    g(
      {},
      slab(P.cookie, P.cocoaLight),
      // icing squiggle along front edge
      path('M146 352 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0', line(8, P.white)),
      circle(200, 394, 9, ol(P.red, 5)), circle(300, 398, 9, ol(P.holly, 5)), circle(400, 394, 9, ol(P.red, 5)),
      circle(230, 318, 4, { fill: P.cocoa }), circle(330, 322, 4, { fill: P.cocoa }), circle(390, 314, 4, { fill: P.cocoa }),
    ),

  candy_cane_platform: () => {
    const stripes: string[] = [];
    for (let x = 150; x < 430; x += 44) stripes.push(path(`M${x} ${FLOOR + 80} L${x + 26} ${FLOOR}`, line(16, P.red)));
    return g(
      {},
      slab(P.cream, P.cream),
      ...stripes,
      // re-stroke edges over the stripes
      path(`M140 ${FLOOR} L140 ${FLOOR + 70} Q140 ${FLOOR + 80} 150 ${FLOOR + 80} L450 ${FLOOR + 80} Q460 ${FLOOR + 80} 460 ${FLOOR + 70} L460 ${FLOOR}`, line(O)),
      path(`M140 ${FLOOR} L180 ${FLOOR - 40} L420 ${FLOOR - 40} L460 ${FLOOR}`, line(O)),
      // cane hooks at the corners
      path('M150 340 L150 270 Q150 240 178 240 Q206 240 206 268', line(26, P.ink)),
      path('M150 340 L150 270 Q150 240 178 240 Q206 240 206 268', line(16, P.cream)),
      path('M150 330 L150 312 M150 290 L156 262 M172 244 L192 248', line(10, P.red)),
      path('M450 340 L450 270 Q450 240 422 240 Q394 240 394 268', line(26, P.ink)),
      path('M450 340 L450 270 Q450 240 422 240 Q394 240 394 268', line(16, P.cream)),
      path('M450 330 L450 312 M450 290 L444 262 M428 244 L408 248', line(10, P.red)),
    );
  },

  ice_block: () =>
    g(
      {},
      slab(P.frostLight, P.frost),
      path('M170 370 L210 400 M240 360 L250 380 M360 390 L400 360', line(6, P.frostDark)),
      path('M150 352 L150 400', line(10, P.white)),
      path('M200 320 L260 320', line(8, P.white)),
      // dripping icicles
      path('M180 420 L188 446 L196 420 M300 420 L306 440 L312 420 M410 420 L420 448 L430 420', ol(P.frostLight, 5)),
      sparkle(430, 318, 12, P.white), sparkle(214, 384, 10, P.white),
    ),

  yule_log_base: () =>
    g(
      {},
      shadow(300, 434, 190, 14),
      // log body
      path('M150 290 L430 290 Q470 290 470 352 Q470 414 430 414 L150 414 Z', ol(P.cocoa)),
      path('M180 320 Q250 312 320 322 M200 360 Q280 352 380 364 M170 394 Q260 386 340 396', line(7, '#5c351d')),
      // cut end with rings
      ellipse(150, 352, 46, 62, ol(P.cookieLight)),
      ellipse(150, 352, 30, 42, line(5, P.cocoaLight)),
      ellipse(150, 352, 14, 20, line(5, P.cocoaLight)),
      // holly sprig and candle-ish glow
      hollyLeaf(340, 286, 58, -20, P.holly),
      hollyLeaf(392, 282, 54, 20, P.hollyLight),
      berries(366, 282, 10),
      // snow on top
      path('M190 292 Q230 276 270 290 Q300 278 320 290', line(14, P.white)),
    ),

  toffee_anvil: () =>
    g(
      {},
      shadow(300, 434, 190, 14),
      path('M150 330 L450 330 L430 350 Q390 362 380 380 L400 414 L200 414 L220 380 Q210 362 170 350 Z', ol(P.cookie)),
      path('M150 330 L450 330 L470 312 L190 312 Z', ol(P.cookieLight)),
      path('M230 372 Q300 360 372 374', line(7, P.cocoaLight)),
      path('M250 396 L340 396', line(6, P.white)),
      circle(300, 322, 4, { fill: P.white }),
    ),

  chestnut_brazier: () =>
    g(
      {},
      shadow(300, 434, 170, 14),
      path('M150 330 Q300 306 450 330 L420 392 L180 392 Z', ol('#5a5a64')),
      ellipse(300, 330, 150, 22, ol('#2b1d14')),
      ellipse(210, 326, 20, 12, ol(P.cocoaLight, 5)), ellipse(260, 322, 20, 12, ol(P.cocoaLight, 5)), ellipse(320, 324, 20, 12, ol(P.cocoaLight, 5)), ellipse(380, 326, 20, 12, ol(P.cocoaLight, 5)),
      path('M230 318 Q220 290 240 276 Q244 296 256 300 Q262 280 280 268 Q280 296 296 304 Q308 284 330 274 Q324 302 340 312', ol(P.red, 5)),
      path('M200 392 L180 424 M400 392 L420 424', line(10, P.ink)),
    ),

  wishbone_plinth: () =>
    g(
      {},
      slab(P.cream, '#e8d9b4', 190, 410, 60),
      path('M230 340 Q222 250 280 232 Q300 226 300 250 Q300 226 320 232 Q378 250 370 340', line(22, P.ink)),
      path('M230 340 Q222 250 280 232 Q300 226 300 250 Q300 226 320 232 Q378 250 370 340', line(14, P.cream)),
      path('M300 232 L300 214 M286 212 Q300 200 314 212', line(8, P.red)),
      sparkle(378, 260, 12, P.gold),
    ),

  sleigh_runner: () =>
    g(
      {},
      shadow(300, 434, 190, 14),
      path('M130 330 L470 330 L470 346 L130 346 Z', ol('#6b4a2b')),
      path('M120 410 Q130 410 460 410 Q490 410 490 380 Q490 350 460 350 L170 350 Q130 350 120 410 Z', ol(P.red)),
      path('M120 410 L120 360 Q120 330 150 330', line(10, P.gold)),
      path('M130 424 Q300 424 480 424', line(10, P.silver)),
      path('M200 330 L200 350 M300 330 L300 350 M400 330 L400 350', line(8, P.ink)),
      circle(250, 374, 11, ol(P.gold, 5)), circle(300, 374, 11, ol(P.gold, 5)), circle(350, 374, 11, ol(P.gold, 5)),
    ),

  gingerbread_cottage: () =>
    g(
      {},
      shadow(300, 434, 190, 14),
      path('M170 350 L170 414 L430 414 L430 350 Z', ol(P.cookie)),
      path('M150 354 L300 270 L450 354 Z', ol(P.cocoaLight)),
      path('M160 352 Q190 372 220 352 Q250 372 280 352 Q310 372 340 352 Q370 372 400 352 Q420 366 440 352', line(10, P.white)),
      rect(274, 372, 52, 42, ol(P.cocoa)),
      rect(194, 372, 38, 30, ol(P.gold)), rect(368, 372, 38, 30, ol(P.gold)),
      circle(300, 316, 10, ol(P.red, 5)),
    ),

  wishing_star_pedestal: () =>
    g(
      {},
      shadow(300, 434, 170, 14),
      slab('#34408a', '#232d66', 190, 410, 74),
      star(300, 276, 50, ol(P.gold, 7)),
      circle(300, 276, 14, { fill: P.cream }),
      sparkle(236, 250, 12, P.white), sparkle(364, 246, 12, P.white), sparkle(330, 330, 9, P.gold),
    ),
};

// ---------------------------------------------------------------- baits (512 square)

export const baits: Record<string, () => string> = {
  ribbon_candy: () =>
    g(
      {},
      shadow(256, 430, 160),
      // a wrapped candy with twisted ends and ribbon stripes
      path('M120 256 L60 196 L70 316 Z', ol(P.red)),
      path('M392 256 L452 196 L442 316 Z', ol(P.red)),
      ellipse(256, 256, 140, 96, ol(P.cream)),
      ...[0, 1, 2, 3].map((i) => path(`M${170 + i * 56} 168 Q${150 + i * 56} 256 ${170 + i * 56} 344`, line(18, i % 2 ? P.holly : P.red))),
      glint(210, 210, 0.9),
    ),

  golden_bow_bonbon: () =>
    g(
      {},
      shadow(256, 430, 150),
      circle(256, 290, 120, ol(P.cocoa)),
      path('M150 250 Q256 200 362 250', line(10, P.goldBright)),
      // golden bow on top
      path('M256 170 C200 110 150 150 190 190 C210 210 240 196 256 176 Z', ol(P.goldBright)),
      path('M256 170 C312 110 362 150 322 190 C302 210 272 196 256 176 Z', ol(P.goldBright)),
      circle(256, 176, 18, ol(P.gold)),
      path('M246 190 L220 250 M266 190 L292 250', line(10, P.goldBright)),
      sparkle(360, 140, 18), sparkle(150, 330, 14),
    ),

  glitter_gumdrop: () =>
    g(
      {},
      shadow(256, 430, 150),
      path('M130 380 Q130 190 256 170 Q382 190 382 380 Z', ol(P.goldBright)),
      path('M170 340 Q170 230 256 214', line(10, P.cream)),
      sparkle(190, 260, 14), sparkle(320, 300, 12), sparkle(280, 220, 10),
      // tiny bow
      path('M256 170 C216 130 186 160 214 184 C230 196 248 184 256 174 Z', ol(P.gold)),
      path('M256 170 C296 130 326 160 298 184 C282 196 264 184 256 174 Z', ol(P.gold)),
      circle(256, 174, 12, ol(P.gold)),
      glint(300, 230, 0.8),
    ),

  pantry_crumbs: () =>
    g(
      {},
      shadow(256, 420, 150),
      circle(190, 330, 34, ol('#b98d58')), circle(290, 350, 26, ol('#b98d58')), circle(340, 300, 20, ol('#b98d58')),
      circle(240, 280, 16, ol('#b98d58', 6)), circle(150, 390, 12, ol('#b98d58', 5)), circle(380, 380, 11, ol('#b98d58', 5)),
      circle(200, 322, 7, { fill: P.cocoa }), circle(298, 346, 6, { fill: P.cocoa }),
    ),

  gingersnap: () =>
    g(
      {},
      shadow(256, 420, 150),
      circle(256, 270, 140, ol('#a8672c')),
      circle(256, 270, 100, line(8, '#c98a4c')),
      path('M170 230 L256 180 L342 230 M200 330 L256 360 L312 330', line(8, P.cream)),
      circle(256, 270, 14, ol(P.goldBright, 6)),
    ),

  hay_biscuit: () =>
    g(
      {},
      shadow(256, 420, 160),
      path('M120 330 Q120 210 256 210 Q392 210 392 330 Q392 390 256 390 Q120 390 120 330 Z', ol('#d9b45a')),
      path('M170 250 L210 380 M230 230 L260 385 M290 232 L312 384 M345 260 L350 372', line(8, '#a8832f')),
      path('M150 200 L190 150 M256 190 L256 130 M360 200 L330 150', line(10, '#d9b45a')),
    ),

  spiced_honey_drop: () =>
    g(
      {},
      shadow(256, 420, 150),
      path('M256 120 Q380 260 380 330 Q380 420 256 420 Q132 420 132 330 Q132 260 256 120 Z', ol(P.gold)),
      path('M190 330 Q190 280 240 220', line(12, P.cream)),
      circle(300, 340, 10, ol(P.red, 5)), circle(260, 370, 8, ol(P.red, 5)),
      sparkle(350, 190, 14), glint(210, 260, 0.8),
    ),

  gilded_cocoa: () =>
    g(
      {},
      shadow(256, 430, 160),
      path('M140 220 L372 220 L352 400 Q352 420 332 420 L180 420 Q160 420 160 400 Z', ol(P.goldBright)),
      path('M372 250 Q440 250 436 320 Q432 370 360 366', line(14, P.gold)),
      ellipse(256, 222, 114, 26, ol(P.cocoa)),
      path('M200 200 Q190 150 215 110 M260 200 Q250 150 275 110 M320 200 Q310 150 335 110', line(8, P.cream)),
      sparkle(190, 320, 16), sparkle(320, 350, 14), glint(200, 260, 0.9),
    ),

  honey_lozenge: () =>
    g(
      {},
      shadow(256, 420, 150),
      ellipse(256, 300, 140, 110, ol(P.gold)),
      ellipse(256, 290, 100, 72, ol(P.goldBright)),
      path('M180 290 Q256 220 332 290 Q256 340 180 290 Z', line(10, P.cream)),
      path('M230 392 Q230 440 250 440 Q268 440 268 410', ol(P.gold)),
      glint(200, 250, 0.8),
    ),

  stale_cookie: () =>
    g(
      {},
      shadow(256, 420, 150),
      path('M256 110 C350 110 402 180 402 256 C402 340 340 402 256 402 C172 402 110 340 110 256 C110 230 116 206 128 186 L160 200 L170 168 L150 150 C178 124 214 110 256 110 Z', ol('#b98d58')),
      // crack
      path('M240 140 L262 200 L236 236 L274 300', line(8, P.cocoa)),
      // chips and mould spots
      circle(320, 200, 14, ol(P.cocoa, 6)), circle(190, 300, 13, ol(P.cocoa, 6)), circle(330, 330, 12, ol(P.cocoa, 6)),
      circle(204, 230, 9, { fill: '#8fa36b' }), circle(300, 368, 8, { fill: '#8fa36b' }), circle(360, 256, 7, { fill: '#8fa36b' }),
      // crumbs
      circle(132, 404, 8, ol('#b98d58', 5)), circle(170, 430, 6, ol('#b98d58', 5)), circle(380, 420, 7, ol('#b98d58', 5)),
    ),

  sugar_cookie: () =>
    g(
      {},
      shadow(256, 430, 150),
      star(256, 266, 170, ol(P.cookieLight), 0.55),
      star(256, 266, 140, { fill: P.cream }, 0.55),
      ...([[230, 210, P.red], [290, 240, P.holly], [250, 300, P.frostDark], [300, 320, P.red], [200, 290, P.gold], [270, 180, P.pink], [320, 280, P.gold], [220, 350, P.holly]] as const).map(
        ([x, y, c], i) => rect(Number(x) - 12, Number(y) - 4, 24, 8, { fill: String(c), transform: `rotate(${i * 40} ${x} ${y})` }, 4),
      ),
      glint(210, 190, 0.8),
    ),

  peppermint_bark: () =>
    g(
      {},
      shadow(256, 430, 170),
      // dark chocolate layer
      path('M90 300 L140 200 L390 170 L430 290 L380 380 L130 400 Z', ol(P.cocoa)),
      // white layer slightly up
      path('M100 280 L148 186 L384 158 L420 270 L372 350 L138 372 Z', ol(P.cream)),
      // crushed candy bits
      ...([[170, 240], [230, 210], [300, 200], [350, 250], [250, 290], [190, 320], [320, 320], [380, 210], [280, 250]] as const).map(([x, y], i) =>
        poly([[x - 14, y - 6], [x + 10, y - 14], [x + 14, y + 8], [x - 8, y + 12]], { ...ol(i % 2 ? P.red : P.white, 5), transform: `rotate(${i * 35} ${x} ${y})` }),
      ),
      path('M138 372 L130 400 M372 350 L380 380 M420 270 L430 290', line(O)),
    ),

  fruitcake: () =>
    g(
      {},
      shadow(256, 420, 170),
      // loaf: top, side, front slice
      path('M96 230 L176 160 L420 160 L420 340 L340 410 L96 410 Z', ol(P.cocoa)),
      path('M96 230 L176 160 L420 160 L340 230 Z', ol(P.cocoaLight)),
      path('M340 230 L420 160 L420 340 L340 410 Z', ol('#5c351d')),
      // fruit bits on front face
      ...([[140, 280, P.red], [200, 320, P.holly], [260, 270, P.orange], [300, 350, P.red], [150, 370, P.goldBright], [240, 380, P.holly], [310, 290, P.goldBright], [200, 260, P.red]] as const).map(
        ([x, y, c]) => rect(Number(x) - 13, Number(y) - 10, 26, 20, ol(String(c), 5), 6),
      ),
      // icing drizzle and cherry
      path('M120 210 Q160 230 190 196 Q230 226 260 190 Q300 226 330 196 Q370 222 400 176', line(14, P.white)),
      circle(250, 170, 22, ol(P.red, 7)),
      path('M250 150 Q256 120 280 110', line(6, P.holly)),
    ),

  hot_cocoa: () =>
    g(
      {},
      shadow(256, 440, 150),
      // steam
      path('M200 130 q-20 -30 0 -60 M256 120 q20 -30 0 -60 M312 130 q-20 -30 0 -60', line(10, P.white)),
      // handle
      path('M370 230 Q440 230 440 300 Q440 370 360 370', line(40, P.ink)),
      path('M370 230 Q440 230 440 300 Q440 370 360 370', line(22, P.red)),
      // mug
      path('M130 170 L382 170 L366 400 Q362 430 330 430 L182 430 Q150 430 146 400 Z', ol(P.red)),
      path('M150 230 L366 230 M154 290 L362 290', line(14, P.white)),
      path('M150 230 L366 230 M154 290 L362 290', line(6, P.redDark)),
      // cocoa surface and marshmallows
      ellipse(256, 170, 126, 30, ol(P.cocoa)),
      rect(196, 146, 40, 32, ol(P.white, 6), 8), rect(240, 152, 40, 32, ol(P.cream, 6), 8), rect(284, 144, 40, 32, ol(P.white, 6), 8),
      snowflake(256, 356, 30, P.white, 7),
    ),
};

// ---------------------------------------------------------------- charms (512 square)

export const charms: Record<string, () => string> = {
  mistletoe_charm: () =>
    g(
      {},
      // red ribbon loop at top
      path('M256 60 C210 60 210 120 256 130 C302 120 302 60 256 60 Z', ol(P.red)),
      path('M256 130 L220 190 M256 130 L292 190', line(16, P.ink)),
      path('M256 130 L220 190 M256 130 L292 190', line(8, P.red)),
      // mistletoe leaves: paired soft ovals
      ...([[-55, 200, 150], [55, 312, 150], [-30, 180, 250], [30, 332, 250], [-70, 186, 330], [70, 326, 330]] as const).map(([rot, x, y]) =>
        ellipse(x, y, 70, 30, { ...ol(P.hollyLight), transform: `rotate(${rot} ${x} ${y})` }),
      ),
      path('M256 140 L256 380', line(10, P.pine)),
      // white berries
      circle(240, 270, 20, ol(P.white, 7)), circle(276, 280, 20, ol(P.cream, 7)), circle(256, 306, 20, ol(P.white, 7)),
      circle(246, 370, 18, ol(P.white, 7)), circle(274, 380, 16, ol(P.cream, 7)),
      sparkle(130, 400, 20), sparkle(400, 120, 16),
    ),

  jingle_bell_charm: () =>
    g(
      {},
      shadow(256, 460, 130),
      // ribbon bow
      path('M256 140 L176 94 L170 170 Z', ol(P.red)),
      path('M256 140 L336 94 L342 170 Z', ol(P.red)),
      path('M240 150 L210 230 M272 150 L302 230', line(14, P.redDark)),
      // bell sphere
      circle(256, 300, 140, ol(P.gold)),
      path('M124 280 Q256 250 388 280', line(12, P.goldDark)),
      path('M132 320 Q256 290 380 320', line(6, P.goldDark)),
      // slot
      path('M200 372 Q256 392 312 372', line(20, P.ink)),
      circle(200, 372, 14, { fill: P.ink }), circle(312, 372, 14, { fill: P.ink }),
      circle(256, 150, 26, ol(P.redDark)),
      glint(196, 226, 1.3),
      sparkle(430, 210, 18), sparkle(86, 360, 14),
    ),

  windup_key_charm: () =>
    g(
      {},
      shadow(256, 450, 140),
      // bow of the key: two loops
      path('M256 250 C140 290 90 200 150 150 C200 110 240 170 256 250 Z', ol(P.brass)),
      path('M256 250 C372 290 422 200 362 150 C312 110 272 170 256 250 Z', ol(P.brass)),
      ellipse(176, 188, 24, 18, { fill: P.goldDark, transform: 'rotate(-30 176 188)' }),
      ellipse(336, 188, 24, 18, { fill: P.goldDark, transform: 'rotate(30 336 188)' }),
      // shaft
      rect(234, 240, 44, 180, ol(P.gold), 10),
      rect(222, 412, 68, 28, ol(P.goldDark), 8),
      circle(256, 250, 32, ol(P.goldBright)),
      gear(256, 250, 24, 8, P.goldDark, 5, 0.3),
      glint(246, 320, 0.7),
      sparkle(420, 360, 16), sparkle(90, 380, 12),
    ),

  cheer_bauble: () =>
    g(
      {},
      shadow(256, 450, 130),
      rect(226, 70, 60, 50, ol(P.gold), 10),
      path('M256 70 C256 40 300 40 300 70', line(10, P.ink)),
      circle(256, 280, 150, ol(P.red)),
      path('M130 250 Q256 300 382 250', line(22, P.gold)),
      path('M124 310 Q256 360 388 310', line(10, P.goldBright)),
      glint(200, 200, 1.4),
      sparkle(410, 140, 18), sparkle(96, 380, 14),
    ),

  tinsel_cheer_charm: () =>
    g(
      {},
      shadow(256, 450, 140),
      path('M110 200 C170 120 220 280 280 200 C340 120 380 260 410 190', line(40, P.ink)),
      path('M110 200 C170 120 220 280 280 200 C340 120 380 260 410 190', line(26, P.gold)),
      path('M100 320 C170 250 230 400 290 320 C350 250 390 380 420 310', line(40, P.ink)),
      path('M100 320 C170 250 230 400 290 320 C350 250 390 380 420 310', line(26, P.red)),
      sparkle(150, 100, 18), sparkle(400, 410, 20), sparkle(250, 60, 14),
    ),

  gold_star_cheer_charm: () =>
    g(
      {},
      shadow(256, 460, 140),
      path('M256 60 L306 190 L446 198 L336 286 L374 424 L256 346 L138 424 L176 286 L66 198 L206 190 Z', ol(P.gold, 12)),
      path('M256 120 L290 206 L384 212 L312 272 L336 364 L256 312 L176 364 L200 272 L128 212 L222 206 Z', { fill: P.goldBright }),
      glint(220, 190, 1.2),
      sparkle(430, 90, 18), sparkle(80, 380, 14),
    ),
};

// ---------------------------------------------------------------- materials (512 square)

export const materials: Record<string, () => string> = {
  sugar_twist: () =>
    g(
      {},
      shadow(256, 420, 150),
      // a pulled-sugar curl
      path('M140 360 C120 260 240 220 260 280 C280 340 170 340 200 260 C230 180 360 170 370 250 C380 330 290 340 300 270', { fill: 'none', stroke: P.ink, 'stroke-width': 46, 'stroke-linecap': 'round' }),
      path('M140 360 C120 260 240 220 260 280 C280 340 170 340 200 260 C230 180 360 170 370 250 C380 330 290 340 300 270', { fill: 'none', stroke: P.pink, 'stroke-width': 30, 'stroke-linecap': 'round' }),
      path('M140 360 C120 260 240 220 260 280 C280 340 170 340 200 260 C230 180 360 170 370 250', { fill: 'none', stroke: P.white, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '18 26' }),
      glint(330, 210, 0.8),
    ),

  candied_peel: () =>
    g(
      {},
      shadow(256, 420, 160),
      ...([[170, 300, -20, P.orange], [300, 260, 25, P.goldBright], [250, 360, 5, P.orange], [350, 360, -30, '#e85a3a']] as const).map(([x, y, r, c]) =>
        g(
          { transform: `translate(${x} ${y}) rotate(${r})` },
          path('M-90 0 Q-80 -60 0 -60 Q80 -60 90 0 L60 0 Q55 -32 0 -32 Q-55 -32 -60 0 Z', ol(String(c))),
          path('M-70 -6 Q-62 -44 0 -46 Q62 -44 70 -6', line(5, P.cream)),
        ),
      ),
      ...([[160, 180], [340, 170], [410, 270], [110, 360], [280, 140]] as const).map(([x, y]) => rect(x - 6, y - 6, 12, 12, { fill: P.white, transform: `rotate(45 ${x} ${y})` })),
    ),

  sugar_glass: () =>
    g(
      {},
      shadow(256, 430, 150),
      poly([[256, 70], [330, 200], [300, 420], [210, 420], [180, 200]], ol(P.frostLight)),
      poly([[150, 220], [200, 260], [190, 420], [120, 410], [110, 290]], ol(P.pink)),
      poly([[360, 200], [410, 280], [400, 410], [320, 420], [330, 290]], ol(P.frost)),
      path('M256 70 L250 420 M180 200 L330 200', line(5, P.white)),
      glint(230, 160, 1.1), glint(380, 260, 0.7), sparkle(140, 150, 16, P.white),
    ),

  cookie_tin: () =>
    g(
      {},
      shadow(256, 440, 180),
      // tin body
      path('M86 230 L86 370 Q86 430 256 430 Q426 430 426 370 L426 230 Z', ol(P.holly)),
      path('M86 300 Q86 340 256 340 Q426 340 426 300', line(12, P.gold)),
      // lid
      ellipse(256, 230, 170, 58, ol(P.red)),
      ellipse(256, 222, 150, 44, ol(P.redLight, 6)),
      star(256, 220, 34, ol(P.goldBright, 6)),
      // dent and imp tooth marks
      path('M380 380 l10 14 l10 -14 l10 14', line(6, P.ink)),
      glint(130, 370, 0.8),
    ),

  brass_spring: () => {
    let d = 'M180 400 ';
    for (let i = 0; i < 7; i++) {
      const y = 380 - i * 40;
      d += `C120 ${y} 120 ${y - 40} 256 ${y - 40} C392 ${y - 40} 392 ${y} 256 ${y} `;
    }
    return g(
      {},
      shadow(256, 430, 140),
      path(d, line(34, P.ink)),
      path(d, line(20, P.brass)),
      path(d, { ...line(6, P.goldBright), 'stroke-dasharray': '18 40' }),
      sparkle(410, 140, 18), sparkle(110, 300, 12),
    );
  },

  golden_ribbon: () =>
    g(
      {},
      shadow(256, 440, 140),
      // tails
      path('M240 270 L160 430 L196 420 L210 450 L270 290 Z', ol(P.goldDark)),
      path('M272 270 L352 430 L316 420 L302 450 L242 290 Z', ol(P.gold)),
      // loops
      path('M256 250 C150 120 70 200 110 280 C140 330 210 300 256 250 Z', ol(P.gold)),
      path('M256 250 C362 120 442 200 402 280 C372 330 302 300 256 250 Z', ol(P.gold)),
      path('M140 240 Q180 220 220 250 M372 240 Q332 220 292 250', line(8, P.goldDark)),
      ellipse(256, 256, 40, 48, ol(P.goldBright)),
      glint(160, 210, 0.8), sparkle(420, 120, 18), sparkle(96, 120, 12),
    ),

  enchanted_wrapping: () =>
    g(
      {},
      shadow(256, 440, 170),
      // folded wrapping paper sheet
      path('M100 140 L380 100 L420 380 L140 430 Z', ol(P.purple)),
      path('M380 100 L420 380 L340 300 Z', ol(P.purpleLight)),
      ...([[170, 190], [260, 170], [200, 300], [300, 260], [230, 380], [340, 360], [150, 360]] as const).map(([x, y], i) =>
        star(x, y, 18, { fill: i % 2 ? P.goldBright : P.white }),
      ),
      // magic swirl
      path('M70 260 Q130 200 180 250 Q230 300 280 230', { ...line(6, P.goldBright), 'stroke-dasharray': '2 14' }),
      sparkle(440, 160, 22), sparkle(80, 420, 16), sparkle(420, 430, 12, P.white),
    ),

  toymakers_gear: () =>
    g(
      {},
      shadow(256, 450, 160),
      gear(256, 250, 170, 12, P.brass, O, 0.32),
      circle(256, 250, 110, line(8, P.goldDark)),
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * Math.PI) / 3;
        return circle(256 + Math.cos(a) * 82, 250 + Math.sin(a) * 82, 12, ol(P.goldDark, 5));
      }),
      glint(170, 160, 1),
    ),

  clockwork_heart: () =>
    g(
      {},
      shadow(256, 450, 150),
      path('M256 430 C120 330 70 250 90 180 C110 110 200 90 256 160 C312 90 402 110 422 180 C442 250 392 330 256 430 Z', ol(P.red)),
      // window showing gears inside
      circle(256, 250, 92, ol(P.cream)),
      gear(222, 230, 52, 10, P.brass, 7, 0.3),
      gear(298, 282, 40, 8, P.goldDark, 7, 0.3),
      gear(286, 196, 26, 7, P.silver, 6, 0.3),
      // rivets
      ...([[130, 190], [382, 190], [190, 360], [322, 360]] as const).map(([x, y]) => circle(x, y, 9, ol(P.gold, 5))),
      glint(150, 170, 0.9), sparkle(430, 400, 16),
    ),

  hymn_reed: () =>
    g(
      {},
      shadow(256, 420, 150),
      ...([[190, -8], [256, 0], [322, 8]] as const).map(([x, r]) => g({ transform: `rotate(${r} ${x} 400)` }, path(`M${x} 400 Q${x - 10} 260 ${x + 6} 100`, line(30, P.ink)), path(`M${x} 400 Q${x - 10} 260 ${x + 6} 100`, line(18, '#e8dcb0')))),
      path('M170 280 L340 280', line(16, P.ink)), path('M170 280 L340 280', line(8, P.red)),
      glint(300, 140, 0.7),
    ),

  carol_songsheet: () =>
    g(
      {},
      shadow(256, 430, 170),
      path('M130 90 L370 80 L384 150 L366 200 L384 280 L370 430 L136 440 L150 340 L128 270 L144 180 Z', ol(P.cream)),
      ...[150, 190, 230, 270, 310].map((y) => path(`M160 ${y} H350`, line(4, P.ink))),
      circle(200, 230, 12, { fill: P.ink }), circle(250, 210, 12, { fill: P.ink }), circle(300, 250, 12, { fill: P.ink }),
      path('M212 230 V170 M262 210 V150 M312 250 V190', line(5, P.ink)),
      path('M170 380 Q200 360 230 380 T290 380', line(5, P.cocoa)),
    ),

  silver_sleighbell: () =>
    g(
      {},
      shadow(256, 450, 140),
      // leather strap
      path('M60 140 Q256 60 452 140', line(46, P.ink)),
      path('M60 140 Q256 60 452 140', line(32, P.cocoa)),
      path('M60 140 Q256 60 452 140', { ...line(5, P.cocoaLight), 'stroke-dasharray': '14 12' }),
      rect(240, 92, 32, 60, ol(P.silverDark, 7), 6),
      circle(256, 290, 140, ol(P.silver)),
      path('M124 270 Q256 240 388 270', line(12, P.silverDark)),
      path('M200 362 Q256 382 312 362', line(20, P.ink)),
      circle(200, 362, 14, { fill: P.ink }), circle(312, 362, 14, { fill: P.ink }),
      glint(196, 220, 1.3),
      sparkle(430, 300, 18, P.white), sparkle(84, 330, 14, P.white),
    ),

  steam_pearl: () =>
    g(
      {},
      shadow(256, 440, 130),
      circle(256, 290, 130, ol(P.white, 12)),
      circle(256, 290, 130, { fill: '#cfeef6', opacity: 0.7 }),
      path('M200 250 Q230 200 280 214', line(14, P.white)),
      path('M226 160 Q200 110 240 70 Q262 40 244 10', line(12, P.silver)),
      glint(210, 246, 0.8),
    ),

  brimstone_coal: () =>
    g(
      {},
      shadow(256, 440, 170),
      circle(256, 280, 170, { fill: P.orange, opacity: 0.25 }),
      poly([[120, 300], [170, 180], [270, 130], [380, 190], [410, 310], [330, 410], [190, 410]], ol(P.coal)),
      poly([[170, 180], [270, 130], [260, 250]], { fill: '#544a4d' }),
      poly([[380, 190], [410, 310], [300, 280]], { fill: '#2a2426' }),
      // glowing cracks
      path('M200 300 L250 270 L240 340 L300 320 M320 230 L350 270', line(16, P.ink)),
      path('M200 300 L250 270 L240 340 L300 320 M320 230 L350 270', line(9, P.orange)),
      path('M200 300 L250 270 L240 340 L300 320 M320 230 L350 270', line(3, P.goldBright)),
      // smoke curl
      path('M270 120 q-30 -30 0 -60 q30 -30 0 -60', line(12, P.silverDark)),
    ),
};

// ---------------------------------------------------------------- trap types (256 square)

export const trapTypes: Record<string, () => string> = {
  clockwork: () => g({}, circle(128, 128, 116, ol(P.cream, 8)), gear(128, 128, 84, 10, P.brass, 8, 0.32)),
  starlight: () =>
    g(
      {},
      circle(128, 128, 116, ol(P.night, 8)),
      circle(128, 130, 84, { fill: P.nightLight }),
      star(128, 132, 74, ol(P.goldBright, 8), 0.42),
      sparkle(66, 70, 14, P.white), sparkle(192, 186, 10, P.white), sparkle(196, 64, 8, P.goldBright),
    ),
  frost: () => g({}, circle(128, 128, 116, ol(P.cream, 8)), circle(128, 128, 82, ol(P.frostLight, 8)), snowflake(128, 128, 64, P.frostDark, 12)),
  tide: () =>
    g(
      {},
      circle(128, 128, 116, ol('#0d4a5c', 8)),
      circle(128, 130, 84, { fill: '#2fa3b8' }),
      path('M128 52 C164 98 184 122 184 150 A56 56 0 0 1 72 150 C72 122 92 98 128 52 Z', ol(P.white, 8)),
      path('M92 196 Q128 214 164 196', line(8, P.white)),
      sparkle(196, 66, 10, P.white),
    ),
  carol: () =>
    g(
      {},
      circle(128, 128, 116, ol('#7a2a47', 8)),
      circle(128, 130, 84, { fill: '#c24d77' }),
      path('M104 176 V82 L178 66 V158', line(14, P.goldBright)), circle(86, 178, 22, { fill: P.goldBright }), circle(160, 160, 22, { fill: P.goldBright }),
      sparkle(196, 60, 10, P.white),
    ),
};

// Draw traps and bases 20% larger around the floor point so they fill their thumbnails,
// while the trap still stands exactly on the base's top surface.
const grow = (draw: () => string) => () => g({ transform: `translate(300 ${FLOOR}) scale(1.2) translate(-300 -${FLOOR})` }, draw());
for (const table of [traps, bases]) for (const id of Object.keys(table)) table[id] = grow(table[id]!);

// keep the import list honest for helpers only some drawings use
void el; void shade;
