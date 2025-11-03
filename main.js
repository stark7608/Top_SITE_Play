/**
 * 주식 계산기 메인 스크립트
 */

// DOM 요소 가져오기
const elements = {
    initialAmount: document.getElementById('initialAmount'),
    monthlyDeposit: document.getElementById('monthlyDeposit'),
    period: document.getElementById('period'),
    periodUnit: document.getElementById('periodUnit'),
    interestRate: document.getElementById('interestRate'),
    dividendRate: document.getElementById('dividendRate'),
    calculationType: document.querySelectorAll('input[name="calculationType"]'),
    includeDividend: document.getElementById('includeDividend'),
    dividendFrequency: document.getElementById('dividendFrequency'),
    dividendOptionsGroup: document.getElementById('dividendOptionsGroup'),
    dividendTaxRate: document.getElementById('dividendTaxRate'),
    dividendTaxGroup: document.getElementById('dividendTaxGroup'),
    calculateBtn: document.getElementById('calculateBtn'),
    resultCard: document.getElementById('resultCard'),
    totalDeposit: document.getElementById('totalDeposit'),
    totalEarnings: document.getElementById('totalEarnings'),
    finalAmount: document.getElementById('finalAmount'),
    totalDividend: document.getElementById('totalDividend'),
    dividendTax: document.getElementById('dividendTax'),
    calculationTypeBadge: document.getElementById('calculationTypeBadge'),
    interestLabel: document.getElementById('interestLabel'),
    finalAmountLabel: document.getElementById('finalAmountLabel'),
    dividendReinvestmentResult: document.getElementById('dividendReinvestmentResult'),
    dividendReinvestment: document.getElementById('dividendReinvestment'),
    dividendDetailResult: document.getElementById('dividendDetailResult'),
    comparisonSection: document.getElementById('comparisonSection'),
    simpleFinalAmount: document.getElementById('simpleFinalAmount'),
    compoundFinalAmount: document.getElementById('compoundFinalAmount'),
    betterTypeLabel: document.getElementById('betterTypeLabel'),
    differenceAmount: document.getElementById('differenceAmount')
};

/**
 * 숫자에 천단위 콤마 추가
 * @param {string} value - 입력값
 * @returns {string} 포맷된 문자열
 */
function formatNumberWithCommas(value) {
    // 숫자가 아닌 문자 제거 (콤마, 공백 제외하고 숫자만 남김)
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (!numericValue) return '';
    
    // 천단위 콤마 추가
    return parseInt(numericValue).toLocaleString('ko-KR');
}

/**
 * 콤마 제거하여 숫자로 변환
 * @param {string} value - 입력값
 * @returns {number} 숫자값
 */
function removeCommas(value) {
    if (!value) return 0;
    const numericValue = value.replace(/[^\d]/g, '');
    return numericValue ? parseFloat(numericValue) : 0;
}

/**
 * 숫자 입력 필드 포맷팅 초기화
 */
