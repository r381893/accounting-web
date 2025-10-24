// script.js

// --- 全域變數與初始化 ---

const noteForm = document.getElementById('noteForm');
const recordList = document.getElementById('recordList');

// --- 輔助函數：數據持久化 ---

function getRecords() {
    const records = localStorage.getItem('expenseRecords');
    return records ? JSON.parse(records) : [];
}

function saveRecords(records) {
    localStorage.setItem('expenseRecords', JSON.stringify(records));
}

// --- 輔助函數：日期時間處理 ---

/**
 * 設置日期和時間的預設值為當前時間。
 */
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

/**
 * 獲取並安全地解析數字輸入值，空字串會被視為 0。
 * @param {string} id - 輸入框的 ID
 * @returns {number} 解析後的數字
 */
const getNumericValue = (id) => {
    const value = document.getElementById(id).value;
    // 如果是空字串或無法解析為數字，則返回 0
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
};


// --- 資料管理與渲染 ---

/**
 * 渲染記錄列表。
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
        recordList.innerHTML = '<p style="text-align: center; margin-top: 20px;">尚無記錄 📝 請新增一筆。</p>';
        return; 
    }

    records.forEach((record, index) => {
        const recordElement = document.createElement('div');
        recordElement.classList.add('note');
        
        const dateTimeStr = `${record.date} ${record.time}`;
        
        // 輔助函數：格式化數字和價格。
        // 如果值是 0 或無法顯示，則顯示 'N/A'
        const formatNumber = (num) => (num || num === 0) ? num.toLocaleString('zh-TW', { maximumFractionDigits: 2 }) : 'N/A';
        const formatPrice = (num) => (num || num === 0) ? `$${num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
        
        // 顯示所有欄位資料
        const fields = `
            <p><strong>當時大盤指數:</strong> ${formatNumber(record.marketIndex)}</p>
            <p><strong>價平履約價:</strong> ${formatNumber(record.atmStrike)}</p>
            <p><strong>庫存履約價:</strong> ${formatNumber(record.inventoryStrike)}</p>
            <p><strong>庫存買入價:</strong> ${formatPrice(record.inventoryBuyPrice)}</p>
            <p><strong>庫存即時價格:</strong> ${formatPrice(record.inventoryCurrentPrice)}</p>
            <p><strong>庫存當時大盤:</strong> ${formatNumber(record.inventoryMarketIndex)}</p>
        `;

        recordElement.innerHTML = `
            <p><strong>日期/時間:</strong> ${dateTimeStr}</p>
            <hr style="border-top: 1px dashed #ccc; margin: 10px 0;">
            ${fields}
            <button class="delete-btn" data-index="${index}">刪除</button>
        `;
        recordList.appendChild(recordElement);
    });

    // 為所有刪除按鈕添加事件監聽器
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteRecord);
    });
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


// --- 事件處理器 ---

/**
 * 處理新增記錄的表單提交。
 */
function handleFormSubmit(event) {
    event.preventDefault(); 

    // 1. 獲取日期和時間
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    // 驗證日期和時間是否為空（因為它們有預設值，通常不會為空）
    if (!date || !time) {
        alert('日期和時間欄位是必填的！');
        return;
    }

    // 2. 獲取所有數字欄位的值（使用安全的 getNumericValue 函數）
    const newRecord = { 
        date, 
        time, 
        // 為了數據結構兼容性，可以保留 price 和 content 欄位，並設為 0/空字串
        price: 0, 
        content: '',
        
        marketIndex: getNumericValue('marketIndex'),
        atmStrike: getNumericValue('atmStrike'),
        inventoryStrike: getNumericValue('inventoryStrike'),
        inventoryBuyPrice: getNumericValue('inventoryBuyPrice'),
        inventoryCurrentPrice: getNumericValue('inventoryCurrentPrice'),
        inventoryMarketIndex: getNumericValue('inventoryMarketIndex')
    };

    // 3. 儲存並更新介面
    const records = getRecords();
    records.push(newRecord);
    saveRecords(records);

    // 清空數字輸入框，並將日期時間重設為最新
    noteForm.reset();
    setDefaultDateTime(); 
    
    renderRecords();
}

// --- 初始化執行 ---

noteForm.addEventListener('submit', handleFormSubmit);

// 頁面加載完成後執行：設置預設時間日期，並渲染記錄
document.addEventListener('DOMContentLoaded', () => {
    // 嘗試從 localStorage 加載記錄並渲染
    renderRecords();
});
