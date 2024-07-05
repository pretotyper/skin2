require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const PORT = 3000; // 여기에서 포트를 설정합니다
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/config.js', (req, res) => {
    res.type('.js');
    res.send(`const OPENAI_API_KEY = '${OPENAI_API_KEY}';`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
