const API_URL = 'https://script.google.com/macros/s/AKfycbzb6mVWD0lqrLU1OQRydoNyU4fVW2IpPacngUQDZOpWPv_eddIIQMr5uLlOqDEBYKbB5A/exec';

let chart = null;
let monthlyChart = null;
let currentRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);

  loadRecords();

  // ✅ 註冊 PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(() => {
      console.log('Service Worker Registered');
    });
  }
});

document.getElementById('noteForm').addEventListener('submit', async e => {
  e.preventDefault();

  const data = {
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    price: parseFloat(document.getElementById('price').value),
    content: document.getElementById('content').value
  };

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  document.getElementById('noteForm').reset();
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);

  loadRecords();
});

async function loadRecords() {
  const res = await fetch(API_URL);
  const records = await res.json();
  currentRecords = records;

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);
  const maxPrice = Math.max(...todayRecords.map(r => Number(r.price)));

  const list = document.getElementById('recordList');
  list.innerHTML = records.reverse().map((r, index) => {
    const isMax = (r.date === today && Number(r.price) === maxPrice);
    const day = new Date(r.date).getDay();
    const dayNames = ['日','一','二','三','四','五','六'];
    const weekday = dayNames[day];
    return `
      <div class="note" style="background:${isMax ? '#ffe0e0' : '#ecf0f1'}">
        <strong>${r.date}（${weekday}） ${r.time}</strong><br/>
        價格：$${r.price} <br/>
        內容：${r.content}<br/>
        <button class="delete-btn" onclick="deleteRecord(${records.length - 1 - index})">🗑 刪除</button>
      </div>
    `;
  }).join('');

  drawDailyChart(records);
  drawMonthlyChart(records);
}

async function deleteRecord(index) {
  if (!confirm("確定要刪除這筆紀錄嗎？")) return;
  const payload = { deleteIndex: index };

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  loadRecords();
}

function drawDailyChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  const labels = todayRecords.map(r => r.time);
  const data = todayRecords.map(r => Number(r.price));

  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '當日金額變化',
        data,
        borderColor: '#3498db',
        backgroundColor: '#3498db',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: '時間' } },
        y: { title: { display: true, text: '金額' }, beginAtZero: true }
      }
    }
  });
}

function drawMonthlyChart(records) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const dailyMax = {};

  records.forEach(r => {
    const d = new Date(r.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = r.date;
      const price = Number(r.price);
      if (!dailyMax[day] || price > dailyMax[day]) {
        dailyMax[day] = price;
      }
    }
  });

  const sortedDates = Object.keys(dailyMax).sort();
  const data = sortedDates.map(d => dailyMax[d]);

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: '本月每日最高金額',
        data,
        borderColor: '#e67e22',
        backgroundColor: '#e67e22',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: '日期' } },
        y: { title: { display: true, text: '最高金額' }, beginAtZero: true }
      }
    }
  });
}
