/**
 * 주식 투자 계산기 로직 모듈
 */

/**
 * 거치기간을 일(day) 단위로 변환
 * @param {number} period - 거치기간 숫자
 * @param {string} unit - 단위 ('year', 'month', 'day')
 * @returns {number} 일 단위로 변환된 거치기간
 */
function convertPeriodToDays(period, unit) {
    switch (unit) {
        case 'year':
            return period * 365;
        case 'month':
            return period * 30; // 평균 월 일수
        default: // 'day'
            return period;
    }
}

/**
 * 단리 계산
 * @param {number} initialAmount - 예치금액
 * @param {number} monthlyDeposit - 월납입액
 * @param {number} periodInDays - 거치기간 (일)
 * @param {number} interestRate - 수익률 (%)
 * @returns {Object} 계산 결과
 */
function calculateSimpleInterest(initialAmount, monthlyDeposit, periodInDays, interestRate) {
    const months = Math.floor(periodInDays / 30);
    const years = periodInDays / 365;
    const annualRate = interestRate / 100;
    
    // 1. 예치금액의 단리 이자
    const initialInterest = initialAmount * annualRate * years;
    
    // 2. 월납입액의 단리 이자 (매월 1일에 납입 가정)
    let depositInterest = 0;
    for (let i = 0; i < months; i++) {
        // 납입 시점부터 만기까지 남은 기간 (일)
        const depositPeriodInDays = periodInDays - (i * 30);
        const depositPeriodInYears = depositPeriodInDays / 365;
        depositInterest += monthlyDeposit * annualRate * depositPeriodInYears;
    }
    
    const totalInterest = initialInterest + depositInterest;
    const totalDeposit = initialAmount + (monthlyDeposit * months);
    const finalAmount = totalDeposit + totalInterest;
    
    return {
        totalDeposit: totalDeposit,
        totalInterest: totalInterest,
        finalAmount: finalAmount // 배당금 미포함 최종액
    };
}

/**
 * 배당금 및 재투자 계산 (단리/복리 공통) - 월별 납입 및 연간 배당 재투자 적용
 * @param {number} initialAmount - 예치금액
 * @param {number} monthlyDeposit - 월 납입액
 * @param {number} periodInDays - 거치 기간 (일)
 * @param {number} interestRate - 수익률 (%)
 * @param {string} calculationType - 'simple' 또는 'compound'
 * @param {number} dividendRate - 배당율 (%)
 * @param {number} dividendTaxRate - 배당소득세율 (%)
 * @returns {Object} 계산 결과
 */
function calculateDividendReinvestment(initialAmount, monthlyDeposit, periodInDays, interestRate, calculationType, dividendRate, dividendTaxRate) {
    const annualRate = interestRate / 100;
    const dividendRateDecimal = dividendRate / 100;
    const taxRateDecimal = dividendTaxRate / 100;
    const taxFactor = 1 - taxRateDecimal;
    const years = Math.floor(periodInDays / 365);
    const months = Math.floor(periodInDays / 30);
    
    let currentCapital = initialAmount;
    let totalDeposited = initialAmount + (monthlyDeposit * months);
    let totalDividendTaxed = 0;
    let totalDividendBeforeTax = 0;
    
    // 매년 말 기준으로 계산
    for (let y = 1; y <= years; y++) {
        const annualDeposit = monthlyDeposit * 12;
        
        // 1. 연초 원금(currentCapital)과 해당 연도 납입액(annualDeposit)에 대한 운용수익(이자) 계산
        let totalInterestForYear = 0;
        
        if (calculationType === 'compound') {
            // 복리: 연초 원금(currentCapital)에 대한 연 복리 이자
            let capitalInterest = currentCapital * annualRate; 
            // 월 납입액(적립식)에 대한 월 복리 이자 (근사치: 월 복리 적금 공식의 연 이자로 변환)
            const monthlyRate = annualRate / 12;
            let depositInterest = monthlyDeposit * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate) * (1 + monthlyRate) - annualDeposit;
            totalInterestForYear = capitalInterest + depositInterest;
            
        } else { // 'simple' 단리
            // 단리: 연초 원금(currentCapital)에 대한 연 단리 이자
            let capitalInterest = currentCapital * annualRate;
            // 월 납입액에 대한 연평균 6개월 단리 이자 (1년 납입액 * 연이율 * 0.5년)
            let depositInterest = annualDeposit * annualRate * 0.5;
            totalInterestForYear = capitalInterest + depositInterest;
        }
        
        // 2. 배당금 계산 기준 금액
        // (연초 원금 + 연간 납입액)에 대한 배당으로 근사치 계산
        const dividendBase = currentCapital + annualDeposit; 
        
        const dividendBeforeTax = dividendBase * dividendRateDecimal;
        const tax = dividendBeforeTax * taxRateDecimal;
        const dividendAfterTax = dividendBeforeTax * taxFactor;
        
        // 3. 다음 해 초 원금 업데이트 (재투자)
        currentCapital += annualDeposit + totalInterestForYear + dividendAfterTax;
        
        totalDividendBeforeTax += dividendBeforeTax;
        totalDividendTaxed += tax;
    }
    
    // 최종 금액에서 운용수익 및 배당금 재투자액 분리
    const totalEarnings = currentCapital - totalDeposited;
    
    return {
        finalAmountWithDividend: currentCapital,
        totalDeposit: totalDeposited,
        totalInterest: totalEarnings - (totalDividendBeforeTax * taxFactor), // 총 수익 - 세후 배당금 = 이자 (근사치)
        totalDividend: totalDividendBeforeTax,
        dividendAfterTax: totalDividendBeforeTax - totalDividendTaxed,
        tax: totalDividendTaxed,
    };
}


