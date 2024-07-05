document.getElementById('image1').addEventListener('change', handleImageUpload);
document.getElementById('image2').addEventListener('change', handleImageUpload);
document.getElementById('image3').addEventListener('change', handleImageUpload);
document.getElementById('budget').addEventListener('input', handleBudgetInput);
document.getElementById('budget').addEventListener('blur', function() {
    addCurrencySymbol(this);
});
document.getElementById('analyze').addEventListener('click', function() {
    if (this.disabled) {
        showToast('먼저 이미지 업로드 및 예산을 입력해주세요');
    } else {
        handleAnalyze();
    }
});
document.getElementById('record').addEventListener('click', showPopup);
document.getElementById('share').addEventListener('click', shareResult);
document.getElementById('gnb-share-btn').addEventListener('click', sharePageLink);

function handleImageUpload(event) {
    const file = event.target.files[0];
    const fileName = file ? file.name : null;

    // 중복 파일 체크
    const imageFiles = [
        document.getElementById('image1').files[0],
        document.getElementById('image2').files[0],
        document.getElementById('image3').files[0]
    ];

    const fileNames = imageFiles.map(file => file ? file.name : null);
    const fileCount = fileNames.filter(name => name === fileName).length;

    if (fileCount > 1) {
        alert('중복된 파일은 등록할 수 없습니다');
        event.target.value = ''; // 파일 선택 취소
        return;
    }

    const previewId = "preview" + event.target.id.charAt(event.target.id.length - 1);
    const preview = document.getElementById(previewId);

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }

    checkInputs();
}

function handleBudgetInput(event) {
    inputCurrencyFormat(event.target);
    checkInputs();
}

function addCurrencySymbol(input) {
    let value = input.value.trim();
    if (value !== '' && !value.startsWith('₩ ')) {
        input.value = '₩ ' + value;
    }
}

function checkInputs() {
    const image1 = document.getElementById('image1').files.length > 0;
    const image2 = document.getElementById('image2').files.length > 0;
    const image3 = document.getElementById('image3').files.length > 0;
    const budget = document.getElementById('budget').value.trim() !== '₩' && document.getElementById('budget').value.trim() !== '';

    const analyzeButton = document.getElementById('analyze');
    if (image1 && image2 && image3 && budget) {
        analyzeButton.disabled = false;
        analyzeButton.style.backgroundColor = 'black';
        analyzeButton.style.cursor = 'pointer';
    } else {
        analyzeButton.disabled = true;
        analyzeButton.style.backgroundColor = 'lightgray';
        analyzeButton.style.cursor = 'not-allowed';
    }
}

function comma(str) {
    str = String(str);
    return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
}

function uncomma(str) {
    str = String(str);
    return str.replace(/[^\d]+/g, '');
} 

function inputCurrencyFormat(obj) {
    let value = uncomma(obj.value.replace('₩', '').trim());
    if (value === '') {
        obj.value = '';
    } else {
        obj.value = '₩ ' + comma(value);
    }
}

function inputOnlyNumberFormat(obj) {
    let value = uncomma(obj.value.replace('₩', '').trim());
    if (value === '') {
        obj.value = '';
    } else {
        obj.value = '₩ ' + onlynumber(value);
    }
}

function onlynumber(str) {
    str = String(str);
    return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1');
}

