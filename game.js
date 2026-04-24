const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rand = (min, max) => Math.random() * (max - min) + min;

const assets = {
  bg: loadImage("assets/background-triptych.png"),
  sprites: loadImage("assets/spritesheet.png"),
  icons: loadImage("assets/icons.png"),
};

const SCORE_KEY = "purpleButterflyShooterScores";
const MAX_HEALTH = 5;

function loadImage(src) {
  const img = new Image();
  img.decoding = "async";
  img.retryCount = 0;
  img.onerror = () => {
    if (img.retryCount >= 3) return;
    img.retryCount += 1;
    setTimeout(() => {
      img.src = `${src}?retry=${img.retryCount}&t=${Date.now()}`;
    }, 250 * img.retryCount);
  };
  img.src = src;
  return img;
}

function imageReady(img) {
  return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

const sprite = {
  hero: { x: 46, y: 48, w: 310, h: 250 },
  heroShoot: { x: 410, y: 56, w: 430, h: 245 },
  heroHurt: { x: 840, y: 36, w: 330, h: 285 },
  bubble: { x: 16, y: 382, w: 190, h: 205 },
  spider: { x: 220, y: 370, w: 235, h: 225 },
  wind: { x: 470, y: 358, w: 230, h: 225 },
  gust: { x: 650, y: 360, w: 278, h: 235 },
  smog: { x: 925, y: 386, w: 190, h: 185 },
  vine: { x: 1110, y: 372, w: 190, h: 230 },
  bird: { x: 1275, y: 382, w: 210, h: 190 },
  boss1: { x: 28, y: 630, w: 420, h: 330 },
  boss2: { x: 490, y: 640, w: 525, h: 340 },
  boss3: { x: 1022, y: 635, w: 470, h: 340 },
};

const icon = {
  heart: { x: 55, y: 70, w: 260, h: 225 },
  star: { x: 390, y: 72, w: 250, h: 220 },
  crystal: { x: 718, y: 65, w: 255, h: 230 },
  pollen: { x: 1058, y: 92, w: 250, h: 175 },
  nectar: { x: 55, y: 405, w: 270, h: 210 },
  spread: { x: 405, y: 410, w: 250, h: 200 },
  shield: { x: 730, y: 390, w: 270, h: 235 },
  swarm: { x: 1070, y: 390, w: 280, h: 235 },
};

const levels = [
  {
    name: "第一關：紫蝶幽谷",
    badge: "越冬集結",
    bg: 0,
    length: 2600,
    spawn: ["bubble", "spider", "wind"],
    boss: "boss1",
    bossName: "霧谷蛛后",
    knowledgeTitle: "紫蝶幽谷與越冬",
    knowledge:
      "紫斑蝶會在較溫暖、避風的山谷群聚越冬。觀察蝶群時要保持距離、放慢腳步，避免驚擾停棲中的蝴蝶。",
  },
  {
    name: "第二關：風路大遷徙",
    badge: "春季北返",
    bg: 1,
    length: 3000,
    spawn: ["wind", "gust", "smog"],
    boss: "boss2",
    bossName: "巨輪風暴車",
    knowledgeTitle: "道路上的遷徙挑戰",
    knowledge:
      "紫斑蝶北返時可能飛越道路。部分路段會使用警示、減速與保育措施，讓蝶群有更安全的通行機會。",
  },
  {
    name: "第三關：北方森林新家",
    badge: "繁殖棲地",
    bg: 2,
    length: 3300,
    spawn: ["vine", "smog", "bird", "gust"],
    boss: "boss3",
    bossName: "枯林污染機",
    knowledgeTitle: "花蜜、寄主植物與棲地",
    knowledge:
      "成蝶需要花蜜補充能量，幼蟲則依賴特定寄主植物。保留原生植物、減少農藥，能幫助蝶類完成生命週期。",
  },
];

const enemyInfo = {
  bubble: { hp: 16, r: 34, speed: 105, damage: 8, score: 2, crop: sprite.bubble },
  spider: { hp: 24, r: 38, speed: 125, damage: 10, score: 3, crop: sprite.spider },
  wind: { hp: 20, r: 36, speed: 155, damage: 9, score: 3, crop: sprite.wind },
  gust: { hp: 36, r: 46, speed: 175, damage: 13, score: 5, crop: sprite.gust },
  smog: { hp: 32, r: 40, speed: 118, damage: 12, score: 5, crop: sprite.smog },
  vine: { hp: 34, r: 42, speed: 115, damage: 12, score: 5, crop: sprite.vine },
  bird: { hp: 30, r: 38, speed: 220, damage: 14, score: 6, crop: sprite.bird },
};

const weapons = [
  { id: "pollen", name: "花粉光彈", cooldown: 0.18, icon: icon.pollen },
  { id: "nectar", name: "蜜露追蹤", cooldown: 0.32, icon: icon.nectar },
  { id: "spread", name: "紫光散射", cooldown: 0.42, icon: icon.spread },
  { id: "shield", name: "風之護盾", cooldown: 1.15, icon: icon.shield },
];

const musicTracks = {
  level0: {
    bpm: 94,
    wave: "triangle",
    bass: [45, null, null, null, 48, null, null, null, 52, null, null, null, 48, null, 43, null],
    melody: [69, null, 72, null, 76, null, 74, null, 72, null, 69, null, 67, null, null, null],
    chord: [57, 60, 64],
  },
  level1: {
    bpm: 112,
    wave: "square",
    bass: [50, null, 50, null, 55, null, 55, null, 57, null, 57, null, 55, null, 52, null],
    melody: [74, 76, null, 79, null, 81, 79, null, 76, null, 74, 76, 79, null, null, null],
    chord: [62, 66, 69],
  },
  level2: {
    bpm: 104,
    wave: "sine",
    bass: [47, null, null, 47, 54, null, null, 54, 52, null, null, 52, 50, null, 45, null],
    melody: [71, null, 74, 76, null, 78, null, 76, 74, null, 71, null, 69, null, null, null],
    chord: [59, 62, 66],
  },
  boss: {
    bpm: 142,
    wave: "sawtooth",
    bass: [43, null, 43, 46, 43, null, 43, 48, 43, null, 43, 46, 50, 48, 46, 43],
    melody: [67, null, 66, null, 70, null, 66, null, 73, null, 70, 66, 76, null, 73, null],
    chord: [43, 46, 50],
    tension: true,
  },
};

const music = {
  ctx: null,
  master: null,
  enabled: true,
  track: "silent",
  step: 0,
  nextTime: 0,
  noiseBuffer: null,
};

const keys = new Set();
const input = { x: 0, y: 0, fire: false, special: false };
let joystickActive = false;
let touchFireHeld = false;
let state = "menu";
let lastTime = 0;
let game = createGame();

function createGame(startLevel = 0) {
  return {
    levelIndex: startLevel,
    distance: 0,
    scroll: 0,
    spawnTimer: 0.9,
    pollen: 0,
    crystals: 0,
    score: 0,
    weaponIndex: 0,
    weaponLevels: [1, 1, 1, 1],
    weaponCooldown: 0,
    hurtFlash: 0,
    bossAnnounce: 0,
    player: {
      x: 150,
      y: H * 0.5,
      r: 34,
      hp: MAX_HEALTH,
      maxHp: MAX_HEALTH,
      shield: 0,
      ultimate: 0,
      ultimateCharges: 0,
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    boss: null,
    bossDone: false,
  };
}

function resetLevel(levelIndex) {
  const keep = {
    pollen: game.pollen,
    crystals: game.crystals,
    score: game.score,
    weaponLevels: [...game.weaponLevels],
    weaponIndex: game.weaponIndex,
    playerHp: Math.min(MAX_HEALTH, game.player.hp + 1),
    ultimate: game.player.ultimate,
    ultimateCharges: game.player.ultimateCharges,
  };
  game = createGame(levelIndex);
  game.pollen = keep.pollen;
  game.crystals = keep.crystals;
  game.score = keep.score;
  game.weaponLevels = keep.weaponLevels;
  game.weaponIndex = keep.weaponIndex;
  game.player.hp = keep.playerHp;
  game.player.ultimate = keep.ultimate;
  game.player.ultimateCharges = keep.ultimateCharges;
  addUltimateEnergy(25);
}

function startGame() {
  ensureAudio();
  game = createGame(0);
  state = "playing";
  document.getElementById("scoreForm").hidden = true;
  document.getElementById("helpButton").hidden = false;
  document.getElementById("startButton").textContent = "開始遊戲";
  hideOverlay();
}

function hideOverlay() {
  document.getElementById("overlay").classList.remove("is-visible");
  document.getElementById("knowledgePanel").classList.remove("is-visible");
}

function readScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeScores(scores) {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 5)));
  } catch {
    // 排行榜無法寫入時，遊戲本身仍可繼續。
  }
}

