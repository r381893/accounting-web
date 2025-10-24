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

// 輔助函數：設置日期和時間的預設值
function setDefaultDateTime() {
    const now = new Date();
    
    // 格式化日期為 YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${year}-${month}-${day}`;

    // 格式化時間為 HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('time').value = `${hours}:${minutes}`;
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
    setDefaultDateTime(); // 每次渲染後重置表單日期時間為當前時間

    if (records.length === 0) {
        recordList.innerHTML = '<p style="text-align: center; margin-top: 20px;">尚無紀錄 📝</p>';
        updateChart([]); // 更新圖表
        return;
    }

    records.forEach((record, index) => {
        const recordElement = document.createElement('div');
        recordElement.classList.add('note');
        
        const dateTimeStr = `${record.date} ${record.time}`;
        
        // 輔助函數：格式化數字和價格。如果值是 0 或 NaN，顯示 N/A
        const formatNumber = (num) => (num || num === 0) ? parseFloat(num).toLocaleString() : 'N/A';
        const formatPrice = (num) => (num || num === 0) ? `$${formatNumber(num)}` : 'N/A';
        
        // 顯示所有欄位資料
        const fields = `
            <p><strong>大盤指數:</strong> ${formatNumber(record.marketIndex)}</p>
            <p><strong>價平履約價:</strong> ${formatNumber(record.atmStrike)}</p>
            <p><strong>庫存履約價:</strong> ${formatNumber(record.inventoryStrike)}</p>
            <p><strong>庫存買入價:</strong> ${formatPrice(record.inventoryBuyPrice)}</p>
            <p><strong>庫存即時價格:</strong> ${formatPrice(record.inventoryCurrentPrice)}</p>
            <p><strong>庫存當時大盤:</strong> ${formatNumber(record.inventoryMarketIndex)}</p>
        `;

        recordElement.innerHTML = `
            <p><strong>日期/時間:</strong> ${dateTimeStr}</p>
            ${fields}
            <button class="delete-btn" data-index="${index}">刪除</button>
        `;
        recordList.appendChild(recordElement);
    });

    // Add event listeners for delete buttons
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
// 由於刪除了 '價格' 欄位，圖表計算將失效。圖表將顯示空數據。

function calculateDailyTotals(records) {
    return { labels: [], data: [] };
}

function updateChart(records) {
    const { labels, data } = calculateDailyTotals(records);

    const chartData = {
        labels: labels,
        datasets: [{
            label: '每日總和 (價格欄位已移除)',
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
                text: '圖表暫停顯示 (價格/權利金欄位已被移除)',
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

    // 1. 獲取日期和時間 (這是必須有值的欄位)
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    // 驗證日期和時間是否為空
    if (!date || !time) {
        alert('日期和時間欄位是必填的！');
        return;
    }

    // 2. 獲取期權欄位值，並在值為空時，強制轉為 '0' 確保 parseFloat 成功
    const getNumericValue = (id) => {
        const value = document.getElementById(id).value;
        return parseFloat(value || '0'); // 如果是空字串，使用 '0'
    };

    const marketIndex = getNumericValue('marketIndex');
    const atmStrike = getNumericValue('atmStrike');
    const inventoryStrike = getNumericValue('inventoryStrike');
    const inventoryBuyPrice = getNumericValue('inventoryBuyPrice');
    const inventoryCurrentPrice = getNumericValue('inventoryCurrentPrice');
    const inventoryMarketIndex = getNumericValue('inventoryMarketIndex');
    
    // 3. 建立新的記錄物件
    const newRecord = { 
        date, 
        time, 
        // 價格 (price) 和 內容 (content) 保持預設值
        price: 0, 
        content: '',
        // 期權欄位 (已是數字)
        marketIndex,
        atmStrike,
        inventoryStrike,
        inventoryBuyPrice,
        inventoryCurrentPrice,
        inventoryMarketIndex
    };

    // 4. 儲存並更新介面
    const records = getRecords();
    records.push(newRecord);
    saveRecords(records);

    // 清空數字欄位，但保持日期時間為當前預設值
    noteForm.reset();
    setDefaultDateTime(); // 確保日期時間保持在最新
    
    renderRecords();
}

// --- 初始化執行 ---

noteForm.addEventListener('submit', handleFormSubmit);

// 頁面加載完成後執行：設置預設時間日期，並渲染記錄
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDateTime();
    renderRecords();
});
