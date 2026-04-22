// ARTG2252 FINAL PROJECT FINAL PROTOTYPE
// BIG TY TO CLAUDE CODE FOR FIXING AND KEEPING TRACK OF EVERYTHING AND MY FRIENDS FOR MAKING THIS POSSIBLE
// POND SIMULATOR FINAL VERSION

// going the simulation/relaxing route. Main function is to have on my second screen while I study for a relaxing touch. What to add?
// Flora surroundings, cattails, bushes, grass. Seabed, seaweed, flow side to side (like balloon string)
// Storm simulation. Rain, Thunder, flashes up the entire program to show a lightning strike. Calculated and generated lighting bolts sometimes visual, rolling clouds, storm timer.
//STORM = WIND = EXCESSIVELY MOVING EVERYTHING
// Day-night cycle, adjustable by the user.
// COLOR MUST CHANGE BASED ON ENVIROMENT VARIABLES. MUST BUILD LOGIC BEHIND THIS
// OPACITY MUST CHANGE AS WELL. Based on water depth, and enviroment.
// FLORA SHOULD MOVE DEPENDING ON ENVIRO WEATHER! Wind simulation, intensity differences.
// I want to retain one photorealistic part for an uncanny touch. (WILL BE GEESE)
// All else will be vector drawn.
// ANIMALS MUST INTERACT! Fundemental interaction part. Ducks will be able to eat the fish, if they so choose. Maybe interactable other stuff? (Lilypads chosen)
// Feeding animals! Add feeding tools to attract the two animal types.
// must have a Clear button

// AUDIO BELONGS TO BATTLESTATE GAMES
// PORTED BACK TO P5 FOR AUDIO (for some reason couldnt get it to work otherwise)