function updateLeaderboard() {
  const list = document.getElementById("leaderboardList");
  const scores = readScores();
  list.innerHTML = "";
  if (!scores.length) {
    const empty = document.createElement("li");
    empty.className = "emptyScore";
    empty.textContent = "目前尚無紀錄，完成三關後即可登上排行榜。";
    list.appendChild(empty);
    return;
  }
  for (const item of scores.slice(0, 5)) {
    const li = document.createElement("li");
    li.textContent = `${item.name}：${item.score} 分`;
    list.appendChild(li);
  }
}

function saveCurrentScore(name) {
  const cleanName = name.trim().slice(0, 12) || "無名蝶友";
  const scores = readScores();
  scores.push({ name: cleanName, score: game.score, date: Date.now() });
  scores.sort((a, b) => b.score - a.score || a.date - b.date);
  writeScores(scores);
  updateLeaderboard();
}

function showKnowledge() {
  const level = levels[game.levelIndex];
  state = "knowledge";
  setMusicTrack("silent");
  document.getElementById("knowledgeStage").textContent = level.name;
  document.getElementById("knowledgeTitle").textContent = level.knowledgeTitle;
  document.getElementById("knowledgeText").textContent = level.knowledge;
  document.getElementById("continueButton").textContent =
    game.levelIndex >= levels.length - 1 ? "完成遊戲" : "前往下一關";
  document.getElementById("knowledgePanel").classList.add("is-visible");
}

