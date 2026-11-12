// Color Chase
// Your line of balls follows the cursor. Anything it touches joins your line
// in its own color. Every catch makes your line longer and bigger.
// The game keeps going until your line fills the whole screen.

let chain = [];      // your line of balls
let loose = [];      // balls to catch
let pops = [];       // rings that show when you catch something
let trail = [];      // the path your head has taken
let state = "start"; // start, play, fill, end
let r = 10;          // size of each ball in your line
let caughtCount = 0;
let level = 1;
let bannerTime = 0;  // when the level banner started
let audio;           // for the pop sound

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB);
  resetGame();
}

function resetGame() {
  chain = [];
  loose = [];
  pops = [];
  trail = [];
  r = 10;
  caughtCount = 0;
  level = 1;
  for (let i = 0; i < 5; i++) addBall(200 + i * 8);
  for (let i = 0; i < 10; i++) loose.push(newLoose());
}

function addBall(h) {
  let last = chain.length ? chain[chain.length - 1] : { x: width / 2, y: height / 2 };
  chain.push({ x: last.x, y: last.y, h: h });
}

function tailHue() {
  return chain[chain.length - 1].h;
}

// balls float faster each level
function looseSpeed() {
  return min(0.5 + level * 0.25, 4);
}

function newLoose() {
  let a = random(TWO_PI);
  let speed = looseSpeed();
  return {
    x: random(40, width - 40),
    y: random(40, height - 40),
    vx: cos(a) * speed,
    vy: sin(a) * speed,
    h: tailHue() + random(5, 25) // a color close to your tail, so it stays analogous
  };
}

function draw() {
  // background color shifts with each level
  background((230 + level * 25) % 360, 40, 10);

  if (state == "fill") {
    r += 4; // last swell to finish covering the screen
    if (r > max(width, height)) state = "end";
  } else {
    moveChain();
  }

  if (state == "play") moveLoose();

  // loose balls, each in its own color
  noStroke();
  let looseSize = max(16, r);
  for (let b of loose) {
    fill(b.h % 360, 70, 100, 0.3);
    circle(b.x, b.y, looseSize * 1.8);
    fill(b.h % 360, 70, 100);
    circle(b.x, b.y, looseSize);
  }

  // your line
  for (let i = chain.length - 1; i >= 0; i--) {
    fill(chain[i].h % 360, 70, 100);
    circle(chain[i].x, chain[i].y, r * 2);
  }

  // catch rings
  noFill();
  strokeWeight(3);
  for (let i = pops.length - 1; i >= 0; i--) {
    let p = pops[i];
    p.size += 6;
    p.life -= 0.04;
    stroke(p.h % 360, 70, 100, p.life);
    circle(p.x, p.y, p.size);
    if (p.life <= 0) pops.splice(i, 1);
  }
  noStroke();

  // text
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  if (state == "start") {
    textSize(56);
    text("Color Chase", width / 2, height / 2 - 30);
    textSize(18);
    text("Catch colors. Grow until you fill the screen. Click to start.", width / 2, height / 2 + 30);
  } else if (state == "play") {
    textAlign(LEFT, TOP);
    textSize(16);
    text("Level " + level + "   Caught: " + caughtCount, 20, 20);

    // level banner fades out over 2 seconds
    let t = millis() - bannerTime;
    if (t < 2000) {
      fill(0, 0, 100, 1 - t / 2000);
      textAlign(CENTER, CENTER);
      textSize(60);
      text("Level " + level, width / 2, height / 2);
    }
  } else if (state == "end") {
    fill(0, 0, 0);
    textSize(48);
    text("You filled the screen", width / 2, height / 2 - 20);
    textSize(18);
    text("Level " + level + ", caught " + caughtCount + ". Click to play again.", width / 2, height / 2 + 30);
  }
}

function moveChain() {
  // head follows the mouse
  let head = chain[0];
  head.x = lerp(head.x, mouseX, 0.5);
  head.y = lerp(head.y, mouseY, 0.5);

  // remember the path the head has taken
  if (trail.length == 0 || dist(head.x, head.y, trail[0].x, trail[0].y) > 1) {
    trail.unshift({ x: head.x, y: head.y });
  }

  // place each ball along that path, so squares stay squares
  let gap = r * 1.8;
  let next = 1;    // which ball we are placing
  let walked = 0;  // how far back along the path we are
  for (let k = 1; k < trail.length && next < chain.length; k++) {
    let a = trail[k - 1];
    let b = trail[k];
    let seg = dist(a.x, a.y, b.x, b.y);
    while (next < chain.length && walked + seg >= next * gap) {
      let t = (next * gap - walked) / seg;
      let tx = lerp(a.x, b.x, t);
      let ty = lerp(a.y, b.y, t);
      // ease toward the path a little, this keeps some of the physics feel
      chain[next].x = lerp(chain[next].x, tx, 0.6);
      chain[next].y = lerp(chain[next].y, ty, 0.6);
      next++;
    }
    walked += seg;
    if (next >= chain.length) trail.splice(k + 20); // forget path we no longer need
  }
}

function moveLoose() {
  for (let b of loose) {
    // drift and bounce off the walls
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 10 || b.x > width - 10) b.vx *= -1;
    if (b.y < 10 || b.y > height - 10) b.vy *= -1;

    // anything your line touches joins it
    for (let c of chain) {
      if (dist(b.x, b.y, c.x, c.y) < r + 16) {
        catchBall(b);
        break;
      }
    }
  }

  // every second, check how much of the screen you cover
  if (frameCount % 60 == 0 && coverage() > 0.9) state = "fill";
}

function catchBall(b) {
  caughtCount++;
  addBall(b.h);    // longer, in the color you caught
  r += 0.1;        // bigger
  pops.push({ x: b.x, y: b.y, h: b.h, size: 20, life: 1 });
  popSound(b.h);
  Object.assign(b, newLoose());

  // level up every 20 catches
  if (caughtCount % 20 == 0) {
    level++;
    bannerTime = millis();
    if (loose.length < 30) loose.push(newLoose(), newLoose());
    for (let l of loose) {
      let a = random(TWO_PI);
      let speed = looseSpeed();
      l.vx = cos(a) * speed;
      l.vy = sin(a) * speed;
    }
  }
}

// checks a grid of points to see how much of the screen your line covers
function coverage() {
  let hit = 0;
  let total = 0;
  for (let x = 0; x <= width; x += width / 20) {
    for (let y = 0; y <= height; y += height / 12) {
      total++;
      for (let c of chain) {
        if (dist(x, y, c.x, c.y) < r) {
          hit++;
          break;
        }
      }
    }
  }
  return hit / total;
}

// short pop, higher pitch for different colors
function popSound(h) {
  if (!audio) return;
  let o = audio.createOscillator();
  let g = audio.createGain();
  o.frequency.value = 300 + (h % 360);
  g.gain.setValueAtTime(0.15, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
  o.connect(g);
  g.connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + 0.15);
}

function mousePressed() {
  // sound can only start after a click
  if (!audio) {
    try { audio = new AudioContext(); } catch (e) {}
  }
  if (audio) audio.resume();

  if (state == "start") {
    state = "play";
    bannerTime = millis();
  } else if (state == "end") {
    resetGame();
    state = "play";
    bannerTime = millis();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
