let clickCount = 0;
const cat = document.getElementById('cat');    // 閉嘴圖片 1.png
const cat2 = document.getElementById('cat2');  // 張嘴圖片 2.png
const clickCountElement = document.getElementById('clickCount');
const globalClickCountElement = document.getElementById('globalClickCount');

// 閉嘴的貓咪圖片
const closedMouthCatImg = cat;  // 直接使用圖片元素
// 張嘴的貓咪圖片
const openMouthCatImg = cat2;  // 直接使用圖片元素
// 狂暴模式貓咪圖片
const frenzyCatImg = cat2;  // 改為使用 cat2 作為狂暴模式圖片

// 點擊音效
const popSound = new Audio('pa2.mp3');     // 一般點擊音效
const frenzySound = new Audio('pa2.mp3');  // 狂暴模式音效

// 設定音效音量
popSound.volume = 1;     // 最大音量
frenzySound.volume = 1;  // 最大音量

// 點擊速度追蹤
let clickTimes = [];
let isFrenzyMode = false;
const FRENZY_THRESHOLD = 5;    // 每秒5次點擊觸發狂暴模式
const FRENZY_DURATION = 3000;  // 狂暴模式持續3秒
let frenzyTimer = null;

// 計算點擊速度
function calculateClickSpeed() {
  const now = Date.now();
  clickTimes =
      clickTimes.filter(time => now - time < 1000);  // 只保留最近1秒的點擊
  return clickTimes.length;
}

// 音效播放函數
function playSound(sound) {
  sound.currentTime = 0;  // 重置音效
  sound.play().catch(error => console.log('音效播放失敗:', error));
}

// 啟動狂暴模式
function activateFrenzyMode() {
  if (!isFrenzyMode) {
    isFrenzyMode = true;
    document.body.classList.add('frenzy-mode');
    playSound(frenzySound);
    // 切換到狂暴模式圖片 (使用 cat2)
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'none';  // 確保張嘴圖片隱藏
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
    // 切換回閉嘴圖片 (使用 cat)
    frenzyCatImg.style.display = 'none';  // 隱藏狂暴模式圖片 (cat2)
    closedMouthCatImg.style.display = 'block';
    // openMouthCatImg.style.display = 'none'; // 保持隱藏
  }
}

// 監控點擊速度
function monitorClickSpeed() {
  const speed = calculateClickSpeed();

  if (speed >= FRENZY_THRESHOLD) {
    activateFrenzyMode();
    // 重置計時器
    if (frenzyTimer) {
      clearTimeout(frenzyTimer);
    }
    frenzyTimer = setTimeout(() => {
      deactivateFrenzyMode();
    }, FRENZY_DURATION);
  } else if (isFrenzyMode && speed < FRENZY_THRESHOLD) {
    // 如果速度低於閾值，立即解除狂暴模式
    deactivateFrenzyMode();
  }
}

// 同步點擊數到後端
async function syncClickCount(increment) {
  try {
    const response = await fetch('/api/clicks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({clicks: increment})  // 只送這次的增量
    });

    if (!response.ok) throw new Error('Failed to sync clicks');

    const data = await response.json();
    if (data.totalClicks) {
      globalClickCountElement.textContent = data.totalClicks;
    }
  } catch (error) {
    console.error('Error syncing clicks:', error);
  }
}


function animateScoreBounce() {
  clickCountElement.classList.remove('bounce');
  // 觸發 reflow 以重新啟動動畫
  void clickCountElement.offsetWidth;
  clickCountElement.classList.add('bounce');
}

// 按下時
document.addEventListener('mousedown', () => {
  const now = Date.now();
  clickTimes.push(now);

  // 檢查點擊速度
  monitorClickSpeed();

  // 切換圖片
  if (isFrenzyMode) {
    // 狂暴模式下，按下保持狂暴圖片
  } else {
    closedMouthCatImg.style.display = 'none';
    openMouthCatImg.style.display = 'block';
  }

  clickCount++;
  clickCountElement.textContent = clickCount;
  localStorage.setItem('localCount', clickCount);  // ✅ 更新本地儲存
  animateScoreBounce();
  syncClickCount(1);
  playSound(isFrenzyMode ? frenzySound : popSound);
  // 每1次點擊同步一次到後端
});

// 放開時
document.addEventListener('mouseup', () => {
  if (isFrenzyMode) {
    // 狂暴模式下，放開保持狂暴圖片
  } else {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

// 滑鼠離開時也要恢復閉嘴狀態
document.addEventListener('mouseleave', () => {
  if (isFrenzyMode) {
    // 狂暴模式下，滑鼠離開保持狂暴圖片
  } else {
    closedMouthCatImg.style.display = 'block';
    openMouthCatImg.style.display = 'none';
  }
});

// 定期檢查點擊速度
setInterval(monitorClickSpeed, 100);

clickCount = parseInt(localStorage.getItem('localCount')) || 0;
clickCountElement.textContent = clickCount;

// 頁面載入時從後端獲取總點擊數
async function loadTotalClicks() {
  try {
    const response = await fetch('/api/clicks');
    if (response.ok) {
      const data = await response.json();
      globalClickCountElement.textContent = data.totalClicks || 0;
    }
  } catch (error) {
    console.error('Error loading total clicks:', error);
  }
}

// 頁面載入時執行
loadTotalClicks();