function continueFromKnowledge() {
  if (game.levelIndex >= levels.length - 1) {
    state = "victory";
    showEndPanel("遷徙成功", "小紫完成旅程，也把紫斑蝶的棲地知識帶給了玩家。", "重新開始遊戲", true);
    return;
  }
  resetLevel(game.levelIndex + 1);
  state = "playing";
  hideOverlay();
}

function showEndPanel(title, text, buttonText, allowScore = false) {
  setMusicTrack("silent");
  const overlay = document.getElementById("overlay");
  overlay.querySelector(".eyebrow").textContent = `本次得分 ${game.score}`;
  overlay.querySelector("h1").textContent = title;
  overlay.querySelector(".intro").textContent = text;
  document.getElementById("startButton").textContent = buttonText;
  document.getElementById("helpButton").hidden = true;
  document.getElementById("helpText").hidden = true;
  const scoreForm = document.getElementById("scoreForm");
  scoreForm.hidden = !allowScore;
  if (allowScore) {
    document.getElementById("playerName").value = "";
    setTimeout(() => document.getElementById("playerName").focus(), 50);
  }
  updateLeaderboard();
  overlay.classList.add("is-visible");
}

function loop(t) {
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0);
  lastTime = t;
  if (state === "playing") update(dt);
  updateMusic();
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  updateInputFromKeys();
  syncMusicToGame();
  const level = levels[game.levelIndex];
  game.scroll += 90 * dt;
  if (!game.boss) game.distance += 90 * dt;
  game.weaponCooldown = Math.max(0, game.weaponCooldown - dt);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt);
  game.player.shield = Math.max(0, game.player.shield - dt);

  const speed = game.player.shield > 0 ? 355 : 310;
  game.player.x = clamp(game.player.x + input.x * speed * dt, 52, W - 120);
  game.player.y = clamp(game.player.y + input.y * speed * dt, 78, H - 72);

  if (input.fire) fireWeapon();
  if (input.special) {
    input.special = false;
    useUltimate();
  }

  if (!game.boss && !game.bossDone && game.distance >= level.length) spawnBoss();
  if (!game.boss && !game.bossDone) spawnEnemies(dt, level);

  updateBullets(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updatePickups(dt);
  updateParticles(dt);
  handleCollisions();
}

function updateInputFromKeys() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const up = keys.has("arrowup") || keys.has("w");
  const down = keys.has("arrowdown") || keys.has("s");
  const keyX = (right ? 1 : 0) - (left ? 1 : 0);
  const keyY = (down ? 1 : 0) - (up ? 1 : 0);
  if (keyX || keyY) {
    const len = Math.hypot(keyX, keyY);
    input.x = keyX / len;
    input.y = keyY / len;
  } else if (!joystickActive) {
    input.x = 0;
    input.y = 0;
  }
  input.fire = touchFireHeld || keys.has(" ");
}

function fireWeapon() {
  if (game.weaponCooldown > 0) return;
  const weapon = weapons[game.weaponIndex];
  const lvl = game.weaponLevels[game.weaponIndex];
  game.weaponCooldown = Math.max(0.08, weapon.cooldown - lvl * 0.018);

  if (weapon.id === "shield") {
    game.player.shield = 1.25 + lvl * 0.28;
    burst(game.player.x, game.player.y, "#9de8ff", 18);
    return;
  }

  const base = { x: game.player.x + 54, y: game.player.y, owner: "player", life: 1.8 };
  if (weapon.id === "pollen") {
    game.bullets.push({ ...base, vx: 650, vy: 0, r: 9 + lvl, dmg: 7 + lvl * 3, color: "#ffdf5c", kind: "pollen" });
  } else if (weapon.id === "nectar") {
    game.bullets.push({ ...base, vx: 520, vy: 0, r: 14, dmg: 8 + lvl * 2.5, color: "#6ee7ff", kind: "homing" });
  } else if (weapon.id === "spread") {
    const count = lvl >= 4 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      game.bullets.push({
        ...base,
        vx: 610,
        vy: (i - mid) * 145,
        r: 8,
        dmg: 6 + lvl * 2,
        color: "#f8a4ff",
        kind: "spread",
      });
    }
  }
  burst(game.player.x + 48, game.player.y, "#fff1a8", 4);
}

