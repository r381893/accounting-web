const API_URL = 'https://script.google.com/macros/s/AKfycbzRhsu5ulkyBZkWO8A1l_SQM8jbHKYw9JWBR1ZTB8rmjhVdAmxwogxLUYnHD2i2zko5eg/exec';

let chart = null;

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
  loadRecords();
});

async function loadRecords() {
  const res = await fetch(API_URL);
  const records = await res.json();

  const list = document.getElementById('recordList');
  list.innerHTML = records.reverse().map(r => `
    <div class="note">
      <strong>${r.date} ${r.time}</strong><br/>
      價格：$${r.price} <br/>
      內容：${r.content}
    </div>
  `).join('');

  drawChart(records);
}

function drawChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  const labels = todayRecords.map(r => r.time);
  const data = todayRecords.map(r => Number(r.price));

  const ctx = document.getElementById('dailyChart').getContext('2d');

  if (chart) chart.destroy(); // 清除舊圖

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '當日金額變化',
        data,
        fill: false,
        tension: 0.4,
        borderColor: '#3498db',
        backgroundColor: '#3498db',
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: '時間' }
        },
        y: {
          title: { display: true, text: '金額 (元)' },
          beginAtZero: true
        }
      }
    }
  });
}