// OpenAI API 호출 추가
async function handleAnalyze() {
    const budget = document.getElementById('budget').value.trim();
    const image1 = document.getElementById('image1').files[0];
    const image2 = document.getElementById('image2').files[0];
    const image3 = document.getElementById('image3').files[0];

    // API 요청을 위한 데이터 준비
    const data = {
        budget: budget,
        images: [image1, image2, image3].map(image => URL.createObjectURL(image))
    };

    try {
        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // 모델을 'gpt-3.5-turbo'로 변경
                messages: [
                    {
                        role: 'system',
                        content: 'You are a skin care expert. Analyze the provided skin images and budget to recommend skin care products and treatments. Provide the results in Korean.'
                    },
                    {
                        role: 'user',
                        content: `분석을 위해 세 장의 얼굴 사진과 예산을 입력받았습니다. 
                                예산: ${budget} 원.
                                이미지 URL: ${data.images.join(', ')}.
                                만약 사진 중 하나라도 얼굴 사진이 아니라면 "얼굴 사진이 아니면 정확한 분석이 어렵습니다. 본인의 얼굴 사진으로 다시 업로드해주세요."라는 메시지를 출력해주세요.
                                분석 결과, 제품 및 루틴 추천, 피부 시술 추천 항목을 각각 구분하여 출력해주세요.`
                    }
                ],
                max_tokens: 1000
            })
        });

        const result = await response.json();

        // 응답 데이터 로깅
        console.log(result);

        // 응답 데이터가 올바르게 반환되었는지 확인
        if (result && result.choices && result.choices[0] && result.choices[0].message) {
            const content = result.choices[0].message.content;
            
            // 각 섹션을 구분하여 결과 표시
            const diagnosisResult = content.match(/진단 결과[\s\S]*?(?=\n제품 및 루틴 추천)/);
            const productRoutineRecommendation = content.match(/제품 및 루틴 추천[\s\S]*?(?=\n피부 시술 추천)/);
            const treatmentRecommendation = content.match(/피부 시술 추천[\s\S]*$/);

            if (diagnosisResult) {
                document.getElementById('predicted-age').innerText = diagnosisResult[0].trim();
            } else {
                document.getElementById('predicted-age').innerText = "분석 결과를 불러오지 못했습니다. 다시 시도해주세요.";
            }

            if (productRoutineRecommendation) {
                document.getElementById('recommended-products').innerText = productRoutineRecommendation[0].trim();
            } else {
                document.getElementById('recommended-products').innerText = "분석 결과를 불러오지 못했습니다. 다시 시도해주세요.";
            }

            if (treatmentRecommendation) {
                document.getElementById('recommended-treatments').innerText = treatmentRecommendation[0].trim();
            } else {
                document.getElementById('recommended-treatments').innerText = "분석 결과를 불러오지 못했습니다. 다시 시도해주세요.";
            }

            // 진단 결과 및 추천 제품 섹션의 글씨 색상 변경
            document.getElementById('predicted-age').style.color = "black";
            document.getElementById('recommended-products').style.color = "black";
            document.getElementById('recommended-treatments').style.color = "black";

            // 회원가입하고 기록하기 및 공유하기 버튼 활성화
            document.getElementById('record').classList.add('active');
            document.getElementById('record').disabled = false;
            document.getElementById('share').classList.add('active');
            document.getElementById('share').disabled = false;

            // '분석하기' 버튼 비활성화 및 색상 변경
            document.getElementById('analyze').disabled = true;
            document.getElementById('analyze').style.backgroundColor = 'lightgray';
        } else {
            showToast('분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
            console.error('Unexpected response format:', result);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('record').disabled = true;
    document.getElementById('share').disabled = true;

    document.getElementById('record').addEventListener('click', function(event) {
        if (this.disabled) {
            event.preventDefault();
        }
    });
    document.getElementById('share').addEventListener('click', function(event) {
        if (this.disabled) {
            event.preventDefault();
        }
    });
});

function showPopup() {
    alert('준비 중입니다');
}

function shareResult() {
    const predictedAge = document.getElementById('predicted-age').innerText;
    const recommendedProducts = document.getElementById('recommended-products').innerText;
    const recommendedTreatments = document.getElementById('recommended-treatments').innerText;
    const shareText = `진단 결과:\n${predictedAge}\n\n제품 추천:\n${recommendedProducts}\n\n피부 시술 추천:\n${recommendedTreatments}\n\n친구의 피부 연령대가 궁금하다면? "https://yourdomain.com"을 전해보세요!`;
    
    navigator.clipboard.writeText(shareText).then(function() {
        showToast('분석 결과가 복사되었습니다.');
    }, function(err) {
        console.error('Failed to copy text: ', err);
    });
}

function sharePageLink() {
    const pageURL = "https://yourdomain.com";
    
    navigator.clipboard.writeText(pageURL).then(function() {
        showToast('링크가 복사되었습니다.');
    }, function(err) {
        console.error('Failed to copy text: ', err);
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "toast show";
    setTimeout(function() {
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}