function useUltimate() {
  if (game.player.ultimateCharges <= 0) return;
  game.player.ultimateCharges -= 1;
  game.bullets.push({
    x: game.player.x + 80,
    y: game.player.y,
    vx: 360,
    vy: 0,
    r: 90,
    dmg: 95,
    owner: "player",
    life: 2.2,
    color: "#c084fc",
    kind: "ultimate",
  });
  burst(game.player.x, game.player.y, "#d8b4fe", 42);
}

function addUltimateEnergy(amount) {
  game.player.ultimate += amount;
  while (game.player.ultimate >= 100) {
    game.player.ultimate -= 100;
    game.player.ultimateCharges += 1;
  }
}

function spawnEnemies(dt, level) {
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  const kind = level.spawn[Math.floor(Math.random() * level.spawn.length)];
  const info = enemyInfo[kind];
  const enemy = {
    kind,
    x: W + rand(40, 140),
    y: rand(96, H - 96),
    baseY: 0,
    r: info.r,
    hp: info.hp + game.levelIndex * 5,
    maxHp: info.hp + game.levelIndex * 5,
    vx: -info.speed - game.levelIndex * 12,
    t: rand(0, 10),
    fire: rand(1.4, 2.8),
  };
  enemy.baseY = enemy.y;
  if (kind === "bird") enemy.y = rand(90, 210);
  game.enemies.push(enemy);
  game.spawnTimer = rand(0.7, 1.25) - game.levelIndex * 0.08;
}

function spawnBoss() {
  const level = levels[game.levelIndex];
  const bossHp = 360 * (1 + game.levelIndex * 0.5);
  setMusicTrack("boss");
  game.boss = {
    crop: sprite[level.boss],
    name: level.bossName,
    x: W + 210,
    y: H * 0.5,
    r: 95,
    hp: bossHp,
    maxHp: bossHp,
    t: 0,
    fire: 1.0,
  };
  game.bossAnnounce = 2.5;
}

function updateBullets(dt) {
  for (const b of game.bullets) {
    if (b.kind === "homing") {
      const target = nearestTarget(b.x, b.y);
      if (target) {
        const angle = Math.atan2(target.y - b.y, target.x - b.x);
        b.vx += Math.cos(angle) * 520 * dt;
        b.vy += Math.sin(angle) * 520 * dt;
        const len = Math.hypot(b.vx, b.vy);
        b.vx = (b.vx / len) * 560;
        b.vy = (b.vy / len) * 560;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  for (const b of game.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  game.bullets = game.bullets.filter((b) => b.life > 0 && b.x < W + 160 && b.y > -160 && b.y < H + 160);
  game.enemyBullets = game.enemyBullets.filter((b) => b.life > 0 && b.x > -120 && b.y > -120 && b.y < H + 120);
}

function nearestTarget(x, y) {
  let target = game.boss;
  let best = target ? Math.hypot(target.x - x, target.y - y) : Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < best) {
      best = d;
      target = e;
    }
  }
  return target;
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    e.t += dt;
    e.x += e.vx * dt;
    if (e.kind === "wind" || e.kind === "gust") e.y = e.baseY + Math.sin(e.t * 3) * 48;
    if (e.kind === "bird") e.y += Math.sin(e.t * 5) * 70 * dt + 75 * dt;
    if (e.kind === "smog") {
      e.fire -= dt;
      if (e.fire <= 0) {
        enemyShot(e.x - 35, e.y, -250, rand(-80, 80), 11, "#7c5b8b");
        e.fire = rand(1.5, 2.5);
      }
    }
  }
  game.enemies = game.enemies.filter((e) => e.x > -130 && e.hp > 0);
}

function updateBoss(dt) {
  if (!game.boss) return;
  const b = game.boss;
  b.t += dt;
  b.x += (W - 210 - b.x) * Math.min(1, dt * 1.4);
  b.y = H * 0.5 + Math.sin(b.t * 1.4) * 135;
  b.fire -= dt;
  game.bossAnnounce = Math.max(0, game.bossAnnounce - dt);
  if (b.fire <= 0) {
    const n = 5 + game.levelIndex;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + (i / (n - 1)) * Math.PI * 0.55 - 0.27;
      enemyShot(b.x - 70, b.y, Math.cos(a) * 260, Math.sin(a) * 260, 13, game.levelIndex === 2 ? "#a3e635" : "#7dd3fc");
    }
    b.fire = Math.max(0.55, 1.1 - game.levelIndex * 0.14);
  }
  if (b.hp <= 0) {
    game.score += 80 + game.levelIndex * 40;
    game.boss = null;
    game.bossDone = true;
    burst(W - 220, H * 0.5, "#fde68a", 80);
    setTimeout(showKnowledge, 750);
  }
}

