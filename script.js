const API_URL = 'https://script.google.com/macros/s/AKfycbxAJgXmLtBrqPCheOYlvXi-pCeFttSJG3aHK_kJqnIqtslGpIrk_NvfCsbbGWS5_oSJAQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  fetchRecords();
});

document.getElementById('recordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const record = {
    date: document.getElementById('date').value,
    category: document.getElementById('category').value,
    amount: parseFloat(document.getElementById('amount').value),
    notes: document.getElementById('notes').value
  };

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(record)
  });

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

  records.slice().reverse().forEach(rec => {
    const li = document.createElement('li');
    li.textContent = `${rec.date}｜${rec.category}｜$${rec.amount}｜${rec.notes}`;
    list.appendChild(li);
  });
}

function renderCharts(records) {
  const dailyMap = {};
  const monthlyMap = {};

  records.forEach(rec => {
    const date = rec.date;
    const month = rec.date.slice(0, 7);

    // 每日總計
    dailyMap[date] = (dailyMap[date] || 0) + parseFloat(rec.amount);

    // 每月最高
    if (!monthlyMap[month] || parseFloat(rec.amount) > monthlyMap[month]) {
      monthlyMap[month] = parseFloat(rec.amount);
    }
  });

  // 每日圖表
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyValues = dailyLabels.map(d => dailyMap[d]);

  if (window.dailyChart) window.dailyChart.destroy();
  const ctx1 = document.getElementById('dailyChart').getContext('2d');
  window.dailyChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: '每日支出',
        data: dailyValues,
        borderColor: '#3B82F6',
        fill: false,
        tension: 0.3
      }]
    }
  });

  // 每月圖表
  const monthlyLabels = Object.keys(monthlyMap).sort();
  const monthlyValues = monthlyLabels.map(m => monthlyMap[m]);

  if (window.monthlyChart) window.monthlyChart.destroy();
  const ctx2 = document.getElementById('monthlyChart').getContext('2d');
  window.monthlyChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: monthlyLabels,
      datasets: [{
        label: '每月最高支出',
        data: monthlyValues,
        borderColor: '#10B981',
        fill: false,
        tension: 0.3
      }]
    }
  });
}
