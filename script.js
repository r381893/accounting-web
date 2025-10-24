const API_URL = 'https://script.google.com/macros/s/AKfycbzb6mVWD0lqrLU1OQRydoNyU4fVW2IpPacngUQDZOpWPv_eddIIQMr5uLlOqDEBYKbB5A/exec';

let chart = null;
let currentRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  loadRecords();
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
    return `
      <div class="note" style="background:${isMax ? '#ffe0e0' : '#ecf0f1'}">
        <strong>${r.date} ${r.time}</strong><br/>
        價格：$${r.price} <br/>
        內容：${r.content}<br/>
        <button class="delete-btn" onclick="deleteRecord(${records.length - 1 - index})">🗑 刪除</button>
      </div>
    `;
  }).join('');

  drawChart(records);
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

function drawChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  if (todayRecords.length === 0) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    ctx.clearRect(0, 0, 600, 200);
    return;
  }

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
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: { title: { display: true, text: '時間' } },
        y: { title: { display: true, text: '金額 (元)' }, beginAtZero: true }
      }
    }
  });
}