function initializeNumberFormatting() {
    // 예치금액 필드
    elements.initialAmount.addEventListener('input', function(e) {
        const cursorPosition = this.selectionStart;
        const oldValue = this.value;
        const newValue = formatNumberWithCommas(this.value);
        
        // 포맷팅된 값이 변경된 경우 커서 위치 조정
        if (oldValue !== newValue) {
            const diff = newValue.length - oldValue.length;
            this.value = newValue;
            const newCursorPosition = Math.max(0, cursorPosition + diff);
            this.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    });

    // 월납입액 필드
    elements.monthlyDeposit.addEventListener('input', function(e) {
        const cursorPosition = this.selectionStart;
        const oldValue = this.value;
        const newValue = formatNumberWithCommas(this.value);
        
        // 포맷팅된 값이 변경된 경우 커서 위치 조정
        if (oldValue !== newValue) {
            const diff = newValue.length - oldValue.length;
            this.value = newValue;
            const newCursorPosition = Math.max(0, cursorPosition + diff);
            this.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    });

    // 포커스 아웃 시 포맷팅 정리
    elements.initialAmount.addEventListener('blur', function() {
        if (this.value) {
            this.value = formatNumberWithCommas(this.value);
        }
    });

    elements.monthlyDeposit.addEventListener('blur', function() {
        if (this.value) {
            this.value = formatNumberWithCommas(this.value);
        }
    });
}

// 페이지 로드 시 숫자 포맷팅 초기화
initializeNumberFormatting();

/**
 * 배당금 계산 체크박스 이벤트
 */
elements.includeDividend.addEventListener('change', function() {
    if (this.checked) {
        elements.dividendOptionsGroup.style.display = 'block';
        elements.dividendTaxGroup.style.display = 'block';
    } else {
        elements.dividendOptionsGroup.style.display = 'none';
        elements.dividendTaxGroup.style.display = 'none';
    }
});

/**
 * 입력값 검증
 * @returns {Object|null} 검증된 입력값 또는 null
 */
function validateInputs() {
    // 콤마 제거하여 숫자로 변환
    const initialAmount = removeCommas(elements.initialAmount.value);
    const monthlyDeposit = removeCommas(elements.monthlyDeposit.value);
    const period = parseFloat(elements.period.value);
    const interestRate = parseFloat(elements.interestRate.value);
    const dividendRate = parseFloat(elements.dividendRate.value) || 0;
    
    // 필수 입력값 검증
    if (!period || period <= 0) {
        alert('거치기간을 올바르게 입력해주세요.');
        elements.period.focus();
        return null;
    }
    
    if (!interestRate || interestRate < 0) {
        alert('수익률을 올바르게 입력해주세요.');
        elements.interestRate.focus();
        return null;
    }
    
    if (initialAmount < 0 || monthlyDeposit < 0) {
        alert('금액은 0 이상이어야 합니다.');
        return null;
    }
    
    // 예치금액과 월납입액 중 하나는 있어야 함
    if (initialAmount === 0 && monthlyDeposit === 0) {
        alert('예치금액 또는 월납입액 중 하나를 입력해주세요.');
        return null;
    }
    
    // 계산 방식 가져오기
    let calculationType = 'simple';
    elements.calculationType.forEach(radio => {
        if (radio.checked) {
            calculationType = radio.value;
        }
    });
    
    const includeDividend = elements.includeDividend.checked;
    const dividendFrequency = includeDividend ? parseInt(elements.dividendFrequency.value) || 1 : 1;
    const dividendTaxRate = includeDividend ? (parseFloat(elements.dividendTaxRate.value) || 0) : 0;
    
    // 배당금 포함 시 배당율 검증
    if (includeDividend && (!dividendRate || dividendRate < 0)) {
        alert('배당금 계산을 선택하셨다면 배당율을 입력해주세요.');
        elements.dividendRate.focus();
        return null;
    }
    
    return {
        initialAmount,
        monthlyDeposit,
        period,
        periodUnit: elements.periodUnit.value,
        interestRate,
        dividendRate,
        calculationType,
        includeDividend,
        dividendFrequency,
        dividendTaxRate
    };
}

/**
 * 결과 표시
 * @param {Object} result - 계산 결과
 * @param {string} calculationType - 계산 타입 ('simple' 또는 'compound')
 */
function displayResult(result, calculationType) {
    // 계산 타입 뱃지 표시
    if (calculationType === 'simple') {
        elements.calculationTypeBadge.textContent = '💰 단리 (Simple Interest) 적용';
        elements.calculationTypeBadge.className = 'calculation-type-badge simple';
        elements.interestLabel.textContent = '총 운용수익 (이자, 세전 단리)';
        elements.finalAmountLabel.textContent = '총 예상 금액 (단리)';
    } else {
        elements.calculationTypeBadge.textContent = '💰 복리 (Compound Interest) 적용';
        elements.calculationTypeBadge.className = 'calculation-type-badge compound';
        elements.interestLabel.textContent = '총 운용수익 (이자, 세전 복리)';
        elements.finalAmountLabel.textContent = '총 예상 금액 (복리)';
    }
    
    // 총 납입 원금
    elements.totalDeposit.textContent = formatCurrency(result.totalDeposit);
    
    // 총 운용수익 (이자)
    elements.totalEarnings.textContent = formatCurrency(result.totalInterest);
    
    // 배당금 결과 표시
    if (result.dividend) {
        // 총 배당금 재투자 원리합계 (세후)
        elements.dividendReinvestment.textContent = formatCurrency(result.dividend.dividendAfterTax);
        elements.dividendReinvestmentResult.style.display = 'flex';
        
        // 배당금 상세 정보
        elements.totalDividend.textContent = formatCurrency(result.dividend.totalDividend);
        elements.dividendTax.textContent = formatCurrency(result.dividend.tax);
        elements.dividendDetailResult.style.display = 'flex';
        
        // 총 예상 금액 (세후 배당금 포함 최종액)
        if (result.finalAmountWithDividend !== undefined) {
            elements.finalAmount.textContent = formatCurrency(result.finalAmountWithDividend);
        } else {
            elements.finalAmount.textContent = formatCurrency(result.finalAmount);
        }
    } else {
        elements.dividendReinvestmentResult.style.display = 'none';
        elements.dividendDetailResult.style.display = 'none';
        elements.finalAmount.textContent = formatCurrency(result.finalAmount);
    }
    
    // 결과 카드 표시
    elements.resultCard.style.display = 'block';
    
    // 결과로 스크롤
    elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 단리/복리 비교 결과 표시
 * @param {Object} simpleResult - 단리 계산 결과
 * @param {Object} compoundResult - 복리 계산 결과
 */
function displayComparison(simpleResult, compoundResult) {
    // 최종 금액 가져오기
    const simpleFinal = simpleResult.finalAmountWithDividend || simpleResult.finalAmount;
    const compoundFinal = compoundResult.finalAmountWithDividend || compoundResult.finalAmount;
    
    // 비교 섹션 표시
    elements.simpleFinalAmount.textContent = formatCurrency(simpleFinal);
    elements.compoundFinalAmount.textContent = formatCurrency(compoundFinal);
    
    // 차이 계산
    const difference = Math.abs(compoundFinal - simpleFinal);
    
    if (compoundFinal > simpleFinal) {
        elements.betterTypeLabel.textContent = '복리가 단리보다 더 많이 벌었습니다 (차이)';
        elements.differenceAmount.textContent = formatCurrency(difference);
        elements.differenceAmount.style.color = '#f5576c';
    } else if (simpleFinal > compoundFinal) {
        elements.betterTypeLabel.textContent = '단리가 복리보다 더 많이 벌었습니다 (차이)';
        elements.differenceAmount.textContent = formatCurrency(difference);
        elements.differenceAmount.style.color = '#667eea';
    } else {
        elements.betterTypeLabel.textContent = '단리와 복리 금액이 동일합니다';
        elements.differenceAmount.textContent = formatCurrency(0);
        elements.differenceAmount.style.color = '#555';
    }
    
    elements.comparisonSection.style.display = 'block';
}

/**
 * 계산 버튼 클릭 이벤트
 */
elements.calculateBtn.addEventListener('click', function() {
    const inputs = validateInputs();
    if (!inputs) {
        return;
    }
    
    try {
        // 선택한 계산 타입의 결과
        const result = calculateInvestment(inputs);
        
        // 단리와 복리 모두 계산하여 비교
        const simpleInputs = { ...inputs, calculationType: 'simple' };
        const compoundInputs = { ...inputs, calculationType: 'compound' };
        
        const simpleResult = calculateInvestment(simpleInputs);
        const compoundResult = calculateInvestment(compoundInputs);
        
        // 선택한 계산 타입의 결과 표시
        displayResult(result, inputs.calculationType);
        
        // 단리/복리 비교 표시
        displayComparison(simpleResult, compoundResult);
    } catch (error) {
        alert('계산 중 오류가 발생했습니다: ' + error.message);
        console.error('계산 오류:', error);
    }
});

/**
 * 라디오 버튼 탭 키 처리
 */
elements.calculationType.forEach((radio, index) => {
    radio.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && !e.shiftKey) {
            // 현재 라디오 버튼이 단리이고 Tab 키를 누르면 복리로 이동
            if (this.value === 'simple') {
                e.preventDefault();
                const compoundRadio = Array.from(elements.calculationType).find(r => r.value === 'compound');
                if (compoundRadio) {
                    compoundRadio.focus();
                }
            }
            // 복리에서 Tab 키를 누르면 다음 요소로 이동 (자동 처리됨)
        }
    });
});

/**
 * Enter 키로 계산하기
 */
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        elements.calculateBtn.click();
    }
});