/**
 * 복리 계산 (배당금 미포함)
 * @returns {Object} 계산 결과
 */
function calculateCompoundInterest(initialAmount, monthlyDeposit, periodInDays, interestRate, includeDividend = false, dividendRate = 0, dividendFrequency = 1, dividendTaxRate = 0) {
    if (includeDividend) {
        // 배당금 재투자 로직으로 이동
        return calculateDividendReinvestment(initialAmount, monthlyDeposit, periodInDays, interestRate, 'compound', dividendRate, dividendTaxRate);
    }
    
    // 배당금 미포함 순수 복리 계산 로직 (월 납입 기준)
    const months = Math.floor(periodInDays / 30);
    const monthlyRate = (interestRate / 100) / 12;
    
    // 1. 예치금액의 복리 원리합계
    const initialAmountFinal = initialAmount * Math.pow(1 + monthlyRate, months);
    
    // 2. 월납입액의 복리 원리합계 (적금 공식)
    let depositFinal = 0;
    if (monthlyRate > 0) {
        depositFinal = monthlyDeposit * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate); // 기수불
    } else {
        depositFinal = monthlyDeposit * months;
    }
    
    const finalAmount = initialAmountFinal + depositFinal;
    const totalDeposit = initialAmount + (monthlyDeposit * months);
    const totalInterest = finalAmount - totalDeposit;
    
    return {
        totalDeposit: totalDeposit,
        totalInterest: totalInterest,
        finalAmount: finalAmount 
    };
}

/**
 * 배당금 계산 함수 (배당 재투자 미포함 시 사용)
 * 현재는 재투자 로직을 위해 사용하지 않으므로, 빈 함수로 유지
 */
function calculateDividend(finalAmount, dividendRate, periodInDays, frequency = 1, taxRate = 0) {
    return {};
}

/**
 * 숫자를 통화 형식으로 포맷팅
 * @param {number} amount - 금액
 * @returns {string} 포맷된 문자열
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * 메인 계산 함수
 * @param {Object} inputs - 입력값들
 * @returns {Object} 계산 결과
 */
function calculateInvestment(inputs) {
    const periodInDays = convertPeriodToDays(inputs.period, inputs.periodUnit);
    let result = {};
    
    if (inputs.calculationType === 'simple') {
        // 단리 계산은 배당 재투자가 있는 경우와 없는 경우를 모두 처리해야 함
        if (inputs.includeDividend) {
            result = calculateDividendReinvestment(inputs.initialAmount, inputs.monthlyDeposit, periodInDays, inputs.interestRate, 'simple', inputs.dividendRate, inputs.dividendTaxRate);
            result.dividend = {
                totalDividend: result.totalDividend,
                tax: result.tax,
                dividendAfterTax: result.dividendAfterTax
            };
            result.finalAmount = result.finalAmountWithDividend;
        } else {
            result = calculateSimpleInterest(inputs.initialAmount, inputs.monthlyDeposit, periodInDays, inputs.interestRate);
        }
    } else {
        // 복리 계산은 내부에서 배당 재투자 유무를 판단하여 처리
        result = calculateCompoundInterest(inputs.initialAmount, inputs.monthlyDeposit, periodInDays, inputs.interestRate, inputs.includeDividend, inputs.dividendRate, inputs.dividendFrequency, inputs.dividendTaxRate);
        
        if (inputs.includeDividend) {
            result.dividend = {
                totalDividend: result.totalDividend,
                tax: result.tax,
                dividendAfterTax: result.dividendAfterTax
            };
            result.finalAmount = result.finalAmountWithDividend;
        }
    }
    
    return result;
}

// 모듈 내보내기 (Node.js 환경 대비)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateInvestment,
        formatCurrency,
        convertPeriodToDays,
        calculateSimpleInterest,
        calculateCompoundInterest,
        calculateDividend
    };
}