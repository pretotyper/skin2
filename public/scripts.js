document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('record').disabled = true;
    document.getElementById('share').disabled = true;

    ['image1', 'image2', 'image3'].forEach(id => {
        document.getElementById(id).addEventListener('change', handleImageUpload);
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

function handleImageUpload(event) {
    const file = event.target.files[0];
    const maxFileSizeMB = 10; // 10MB 이하로 제한

    if (file.size > maxFileSizeMB * 1024 * 1024) {
        alert(`파일 크기가 너무 큽니다. 최대 ${maxFileSizeMB}MB 이하로 업로드해주세요.`);
        event.target.value = ''; // 파일 선택 취소
        return;
    }

    const fileName = file ? file.name : null;

    // 이미지 파일 선택 중복 확인 대신 고유 값을 이용하여 중복 확인 방지
    const filePaths = [
        document.getElementById('image1').value,
        document.getElementById('image2').value,
        document.getElementById('image3').value
    ];

    const filePathCount = filePaths.filter(path => path === event.target.value).length;

    if (filePathCount > 1) {
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
        .replace(/## (.*?)(\n|$)/g, '<h2>$1</2>')
        .replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>')
        .replace(/\n/g, '<br>');
}

function removeLinkSentences(text) {
    return text.replace(/.*\bwww\.coupang\.com\S*.*(\n|$)/g, '');
}

function replaceDuplicateSkinFeatures(text) {
    const regex = /(피부 특징)/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length > 1) {
        return text.replace(regex, (match, offset, string) => string.indexOf(match) === offset ? match : '특징');
    }
    return text;
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

        let result = await response.json();
        console.log(result);  // API 응답을 콘솔에 출력

        spinner.style.display = 'none';

        // Remove bold markers, links, and replace duplicate skin features, then convert to HTML
        let formattedResult = removeBold(result);
        formattedResult = removeLinkSentences(formattedResult);
        formattedResult = replaceDuplicateSkinFeatures(formattedResult);
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
    toast.innerText = message;
    toast.className = "toast show";
    setTimeout(function() {
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}
