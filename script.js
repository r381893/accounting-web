// 把這裡替換成你自己的 Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxey1neT__fTdPA0HveXTkPDaqhSr-vM4Zm52uM8TyndQtZTIPOyosmYSHu9qWGfaWkHw/exec';

let dailyChart = null;
let monthlyChart = null;

document.addEventListener('DOMContentLoaded', () => {
  // 預設今天日期
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  fetchRecords();
});

document.getElementById('recordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const record = {
    date:    document.getElementById('date').value,
    category:document.getElementById('category').value,
    amount:  parseFloat(document.getElementById('amount').value),
    notes:   document.getElementById('notes').value
  };

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(record)
  });

  // 重置表單並重新載入
  e.target.reset();
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  fetchRecords();
});

async function fetchRecords() {
  const res = await fetch(API_URL);
  const records = await res.json();
  renderList(records);
  renderCharts(records);
}

function renderList(records) {
  const list = document.getElementById('recordList');
  list.innerHTML = '';
  // 反轉順序，最新在上面
  records.slice().reverse().forEach(rec => {
    const li = document.createElement('li');
    li.textContent = `${rec.date}｜${rec.category}｜$${rec.amount}｜${rec.notes}`;
    list.appendChild(li);
  });
}

function renderCharts(records) {
  // —— 每日：所有交易都畫一點 —— 
  const dailyLabels = [];
  const dailyValues = [];
  records.forEach(rec => {
    dailyLabels.push(`${rec.date} ${rec.time||''}`);
    dailyValues.push(parseFloat(rec.amount));
  });

  if (dailyChart) dailyChart.destroy();
  const ctx1 = document.getElementById('dailyChart').getContext('2d');
  dailyChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{ 
        label: '每筆支出', 
        data: dailyValues,
        borderColor: '#3B82F6',
        fill: false,
        tension: 0.3
      }]
    },
    options: { responsive: true }
  });

  // —— 每日最高支出 —— 
  const maxMap = {};
  records.forEach(rec => {
    if (!maxMap[rec.date] || rec.amount > maxMap[rec.date].amount) {
      maxMap[rec.date] = rec;
    }
  });
  const maxLabels = Object.keys(maxMap).sort();
  const maxValues = maxLabels.map(d => maxMap[d].amount);

  if (monthlyChart) monthlyChart.destroy();
  const ctx2 = document.getElementById('monthlyChart').getContext('2d');
  monthlyChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: maxLabels,
      datasets: [{ 
        label: '每日最高支出', 
        data: maxValues,
        borderColor: '#10B981',
        fill: false,
        tension: 0.3
      }]
    },
    options: { responsive: true }
  });
}
