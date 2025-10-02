let clickCount = 0; // 個人本地點擊數
let pendingClicks = 0; // 尚未送到後端的點擊數
const cat = document.getElementById('cat');   
const cat2 = document.getElementById('cat2');  
const clickCountElement = document.getElementById('clickCount');
const globalClickCountElement = document.getElementById('globalClickCount');
const API_BASE = "https://fuckperiod-api.vercel.app";

const closedMouthCatImg = cat;
const openMouthCatImg = cat2;
const frenzyCatImg = cat2;

// --- 聲音池 ---
const poolSize = 5;
const soundPool = Array.from({ length: poolSize }, () => new Audio('pa2.mp3'));
let poolIndex = 0;
function playSound() {
  const sound = soundPool[poolIndex];
  sound.currentTime = 0;
  sound.play().catch(() => {});
  poolIndex = (poolIndex + 1) % poolSize;
}

// --- Frenzy Mode (保留你的特色) ---
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
setInterval(monitorClickSpeed, 100);

// --- 平滑跳動動畫 ---
function animateGlobalCount(from, to) {
  if (to <= from) {
    globalClickCountElement.textContent = to;
    return;
  }
  let current = from;
  const step = () => {
    current++;
    globalClickCountElement.textContent = current;
    if (current < to) {
      requestAnimationFrame(step);
    }
  };
  step();
}

// --- 與 API 溝通 ---
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
      const current = parseInt(globalClickCountElement.textContent) || 0;
      animateGlobalCount(current, data.totalClicks);
    }
  } catch (error) {
    console.error('Error syncing clicks:', error);
  }
}

let firstLoad = true; // 加這個

async function loadTotalClicks() {
  try {
    const response = await fetch(`${API_BASE}/api/clicks`);
    if (response.ok) {
      const data = await response.json();
      if (firstLoad) {
        // 第一次：直接設定數字
        globalClickCountElement.textContent = data.totalClicks || 0;
        firstLoad = false;
      } else {
        // 之後：平滑跳動
        const current = parseInt(globalClickCountElement.textContent) || 0;
        animateGlobalCount(current, data.totalClicks || 0);
      }
    }
  } catch (error) {
    console.error('Error loading total clicks:', error);
  }
}


// --- 每秒送 pendingClicks ---
setInterval(() => {
  if (pendingClicks > 0) {
    syncClickCount(pendingClicks);
    pendingClicks = 0;
  }
}, 1000);

// --- 每 2 秒抓一次最新 total ---
setInterval(loadTotalClicks, 2000);

// --- 點擊事件 ---
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

  // 個人數字立即更新
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

// --- 初始化 ---
clickCount = parseInt(localStorage.getItem('localCount')) || 0;
clickCountElement.textContent = clickCount;
loadTotalClicks();
