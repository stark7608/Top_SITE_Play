document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM 요소 선택 ---
    const form = document.getElementById('stock-calculator-form');
    const defaultInputs = document.getElementById('default-inputs');
    const purchasePriceInput = document.getElementById('purchase-price');
    const purchaseQuantityInput = document.getElementById('purchase-quantity'); // '매수수량'으로 변경
    
    const targetPriceInput = document.getElementById('target-price');
    const targetRateInput = document.getElementById('target-rate');
    const targetPriceRow = document.querySelector('.input-group-row'); // 목표가 섹션
    
    const splitBuysInput = document.getElementById('split-buys');
    const splitSellsInput = document.getElementById('split-sells');
    const splitBuyContainer = document.getElementById('split-buy-inputs');
    const splitSellContainer = document.getElementById('split-sell-inputs');
    
    const resultText = document.getElementById('result-text');

    // --- 2. 헬퍼 함수 (숫자 포맷팅) ---
    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };
    
    const parseNumber = (str) => {
        return parseFloat(String(str).replace(/,/g, '')) || 0;
    };

    const setupInputFormatting = (inputElement) => {
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value;
            let num = parseNumber(value);
            if (isNaN(num)) {
                e.target.value = '';
                return;
            }
            if (value.slice(-1) !== '.' && !value.includes('.')) {
                 e.target.value = formatNumber(num);
            }
        });
        inputElement.addEventListener('blur', (e) => {
            let num = parseNumber(e.target.value);
            if (!isNaN(num) && num !== 0) {
                e.target.value = formatNumber(num);
            } else if (e.target.id !== 'target-rate') {
                e.target.value = '';
            }
        });
    };

    // '매수수량'은 콤마 포맷팅이 필요 없으므로 제외
    [purchasePriceInput, targetPriceInput].forEach(setupInputFormatting);
    
    targetRateInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9.]/g, '');
    });


    // --- 3. 동적 입력란 생성 ---
    const renderDynamicInputs = (count, container, type) => {
        container.innerHTML = '';
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
            setupInputFormatting(div.querySelector('.dynamic-price'));
        }
    };

    // 분할매수 횟수 변경 리스너
    splitBuysInput.addEventListener('change', (e) => {
        const count = parseInt(e.target.value, 10);
        renderDynamicInputs(count, splitBuyContainer, 'buy');
        
        const isDisabled = count > 0;
        purchasePriceInput.disabled = isDisabled; // '매수가' 비활성화
        purchaseQuantityInput.disabled = isDisabled; // '매수수량' 비활성화
        defaultInputs.style.opacity = isDisabled ? 0.5 : 1;
    });

    // 분할매도 횟수 변경 리스너 (수정됨)
    splitSellsInput.addEventListener('change', (e) => {
        const count = parseInt(e.target.value, 10);
        renderDynamicInputs(count, splitSellContainer, 'sell');
        
        // 분할매도 횟수가 0보다 크면 '목표가' 섹션 비활성화
        const isDisabled = count > 0;
        targetPriceInput.disabled = isDisabled;
        targetRateInput.disabled = isDisabled;
        targetPriceRow.style.opacity = isDisabled ? 0.5 : 1;
    });

    // --- 4. 매입 평균단가 및 총 수량 계산 (수정됨) ---
    const getPurchaseData = () => {
        let totalCost = 0;
        let totalShares = 0;
        const splitBuyCount = parseInt(splitBuysInput.value, 10);

        if (splitBuyCount > 0) {
            // 분할매수 모드
            for (let i = 1; i <= splitBuyCount; i++) {
                const price = parseNumber(document.getElementById(`buy-price-${i}`).value);
                const quantity = parseInt(document.getElementById(`buy-qty-${i}`).value, 10) || 0;
                
                totalCost += price * quantity;
                totalShares += quantity;
            }
        } else {
            // 기본 모드 (매수가 * 매수수량)
            const purchasePrice = parseNumber(purchasePriceInput.value);
            const quantity = parseInt(purchaseQuantityInput.value, 10) || 0;
            
            if (purchasePrice > 0 && quantity > 0) {
                totalCost = purchasePrice * quantity;
                totalShares = quantity;
            }
        }

        const averagePrice = totalShares > 0 ? totalCost / totalShares : 0;
        
        return { totalCost, totalShares, averagePrice };
    };

    // --- 5. 목표가 <-> 목표율 실시간 연동 ---
    targetPriceInput.addEventListener('input', () => {
        const { averagePrice } = getPurchaseData();
        if (averagePrice === 0) return;

        const targetPrice = parseNumber(targetPriceInput.value);
        const rate = ((targetPrice - averagePrice) / averagePrice) * 100;
        
        targetRateInput.value = rate.toFixed(2); 
    });

    targetRateInput.addEventListener('input', () => {
        const { averagePrice } = getPurchaseData();
        if (averagePrice === 0) return;

        const rate = parseFloat(targetRateInput.value) || 0;
        const targetPrice = averagePrice * (1 + rate / 100);
        
        targetPriceInput.value = formatNumber(targetPrice.toFixed(0)); 
    });

    // --- 6. 최종 계산 (폼 제출) (수정됨) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const { totalCost, totalShares, averagePrice } = getPurchaseData();
        const splitSellCount = parseInt(splitSellsInput.value, 10);

        if (totalShares === 0) {
            alert('매수 정보를 올바르게 입력하세요.');
            return;
        }

        let finalValue = 0;         // 총 매도 금액
        let costOfGoodsSold = 0;    // 매도한 주식의 원가
        let alertMessage = null;

        if (splitSellCount > 0) {
            // 분할매도 로직
            let totalSoldShares = 0;
            for (let i = 1; i <= splitSellCount; i++) {
                const price = parseNumber(document.getElementById(`sell-price-${i}`).value);
                const quantity = parseInt(document.getElementById(`sell-qty-${i}`).value, 10) || 0;
                
                finalValue += price * quantity;
                totalSoldShares += quantity;
            }

            if (totalSoldShares > totalShares) {
                alertMessage = `총 매수수량(${formatNumber(totalShares)}주)보다 많은 수량(${formatNumber(totalSoldShares)}주)을 매도할 수 없습니다.`;
            }
            // 매도한 주식의 원가 = 평균단가 * 매도수량
            costOfGoodsSold = averagePrice * totalSoldShares; 

        } else {
            // 목표가 로직
            const targetPrice = parseNumber(targetPriceInput.value);
            if (targetPrice === 0) {
                alert('목표가를 입력하거나 분할매도를 설정하세요.');
                return;
            }
            // 목표가로 전체 매도
            finalValue = targetPrice * totalShares;
            costOfGoodsSold = totalCost; // 전체 원가
        }

        if (alertMessage) {
            alert(alertMessage);
            return;
        }

        if (costOfGoodsSold === 0) {
            alert('매도 정보가 유효하지 않습니다.');
            return;
        }

        // 손익액 및 손익율 계산
        const profitLossAmount = finalValue - costOfGoodsSold;
        const profitLossRate = (profitLossAmount / costOfGoodsSold) * 100;

        // 결과 표시
        resultText.innerHTML = `
            손익액 <strong>${formatNumber(Math.round(profitLossAmount))}</strong>원 
            (손익율 <strong>${profitLossRate.toFixed(2)}</strong>%)
        `;
        
        // 손익에 따른 색상 변경
        resultText.className = 'neutral'; // 초기화
        if (profitLossAmount > 0) {
            resultText.classList.add('profit'); // 수익 (빨강)
        } else if (profitLossAmount < 0) {
            resultText.classList.add('loss'); // 손실 (파랑)
        }
    });

});