function enemyShot(x, y, vx, vy, r, color) {
  game.enemyBullets.push({ x, y, vx, vy, r, color, life: 4 });
}

function updatePickups(dt) {
  for (const p of game.pickups) {
    p.x -= 100 * dt;
    p.y += Math.sin((p.x + p.y) * 0.03) * 16 * dt;
  }
  game.pickups = game.pickups.filter((p) => p.x > -80);
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function handleCollisions() {
  for (const b of game.bullets) {
    for (const e of game.enemies) {
      if (e.hp <= 0) continue;
      if (hit(b, e)) {
        e.hp -= b.dmg;
        b.life = b.kind === "ultimate" ? b.life : 0;
        burst(e.x, e.y, b.color, 6);
        if (e.hp <= 0) defeatEnemy(e);
      }
    }
    if (game.boss && hit(b, game.boss)) {
      game.boss.hp -= b.dmg;
      b.life = b.kind === "ultimate" ? b.life : 0;
      burst(b.x, b.y, b.color, 5);
    }
  }

  for (const e of game.enemies) {
    if (hit(e, game.player)) {
      damagePlayer(e.damage);
      e.hp = 0;
      burst(e.x, e.y, "#fca5a5", 14);
    }
  }

  for (const b of game.enemyBullets) {
    if (hit(b, game.player)) {
      damagePlayer(9);
      b.life = 0;
    }
  }

  if (game.boss && hit(game.boss, game.player)) damagePlayer(18);

  for (const p of game.pickups) {
    if (hit(p, game.player)) {
      collectPickup(p);
      p.collected = true;
    }
  }
  game.pickups = game.pickups.filter((p) => !p.collected);
}

function hit(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}

function defeatEnemy(e) {
  const info = enemyInfo[e.kind];
  game.score += info.score;
  addUltimateEnergy(4);
  if (Math.random() < 0.65) game.pickups.push({ type: "pollen", x: e.x, y: e.y, r: 18 });
  if (Math.random() < 0.2) game.pickups.push({ type: "heal", x: e.x + 18, y: e.y - 14, r: 20 });
  if (Math.random() < 0.12) game.pickups.push({ type: "crystal", x: e.x + 20, y: e.y - 16, r: 20 });
}

function collectPickup(p) {
  if (p.type === "pollen") {
    game.pollen += 1;
    if (game.pollen % 8 === 0) upgradeWeapon(game.weaponIndex);
  } else if (p.type === "heal") {
    game.player.hp = clamp(game.player.hp + 1, 0, game.player.maxHp);
  } else {
    game.crystals += 1;
    upgradeWeapon(game.weaponIndex);
  }
  burst(p.x, p.y, p.type === "pollen" ? "#fde047" : p.type === "heal" ? "#f472b6" : "#67e8f9", 12);
}

function upgradeWeapon(index) {
  game.weaponLevels[index] = clamp(game.weaponLevels[index] + 1, 1, 5);
  addUltimateEnergy(10);
}

function damagePlayer(amount) {
  if (game.hurtFlash > 0) return;
  if (game.player.shield > 0) {
    addUltimateEnergy(3);
    burst(game.player.x, game.player.y, "#9de8ff", 18);
    return;
  }
  game.player.hp -= 1;
  game.hurtFlash = 0.8;
  burst(game.player.x, game.player.y, "#fda4af", 18);
  if (game.player.hp <= 0) {
    state = "gameover";
    showEndPanel("花蜜耗盡", "遷徙途中需要保存體力。打倒敵人取得補血道具、善用風之護盾，再挑戰一次。", "重新開始遊戲");
  }
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(40, 210);
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: rand(2, 5),
      color,
      life: rand(0.35, 0.8),
      maxLife: 0.8,
      alpha: 1,
    });
  }
}

function draw() {
  drawBackground();
  drawPickups();
  drawBullets();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawParticles();
  drawHud();
  if (state === "paused") drawCenterText("暫停", "按 P 或觸控射擊鍵繼續");
}