new p5(function (p) { //port
  const W = 1920,
    H = 1080;
  const SHORE_TOP = 220;
  const WATER_TOP = 300;
  const WATER_BOT = 980;
  const BED_Y = 865;

  // UI geometry
  const TOOLBAR_Y = H - 46;
  const SLIDER_X = 150,
    SLIDER_Y = H - 30,
    SLIDER_W = 170;
  const RELOCATE_BTN = { x: W - 160, y: 16, w: 144, h: 30 };

  // Duck AI tuning -- how far a duck will swim toward prey or food
  const DUCK_DIVE_RANGE = 220;
  const DUCK_FOOD_RANGE = 240;

  // Storm phase IDs: (0) clear, (1) building, (2) peak, (3) fading
  const STORM_CLEAR = 0;
  const STORM_BUILDING = 1;
  const STORM_PEAK = 2;
  const STORM_FADING = 3;

  // Sky color keyframes: [time, topR, topG, topB, botR, botG, botB]
  const SKY_KEYS = [
    [0.0, 8, 8, 35, 12, 12, 50],
    [0.18, 10, 10, 38, 14, 14, 52],
    [0.23, 60, 30, 70, 200, 100, 70],
    [0.32, 95, 155, 225, 150, 205, 252],
    [0.5, 78, 148, 218, 135, 198, 252],
    [0.65, 78, 148, 218, 135, 198, 252],
    [0.71, 195, 75, 38, 235, 155, 55],
    [0.77, 170, 45, 28, 210, 90, 35],
    [0.83, 40, 20, 60, 55, 25, 72],
    [0.9, 12, 10, 40, 16, 14, 55],
    [1.0, 8, 8, 35, 12, 12, 50],
  ];

  // Night-dim keyframes: [time, dim]  (0 = full day, 1 = full night)
  const NIGHT_DIM_KEYS = [
    [0.0, 1.0],
    [0.18, 1.0],
    [0.26, 0.0],
    [0.7, 0.0],
    [0.8, 0.5],
    [0.88, 1.0],
    [1.0, 1.0],
  ];

  // Simulation state
  let wavePhase = 0;
  let timeOfDay = 0.3;
  let daySpeed = 1.0;
  let feedMode = "duck";
  let relocating = false;

  let ripples = [],
    fish = [],
    ducks = [],
    geese = [],
    clouds = [];
  let raindrops = [],
    rocks = [];
  let duckFood = [],
    fishFood = [],
    cattails = [],
    shorelineBushes = [],
    lilyPads = [];
  let pondWeeds = [],
    mudPatches = [];
  let catchParticles = [];
  let uiButtons = [];

  let dragging = null,
    dragOffX = 0,
    dragOffY = 0;
  let nextGooseTimer = 300;
  let lastDuckFeedFrame = 0,
    lastFishFeedFrame = 0;

  // --- sound state ---
  let thunderSounds = []; // thunder1, thunder2, thunder3
  let rainLoop = null; // rain1
  let idleLoop = null; // idle1 (daytime ambience)
  let nightLoop = null; // night1 (grasshoppers)

  let lastThunderFrame = -9999;
  let currentAmbience = null; // 'idle', 'rain', 'night'

  // Storm state
  let stormPhase = STORM_CLEAR;
  let stormIntensity = 0;
  let stormTimer = 0;
  let stormHoldFrames = 0;
  let stormDurationSec = 0;

  // Lightning state
  let lightningAlpha = 0;
  let lightningSegs = [];
  let nextLightningTimer = 0;

  // ---- WATER WAVES ----

  function getWaveY(x) {
    let stormExtra =
      stormIntensity *
      (p.sin(x * 0.025 + wavePhase * 1.8) * 8 +
        p.sin(x * 0.05 - wavePhase) * 4);
    return (
      WATER_TOP +
      p.sin(x * 0.018 + wavePhase) * 5 +
      p.sin(x * 0.038 - wavePhase * 0.7) * 2.5 +
      stormExtra
    );
  }

  function getSunPos() {
    let angle = (timeOfDay - 0.25) * p.TWO_PI;
    return {
      x: W * 0.5 + p.cos(angle - p.HALF_PI) * (W * 0.55),
      y: SHORE_TOP - p.sin(angle - p.HALF_PI) * 160,
    };
  }

  function getMoonPos() {
    let angle = (timeOfDay - 0.75) * p.TWO_PI;
    return {
      x: W * 0.5 + p.cos(angle - p.HALF_PI) * (W * 0.55),
      y: SHORE_TOP - p.sin(angle - p.HALF_PI) * 160,
    };
  }

  function getSkyColors() {
    let t = timeOfDay;
    let k0 = SKY_KEYS[0],
      k1 = SKY_KEYS[SKY_KEYS.length - 1];
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
      if (t >= SKY_KEYS[i][0] && t <= SKY_KEYS[i + 1][0]) {
        k0 = SKY_KEYS[i];
        k1 = SKY_KEYS[i + 1];
        break;
      }
    }
    let f = p.constrain((t - k0[0]) / (k1[0] - k0[0]), 0, 1);
    f = f * f * (3 - 2 * f); // smoothstep
    let c = {
      topR: p.lerp(k0[1], k1[1], f),
      topG: p.lerp(k0[2], k1[2], f),
      topB: p.lerp(k0[3], k1[3], f),
      botR: p.lerp(k0[4], k1[4], f),
      botG: p.lerp(k0[5], k1[5], f),
      botB: p.lerp(k0[6], k1[6], f),
    };
    if (stormIntensity > 0) {
      let s = stormIntensity * 0.65;
      c.topR = p.lerp(c.topR, 52, s);
      c.topG = p.lerp(c.topG, 55, s);
      c.topB = p.lerp(c.topB, 62, s);
      c.botR = p.lerp(c.botR, 72, s);
      c.botG = p.lerp(c.botG, 75, s);
      c.botB = p.lerp(c.botB, 85, s);
    }
    return c;
  }

  // returns 0..1 golden-hour intensity, peaks near sunset (golden hour)
  function getGolden() {
    if (stormIntensity > 0.3) return 0;
    let t = timeOfDay;
    if (t > 0.68 && t < 0.8) {
      return p.sin(((t - 0.68) / 0.12) * p.PI) * (1 - stormIntensity * 3);
    }
    return 0;
  }

  // Returns 0 = full day, 1 = full night
  function getNightDim() {
    let t = timeOfDay;
    let k0 = NIGHT_DIM_KEYS[0],
      k1 = NIGHT_DIM_KEYS[NIGHT_DIM_KEYS.length - 1];
    for (let i = 0; i < NIGHT_DIM_KEYS.length - 1; i++) {
      if (t >= NIGHT_DIM_KEYS[i][0] && t <= NIGHT_DIM_KEYS[i + 1][0]) {
        k0 = NIGHT_DIM_KEYS[i];
        k1 = NIGHT_DIM_KEYS[i + 1];
        break;
      }
    }
    let f = p.constrain((t - k0[0]) / (k1[0] - k0[0]), 0, 1);
    f = f * f * (3 - 2 * f);
    return p.lerp(k0[1], k1[1], f);
  }

  function getSunVisible() {
    let t = timeOfDay;
    if (t < 0.22 || t > 0.78) return 0;
    let v = 1;
    if (t < 0.27) v = p.map(t, 0.22, 0.27, 0, 1);
    if (t > 0.73) v = p.map(t, 0.73, 0.78, 1, 0);
    return v * p.max(0, 1 - stormIntensity * 2);
  }

  function getMoonVisible() {
    let t = timeOfDay;
    if (t > 0.2 && t < 0.88) return 0;
    if (t > 0.88) return p.map(t, 0.88, 0.93, 0, 1);
    if (t <= 0.15) return 1;
    return p.map(t, 0.15, 0.2, 1, 0);
  }

  function getWaterColor() {
    let sky = getSkyColors();
    let golden = getGolden();
    let r = p.lerp(sky.botR * 0.45 + 30, 130, golden * 0.5);
    let g = p.lerp(sky.botG * 0.45 + 50, 95, golden * 0.5);
    let b = p.lerp(sky.botB * 0.55 + 40, 75, golden * 0.5);
    if (stormIntensity > 0) {
      r = p.lerp(r, 48, stormIntensity * 0.6);
      g = p.lerp(g, 52, stormIntensity * 0.6);
      b = p.lerp(b, 62, stormIntensity * 0.6);
    }
    return { r, g, b };
  }

  function getGrassColor() {
    let golden = getGolden();
    let nightDim = getNightDim();
    let dim = p.lerp(1.0, 0.32, nightDim) * p.lerp(1.0, 0.65, stormIntensity);
    return {
      r: p.lerp(82, 115, golden * 0.5) * dim,
      g: p.lerp(122, 98, golden * 0.4) * dim,
      b: p.lerp(58, 42, golden * 0.4) * dim,
    };
  }

  function getCloudColor() {
    let nightDim = getNightDim();
    let golden = getGolden();
    let r = p.lerp(255, p.lerp(40, 55, nightDim), nightDim * 0.85);
    let g = p.lerp(
      p.lerp(255, 210, golden * 0.6),
      p.lerp(42, 58, nightDim),
      nightDim * 0.85
    );
    let b = p.lerp(
      p.lerp(255, 195, golden * 0.5),
      p.lerp(55, 75, nightDim),
      nightDim * 0.85
    );
    let alpha = p.lerp(190, 35, nightDim * 0.8);
    if (stormIntensity > 0.3) {
      alpha *= p.lerp(1, 0.15, (stormIntensity - 0.3) / 0.7);
    }
    return { r, g, b, alpha };
  }

  // ---- spawning ----

  function spawnDuck(x, y) {
    ducks.push({
      x,
      y,
      vx: p.random(0.12, 0.32),
      bobPhase: p.random(p.TWO_PI),
      diveState: "idle",
      diveTimer: p.floor(p.random(80, 250)),
      diveAnim: 0,
      diveAngle: 0,
      targetFish: null,
      targetFood: null,
      catchFlash: 0,
      eatDepth: 0,
      size: p.random(0.85, 1.1),
    });
  }

  function spawnFish() {
    let fromLeft = p.random() < 0.5;
    let isSurface = p.random() < 0.35;

    // decide starting Y based on surface / deeper fish
    let startY;
    if (isSurface) {
      startY = p.random(WATER_TOP + 16, WATER_TOP + 44);
    } else {
      startY = p.random(WATER_TOP + 60, BED_Y - 30);
    }

    // decide depth target
    if (isSurface) {
      depthTarget = p.random(WATER_TOP + 16, WATER_TOP + 44);
    } else {
      depthTarget = p.random(WATER_TOP + 65, BED_Y - 40);
    }

    // color choice (slight variations, similar shade)
    let col;
    if (p.random() < 0.4) {
      col = [200, 110, 55];
    } else {
      col = [155, 192, 210];
    }

    // horizontal velocity based on side
    let vx = fromLeft ? p.random(0.4, 0.9) : -p.random(0.4, 0.9);

    fish.push({
      x: fromLeft ? -60 : W + 60,
      y: startY,
      vx: vx,
      phase: p.random(p.TWO_PI),
      size: p.random(0.7, 1.2),
      col: col,
      depthTarget: depthTarget,
      depthPhase: p.random(p.TWO_PI),
      depthSpeed: p.random(0.003, 0.01),
      caught: false,
      catchAnim: 0,
    });
  }

  function spawnGooseFormation() {
    if (geese.length > 0) return;
    let y = p.random(34, 120);
    let count = p.floor(p.random(7, 13));
    let fromLeft = p.random() < 0.5;
    let speed = p.random(1.6, 2.3);
    let vx = fromLeft ? speed : -speed;
    let baseX = fromLeft ? -140 : W + 140;
    for (let i = 0; i < count; i++) {
      let offset = i * 30;
      let rowLift = Math.floor(i / 2) * 8;
      geese.push({
        x: fromLeft ? baseX - offset : baseX + offset,
        y: y + (i % 2 === 0 ? 0 : 14) + rowLift,
        vx,
        flapPhase: p.random(p.TWO_PI),
        size: p.random(0.82, 1.06),
      });
    }
  }

  function spawnRaindrop() {
    raindrops.push({
      x: p.random(W),
      y: p.random(-40, SHORE_TOP),
      vy: p.random(8, 14) + stormIntensity * 6,
      vx: p.random(-1.5, -0.5),
      len: p.random(8, 16),
    });
  }

  // ---- world generation ----

  function generateRocks() {
    p.randomSeed(77);
    for (let x = 4; x < W; x += p.random(14, 28)) {
      rocks.push({
        x: x + p.random(-4, 4),
        w: p.random(5, 14),
        h: p.random(3, 7),
        r: p.random(140, 195),
        g: p.random(130, 180),
        b: p.random(118, 165),
        alpha: p.random(140, 210),
      });
    }
    p.randomSeed();
  }

  function generateShorePlants() {
    p.randomSeed(123);
    let x = 18;
    while (x < W - 18) {
      x += p.random(18, 42);
      if (p.random() < 0.22) continue;
      let cluster = p.floor(p.random(1, 4));
      for (let i = 0; i < cluster; i++) {
        let cx = x + p.random(-14, 14);
        if (cx < 18 || cx > W - 18) continue;
        cattails.push({
          x: cx,
          h: p.random(42, 84),
          lean: p.random(-5, 5),
          swayAmp: p.random(2, 8),
          phase: p.random(p.TWO_PI),
          twin: p.random() < 0.35,
        });
      }
      if (p.random() < 0.55) {
        shorelineBushes.push({
          x: x + p.random(-10, 10),
          y: SHORE_TOP - p.random(6, 18) + 10,
          w: p.random(28, 58),
          h: p.random(14, 28),
          tone: p.random(0.8, 1.15),
        });
      }
    }
    for (let i = 0; i < 5; i++) {
      shorelineBushes.push({
        x: p.random(30, W - 30),
        y: SHORE_TOP - p.random(10, 22) + 10,
        w: p.random(34, 70),
        h: p.random(16, 32),
        tone: p.random(0.75, 1.2),
      });
    }
    p.randomSeed();
  }

  function initClouds() {
    let spacing = W / 4;
    for (let i = 0; i < 4; i++) {
      clouds.push({
        x: i * spacing + p.random(0, spacing * 0.4),
        y: p.random(8, 62),
        w: p.random(90, 150),
        h: p.random(28, 46),
        speed: p.random(0.1, 0.22),
      });
    }
  }

  function resetCloud(c) {
    c.x = -c.w * 0.5;
    c.y = p.random(8, 62);
    c.w = p.random(90, 150);
    c.h = p.random(28, 46);
    c.speed = p.random(0.1, 0.22);
  }

  function generateUnderwaterVeg() {
    p.randomSeed(99);
    for (let x = 20; x < W; x += p.random(22, 45)) {
      let stemCount = p.floor(p.random(2, 5));
      for (let s = 0; s < stemCount; s++) {
        pondWeeds.push({
          x: x + p.random(-10, 10),
          rootY: BED_Y + p.random(0, 15),
          height: p.random(35, 90),
          sway: p.random(-1, 1),
          swaySpeed: p.random(0.008, 0.02),
          swayPhase: p.random(p.TWO_PI),
          thickness: p.random(1.0, 2.2),
          col: p.floor(p.random(3)), // 0=green, 1=olive, 2=brown-olive
        });
      }
    }
    for (let x = 15; x < W; x += p.random(30, 60)) {
      mudPatches.push({
        x: x + p.random(-15, 15),
        y: BED_Y + p.random(4, 18),
        w: p.random(18, 50),
        h: p.random(5, 12),
        alpha: p.random(80, 160),
      });
    }
    p.randomSeed();
  }

  // Pond bed profile curves deeper toward the center
  function getBedY(x) {
    let t = x / W;
    return BED_Y + p.sin(t * p.PI) * 22 + p.sin(t * p.PI * 3) * 5;
  }

  p.preload = function () {
    geeseGif = p.loadImage("geese.gif"); // animated GIF of geese flying

    // thunder: three variations for lightning strikes
    thunderSounds = [
      p.loadSound("thunder1.mp3"),
      p.loadSound("thunder2.mp3"),
      p.loadSound("thunder3.mp3"),
    ];

    // looping ambience
    rainLoop = p.loadSound("rain1.mp3");
    idleLoop = p.loadSound("idle1.mp3");
    nightLoop = p.loadSound("night1.mp3");
  };

  function stopAllAmbience() {
    if (rainLoop && rainLoop.isPlaying()) rainLoop.stop();
    if (idleLoop && idleLoop.isPlaying()) idleLoop.stop();
    if (nightLoop && nightLoop.isPlaying()) nightLoop.stop();
  }

  function updateAmbience(nightDim) {
    let target = null;

    if (stormIntensity > 0.15) {
      target = "rain";
    } else if (nightDim > 0.6) {
      target = "night";
    } else {
      target = "idle";
    }

    if (target === currentAmbience) return;

    stopAllAmbience();
    currentAmbience = target;

    if (target === "rain" && rainLoop) {
      rainLoop.setLoop(true);
      rainLoop.setVolume(0.65);
      rainLoop.play();
    } else if (target === "night" && nightLoop) {
      nightLoop.setLoop(true);
      nightLoop.setVolume(0.6);
      nightLoop.play();
    } else if (target === "idle" && idleLoop) {
      idleLoop.setLoop(true);
      idleLoop.setVolume(0.45);
      idleLoop.play();
    }
  }

  function playThunder() {
    if (!thunderSounds.length) return;
    if (p.frameCount - lastThunderFrame < 60) return;
    lastThunderFrame = p.frameCount;

    let s = p.random(thunderSounds);
    if (s.isPlaying()) s.stop();
    s.setVolume(0.85);
    s.play();
  }

  // ---- setup ----

  p.setup = function () {
    let cnv = p.createCanvas(W, H);
    cnv.parent("pond-wrap10");

    generateRocks();
    initClouds();
    generateUnderwaterVeg();
    generateShorePlants();

    for (let i = 0; i < 9; i++) spawnFish();
    spawnDuck(260, WATER_TOP + 2);
    spawnDuck(620, WATER_TOP + 2);
    spawnDuck(980, WATER_TOP + 2);

    for (let px of [180, 410, 690, 980, 1160]) {
      lilyPads.push({ x: px, y: WATER_TOP + 28, flower: p.random() < 0.6 });
    }

    stormTimer = p.floor(p.random(900, 1600));

    // three feed/add buttons, right-aligned
    let btnW = 118,
      btnH = 32,
      gap = 8;
    let clusterW = btnW * 3 + gap * 2;
    let clusterX = W - clusterW - 20;
    let btnY = H - 46;
    uiButtons = [
      {
        mode: "duck",
        label: "Duck food",
        x: clusterX,
        y: btnY,
        w: btnW,
        h: btnH,
      },
      {
        mode: "fish",
        label: "Fish food",
        x: clusterX + (btnW + gap),
        y: btnY,
        w: btnW,
        h: btnH,
      },
      {
        mode: "duck-add",
        label: "Add duck",
        x: clusterX + (btnW + gap) * 2,
        y: btnY,
        w: btnW,
        h: btnH,
      },
    ];
  };

  // ---- main draw loop ----

  p.draw = function () {
    timeOfDay = (timeOfDay + 0.0005 * daySpeed) % 1;
    wavePhase += 0.022 + stormIntensity * 0.035;

    updateStorm();

    // compute shared lighting values once per frame
    let skyColors = getSkyColors();
    let golden = getGolden();
    let grassColor = getGrassColor();
    let waterColor = getWaterColor();
    let cloudColor = getCloudColor();
    let nightDim = getNightDim();
    let sunVis = getSunVisible();
    let moonVis = getMoonVisible();

    updateAmbience(nightDim);

    drawSky(skyColors, nightDim, sunVis, moonVis, cloudColor, golden);
    drawShore(grassColor);

    // water body -- filled polygon from wave line down to WATER_BOT
    p.noStroke();
    p.fill(grassColor.r, grassColor.g, grassColor.b);
    p.rect(0, WATER_TOP - 1, W, 8);
    p.fill(waterColor.r, waterColor.g, waterColor.b, 255);
    p.beginShape();
    for (let x = 0; x <= W; x += 4) p.vertex(x, getWaveY(x));
    p.vertex(W, WATER_BOT);
    p.vertex(0, WATER_BOT);
    p.endShape(p.CLOSE);

    drawPondBed(golden);
    drawUnderwaterWeeds();
    updateAndDrawFishFood();
    updateAndDrawFish();
    drawWaterDepthOverlay(waterColor);
    updateAndDrawDuckFood();

    // wave surface shimmer line
    p.noFill();
    p.stroke(232, 247, 255, 24);
    p.strokeWeight(0.9);
    p.beginShape();
    for (let x = 0; x <= W; x += 8) p.vertex(x, getWaveY(x) - 0.35);
    p.endShape();

    drawLilyPads(golden, nightDim);
    drawRain();
    drawRipples();
    updateAndDrawDucks(golden, nightDim);
    updateCatchParticles();
    updateAndDrawGeese(golden);

    if (stormIntensity > 0) {
      p.noStroke();
      p.fill(38, 42, 58, stormIntensity * 52);
      p.rect(0, 0, W, H);
    }

    drawUI();
  };

  // ---- storm logic ----

  function updateStorm() {
    stormTimer--;
    if (stormTimer <= 0) {
      if (stormPhase === STORM_CLEAR) {
        stormPhase = STORM_BUILDING;
        stormTimer = 360;
      } else if (stormPhase === STORM_BUILDING) {
        stormPhase = STORM_PEAK;
        stormDurationSec = p.floor(p.random(20, 50));
        stormHoldFrames = stormDurationSec * 60;
        stormTimer = stormHoldFrames;
        nextLightningTimer = p.floor(p.random(45, 140));
      } else if (stormPhase === STORM_PEAK) {
        stormPhase = STORM_FADING;
        stormTimer = 360;
      } else {
        stormPhase = STORM_CLEAR;
        stormIntensity = 0;
        stormHoldFrames = 0;
        stormDurationSec = 0;
        stormTimer = p.floor(p.random(1100, 2200));
        raindrops = [];
      }
    }

    if (stormPhase === STORM_BUILDING)
      stormIntensity = p.min(stormIntensity + 0.0026, 1);
    else if (stormPhase === STORM_PEAK)
      stormIntensity = p.min(stormIntensity + 0.0002, 1);
    else if (stormPhase === STORM_FADING)
      stormIntensity = p.max(stormIntensity - 0.0024, 0);

    if (stormPhase === STORM_PEAK && stormIntensity > 0.6) {
      stormHoldFrames = p.max(0, stormHoldFrames - 1);
      stormDurationSec = Math.ceil(stormHoldFrames / 60);
      nextLightningTimer--;
      if (nextLightningTimer <= 0) {
        lightningAlpha = 255;
        lightningSegs = [];
        let lx = p.random(60, W - 60);
        let ly = SHORE_TOP * 0.1;
        lightningSegs.push({ x: lx, y: ly });
        while (ly < SHORE_TOP) {
          lx += p.random(-18, 18);
          ly += p.random(12, 22);
          lightningSegs.push({ x: lx, y: p.min(ly, SHORE_TOP) });
        }
        nextLightningTimer = p.floor(p.random(300, 1500));

        // Trigger thunder when a new bolt appears
        playThunder();
      }
    }

    if (lightningAlpha > 0) lightningAlpha = p.max(0, lightningAlpha - 16);
  }

  // ---- draw sub-functions ----

  function drawSky(skyColors, nightDim, sunVis, moonVis, cloudColor, golden) {
    // sky gradient
    for (let y = 0; y < SHORE_TOP; y++) {
      let t = y / SHORE_TOP;
      let r = p.lerp(skyColors.topR, skyColors.botR, t);
      let g = p.lerp(skyColors.topG, skyColors.botG, t);
      let b = p.lerp(skyColors.topB, skyColors.botB, t);
      if (lightningAlpha > 0) {
        r += lightningAlpha * 0.35;
        g += lightningAlpha * 0.35;
        b += lightningAlpha * 0.45;
      }
      p.stroke(r, g, b);
      p.line(0, y, W, y);
    }

    // stars
    if (nightDim > 0.1) {
      p.noStroke();
      p.randomSeed(42);
      let starAlpha = nightDim * 200;
      for (let i = 0; i < 55; i++) {
        let sx = p.random(W);
        let sy = p.random(SHORE_TOP - 8);
        p.fill(255, 255, 220, starAlpha * p.random(0.5, 1));
        p.ellipse(sx, sy, 1.8, 1.8);
      }
      p.randomSeed();
    }

    // sun
    if (sunVis > 0) {
      let sp = getSunPos();
      if (sp.y < SHORE_TOP + 22) {
        p.noStroke();
        p.fill(
          255,
          p.lerp(238, 175, golden),
          p.lerp(155, 55, golden),
          220 * sunVis
        );
        p.ellipse(sp.x, sp.y, 36, 36);
        p.fill(
          255,
          p.lerp(238, 175, golden),
          p.lerp(155, 55, golden),
          50 * sunVis
        );
        p.ellipse(sp.x, sp.y, 62, 62);
        if (sunVis < 0.75) {
          p.fill(255, p.lerp(180, 120, golden), 60, 80 * (1 - sunVis));
          p.ellipse(sp.x, SHORE_TOP, 120, 30);
        }
      }
    }

    // moon
    if (moonVis > 0) {
      let mp = getMoonPos();
      if (mp.y < SHORE_TOP + 12) {
        p.noStroke();
        p.fill(230, 228, 200, 200 * moonVis);
        p.ellipse(mp.x, mp.y, 26, 26);
        p.fill(200, 198, 175, 38 * moonVis);
        p.ellipse(mp.x, mp.y, 44, 44);
      }
    }

    // lightning bolt
    if (lightningAlpha > 0 && lightningSegs.length > 1) {
      p.stroke(220, 232, 255, lightningAlpha);
      p.strokeWeight(2);
      for (let i = 0; i < lightningSegs.length - 1; i++) {
        p.line(
          lightningSegs[i].x,
          lightningSegs[i].y,
          lightningSegs[i + 1].x,
          lightningSegs[i + 1].y
        );
      }
      p.strokeWeight(1);
    }

    // storm cloud banks
    if (stormIntensity > 0) {
      p.noStroke();
      for (let i = 0; i < 5; i++) {
        let drift = (wavePhase * 8 + i * 180) % (W + 420);
        let sx = W + 260 - drift;
        let sy = 42 + i * 18;
        let sw = 340 + i * 70 + stormIntensity * 120;
        let sh = 74 + i * 10;
        let alpha = stormIntensity * (120 - i * 10);
        p.fill(56 - i * 3, 58 - i * 2, 68 - i, alpha);
        p.ellipse(sx, sy, sw, sh);
        p.ellipse(sx - sw * 0.28, sy + 10, sw * 0.62, sh * 0.82);
        p.ellipse(sx + sw * 0.25, sy + 8, sw * 0.58, sh * 0.76);
      }
    }

    // regular clouds
    p.noStroke();
    for (let c of clouds) {
      c.x += c.speed * (1 + stormIntensity * 1.5);
      if (c.x > W + 200) resetCloud(c);
      p.fill(cloudColor.r, cloudColor.g, cloudColor.b, cloudColor.alpha);
      p.ellipse(c.x, c.y, c.w, c.h);
      p.ellipse(c.x - c.w * 0.25, c.y + c.h * 0.12, c.w * 0.6, c.h * 0.75);
      p.ellipse(c.x + c.w * 0.28, c.y + c.h * 0.12, c.w * 0.55, c.h * 0.7);
    }
  }

  function drawShore(grassColor) {
    let gc = grassColor;

    // grass bank between shore and water edge
    p.noStroke();
    p.fill(gc.r, gc.g, gc.b);
    p.rect(0, SHORE_TOP, W, WATER_TOP - SHORE_TOP);

    // grass blades
    p.stroke(gc.r * 0.78, gc.g * 0.82, gc.b * 0.68);
    p.strokeWeight(1.4);
    for (let x = 5; x < W; x += 13) {
      let sw = p.sin(wavePhase * 0.55 + x * 0.045) * (2.2 + stormIntensity * 5);
      p.line(x, SHORE_TOP, x + sw - 2, SHORE_TOP - 9);
      p.line(x + 4, SHORE_TOP, x + 4 + sw, SHORE_TOP - 7);
      p.line(x + 8, SHORE_TOP, x + 9 + sw, SHORE_TOP - 8);
    }

    // rocks along water edge
    p.noStroke();
    for (let rock of rocks) {
      p.fill(rock.r * (gc.r / 82), rock.g * (gc.g / 122), rock.b, rock.alpha);
      p.ellipse(rock.x, WATER_TOP - 3, rock.w, rock.h);
    }

    // shoreline bushes
    for (let bush of shorelineBushes) {
      let shade = bush.tone;
      p.noStroke();
      p.fill(
        gc.r * 0.62 * shade,
        gc.g * 0.72 * shade,
        gc.b * 0.58 * shade,
        210
      );
      p.ellipse(bush.x, bush.y, bush.w, bush.h);
      p.fill(
        gc.r * 0.48 * shade,
        gc.g * 0.62 * shade,
        gc.b * 0.42 * shade,
        190
      );
      p.ellipse(
        bush.x - bush.w * 0.18,
        bush.y + 2,
        bush.w * 0.62,
        bush.h * 0.82
      );
      p.ellipse(
        bush.x + bush.w * 0.18,
        bush.y + 1,
        bush.w * 0.58,
        bush.h * 0.78
      );
    }

    // cattails / reeds
    for (let reed of cattails) {
      let sw =
        p.sin(wavePhase * 0.5 + reed.phase) *
        (reed.swayAmp + stormIntensity * 7);
      let topX = reed.x + sw + reed.lean;

      p.stroke(gc.r * 1.02, gc.g * 0.6, gc.b * 0.5);
      p.strokeWeight(2.1);
      p.line(reed.x, WATER_TOP - 2, topX, WATER_TOP - reed.h);
      if (reed.twin)
        p.line(reed.x + 6, WATER_TOP - 2, topX + 4, WATER_TOP - reed.h * 0.84);

      p.noStroke();
      p.fill(gc.r * 0.64, gc.g * 0.42, gc.b * 0.28);
      p.ellipse(topX, WATER_TOP - reed.h - 4, 6, 18);
      if (reed.twin) p.ellipse(topX + 4, WATER_TOP - reed.h * 0.84 - 3, 5, 15);

      p.stroke(gc.r * 0.93, gc.g * 0.56, gc.b * 0.46);
      p.strokeWeight(1.15);
      p.line(topX, WATER_TOP - reed.h - 13, topX, WATER_TOP - reed.h - 24);
      if (reed.twin)
        p.line(
          topX + 4,
          WATER_TOP - reed.h * 0.84 - 10,
          topX + 4,
          WATER_TOP - reed.h * 0.84 - 18
        );
      p.noStroke();
    }
  }

  function updateAndDrawFishFood() {
    for (let i = fishFood.length - 1; i >= 0; i--) {
      let fd = fishFood[i];

      if (!fd.settled) {
        fd.vy = p.min(fd.vy + 0.035, 1.2);
        fd.y += fd.vy;
        fd.x += p.sin(fd.drift + wavePhase * 0.8) * 0.16;
        if (fd.y >= getBedY(fd.x) - 2) {
          fd.y = getBedY(fd.x) - 2;
          fd.settled = true;
          fd.vy = 0;
        }
      } else {
        fd.life--;
        fd.alpha -= 2.4;
      }

      if (
        fd.y > WATER_TOP &&
        fd.y < WATER_BOT &&
        p.frameCount % 5 === 0 &&
        p.random() < 0.08
      ) {
        ripples.push({
          x: fd.x,
          y: getWaveY(fd.x),
          r: 0,
          alpha: 18,
          tiny: true,
        });
      }

      p.noStroke();
      p.fill(196, 142, 88, fd.alpha);
      p.circle(fd.x, fd.y, fd.size + 0.6);
      p.fill(232, 196, 124, fd.alpha * 0.55);
      p.circle(fd.x - 0.6, fd.y - 0.5, fd.size * 0.45);

      if (fd.alpha <= 0 || fd.life <= 0) fishFood.splice(i, 1);
    }
  }

  function updateAndDrawFish() {
    for (let i = fish.length - 1; i >= 0; i--) {
      let f = fish[i];

      if (f.caught) {
        f.catchAnim++;
        if (f.catchAnim > 80) {
          fish.splice(i, 1);
          spawnFish();
        }
        continue;
      }

      // skip AI while user is dragging this fish
      if (dragging && dragging.kind === "fish" && dragging.obj === f) {
        let depthAlpha = p.map(f.y, WATER_TOP + 14, BED_Y - 18, 210, 45);
        drawFish(f.x, f.y, f.vx, f.size, f.col, depthAlpha);
        continue;
      }

      // find nearest fish food within range
      let targetFood = null,
        bestFood = 1e9;
      for (let fd of fishFood) {
        let d = p.dist(f.x, f.y, fd.x, fd.y);
        if (d < bestFood && d < 95) {
          bestFood = d;
          targetFood = fd;
        }
      }

      if (targetFood) {
        f.x += (targetFood.x - f.x) * 0.028;
        f.y += (targetFood.y - f.y) * 0.02;
        if (targetFood.x < f.x) {
          f.vx = -p.max(0.25, p.abs(f.vx));
        } else {
          f.vx = p.max(0.25, p.abs(f.vx));
        }
        if (bestFood < 10) {
          targetFood.alpha -= 95;
          targetFood.life = 0;
          for (let s = 0; s < 3; s++) {
            ripples.push({
              x: f.x + p.random(-4, 4),
              y: f.y + p.random(-2, 2),
              r: 0,
              alpha: 55,
              tiny: true,
            });
          }
        }
      } else {
        f.x += f.vx;
        f.depthPhase += f.depthSpeed;
        f.y += (f.depthTarget + p.sin(f.depthPhase) * 16 - f.y) * 0.02;
      }

      f.y = p.constrain(f.y, WATER_TOP + 14, BED_Y - 18);
      if (f.x > W + 80 || f.x < -80) {
        f.x = f.vx > 0 ? -55 : W + 55;
        f.y = p.random(WATER_TOP + 16, BED_Y - 30);
      }

      let depthAlpha = p.map(f.y, WATER_TOP + 14, BED_Y - 18, 210, 45);
      drawFish(f.x, f.y, f.vx, f.size, f.col, depthAlpha);
    }

    if (fish.length < 9 && p.frameCount % 180 === 0) spawnFish();
  }

  function updateAndDrawDuckFood() {
    for (let i = duckFood.length - 1; i >= 0; i--) {
      let fd = duckFood[i];
      fd.age++;
      fd.x += p.sin(fd.drift + wavePhase * 0.7) * 0.18;
      fd.y += (getWaveY(fd.x) + fd.floatOffset - fd.y) * 0.18;
      fd.life--;
      if (fd.life < 55) fd.alpha -= 4.2;

      p.noStroke();
      p.fill(206, 164, 92, fd.alpha);
      p.circle(fd.x, fd.y, fd.size);
      p.fill(244, 222, 156, fd.alpha * 0.5);
      p.circle(fd.x - 0.5, fd.y - 0.4, fd.size * 0.42);

      if (fd.alpha <= 0 || fd.life <= 0) duckFood.splice(i, 1);
    }
  }

  function drawLilyPads(golden, nightDim) {
    p.noStroke();
    for (let pad of lilyPads) {
      let isDragged = dragging && dragging.obj === pad;
      let py = isDragged ? pad.y : getWaveY(pad.x) + 12;
      if (!isDragged) pad.y = py;

      p.fill(
        p.lerp(50, 74, golden * 0.4),
        p.lerp(105, 82, golden * 0.3),
        p.lerp(50, 36, golden * 0.4),
        202
      );
      p.ellipse(pad.x, py, 38, 20);
      p.fill(
        p.lerp(38, 60, golden * 0.4),
        p.lerp(85, 64, golden * 0.3),
        38,
        182
      );
      p.ellipse(pad.x + 3, py + 2, 26, 13);

      if (pad.flower && stormIntensity < 0.4 && nightDim < 0.5) {
        p.fill(232, 192, 202, 175);
        p.ellipse(pad.x + 1, py - 5, 8, 8);
        p.fill(255, 236, 172, 195);
        p.ellipse(pad.x + 1, py - 5, 4, 4);
      }
    }
  }

  function drawRain() {
    if (stormIntensity <= 0.1) return;
    let dropCount = p.floor(stormIntensity * 8);
    for (let i = 0; i < dropCount; i++) spawnRaindrop();

    p.stroke(175, 198, 228, 130);
    p.strokeWeight(1);
    for (let i = raindrops.length - 1; i >= 0; i--) {
      let d = raindrops[i];
      d.x += d.vx;
      d.y += d.vy;
      p.line(d.x, d.y, d.x - d.vx * 1.5, d.y - d.len);
      if (d.y > WATER_BOT + 10) {
        raindrops.splice(i, 1);
      } else if (d.y > WATER_TOP && d.y < WATER_BOT) {
        if (p.random() < 0.15) {
          ripples.push({ x: d.x, y: d.y, r: 0, alpha: 70, tiny: true });
        }
        raindrops.splice(i, 1);
      }
    }
  }

  function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
      let r = ripples[i];
      r.r += r.tiny ? 0.5 : 0.85;
      r.alpha -= r.tiny ? 10 : 5;
      if (r.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      p.noFill();
      p.stroke(212, 236, 255, r.alpha);
      p.strokeWeight(r.tiny ? 0.5 : 0.8);
      p.ellipse(r.x, r.y, r.r * 2, r.r * (r.tiny ? 0.4 : 0.65));
    }
  }

  function updateAndDrawDucks(golden, nightDim) {
    if (relocating) {
      let allGone = true;
      for (let duck of ducks) {
        duck.vx = p.lerp(duck.vx, 5.5, 0.08);
        duck.x += duck.vx;
        duck.bobPhase += 0.08;
        duck.diveState = "idle";
        let wy = getWaveY(p.constrain(duck.x, 0, W - 1));
        duck.y += (wy - duck.y) * 0.2;
        if (duck.x < W + 80) allGone = false;
        drawDuckShape(
          duck.x,
          duck.y + p.sin(duck.bobPhase) * 2,
          duck.size,
          0,
          0,
          golden,
          nightDim,
          false,
          null
        );
        if (p.frameCount % 30 === 0 && p.random() < 0.5) {
          ripples.push({
            x: duck.x + p.random(-10, 10),
            y: duck.y + 10,
            r: 0,
            alpha: 100,
          });
        }
      }
      if (allGone) {
        ducks = [];
        relocating = false;
      }
      return;
    }

    for (let duck of ducks) {
      if (dragging && dragging.obj === duck) {
        drawDuckShape(
          duck.x,
          duck.y + p.sin(p.frameCount * 0.08) * 1.5,
          duck.size,
          0,
          0,
          golden,
          nightDim,
          false,
          null
        );
        continue;
      }

      duck.bobPhase += 0.04 + stormIntensity * 0.04;
      let waveY = getWaveY(duck.x);

      let targetMorsel = null,
        bestMorsel = 1e9;
      for (let fd of duckFood) {
        let d = p.dist(duck.x, duck.y, fd.x, fd.y);
        if (d < bestMorsel) {
          bestMorsel = d;
          targetMorsel = fd;
        }
      }

      if (
        duck.diveState === "idle" &&
        targetMorsel &&
        bestMorsel < DUCK_FOOD_RANGE
      ) {
        duck.targetFood = targetMorsel;
        let sign = targetMorsel.x > duck.x ? 1 : -1;
        let desired = sign * p.map(bestMorsel, 0, DUCK_FOOD_RANGE, 1.45, 0.22);
        duck.vx = p.lerp(duck.vx, desired, 0.09);
        duck.x += duck.vx + stormIntensity * 0.2;
        duck.y += (waveY - duck.y) * 0.18;
        if (bestMorsel < 26) {
          duck.diveState = "pecking";
          duck.diveAnim = 0;
          duck.eatDepth = 0;
        }
      } else if (duck.diveState === "idle") {
        duck.y += (waveY - duck.y) * 0.15;
        duck.x += duck.vx + stormIntensity * 0.5;
        if (p.frameCount % 150 === 0) duck.vx += p.random(-0.08, 0.08);
        duck.vx = p.constrain(duck.vx, -0.55, 0.55);
        if (duck.x > W + 60) duck.x = -60;
        if (duck.x < -60) duck.x = W + 60;
        duck.diveTimer--;
        if (duck.diveTimer <= 0) {
          let nearFish = null,
            bestDist = DUCK_DIVE_RANGE;
          for (let f of fish) {
            if (f.caught) continue;
            if (f.y < WATER_TOP + 72) {
              let d = p.abs(f.x - duck.x);
              if (d < bestDist) {
                bestDist = d;
                nearFish = f;
              }
            }
          }
          if (nearFish && !targetMorsel) {
            duck.diveState = "lunging";
            duck.targetFish = nearFish;
            duck.diveAnim = 0;
          } else {
            duck.diveState = "bobdip";
            duck.diveAnim = 0;
            duck.diveTimer = p.floor(p.random(120, 280));
          }
        }
      } else if (duck.diveState === "bobdip") {
        duck.y += (waveY - duck.y) * 0.15;
        duck.x += duck.vx;
        duck.diveAnim++;
        if (duck.diveAnim > 55) {
          duck.diveState = "idle";
          duck.diveTimer = p.floor(p.random(120, 280));
        }
      } else if (duck.diveState === "pecking") {
        duck.diveAnim++;
        duck.x += duck.vx * 0.35;
        let peck = p.sin(p.constrain(duck.diveAnim / 26, 0, 1) * p.PI);
        duck.eatDepth = peck * 12;
        duck.y += (waveY - duck.eatDepth - duck.y) * 0.28;
        if (duck.diveAnim === 12 && duck.targetFood) {
          duck.targetFood.alpha -= 180;
          duck.targetFood.life = 0;
          duck.catchFlash = 8;
          for (let s = 0; s < 5; s++) {
            ripples.push({
              x: duck.x + p.random(-6, 6),
              y: waveY + 10 + p.random(-2, 2),
              r: 0,
              alpha: 70,
              tiny: true,
            });
          }
        }
        if (duck.diveAnim > 26) {
          duck.diveState = "idle";
          duck.diveAnim = 0;
          duck.eatDepth = 0;
          duck.targetFood = null;
          duck.diveTimer = p.floor(p.random(90, 180));
        }
      } else if (duck.diveState === "lunging") {
        duck.diveAnim++;
        duck.diveAngle =
          p.sin(p.constrain(duck.diveAnim / 38, 0, 1) * p.PI) * 1.15;
        duck.x += (duck.targetFish.x - duck.x) * 0.08;
        duck.y += (waveY - duck.y) * 0.1;
        if (duck.diveAnim >= 32 && !duck.targetFish.caught) {
          duck.targetFish.caught = true;
          duck.targetFish.catchAnim = 0;
          duck.diveState = "catching";
          duck.diveAnim = 0;
          duck.catchFlash = 20;
          for (let s = 0; s < 8; s++) {
            ripples.push({
              x: duck.x + p.random(-20, 20),
              y: duck.y + p.random(-6, 12),
              r: 0,
              alpha: 185 + p.random(40),
            });
          }
          for (let s = 0; s < 12; s++) {
            catchParticles.push({
              x: duck.x,
              y: duck.y + 4,
              vx: p.random(-3.5, 3.5),
              vy: p.random(-4.5, -0.5),
              alpha: 220,
              r: p.random(2, 5),
            });
          }
        }
        if (duck.diveAnim > 42 && duck.diveState === "lunging") {
          duck.diveState = "idle";
          duck.diveAngle = 0;
          duck.diveTimer = p.floor(p.random(150, 300));
          duck.targetFish = null;
        }
      } else if (duck.diveState === "catching") {
        duck.diveAnim++;
        duck.diveAngle = p.max(0, 1.15 * (1 - duck.diveAnim / 45));
        duck.y += (waveY - duck.y) * 0.12;
        duck.x += duck.vx * 0.4;
        if (duck.diveAnim > 55) {
          duck.diveState = "idle";
          duck.diveAngle = 0;
          duck.diveTimer = p.floor(p.random(180, 360));
          duck.targetFish = null;
        }
      }

      let bob = 0;
      if (duck.diveState === "idle" || duck.diveState === "bobdip") {
        bob = p.sin(duck.bobPhase) * 2;
      }

      let catching = duck.diveState === "catching";

      let dipAnim = 0;
      if (duck.diveState === "bobdip" || duck.diveState === "pecking") {
        dipAnim = duck.diveAnim;
      }
      if (duck.catchFlash > 0) duck.catchFlash--;
      drawDuckShape(
        duck.x,
        duck.y + bob,
        duck.size,
        duck.diveAngle,
        dipAnim,
        golden,
        nightDim,
        catching,
        catching ? duck.targetFish : null
      );

      if (p.frameCount % 45 === 0 && p.random() < 0.3) {
        ripples.push({
          x: duck.x + p.random(-8, 8),
          y: duck.y + 10,
          r: 0,
          alpha: 75,
        });
      }
    }
  }

  function updateCatchParticles() {
    for (let i = catchParticles.length - 1; i >= 0; i--) {
      let cp = catchParticles[i];
      cp.x += cp.vx;
      cp.y += cp.vy;
      cp.vy += 0.2;
      cp.alpha -= 7;
      if (cp.alpha <= 0) {
        catchParticles.splice(i, 1);
        continue;
      }
      p.noStroke();
      p.fill(150, 210, 255, cp.alpha);
      p.ellipse(cp.x, cp.y, cp.r, cp.r);
    }
  }

  function updateAndDrawGeese(golden) {
    if (!geeseGif) return;

    let y = 80; // vertical position
    let speed = 1.5; // pixels per frame
    let x = ((p.frameCount * speed) % (W + geeseGif.width)) - geeseGif.width;

    p.imageMode(p.CENTER);

    // invert geese gif
    p.push();
    p.translate(x, y);
    p.scale(-1, 1); // flip horizontally
    p.image(geeseGif, 0, 0); // draw at origin after scaling
    p.pop();
  }

  function drawUI() {
    p.textAlign(p.LEFT, p.TOP);

    // info panel (top-left)
    p.noStroke();
    p.fill(0, 0, 0, 72);
    p.rect(14, 14, 360, 62, 10);
    p.fill(255, 248);
    p.textSize(16);
    p.text("Pond controls", 28, 26);
    p.textSize(12);
    p.fill(236, 240, 245, 220);
    p.text("Drag ducks, fish, or lily pads. Click to feed.", 28, 50);

    // storm countdown badge
    if (stormIntensity > 0.05) {
      p.fill(0, 0, 0, 72);
      p.rect(14, 84, 190, 30, 9);
      p.fill(210, 226, 246, 225);
      p.textSize(12);

      let stormLabel;
      if (stormPhase === STORM_PEAK) {
        stormLabel = "Storm time left: " + stormDurationSec + "s";
      } else {
        stormLabel = "Storm building";
      }

      p.text(stormLabel, 28, 93);
    }

    // relocate button (top-right)
    let over =
      p.mouseX > RELOCATE_BTN.x &&
      p.mouseX < RELOCATE_BTN.x + RELOCATE_BTN.w &&
      p.mouseY > RELOCATE_BTN.y &&
      p.mouseY < RELOCATE_BTN.y + RELOCATE_BTN.h;
    p.noStroke();
    p.fill(0, 0, 0, over ? 100 : 72);
    p.rect(RELOCATE_BTN.x, RELOCATE_BTN.y, RELOCATE_BTN.w, RELOCATE_BTN.h, 8);
    p.fill(255, 255, 255, over ? 235 : 200);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text(
      "Relocate ducks",
      RELOCATE_BTN.x + RELOCATE_BTN.w / 2,
      RELOCATE_BTN.y + RELOCATE_BTN.h / 2
    );

    // speed slider (bottom-left panel)
    p.textAlign(p.LEFT, p.TOP);
    p.fill(0, 0, 0, 72);
    p.rect(16, H - 62, 360, 46, 10);
    p.fill(255, 246);
    p.textSize(11);
    p.text("Day-night speed", 28, H - 54);

    p.stroke(245, 245, 255, 120);
    p.strokeWeight(3);
    p.line(SLIDER_X, SLIDER_Y, SLIDER_X + SLIDER_W, SLIDER_Y);

    let knobX = SLIDER_X + ((daySpeed - 0.2) / (3.0 - 0.2)) * SLIDER_W;
    p.noStroke();
    p.fill(250, 250, 255, 235);
    p.circle(knobX, SLIDER_Y, 14);

    p.fill(245, 245, 255, 230);
    p.textSize(11);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(daySpeed.toFixed(2) + "x", SLIDER_X + SLIDER_W + 8, SLIDER_Y);

    // feed mode / add-duck buttons (bottom-right cluster)
    p.textAlign(p.LEFT, p.TOP);
    for (let b of uiButtons) {
      let active = feedMode === b.mode;
      let hov =
        p.mouseX > b.x &&
        p.mouseX < b.x + b.w &&
        p.mouseY > b.y &&
        p.mouseY < b.y + b.h;
      p.noStroke();
      if (active) p.fill(214, 236, 246, 235);
      else if (hov) p.fill(255, 255, 255, 85);
      else p.fill(0, 0, 0, 80);
      p.rect(b.x, b.y, b.w, b.h, 9);
      p.fill(active ? 18 : 248);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(12);
      p.text(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    p.textAlign(p.LEFT, p.TOP);
  }

  // ---- shape and terrain drawing helpers ----

  function drawPondBed(golden) {
    p.noStroke();

    // three mud layers stacked to suggest depth gradient
    p.fill(
      p.lerp(38, 55, golden * 0.2),
      p.lerp(32, 45, golden * 0.2),
      p.lerp(28, 38, golden * 0.2),
      255
    );
    p.beginShape();
    for (let x = 0; x <= W; x += 6) p.vertex(x, getBedY(x));
    p.vertex(W, WATER_BOT);
    p.vertex(0, WATER_BOT);
    p.endShape(p.CLOSE);

    p.fill(
      p.lerp(52, 72, golden * 0.25),
      p.lerp(44, 58, golden * 0.2),
      p.lerp(36, 46, golden * 0.2),
      200
    );
    p.beginShape();
    for (let x = 0; x <= W; x += 6) p.vertex(x, getBedY(x) + 6);
    p.vertex(W, WATER_BOT);
    p.vertex(0, WATER_BOT);
    p.endShape(p.CLOSE);

    p.fill(
      p.lerp(75, 95, golden * 0.3),
      p.lerp(62, 78, golden * 0.25),
      p.lerp(48, 58, golden * 0.2),
      180
    );
    p.beginShape();
    for (let x = 0; x <= W; x += 6) p.vertex(x, getBedY(x) + 10);
    p.vertex(W, WATER_BOT);
    p.vertex(0, WATER_BOT);
    p.endShape(p.CLOSE);

    // scattered pebbles
    p.randomSeed(123);
    for (let i = 0; i < 55; i++) {
      let px = p.random(W);
      let bedY = getBedY(px);
      let sz = p.random(3, 9);
      p.fill(
        p.random(80, 130),
        p.random(70, 115),
        p.random(58, 95),
        p.random(140, 210)
      );
      p.ellipse(px + p.random(-2, 2), bedY + p.random(4, 14), sz, sz * 0.55);
    }
    p.randomSeed();

    for (let m of mudPatches) {
      p.fill(38, 32, 26, m.alpha);
      p.ellipse(m.x, getBedY(m.x) + m.y * 0.4, m.w, m.h);
    }
  }

  function drawUnderwaterWeeds() {
    let colPalette = [
      [48, 88, 52], // dark green
      [62, 78, 40], // olive
      [72, 58, 38], // brown-olive
    ];
    for (let w of pondWeeds) {
      w.swayPhase += w.swaySpeed;
      let sway = p.sin(w.swayPhase + wavePhase * 0.4) * w.sway * 8;
      let rootY = getBedY(w.x) + 8;
      let tipY = rootY - w.height;
      let tipX = w.x + sway;
      let col = colPalette[w.col];

      // weeds near the bed are more visible than those reaching toward the surface
      let depthAlpha = p.map(tipY, WATER_TOP, BED_Y, 55, 140);

      p.stroke(col[0], col[1], col[2], depthAlpha);
      p.strokeWeight(w.thickness);
      p.noFill();
      p.beginShape();
      p.vertex(w.x, rootY);
      p.bezierVertex(
        w.x + sway * 0.3,
        rootY - w.height * 0.35,
        w.x + sway * 0.7,
        rootY - w.height * 0.65,
        tipX,
        tipY
      );
      p.endShape();

      if (w.height > 55) {
        p.stroke(col[0] + 10, col[1] + 12, col[2], depthAlpha * 0.8);
        p.strokeWeight(w.thickness * 0.7);
        p.line(tipX, tipY, tipX - 8 + sway * 0.3, tipY - 7);
        p.line(tipX, tipY, tipX + 6 + sway * 0.3, tipY - 5);
      }
    }
    p.noStroke();
  }

  function drawWaterDepthOverlay(waterColor) {
    p.noStroke();
    for (let y = WATER_TOP + 20; y < WATER_BOT; y += 4) {
      let t = (y - WATER_TOP) / (WATER_BOT - WATER_TOP);
      let alpha = p.pow(t, 2.45) * 84;
      p.fill(
        waterColor.r * 0.62,
        waterColor.g * 0.76,
        waterColor.b * 0.88,
        alpha
      );
      p.rect(0, y, W, 4);
    }
    p.fill(255, 255, 255, 7);
    p.rect(0, WATER_TOP + 16, W, 8);
  }

  function drawDuckShape(
    x,
    y,
    sz,
    diveAngle,
    bobDipAnim,
    golden,
    nightDim,
    catching,
    caughtFish
  ) {
    p.push();
    p.translate(x, y);
    p.scale(sz);

    let tilt = diveAngle;
    if (bobDipAnim > 0) tilt = -p.sin((bobDipAnim / 55) * p.PI) * 0.82;
    p.rotate(tilt);

    let dim = p.lerp(1.0, 0.42, nightDim);
    p.noStroke();

    // shadow
    p.fill(0, 0, 0, 20);
    p.ellipse(2, 16, 44, 9);

    // body
    p.fill(
      p.lerp(240, 255, golden * 0.25) * dim,
      p.lerp(195, 215, golden * 0.4) * dim,
      p.lerp(38, 75, golden * 0.3) * dim
    );
    p.ellipse(0, 4, 46, 27);
    p.fill(
      p.lerp(208, 228, golden * 0.25) * dim,
      p.lerp(162, 182, golden * 0.4) * dim,
      28 * dim
    );
    p.ellipse(5, 7, 30, 17);

    // head
    p.fill(
      p.lerp(26, 42, golden * 0.3) * dim,
      p.lerp(98, 115, golden * 0.3) * dim,
      p.lerp(62, 76, golden * 0.3) * dim
    );
    p.ellipse(-14, -8, 22, 20);
    p.fill(75, 155, 115, 50);
    p.ellipse(-16, -10, 13, 11);

    // eye
    p.fill(255 * dim);
    p.ellipse(-19, -10, 6, 6);
    p.fill(15);
    p.ellipse(-20, -10, 3, 3);
    p.fill(255, 255, 255, 160);
    p.ellipse(-19, -11, 1.5, 1.5);

    // bill (open wider and shows fish when catching)
    p.fill(
      p.lerp(255, 255, golden * 0.15) * dim,
      p.lerp(128, 155, golden * 0.3) * dim,
      0
    );
    if (catching) {
      p.beginShape();
      p.vertex(-25, -6);
      p.vertex(-38, -2);
      p.vertex(-36, 5);
      p.vertex(-23, 2);
      p.endShape(p.CLOSE);
      if (caughtFish) {
        p.fill(caughtFish.col[0], caughtFish.col[1], caughtFish.col[2], 200);
        p.ellipse(-34, -1, 14, 6);
        p.beginShape();
        p.vertex(-28, -1);
        p.vertex(-22, -5);
        p.vertex(-22, 3);
        p.endShape(p.CLOSE);
      }
    } else {
      p.beginShape();
      p.vertex(-25, -6);
      p.vertex(-35, -4);
      p.vertex(-33, 1);
      p.vertex(-23, 0);
      p.endShape(p.CLOSE);
    }

    // tail
    p.fill(
      p.lerp(240, 255, golden * 0.25) * dim,
      p.lerp(195, 215, golden * 0.4) * dim,
      p.lerp(38, 75, golden * 0.3) * dim
    );
    p.beginShape();
    p.vertex(20, 2);
    p.vertex(31, -5);
    p.vertex(33, 4);
    p.vertex(21, 10);
    p.endShape(p.CLOSE);

    p.pop();
  }

  function drawFish(x, y, vx, sz, col, alpha) {
    let facingRight = vx > 0;
    p.push();
    p.translate(x, y);
    p.scale(facingRight ? -sz : sz, sz);
    p.noStroke();

    // body
    p.fill(col[0], col[1], col[2], alpha);
    p.ellipse(0, 0, 34, 13);

    // tail fin
    p.beginShape();
    p.vertex(14, 0);
    p.vertex(23, -7);
    p.vertex(23, 7);
    p.endShape(p.CLOSE);

    // belly highlight
    p.fill(col[0] + 28, col[1] + 28, col[2] + 28, alpha * 0.55);
    p.ellipse(-1, 3, 20, 6);

    // eye
    p.fill(18, 18, 18, alpha);
    p.ellipse(-12, -2, 4, 4);
    p.fill(255, 255, 255, alpha * 0.75);
    p.ellipse(-12, -3, 1.5, 1.5);

    // dorsal fin
    p.fill(col[0] - 18, col[1] - 18, col[2] + 8, alpha * 0.62);
    p.beginShape();
    p.vertex(-2, -4);
    p.vertex(4, -11);
    p.vertex(8, -4);
    p.endShape(p.CLOSE);

    p.pop();
  }

  function drawGooseShape(x, y, facingRight, flapPhase, sz, golden) {
    p.push();
    p.translate(x, y);
    p.scale(sz * (facingRight ? 1 : -1), sz);
    let flap = p.sin(flapPhase) * 16;
    p.noStroke();

    // wings (two flapping shapes, one per side)
    p.fill(
      p.lerp(78, 98, golden * 0.3),
      p.lerp(78, 93, golden * 0.3),
      p.lerp(68, 78, golden * 0.3),
      210
    );
    p.beginShape();
    p.vertex(-10, 0);
    p.vertex(-26, flap);
    p.vertex(-5, 7);
    p.vertex(10, 3);
    p.endShape(p.CLOSE);
    p.beginShape();
    p.vertex(-10, 0);
    p.vertex(-26, -flap);
    p.vertex(-5, -5);
    p.vertex(10, -1);
    p.endShape(p.CLOSE);

    // body
    p.fill(
      p.lerp(98, 118, golden * 0.3),
      p.lerp(98, 112, golden * 0.3),
      p.lerp(86, 96, golden * 0.3),
      220
    );
    p.ellipse(0, 0, 26, 11);

    // head
    p.fill(
      p.lerp(28, 46, golden * 0.3),
      p.lerp(28, 42, golden * 0.3),
      p.lerp(26, 36, golden * 0.3)
    );
    p.ellipse(15, -4, 11, 9);
    p.fill(235, 229, 210, 210);
    p.ellipse(17, -3, 5, 4);

    // beak
    p.fill(p.lerp(170, 190, golden * 0.3), p.lerp(130, 150, golden * 0.3), 50);
    p.ellipse(23, -4, 9, 4);

    p.pop();
  }

  // ---- interaction helpers ----

  function getDuckAt(mx, my) {
    for (let i = ducks.length - 1; i >= 0; i--) {
      if (p.dist(mx, my, ducks[i].x, ducks[i].y) < 28 * ducks[i].size)
        return ducks[i];
    }
    return null;
  }

  function getFishAt(mx, my) {
    if (my < WATER_TOP - 6 || my > WATER_BOT) return null;
    let best = null,
      bestD = 22;
    for (let i = fish.length - 1; i >= 0; i--) {
      let f = fish[i];
      if (f.caught) continue;
      let d = p.dist(mx, my, f.x, f.y);
      let hit = 20 * f.size;
      if (d < hit && d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  function getLilyPadAt(mx, my) {
    let best = null,
      bestD = 24;
    for (let i = lilyPads.length - 1; i >= 0; i--) {
      let pad = lilyPads[i];
      let d = p.dist(mx, my, pad.x, pad.y);
      if (d < 24 && d < bestD) {
        bestD = d;
        best = pad;
      }
    }
    return best;
  }

  function dropDuckFood(x) {
    for (let i = 0; i < 7; i++) {
      duckFood.push({
        x: x + p.random(-12, 12),
        y: getWaveY(x) + p.random(2, 8),
        size: p.random(3.2, 5.6),
        life: p.floor(p.random(220, 320)),
        alpha: 225,
        floatOffset: p.random(5, 11),
        drift: p.random(p.TWO_PI),
        age: 0,
      });
    }
    for (let s = 0; s < 4; s++) {
      ripples.push({
        x: x + p.random(-16, 16),
        y: getWaveY(x) + p.random(0, 6),
        r: 0,
        alpha: 105,
      });
    }
  }

  function dropFishFood(x) {
    for (let i = 0; i < 10; i++) {
      fishFood.push({
        x: x + p.random(-10, 10),
        y: getWaveY(x) + p.random(2, 8),
        vy: p.random(0.25, 0.55),
        size: p.random(3.0, 5.0),
        alpha: 225,
        life: p.floor(p.random(180, 260)),
        drift: p.random(p.TWO_PI),
        settled: false,
      });
    }
    for (let s = 0; s < 3; s++) {
      ripples.push({
        x: x + p.random(-10, 10),
        y: getWaveY(x) + p.random(0, 4),
        r: 0,
        alpha: 90,
        tiny: true,
      });
    }
  }

  function overSlider(mx, my) {
    return (
      mx > SLIDER_X - 10 &&
      mx < SLIDER_X + SLIDER_W + 10 &&
      my > SLIDER_Y - 12 &&
      my < SLIDER_Y + 12
    );
  }

  function overToolButton(mx, my) {
    for (let b of uiButtons) {
      if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) return b;
    }
    return null;
  }

  function overRelocateBtn(mx, my) {
    return (
      mx > RELOCATE_BTN.x &&
      mx < RELOCATE_BTN.x + RELOCATE_BTN.w &&
      my > RELOCATE_BTN.y &&
      my < RELOCATE_BTN.y + RELOCATE_BTN.h
    );
  }

  // ---- input handlers ----

  p.mousePressed = function () {
    if (p.getAudioContext().state !== "running") {
      p.userStartAudio();
    }
    if (overRelocateBtn(p.mouseX, p.mouseY)) {
      if (ducks.length > 0) relocating = true;
      return;
    }

    if (overSlider(p.mouseX, p.mouseY)) {
      daySpeed = p.constrain(
        0.2 + ((p.mouseX - SLIDER_X) / SLIDER_W) * (3.0 - 0.2),
        0.2,
        3.0
      );
      return;
    }

    let tool = overToolButton(p.mouseX, p.mouseY);
    if (tool) {
      feedMode = tool.mode;
      return;
    }

    // drag priority: ducks > lily pads > fish
    let duck = getDuckAt(p.mouseX, p.mouseY);
    if (duck && !relocating) {
      dragging = { kind: "duck", obj: duck };
      dragOffX = duck.x - p.mouseX;
      dragOffY = duck.y - p.mouseY;
      return;
    }

    let pad = getLilyPadAt(p.mouseX, p.mouseY);
    if (pad && !relocating) {
      dragging = { kind: "pad", obj: pad };
      dragOffX = pad.x - p.mouseX;
      dragOffY = pad.y - p.mouseY;
      return;
    }

    let f = getFishAt(p.mouseX, p.mouseY);
    if (f && !relocating) {
      dragging = { kind: "fish", obj: f };
      dragOffX = f.x - p.mouseX;
      dragOffY = f.y - p.mouseY;
      return;
    }

    if (!relocating && p.mouseY > WATER_TOP && p.mouseY < WATER_BOT) {
      if (feedMode === "duck") {
        dropDuckFood(p.mouseX);
        lastDuckFeedFrame = p.frameCount;
        return;
      }
      if (feedMode === "fish") {
        dropFishFood(p.mouseX);
        lastFishFeedFrame = p.frameCount;
        return;
      }
      if (feedMode === "duck-add") {
        spawnDuck(p.mouseX, p.mouseY);
        for (let s = 0; s < 5; s++) {
          ripples.push({
            x: p.mouseX + p.random(-14, 14),
            y: p.mouseY + p.random(-4, 4),
            r: 0,
            alpha: 168,
          });
        }
        return;
      }
    }
  };

  p.mouseDragged = function () {
    if (overSlider(p.mouseX, p.mouseY) && !dragging) {
      daySpeed = p.constrain(
        0.2 + ((p.mouseX - SLIDER_X) / SLIDER_W) * (3.0 - 0.2),
        0.2,
        3.0
      );
      return;
    }
    if (dragging) {
      let o = dragging.obj;
      o.x = p.constrain(p.mouseX + dragOffX, 10, W - 10);
      o.y = p.mouseY + dragOffY;
      if (dragging.kind === "fish") {
        o.y = p.constrain(o.y, WATER_TOP + 12, BED_Y - 14);
      } else if (dragging.kind === "duck") {
        o.y = p.constrain(o.y, WATER_TOP - 8, WATER_BOT - 20);
      } else {
        o.y = p.constrain(o.y, WATER_TOP + 6, WATER_TOP + 60);
      }
    }
  };

  p.mouseReleased = function () {
    if (!dragging) return;
    let o = dragging.obj;
    for (let s = 0; s < 4; s++) {
      ripples.push({
        x: o.x + p.random(-10, 10),
        y: o.y + 8,
        r: 0,
        alpha: 138,
      });
    }
    // dropping a fish near a duck triggers a lunge
    if (dragging.kind === "fish") {
      let nearestDuck = null,
        bestD = 120;
      for (let duck of ducks) {
        let dx = p.abs(duck.x - o.x);
        let dy = p.abs(duck.y - o.y);
        if (dx < 80 && dy < 55) {
          let dd = p.dist(duck.x, duck.y, o.x, o.y);
          if (dd < bestD) {
            bestD = dd;
            nearestDuck = duck;
          }
        }
      }
      if (nearestDuck && nearestDuck.diveState === "idle") {
        nearestDuck.diveState = "lunging";
        nearestDuck.targetFish = o;
        nearestDuck.diveAnim = 0;
      }
    }
    dragging = null;
  };

  p.keyPressed = function () {
    if (p.key === "d" || p.key === "D") {
      feedMode = "duck";
      return false;
    }

    if (p.key === "f" || p.key === "F") {
      feedMode = "fish";
      return false;
    }

    if (p.key === "a" || p.key === "A") {
      feedMode = "duck-add";
      return false;
    }

    if (p.keyCode === 9) {
      if (feedMode === "duck") {
        feedMode = "fish";
      } else if (feedMode === "fish") {
        feedMode = "duck-add";
      } else {
        feedMode = "duck";
      }
      return false;
    }
  };

  p.touchStarted = function () {
    if (p.touches[0]) {
      p.mouseX = p.touches[0].x;
      p.mouseY = p.touches[0].y;
    }
    p.mousePressed();
    return false;
  };

  p.touchMoved = function () {
    if (p.touches[0]) {
      p.mouseX = p.touches[0].x;
      p.mouseY = p.touches[0].y;
    }
    p.mouseDragged();
    return false;
  };

  p.touchEnded = function () {
    p.mouseReleased();
    return false;
  };
}, document.getElementById("pond-wrap10")); 

// Ported to
