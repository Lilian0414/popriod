let clickCount = 0;
const cat = document.getElementById('cat');    // 閉嘴圖片 1.png
const cat2 = document.getElementById('cat2');  // 張嘴圖片 2.png
const clickCountElement = document.getElementById('clickCount');
const globalClickCountElement = document.getElementById('globalClickCount');

// ✅ 改成固定 API 位址
const API_BASE = "https://fuckperiod-api.vercel.app";

// 閉嘴的貓咪圖片
const closedMouthCatImg = cat;
const openMouthCatImg = cat2;
const frenzyCatImg = cat2;

// 點擊音效
const popSound = new Audio('pa2.mp3');
const frenzySound = new Audio('pa2.mp3');

// 設定音效音量
popSound.volume = 1;
frenzySound.volume = 1;

// 點擊速度追蹤
let clickTimes = [];
let isFrenzyMode = false;
const FRENZY_THRESHOLD = 5;    // 每秒5次觸發
const FRENZY_DURATION = 3000;  // 狂暴模式 3 秒
let frenzyTimer = null;

// 計算點擊速度
function calculateClickSpeed() {
  const now = Date.now();
  clickTimes = clickTimes.filter(time => now - time < 1000);
  return clickTimes.length;
}

// 播放音效
function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(err => console.log('音效播放失敗:', err));
}

// 啟動狂暴模式
function activateFrenzyMode() {
  if (!isFrenzyMode) {
    isFrenzyMode = true;
    document.body.classList.add('frenzy-mode');
    playSound(frenzySound);
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

// ✅ 同步點擊數到後端
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

function animateScoreBounce() {
  clickCountElement.classList.remove('bounce');
  void clickCountElement.offsetWidth; // 觸發 reflow
  clickCountElement.classList.add('bounce');
}

// 按下時
document.addEventListener('mousedown', () => {
  const now = Date.now();
  clickTimes.push(now);

  monitorClickSpeed();

  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'block';
  }

  clickCount++;
  clickCountElement.textContent = clickCount;
  localStorage.setItem('localCount', clickCount);

  animateScoreBounce();
  syncClickCount(1);
  playSound(isFrenzyMode ? frenzySound : popSound);
});

// 放開時
document.addEventListener('mouseup', () => {
  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

// 滑鼠離開
document.addEventListener('mouseleave', () => {
  if (!isFrenzyMode) {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

// 定期檢查點擊速度
setInterval(monitorClickSpeed, 100);

clickCount = parseInt(localStorage.getItem('localCount')) || 0;
clickCountElement.textContent = clickCount;

// ✅ 頁面載入時讀取總點擊數
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
