const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await client.connect();
  console.log('Connected to Redis');
})();

/**
 * 紀錄點擊
 * @param {Object} data
 * @param {number} data.clicks - 點擊次數 (通常是 1)
 * @param {string} data.ip - 使用者 IP
 * @param {string} data.userAgent - 使用者 UA
 */
async function saveClick({ clicks, ip, userAgent }) {
  const timestamp = Date.now();

  // 總點擊數
  await client.incrBy('totalClicks', clicks);

  // 詳細紀錄（存成一個 list）
  const logEntry = JSON.stringify({
    clicks,
    ip,
    userAgent,
    timestamp
  });

  await client.lPush('clickLogs', logEntry);
}

/**
 * 取得總點擊數
 */
async function getTotalClicks() {
  const total = await client.get('totalClicks');
  return parseInt(total) || 0;
}

/**
 * 取得最近 N 筆點擊紀錄
 */
async function getRecentLogs(limit = 10) {
  const logs = await client.lRange('clickLogs', 0, limit