function drawBackground() {
  const level = levels[game.levelIndex] || levels[0];
  if (imageReady(assets.bg)) {
    drawBackgroundLayer(level.bg, 1);
    if (!game.boss && !game.bossDone && game.levelIndex < levels.length - 1) {
      const progress = clamp(game.distance / level.length, 0, 1);
      const blend = clamp((progress - 0.78) / 0.22, 0, 1);
      if (blend > 0) drawBackgroundLayer(level.bg + 1, blend * 0.9);
    }
    softenBackgroundEdges();
  } else {
    ctx.fillStyle = "#90d7f5";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 22; i++) {
    const x = (i * 97 - game.scroll * 0.55) % (W + 120);
    ctx.beginPath();
    ctx.ellipse(x, 70 + (i % 6) * 86, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackgroundLayer(bgIndex, alpha) {
  if (!imageReady(assets.bg)) return;
  const sw = 724;
  const sh = 724;
  const crop = 10;
  const sourceX = bgIndex * sw + crop;
  const sourceW = sw - crop * 2;
  const local = game.scroll % W;
  const tileBase = Math.floor(game.scroll / W);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = -1; i <= 2; i++) {
    const x = -local + i * W;
    const flip = (tileBase + i) % 2 !== 0;
    drawBackgroundTile(sourceX, crop, sourceW, sh - crop * 2, x - 2, 0, W + 4, H, flip);
  }
  ctx.restore();
}

function drawBackgroundTile(sx, sy, sw, sh, dx, dy, dw, dh, flipX) {
  if (!imageReady(assets.bg)) return;
  if (!flipX) {
    ctx.drawImage(assets.bg, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(dx + dw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(assets.bg, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

function softenBackgroundEdges() {
  const fade = ctx.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, "rgba(64, 39, 96, 0.16)");
  fade.addColorStop(0.08, "rgba(64, 39, 96, 0)");
  fade.addColorStop(0.92, "rgba(64, 39, 96, 0)");
  fade.addColorStop(1, "rgba(64, 39, 96, 0.16)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);
}

function drawPlayer() {
  const p = game.player;
  const crop = game.hurtFlash > 0 ? sprite.heroHurt : input.fire ? sprite.heroShoot : sprite.hero;
  const scale = game.hurtFlash > 0 ? 0.42 : 0.36;
  ctx.save();
  if (game.hurtFlash > 0 && Math.floor(game.hurtFlash * 18) % 2 === 0) ctx.globalAlpha = 0.55;
  drawSprite(assets.sprites, crop, p.x - crop.w * scale * 0.45, p.y - crop.h * scale * 0.52, crop.w * scale, crop.h * scale);
  if (p.shield > 0) {
    ctx.strokeStyle = "rgba(125, 211, 252, 0.86)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 55 + Math.sin(performance.now() * 0.01) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const e of game.enemies) {
    const crop = enemyInfo[e.kind].crop;
    const size = e.r * 2.3;
    drawSprite(assets.sprites, crop, e.x - size / 2, e.y - size / 2, size, size, true);
    drawSmallHp(e.x, e.y - size * 0.55, e.hp / e.maxHp, size * 0.72);
  }
}

function drawBoss() {
  if (!game.boss) return;
  const b = game.boss;
  const w = b.r * 3.15;
  const h = b.r * 2.35;
  drawSprite(assets.sprites, b.crop, b.x - w / 2, b.y - h / 2, w, h, true);
  drawSmallHp(b.x, b.y - h * 0.58, b.hp / b.maxHp, 250);
  if (game.bossAnnounce > 0) drawCenterText(b.name, "Boss 來襲");
}

function drawBullets() {
  for (const b of game.bullets) {
    ctx.save();
    if (b.kind === "ultimate") {
      const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.08;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = "#fff7ad";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const b of game.enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups() {
  for (const p of game.pickups) {
    const crop = p.type === "pollen" ? icon.star : p.type === "heal" ? icon.heart : icon.crystal;
    drawSprite(assets.icons, crop, p.x - 22, p.y - 22, 44, 44);
  }
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  const level = levels[game.levelIndex] || levels[0];
  ctx.save();
  drawPanel(16, 16, 610, 104);
  drawPanel(W - 374, 16, 358, 116);

  ctx.fillStyle = "#fffaf7";
  ctx.font = "900 17px Microsoft JhengHei, sans-serif";
  ctx.fillText("生命", 34, 45);
  drawHealthSlots(90, 24);
  ctx.fillText("能量", 34, 88);
  drawSprite(assets.icons, icon.swarm, 84, 68, 34, 30);
  drawBar(126, 76, 210, 16, game.player.ultimate / 100, "#c084fc", "#2e1a47");
  drawChargeCounter(348, 66);

  ctx.fillStyle = "#fffaf7";
  ctx.font = "700 18px Microsoft JhengHei, sans-serif";
  ctx.fillText(level.name, 360, 42);
  ctx.fillStyle = "#9de8ff";
  ctx.fillText(level.badge, 360, 72);
  const progress = game.boss ? 1 : clamp(game.distance / level.length, 0, 1);
  drawBar(360, 84, 220, 10, progress, "#fde047", "#463d20");

  drawSprite(assets.icons, icon.star, W - 354, 28, 36, 36);
  drawSprite(assets.icons, icon.crystal, W - 354, 70, 36, 36);
  ctx.fillStyle = "#fffaf7";
  ctx.font = "800 18px Microsoft JhengHei, sans-serif";
  ctx.fillText(`花粉 ${game.pollen}`, W - 312, 53);
  ctx.fillText(`晶球 ${game.crystals}`, W - 312, 95);
  ctx.fillText(`分數 ${game.score}`, W - 180, 53);
  const weapon = weapons[game.weaponIndex];
  drawSprite(assets.icons, weapon.icon, W - 180, 68, 54, 54);
  ctx.fillText(`Lv.${game.weaponLevels[game.weaponIndex]}`, W - 118, 92);
  ctx.fillStyle = "#9de8ff";
  ctx.font = "700 15px Microsoft JhengHei, sans-serif";
  ctx.fillText(weapon.name, W - 180, 122);
  ctx.restore();
}

function drawPanel(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(18, 20, 30, 0.68)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 2;
  roundedRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHealthSlots(x, y) {
  for (let i = 0; i < game.player.maxHp; i++) {
    ctx.save();
    if (i >= game.player.hp) ctx.globalAlpha = 0.26;
    drawSprite(assets.icons, icon.heart, x + i * 44, y, 38, 34);
    ctx.restore();
  }
}

function drawChargeCounter(x, y) {
  ctx.save();
  ctx.fillStyle = game.player.ultimateCharges > 0 ? "rgba(253, 224, 71, 0.95)" : "rgba(255, 255, 255, 0.25)";
  ctx.strokeStyle = "rgba(39, 23, 40, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = game.player.ultimateCharges > 0 ? "#271728" : "rgba(255, 250, 247, 0.68)";
  ctx.font = "900 18px Microsoft JhengHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(game.player.ultimateCharges), x, y + 18);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fffaf7";
  ctx.font = "800 13px Microsoft JhengHei, sans-serif";
  ctx.fillText("次", x + 24, y + 23);
  ctx.restore();
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSprite(img, crop, dx, dy, dw, dh, flipX = false) {
  if (!imageReady(img)) return;
  if (!flipX) {
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(dx + dw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, dw, dh);
  ctx.restore();
}

function drawBar(x, y, w, h, pct, fill, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * clamp(pct, 0, 1), h);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawSmallHp(x, y, pct, w) {
  ctx.save();
  drawBar(x - w / 2, y, w, 8, pct, "#fb7185", "rgba(40,20,26,0.5)");
  ctx.restore();
}

function drawCenterText(title, sub) {
  ctx.save();
  ctx.fillStyle = "rgba(18,20,30,0.58)";
  ctx.fillRect(W / 2 - 250, H / 2 - 78, 500, 136);
  ctx.fillStyle = "#fffaf7";
  ctx.textAlign = "center";
  ctx.font = "900 44px Microsoft JhengHei, sans-serif";
  ctx.fillText(title, W / 2, H / 2 - 12);
  ctx.fillStyle = "#9de8ff";
  ctx.font = "800 20px Microsoft JhengHei, sans-serif";
  ctx.fillText(sub, W / 2, H / 2 + 30);
  ctx.restore();
}

function switchWeapon() {
  game.weaponIndex = (game.weaponIndex + 1) % weapons.length;
  burst(game.player.x, game.player.y, "#f0abfc", 10);
}

function ensureAudio() {
  if (!music.enabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!music.ctx) {
    music.ctx = new AudioContextClass();
    music.master = music.ctx.createGain();
    music.master.gain.value = 0.22;
    music.master.connect(music.ctx.destination);
    music.noiseBuffer = createNoiseBuffer(music.ctx);
  }
  if (music.ctx.state === "suspended") music.ctx.resume();
  if (!music.nextTime) music.nextTime = music.ctx.currentTime + 0.05;
}

function createNoiseBuffer(audioCtx) {
  const length = Math.floor(audioCtx.sampleRate * 0.08);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function syncMusicToGame() {
  if (state !== "playing" || !music.enabled) return;
  if (game.boss) {
    setMusicTrack("boss");
    return;
  }
  if (game.bossDone) {
    setMusicTrack("silent");
    return;
  }
  setMusicTrack(`level${game.levelIndex}`);
}

function setMusicTrack(trackName) {
  if (music.track === trackName) return;
  music.track = trackName;
  music.step = 0;
  if (music.ctx) music.nextTime = music.ctx.currentTime + 0.06;
}

function toggleMusic() {
  music.enabled = !music.enabled;
  if (music.master) music.master.gain.setTargetAtTime(music.enabled ? 0.22 : 0.0001, music.ctx.currentTime, 0.03);
  if (music.enabled) {
    ensureAudio();
    syncMusicToGame();
  }
  updateMusicButton();
}

function updateMusicButton() {
  const button = document.getElementById("musicButton");
  if (button) button.textContent = music.enabled ? "音樂：開" : "音樂：關";
}

function updateMusic() {
  if (!music.enabled || !music.ctx || !music.master || state !== "playing") return;
  const track = musicTracks[music.track];
  if (!track) return;
  if (music.ctx.state === "suspended") return;
  const stepDur = 60 / track.bpm / 4;
  if (!music.nextTime || music.nextTime < music.ctx.currentTime - 0.2) {
    music.nextTime = music.ctx.currentTime + 0.04;
  }
  while (music.nextTime < music.ctx.currentTime + 0.14) {
    scheduleMusicStep(track, music.step, music.nextTime, stepDur);
    music.step += 1;
    music.nextTime += stepDur;
  }
}

function scheduleMusicStep(track, step, time, stepDur) {
  const index = step % 16;
  const bass = track.bass[index];
  const melody = track.melody[index];
  if (bass !== null) playTone(bass, time, stepDur * 1.8, "sine", track.tension ? 0.08 : 0.055);
  if (melody !== null) playTone(melody, time + stepDur * 0.05, stepDur * 1.35, track.wave, track.tension ? 0.045 : 0.038);
  if (index === 0 || index === 8) playChord(track.chord, time, stepDur * 7.5, track.tension);
  if (track.tension) {
    if (index % 4 === 0) playKick(time, 0.11);
    if (index % 2 === 1) playHat(time, 0.035);
  } else {
    if (index % 8 === 4) playKick(time, 0.045);
    if (index % 4 === 2) playHat(time, 0.015);
  }
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playTone(midi, time, duration, type, volume) {
  const audioCtx = music.ctx;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(midiToFreq(midi), time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sawtooth" ? 1300 : 2600, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(filter).connect(gain).connect(music.master);
  osc.start(time);
  osc.stop(time + duration + 0.04);
}

function playChord(notes, time, duration, tension) {
  notes.forEach((note, i) => {
    playTone(note + (tension ? 12 : 0), time + i * 0.012, duration, tension ? "sawtooth" : "triangle", tension ? 0.014 : 0.018);
  });
}

function playKick(time, volume) {
  const audioCtx = music.ctx;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  osc.connect(gain).connect(music.master);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playHat(time, volume) {
  const audioCtx = music.ctx;
  if (!music.noiseBuffer) return;
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = music.noiseBuffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(5200, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
  source.connect(filter).connect(gain).connect(music.master);
  source.start(time);
  source.stop(time + 0.065);
}

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("helpButton").addEventListener("click", () => {
  const help = document.getElementById("helpText");
  help.hidden = !help.hidden;
});
document.getElementById("musicButton").addEventListener("click", toggleMusic);
document.getElementById("continueButton").addEventListener("click", continueFromKnowledge);
document.getElementById("scoreForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentScore(document.getElementById("playerName").value);
  document.getElementById("scoreForm").hidden = true;
  document.getElementById("startButton").focus();
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const key = event.key.toLowerCase();
  keys.add(key);
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
  if (state === "playing" && key === "j") switchWeapon();
  if (state === "playing" && key === "k") input.special = true;
  if (key === "p") state = state === "playing" ? "paused" : state === "paused" ? "playing" : state;
  if (key === "m") toggleMusic();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  if (event.key === " ") input.fire = false;
});

setupTouchControls();
updateLeaderboard();
updateMusicButton();
requestAnimationFrame(loop);

function setupTouchControls() {
  const joystick = document.getElementById("joystick");
  const stick = document.getElementById("stick");
  let activePointer = null;

  function moveStick(event) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = rect.width * 0.34;
    const len = Math.hypot(dx, dy);
    const nx = len > max ? (dx / len) * max : dx;
    const ny = len > max ? (dy / len) * max : dy;
    stick.style.transform = `translate(${nx}px, ${ny}px)`;
    input.x = clamp(dx / max, -1, 1);
    input.y = clamp(dy / max, -1, 1);
  }

  joystick.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    joystickActive = true;
    joystick.setPointerCapture(activePointer);
    moveStick(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) moveStick(event);
  });
  function releaseStick(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    joystickActive = false;
    stick.style.transform = "translate(0, 0)";
    input.x = 0;
    input.y = 0;
  }
  joystick.addEventListener("pointerup", releaseStick);
  joystick.addEventListener("pointercancel", releaseStick);

  const fire = document.getElementById("touchFire");
  fire.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state === "paused") state = "playing";
    touchFireHeld = true;
  });
  fire.addEventListener("pointerup", () => (touchFireHeld = false));
  fire.addEventListener("pointercancel", () => (touchFireHeld = false));

  document.getElementById("touchWeapon").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state === "playing") switchWeapon();
  });
  document.getElementById("touchSpecial").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state === "playing") input.special = true;
  });
}
