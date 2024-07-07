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
                                text: `등록한 3장의 사진과 총 예산 ${budget}에 맞게 예상 연령대와 특징 등 피부 분석을 해주고, 분석 결과에 맞는 피부 관리 제품과 루틴을 추천해줘. 
                        제품은 가급적이면 쿠팡에서 구매 가능한 제품으로 추천해주고 제품의 효과와 성분도 알려줘. 링크를 제공할 필요는 없어.
                        그리고 예산에 상관없이 내 피부에 맞는 피부 시술을 추천해주고 시술당 평균 가격을 알려줘. 
                        마지막에 '이 루틴과 시술을 통해 피부 상태를 개선할 수 있을 것입니다. 추가 질문이나 도움이 필요하면 언제든지 말씀해 주세요!' 메세지 대신 '이 루틴과 시술을 통해 피부 상태를 개선할 수 있을 것입니다. 더 궁금한 부분이 있다면 피부과 전문의 상담을 추천합니다' 로 바꿔줘. 
                        '${budget}에 맞춘 피부 관리 제품 및 루틴 추천 (쿠팡 구매 가능 제품)' 은 심플하게 '피부 관리 제품 및 루틴 추천' 으로 바꿔주고, '예산에 상관없이 추천하는 피부 시술 및 평균 가격' 도 '피부 시술 추천'으로 바꿔줘.`
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
