const API_URL = 'https://script.google.com/macros/s/AKfycbzRhsu5ulkyBZkWO8A1l_SQM8jbHKYw9JWBR1ZTB8rmjhVdAmxwogxLUYnHD2i2zko5eg/exec';

let chart = null;

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const dateInput = document.getElementById('date');
  const timeInput = document.getElementById('time');

  // 自動填入當日日期與時間（時間固定為 HH:mm 格式）
  dateInput.value = now.toISOString().split('T')[0];
  timeInput.value = now.toTimeString().slice(0, 5);

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

  const list = document.getElementById('recordList');
  list.innerHTML = records.reverse().map(r => `
    <div class="note">
      <strong>${r.date} ${r.time}</strong><br/>
      價格：$${r.price} <br/>
      內容：${r.content}
    </div>
  `).join('');

  // 等 DOM 渲染完再畫圖
  setTimeout(() => drawChart(records), 0);
}

function drawChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  if (todayRecords.length === 0) {
    const canvas = document.getElementById('dailyChart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const labels = todayRecords.map(r => r.time);
  const data = todayRecords.map(r => Number(r.price));

  const ctx = document.getElementById('dailyChart').getContext('2d');

  if (chart) chart.destroy(); // 移除舊圖

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
