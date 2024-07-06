require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

const PORT = 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('API key is missing. Please check your .env file.');
    process.exit(1);
}

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', async (req, res) => {
    const { budget, images } = req.body;

    try {
        const imageUrls = images.map((image, index) => ({
            type: "image_url",
            image_url: {
                url: image
            }
        }));

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: "text",
                                text: `3장의 얼굴 사진과 예산: ${budget} 원이 제공되었습니다. 분석 결과, 제품 및 루틴 추천, 피부 시술 추천 항목을 각각 구분하여 출력해주세요.`
                            },
                            ...imageUrls
                        ]
                    }
                ],
                max_tokens: 1000
            })
        });

        const result = await response.json();
        console.log(result);  // API 응답을 콘솔에 출력

        if (result.choices && result.choices[0] && result.choices[0].message) {
            res.json(result.choices[0].message.content);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch analysis results. Please try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
