let clickCount = 0;
const cat = document.getElementById('cat');    // 閉嘴圖片 1.png
const cat2 = document.getElementById('cat2');  // 張嘴圖片 2.png
const clickCountElement = document.getElementById('clickCount');
const globalClickCountElement = document.getElementById('globalClickCount');

// API 基底網址 (指向 Vercel 部署)
const API_BASE = "https://fuckperiod-api.vercel.app";

// 閉嘴 / 張嘴 / 狂暴模式圖片
const closedMouthCatImg = cat;
const openMouthCatImg = cat2;
const frenzyCatImg = cat2;

// === 音效池 ===
const poolSize = 5;
const soundPool = Array.from({ length: poolSize }, () => new Audio('pa2.mp3'));
let poolIndex = 0;

function playSound() {
  const sound = soundPool[poolIndex];
  sound.currentTime = 0;
  sound.play().catch(() => {});
  poolIndex = (poolIndex + 1) % poolSize;
}

// 點擊速度追蹤
let clickTimes = [];
let isFrenzyMode = false;
const FRENZY_THRESHOLD = 10;    // 每秒5次點擊觸發狂暴模式
const FRENZY_DURATION = 3000;  // 狂暴模式持續3秒
let frenzyTimer = null;

// 計算點擊速度
function calculateClickSpeed() {
  const now = Date.now();
  clickTimes = clickTimes.filter(time => now - time < 1000);
  return clickTimes.length;
}

// 啟動狂暴模式
function activateFrenzyMode() {
  if (!isFrenzyMode) {
    isFrenzyMode = true;
    document.body.classList.add('frenzy-mode');
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'none';
    frenzyCatImg.style.display = 'block';
  }
}

// 解除狂暴模式
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

// 監控點擊速度
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

// === 批次同步點擊數到後端 ===
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
}
// 每 500ms 批次送
setInterval(() => {
  if (pendingClicks > 0) {
    syncClickCount(pendingClicks);
    pendingClicks = 0;
  }
}, 1000);

// === 分數動畫 (不用 reflow) ===
function animateScoreBounce() {
  clickCountElement.classList.add('bounce');
  setTimeout(() => clickCountElement.classList.remove('bounce'), 200);
}

// === 點擊事件 ===
document.addEventListener('mousedown', () => {
  const now = Date.now();
  clickTimes.push(now);

  monitorClickSpeed();

  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'block';
  }

  clickCount++;
  pendingClicks++; // ← 只記錄，不馬上送 API
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

// 定期檢查點擊速度
setInterval(monitorClickSpeed, 100);

// 初始化本地計數
clickCount = parseInt(localStorage.getItem('localCount')) || 0;
clickCountElement.textContent = clickCount;

// 頁面載入時取得後端總點擊數
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
