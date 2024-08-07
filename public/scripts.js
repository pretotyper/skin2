document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('record').disabled = true;
    document.getElementById('share').disabled = true;

    const uploadedFiles = [];

    ['image1', 'image2', 'image3'].forEach(id => {
        document.getElementById(id).addEventListener('change', function(event) {
            handleImageUpload(event, uploadedFiles);
        });
    });

    document.getElementById('budget').addEventListener('input', handleBudgetInput);
    document.getElementById('budget').addEventListener('blur', function() {
        addCurrencySymbol(this);
    });

    document.getElementById('analyze').addEventListener('click', function() {
        if (this.disabled) {
            showToast('먼저 이미지 업로드 및 예산을 입력해주세요');
        } else {
            resetButtons();
            handleAnalyze();
        }
    });

    document.getElementById('record').addEventListener('click', showPopup);
    document.getElementById('share').addEventListener('click', shareResult);
    document.getElementById('gnb-share-btn').addEventListener('click', sharePageLink);
    document.getElementById('gnb-refresh-btn').addEventListener('click', function() {
        location.reload();
    });
});

function handleImageUpload(event, uploadedFiles) {
    const file = event.target.files[0];
    const maxFileSizeMB = 10; // 10MB 이하로 제한

    if (file.size > maxFileSizeMB * 1024 * 1024) {
        alert(`파일 크기가 너무 큽니다. 최대 ${maxFileSizeMB}MB 이하로 업로드해주세요.`);
        event.target.value = ''; // 파일 선택 취소
        return;
    }

    // 파일 이름이 "image.jpg"인 경우 중복 체크를 생략
    if (file.name !== 'image.jpg') {
        const fileAlreadyUploaded = uploadedFiles.some(uploadedFile => uploadedFile.name === file.name && uploadedFile.lastModified === file.lastModified && uploadedFile.size === file.size);

        if (fileAlreadyUploaded) {
            alert('중복된 파일은 등록할 수 없습니다');
            event.target.value = ''; // 파일 선택 취소
            return;
        }
    }

    uploadedFiles.push(file);

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

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function removeBold(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

function addColorToKeywords(text) {
    const keywords = [
        '피부 특징', '피부 관리 제품 및 루틴 추천', '피부 시술 추천'
    ];

    keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'g');
        text = text.replace(regex, `<span class="keyword-highlight">${keyword}</span>`);
    });

    return text;
}

function convertMarkdownToHTML(text) {
    return text
        .replace(/## (피부 특징|피부 관리 제품 및 루틴 추천|피부 시술 추천)(\n|$)/g, '<h4 class="keyword-highlight">$1</h4>')
        .replace(/#### (.*?)(\n|$)/g, '<h4>$1</h4>')
        .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')
        .replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>')
        .replace(/\n/g, '<br>');
}

function replaceDuplicateSkinFeatures(text) {
    if (typeof text === 'string') {
        return text.replace(/피부 특징/g, (match, offset, string) => {
            if (string.indexOf(match) !== offset) {
                return '특징';
            }
            return match;
        });
    }
    return text; // 문자열이 아닌 경우 원래 값 반환
}

async function handleAnalyze() {
    const budget = document.getElementById('budget').value.trim();
    const image1 = document.getElementById('image1').files[0];
    const image2 = document.getElementById('image2').files[0];
    const image3 = document.getElementById('image3').files[0];

    try {
        document.getElementById('predicted-age').innerHTML = '';
        document.getElementById('predicted-age').classList.add('skeleton');

        const spinner = document.getElementById('spinner');
        spinner.style.display = 'inline-block';

        const image1Base64 = await getBase64(image1);
        const image2Base64 = await getBase64(image2);
        const image3Base64 = await getBase64(image3);

        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                budget: budget,
                images: [image1Base64, image2Base64, image3Base64]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result);  // API 응답을 콘솔에 출력

        spinner.style.display = 'none';

        // Remove bold markers and convert to HTML
        let formattedResult = removeBold(result);
        formattedResult = replaceDuplicateSkinFeatures(formattedResult); // 중복된 '피부 특징' 텍스트를 '특징'으로 변경
        formattedResult = convertMarkdownToHTML(formattedResult);
        formattedResult = addColorToKeywords(formattedResult);

        document.getElementById('predicted-age').innerHTML = formattedResult;
        document.getElementById('predicted-age').classList.add('predicted-age-content');

        document.getElementById('predicted-age').classList.remove('skeleton');
        document.getElementById('predicted-age').style.color = "black";

        document.getElementById('record').classList.add('active');
        document.getElementById('record').disabled = false;
        document.getElementById('share').classList.add('active');
        document.getElementById('share').disabled = false;

        document.getElementById('analyze').disabled = true;
        document.getElementById('analyze').style.backgroundColor = 'lightgray';
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = '분석 결과를 불러오지 못했습니다. 다시 시도해주세요.';
        document.getElementById('predicted-age').innerHTML = errorMessage;

        document.getElementById('predicted-age').classList.remove('skeleton');

        showToast(errorMessage);
    }
}

function resetButtons() {
    document.getElementById('record').classList.remove('active');
    document.getElementById('record').disabled = true;
    document.getElementById('share').classList.remove('active');
    document.getElementById('share').disabled = true;

    document.getElementById('analyze').disabled = false;
    document.getElementById('analyze').style.backgroundColor = 'black';
}

function showPopup() {
    alert('준비 중입니다');
}

function shareResult() {
    const predictedAge = document.getElementById('predicted-age').innerText;
    let pageURL = location.href;
    const shareText = `분석 결과:\n${predictedAge}\n\n친구의 피부 연령대가 궁금하다면? ${pageURL}을 전해보세요!`;
    
    navigator.clipboard.writeText(shareText).then(function() {
        showToast('분석 결과가 복사되었습니다.');
    }, function(err) {
        console.error('Failed to copy text: ', err);
    });
}

function sharePageLink() {
    let pageURL = location.href;
    
    navigator.clipboard.writeText(pageURL).then(function() {
        showToast('링크가 복사되었습니다.');
    }, function(err) {
        console.error('Failed to copy text: ', err);
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message
    toast.className = "toast show";
    setTimeout(function() {
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}
