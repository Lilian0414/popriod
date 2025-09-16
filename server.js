const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// 👉 全域計數儲存在檔案
const DATA_FILE = 'count.json';
let totalClicks = 0;

// 啟動時讀取
if (fs.existsSync(DATA_FILE)) {
  totalClicks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).count || 0;
}

app.use(express.json());
app.use(express.static('public'));

// 取得總點擊數
app.get('/api/clicks', (req, res) => {
  res.json({totalClicks});
});

// 更新點擊數
app.post('/api/clicks', (req, res) => {
  const {clicks} = req.body;
  totalClicks += clicks;
  fs.writeFileSync(DATA_FILE, JSON.stringify({count: totalClicks}));
  res.json({totalClicks});
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
