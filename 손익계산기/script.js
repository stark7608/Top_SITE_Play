document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM 요소 선택 ---
    const form = document.getElementById('stock-calculator-form');
    const defaultInputs = document.getElementById('default-inputs');
    const investmentAmountInput = document.getElementById('investment-amount');
    const purchasePriceInput = document.getElementById('purchase-price');
    const targetPriceInput = document.getElementById('target-price');
    const targetRateInput = document.getElementById('target-rate');
    
    const splitBuysInput = document.getElementById('split-buys');
    const splitSellsInput = document.getElementById('split-sells');
    const splitBuyContainer = document.getElementById('split-buy-inputs');
    const splitSellContainer = document.getElementById('split-sell-inputs');
    
    const resultText = document.getElementById('result-text');

    // --- 2. 헬퍼 함수 (숫자 포맷팅)  ---
    // 1,000단위 콤마 추가 (출력용)
    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };
    
    // 콤마 제거 및 숫자로 변환 (계산용)
    const parseNumber = (str) => {
        return parseFloat(str.replace(/,/g, '')) || 0;
    };

    // 입력 필드 자동 포맷팅 (콤마 추가)
    const setupInputFormatting = (inputElement) => {
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value;
            let num = parseNumber(value);
            if (isNaN(num)) {
                e.target.value = '';
                return;
            }
            // 소수점 입력 처리를 위해 마지막 문자가 '.'이 아니거나,
            // 정수 부분만 포맷팅 후 소수점 부분 덧붙이기 (목표율 용도)
            if (value.slice(-1) !== '.' && !value.includes('.')) {
                 e.target.value = formatNumber(num);
            }
        });
        // 커서가 떠날 때(blur) 최종 포맷팅
        inputElement.addEventListener('blur', (e) => {
            let num = parseNumber(e.target.value);
            if (!isNaN(num) && num !== 0) {
                e.target.value = formatNumber(num);
            } else if (e.target.id !== 'target-rate') { // 목표율은 0이 될 수 있음
                e.target.value = '';
            }
        });
    };

    //  1000단위 콤마가 필요한 필드에 포맷팅 적용
    [investmentAmountInput, purchasePriceInput, targetPriceInput].forEach(setupInputFormatting);
    // 목표율은 소수점을 허용하므로  별도 포맷팅 (콤마 미적용)
    targetRateInput.addEventListener('input', (e) => {
        // 숫자, 소수점 외 문자 제거
        e.target.value = e.target.value.replace(/[^0-9.]/g, '');
    });


    // --- 3. 동적 입력란 생성  ---
    const renderDynamicInputs = (count, container, type) => {
        container.innerHTML = ''; // 초기화
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'dynamic-input-group';
            div.innerHTML = `
                <label for="${type}-price-${i}">[${type === 'buy' ? '매수' : '매도'} ${i}] 가격:</label>
                <input type="text" id="${type}-price-${i}" class="dynamic-price" placeholder="가격">
                <label for="${type}-qty-${i}">수량:</label>
                <input type="number" id="${type}-qty-${i}" class="dynamic-qty" placeholder="수량" min="1">
            `;
            container.appendChild(div);
            
            // 동적으로 생성된 가격 필드에도 포맷팅 적용
            setupInputFormatting(div.querySelector('.dynamic-price'));
        }
    };

    // 분할매수 횟수 변경 리스너 
    splitBuysInput.addEventListener('change', (e) => {
        const count = parseInt(e.target.value, 10);
        renderDynamicInputs(count, splitBuyContainer, 'buy');
        
        // 분할매수 횟수가 0보다 크면 기본 입력칸 비활성화
        const isDisabled = count > 0;
        investmentAmountInput.disabled = isDisabled;
        purchasePriceInput.disabled = isDisabled;
        defaultInputs.style.opacity = isDisabled ? 0.5 : 1;
    });

    // 분할매도 횟수 변경 리스너 
    splitSellsInput.addEventListener('change', (e) => {
        const count = parseInt(e.target.value, 10);
        renderDynamicInputs(count, splitSellContainer, 'sell');
    });

    // --- 4. 매입 평균단가 및 총 수량 계산 (핵심 로직) ---
    const getPurchaseData = () => {
        let totalCost = 0;
        let totalShares = 0;
        const splitBuyCount = parseInt(splitBuysInput.value, 10);

        if (splitBuyCount > 0) {
            // 분할매수 모드: 동적 입력란에서 계산
            for (let i = 1; i <= splitBuyCount; i++) {
                const price = parseNumber(document.getElementById(`buy-price-${i}`).value);
                const quantity = parseInt(document.getElementById(`buy-qty-${i}`).value, 10) || 0;
                
                totalCost += price * quantity;
                totalShares += quantity;
            }
        } else {
            // 기본 모드: 기본 입력란에서 계산
            const investment = parseNumber(investmentAmountInput.value);
            const purchasePrice = parseNumber(purchasePriceInput.value);
            
            if (purchasePrice > 0) {
                totalCost = investment;
                totalShares = investment / purchasePrice;
            }
        }

        const averagePrice = totalShares > 0 ? totalCost / totalShares : 0;
        
        return { totalCost, totalShares, averagePrice };
    };

    // --- 5. 목표가 <-> 목표율 실시간 연동  ---
    targetPriceInput.addEventListener('input', () => {
        const { averagePrice } = getPurchaseData();
        if (averagePrice === 0) return; // 매수 정보가 없으면 계산 불가

        const targetPrice = parseNumber(targetPriceInput.value);
        const rate = ((targetPrice - averagePrice) / averagePrice) * 100;
        
        //  소수점 2자리까지
        targetRateInput.value = rate.toFixed(2); 
    });

    targetRateInput.addEventListener('input', () => {
        const { averagePrice } = getPurchaseData();
        if (averagePrice === 0) return;

        const rate = parseFloat(targetRateInput.value) || 0;
        const targetPrice = averagePrice * (1 + rate / 100);
        
        //  목표가에 해당 금액 표시
        targetPriceInput.value = formatNumber(targetPrice.toFixed(0)); 
    });

    // --- 6. 최종 계산 (폼 제출) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // 페이지 새로고침 방지

        const { totalCost, totalShares, averagePrice } = getPurchaseData();
        const targetPrice = parseNumber(targetPriceInput.value);

        if (totalShares === 0 || targetPrice === 0) {
            alert('매수 정보와 목표가를 올바르게 입력하세요.');
            return;
        }
        
        //  손익액 및 손익율 계산
        const totalValue = targetPrice * totalShares;
        const profitLossAmount = totalValue - totalCost;
        const profitLossRate = (profitLossAmount / totalCost) * 100;

        //  결과 표시
        resultText.innerHTML = `
            손익액 <strong>${formatNumber(Math.round(profitLossAmount))}</strong>원 
            (손익율 <strong>${profitLossRate.toFixed(2)}</strong>%)
        `;
        
        //  손익에 따른 색상 변경
        resultText.className = 'neutral'; // 초기화
        if (profitLossAmount > 0) {
            resultText.classList.add('profit'); // 수익 (빨강)
        } else if (profitLossAmount < 0) {
            resultText.classList.add('loss'); // 손실 (파랑)
        }
    });

});