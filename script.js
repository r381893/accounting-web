// script.js

// --- 全域變數與初始化 ---

const noteForm = document.getElementById('noteForm');
const recordList = document.getElementById('recordList');
const dailyChartCanvas = document.getElementById('dailyChart');

let dailyChart; 

// 輔助函數：從 localStorage 獲取記錄
function getRecords() {
    const records = localStorage.getItem('expenseRecords');
    return records ? JSON.parse(records) : [];
}

// 輔助函數：將記錄儲存到 localStorage
function saveRecords(records) {
    localStorage.setItem('expenseRecords', JSON.stringify(records));
}

// --- 資料管理與渲染 ---

/**
 * 渲染記錄列表並更新圖表。
 */
function renderRecords() {
    // 獲取所有記錄並按日期/時間降序排序（最新在前）
    const records = getRecords().sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });

    recordList.innerHTML = ''; // 清空當前列表

    if (records.length === 0) {
        recordList.innerHTML = '<p style="text-align: center; margin-top: 20px;">尚無紀錄 📝</p>';
        updateChart([]); // 用空資料更新圖表
        return;
    }

    records.forEach((record, index) => {
        const recordElement = document.createElement('div');
        recordElement.classList.add('note');
        
        // 格式化日期/時間和價格
        const dateTimeStr = `${record.date} ${record.time}`;
        const priceStr = `\$${parseFloat(record.price).toLocaleString()}`; 
        
        // --- 顯示新增的欄位資料 ---
        const newFields = `
            <p><strong>大盤指數:</strong> ${parseFloat(record.marketIndex).toLocaleString()}</p>
            <p><strong>價平履約價:</strong> ${parseFloat(record.atmStrike).toLocaleString()}</p>
            <p><strong>庫存履約價:</strong> ${parseFloat(record.inventoryStrike).toLocaleString()}</p>
            <p><strong>庫存買入價:</strong> \$${parseFloat(record.inventoryBuyPrice).toLocaleString()}</p>
            <p><strong>庫存即時價格:</strong> \$${parseFloat(record.inventoryCurrentPrice).toLocaleString()}</p>
            <p><strong>庫存當時大盤:</strong> ${parseFloat(record.inventoryMarketIndex).toLocaleString()}</p>
        `;
        // -----------------------------

        recordElement.innerHTML = `
            <p><strong>日期/時間:</strong> ${dateTimeStr}</p>
            <p><strong>內容 (交易說明):</strong> ${record.content}</p>
            <p><strong>價格 (權利金):</strong> <span style="color: #e74c3c; font-weight: bold;">${priceStr}</span></p>
            ${newFields} <button class="delete-btn" data-index="${index}">刪除</button>
        `;
        recordList.appendChild(recordElement);
    });

    // 為所有刪除按鈕添加事件監聽器
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteRecord);
    });

    updateChart(records);
}

/**
 * 處理記錄的刪除。
 */
function deleteRecord(event) {
    const indexToDelete = parseInt(event.target.getAttribute('data-index'));
    
    // 獲取記錄，並重新排序以確保刪除的索引正確對應到顯示的列表
    let records = getRecords().sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });

    records.splice(indexToDelete, 1);
    saveRecords(records);
    renderRecords(); 
}


// --- 圖表邏輯 (Chart.js) ---
// 這裡的圖表仍只計算原有的 '價格' (權利金) 欄位總和。

/**
 * 計算每日支出總額。
 */
function calculateDailyTotals(records) {
    const dailyTotals = {};

    records.forEach(record => {
        const date = record.date;
        // 僅使用 price (權利金) 進行圖表計算
        const price = parseFloat(record.price); 
        
        if (!dailyTotals[date]) {
            dailyTotals[date] = 0;
        }
        dailyTotals[date] += price;
    });

    // 提取標籤 (日期) 和資料 (總額) 並按日期排序
    const sortedDates = Object.keys(dailyTotals).sort();
    const labels = sortedDates;
    const data = sortedDates.map(date => dailyTotals[date]);

    return { labels, data };
}

/**
 * 更新或初始化 Chart.js 的每日支出圖表。
 */
function updateChart(records) {
    const { labels, data } = calculateDailyTotals(records);

    const chartData = {
        labels: labels,
        datasets: [{
            label: '每日支出總和 (NT$)',
            data: data,
            backgroundColor: 'rgba(52, 152, 219, 0.8)', 
            borderColor: '#3498db',
            borderWidth: 1,
            borderRadius: 4,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, 
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: '金額 (NT$)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: '日期'
                }
            }
        },
        plugins: {
            legend: {
                display: true,
            },
            title: {
                display: true,
                text: '每日權利金總額趨勢圖',
            }
        }
    };

    if (dailyChart) {
        dailyChart.data = chartData;
        dailyChart.update();
    } else {
        dailyChart = new Chart(dailyChartCanvas, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }
}


// --- 事件處理器 ---

/**
 * 處理新增記錄的表單提交。
 */
function handleFormSubmit(event) {
    event.preventDefault(); 

    // 1. 獲取原有輸入值
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const price = document.getElementById('price').value; // 權利金
    const content = document.getElementById('content').value.trim();

    // 2. 獲取新增的七個欄位值
    const marketIndex = document.getElementById('marketIndex').value;
    const atmStrike = document.getElementById('atmStrike').value;
    const inventoryStrike = document.getElementById('inventoryStrike').value;
    const inventoryBuyPrice = document.getElementById('inventoryBuyPrice').value;
    const inventoryCurrentPrice = document.getElementById('inventoryCurrentPrice').value;
    const inventoryMarketIndex = document.getElementById('inventoryMarketIndex').value;
    
    // 簡單的驗證
    if (!date || !time || !price || !content || !marketIndex || !atmStrike || !inventoryStrike || !inventoryBuyPrice || !inventoryCurrentPrice || !inventoryMarketIndex) {
        alert('請確保所有欄位都已填寫！');
        return;
    }
    
    // 3. 建立新的記錄物件 (包含所有欄位)
    const newRecord = { 
        date, 
        time, 
        price: parseFloat(price), 
        content,
        // 新增欄位
        marketIndex: parseFloat(marketIndex),
        atmStrike: parseFloat(atmStrike),
        inventoryStrike: parseFloat(inventoryStrike),
        inventoryBuyPrice: parseFloat(inventoryBuyPrice),
        inventoryCurrentPrice: parseFloat(inventoryCurrentPrice),
        inventoryMarketIndex: parseFloat(inventoryMarketIndex)
    };

    // 4. 儲存並更新介面
    const records = getRecords();
    records.push(newRecord);
    saveRecords(records);

    noteForm.reset();
    renderRecords();
}

// --- 初始化執行 ---

noteForm.addEventListener('submit', handleFormSubmit);
document.addEventListener('DOMContentLoaded', renderRecords);
