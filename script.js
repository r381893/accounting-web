// ← 貼上你在 Apps Script 新建部署時拿到的 Exec URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxywazgJwZOzFzVek1lVG76mR7560liTzjOHOFdJQuXMoBHje9RWExRzX92G_7atJ7eSQ/exec';

let dailyChart = null;
let monthlyChart = null;

document.addEventListener('DOMContentLoaded', () => {
  // 表單預設帶入今天日期
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  fetchRecords();
});

document.getElementById('recordForm').addEventListener('submit', async e => {
  e.preventDefault();

  // 取得當下時間 HH:mm
  const now = new Date();
  const time = now.toTimeString().slice(0,5);

  const record = {
    date:     document.getElementById('date').value,
    time:     time,
    category: document.getElementById('category').value,
    amount:   parseFloat(document.getElementById('amount').value),
    notes:    document.getElementById('notes').value
  };

  // POST 到 Apps Script
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
  const res     = await fetch(API_URL);
  const records = await res.json();

  renderList(records);
  renderCharts(records);
}

function renderList(records) {
  const ul = document.getElementById('recordList');
  ul.innerHTML = '';
  // 最新在上
  records.slice().reverse().forEach(rec => {
    const li = document.createElement('li');
    li.textContent = 
      `${rec.date} ${rec.time} ｜ ${rec.category} ｜ $${rec.amount} ｜ ${rec.notes}`;
    ul.appendChild(li);
  });
}

function renderCharts(records) {
  //—— 每日支出總計 —— 
  const dailyMap = {};
  records.forEach(rec => {
    dailyMap[rec.date] = (dailyMap[rec.date]||0) + rec.amount;
  });
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyValues = dailyLabels.map(d => dailyMap[d]);

  if (dailyChart) dailyChart.destroy();
  const ctx1 = document.getElementById('dailyChart').getContext('2d');
  dailyChart = new Chart(ctx1, {
    type:'line',
    data:{
      labels: dailyLabels,
      datasets:[{
        label:'每日支出',
        data: dailyValues,
        borderColor:'#3B82F6',
        fill:false,
        tension:0.3
      }]
    },
    options:{ responsive:true }
  });

  //—— 每日最高支出 —— 
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
    type:'line',
    data:{
      labels: maxLabels,
      datasets:[{
        label:'每日最高支出',
        data: maxValues,
        borderColor:'#10B981',
        fill:false,
        tension:0.3
      }]
    },
    options:{ responsive:true }
  });
}
