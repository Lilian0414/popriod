let clickCount = 0;
const cat = document.getElementById('cat');   
const cat2 = document.getElementById('cat2');  
const clickCountElement = document.getElementById('clickCount');
const globalClickCountElement = document.getElementById('globalClickCount');
const API_BASE = "https://fuckperiod-api.vercel.app";

const closedMouthCatImg = cat;
const openMouthCatImg = cat2;
const frenzyCatImg = cat2;

const poolSize = 5;
const soundPool = Array.from({ length: poolSize }, () => new Audio('pa2.mp3'));
let poolIndex = 0;

function playSound() {
  const sound = soundPool[poolIndex];
  sound.currentTime = 0;
  sound.play().catch(() => {});
  poolIndex = (poolIndex + 1) % poolSize;
}

let clickTimes = [];
let isFrenzyMode = false;
const FRENZY_THRESHOLD = 8;    
const FRENZY_DURATION = 3000; 
let frenzyTimer = null;

function calculateClickSpeed() {
  const now = Date.now();
  clickTimes = clickTimes.filter(time => now - time < 1000);
  return clickTimes.length;
}

function activateFrenzyMode() {
  if (!isFrenzyMode) {
    isFrenzyMode = true;
    document.body.classList.add('frenzy-mode');
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'none';
    frenzyCatImg.style.display = 'block';
  }
}

function deactivateFrenzyMode() {
  if (isFrenzyMode) {
    isFrenzyMode = false;
    document.body.classList.remove('frenzy-mode');
    if (frenzyTimer) {
      clearTimeout(frenzyTimer);
      frenzyTimer = null;
    }
    frenzyCatImg.style.display = 'none';
    closedMouthCatImg.style.display = 'block';
  }
}

function monitorClickSpeed() {
  const speed = calculateClickSpeed();
  if (speed >= FRENZY_THRESHOLD) {
    activateFrenzyMode();
    if (frenzyTimer) clearTimeout(frenzyTimer);
    frenzyTimer = setTimeout(() => deactivateFrenzyMode(), FRENZY_DURATION);
  } else if (isFrenzyMode && speed < FRENZY_THRESHOLD) {
    deactivateFrenzyMode();
  }
}

let pendingClicks = 0;
async function syncClickCount(increment) {
  try {
    const response = await fetch(`${API_BASE}/api/clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clicks: increment })
    });
    if (!response.ok) throw new Error('Failed to sync clicks');

    const data = await response.json();
    if (data.totalClicks !== undefined) {
      globalClickCountElement.textContent = data.totalClicks;
    }
  } catch (error) {
    console.error('Error syncing clicks:', error);
  }
}]
setInterval(() => {
  if (pendingClicks > 0) {
    syncClickCount(pendingClicks);
    pendingClicks = 0;
  }
}, 1000);
function animateScoreBounce() {
  clickCountElement.classList.add('bounce');
  setTimeout(() => clickCountElement.classList.remove('bounce'), 200);
}
document.addEventListener('mousedown', () => {
  const now = Date.now();
  clickTimes.push(now);

  monitorClickSpeed();

  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'block';
  }

  clickCount++;
  pendingClicks++;
  clickCountElement.textContent = clickCount;
  localStorage.setItem('localCount', clickCount);

  animateScoreBounce();
  playSound();
});

document.addEventListener('mouseup', () => {
  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

document.addEventListener('mouseleave', () => {
  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

setInterval(monitorClickSpeed, 100);

clickCount = parseInt(localStorage.getItem('localCount')) || 0;
clickCountElement.textContent = clickCount;

async function loadTotalClicks() {
  try {
    const response = await fetch(`${API_BASE}/api/clicks`);
    if (response.ok) {
      const data = await response.json();
      globalClickCountElement.textContent = data.totalClicks || 0;
    }
  } catch (error) {
    console.error('Error loading total clicks:', error);
  }
}
loadTotalClicks();
