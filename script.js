// 修改後的 script.js
// 功能：
// - 顯示日期對應的「星期幾」（會自動在 date 欄位旁建立顯示欄位，若 HTML 已有則使用既有的）
// - 保留原本向 Google Apps Script API 讀寫紀錄、刪除紀錄、顯示當日折線圖功能
// - 新增本月每日總額的長條圖（若頁面上沒有 monthlyChart canvas，會自動建立）
// - 不會破壞原有 records 陣列順序（用 reversed copy 來做畫面呈現）
// 注意：需要在頁面已經引入 Chart.js（CDN）且有 date/time/price/content/noteForm/dailyChart 元素或容器。

const API_URL = 'https://script.google.com/macros/s/AKfycbzb6mVWD0lqrLU1OQRydoNyU4fVW2IpPacngUQDZOpWPv_eddIIQMr5uLlOqDEBYKbB5A/exec';

let chartToday = null;
let chartMonth = null;
let currentRecords = [];

// 若頁面沒有 weekday 顯示或 monthlyChart canvas，這些會自動建立並插入到 date 欄位旁與 dailyChart 之後
function ensureUIElements() {
  // weekday display next to date input
  const dateInput = document.getElementById('date');
  if (dateInput) {
    let weekday = document.getElementById('weekdayDisplay');
    if (!weekday) {
      weekday = document.createElement('span');
      weekday.id = 'weekdayDisplay';
      weekday.style.marginLeft = '8px';
      weekday.style.fontWeight = '600';
      weekday.className = 'small';
      // insert after date input
      dateInput.insertAdjacentElement('afterend', weekday);
    }
  }

  // monthly chart canvas after dailyChart
  if (!document.getElementById('monthlyChart')) {
    const dailyCanvas = document.getElementById('dailyChart');
    const monthlyCanvas = document.createElement('canvas');
    monthlyCanvas.id = 'monthlyChart';
    monthlyCanvas.style.width = '100%';
    monthlyCanvas.style.height = '300px';
    if (dailyCanvas && dailyCanvas.parentNode) {
      dailyCanvas.parentNode.insertBefore(monthlyCanvas, dailyCanvas.nextSibling);
    } else {
      // fallback: append to body
      document.body.appendChild(monthlyCanvas);
    }
  }
}

function getWeekdayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '';
  const WEEK_CN = ['日','一','二','三','四','五','六'];
  return '星期' + WEEK_CN[d.getDay()];
}

document.addEventListener('DOMContentLoaded', () => {
  ensureUIElements();

  const now = new Date();
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  if (dateEl) dateEl.value = now.toISOString().split('T')[0];
  if (timeEl) timeEl.value = now.toTimeString().slice(0, 5);

  // update weekday display when date changes
  const dateInput = document.getElementById('date');
  const weekdayDisplay = document.getElementById('weekdayDisplay');
  if (dateInput && weekdayDisplay) {
    dateInput.addEventListener('change', () => {
      weekdayDisplay.textContent = getWeekdayLabel(dateInput.value);
    });
    // set initial weekday
    weekdayDisplay.textContent = getWeekdayLabel(dateInput.value);
  }

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

  // send to backend
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  // reset form and restore defaults
  document.getElementById('noteForm').reset();
  const now = new Date();
  document.getElementById('date').value = now.toISOString().split('T')[0];
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  const weekdayDisplay = document.getElementById('weekdayDisplay');
  if (weekdayDisplay) weekdayDisplay.textContent = getWeekdayLabel(document.getElementById('date').value);

  loadRecords();
});

async function loadRecords() {
  const res = await fetch(API_URL);
  const records = await res.json();
  // keep original order from server in currentRecords
  currentRecords = records || [];

  // build list view: show newest first but do not mutate currentRecords
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = currentRecords.filter(r => r.date === today);
  const maxPrice = todayRecords.length ? Math.max(...todayRecords.map(r => Number(r.price))) : null;

  const list = document.getElementById('recordList');
  // use a reversed copy for display
  const rev = [...currentRecords].reverse();
  list.innerHTML = rev.map((r, index) => {
    // compute deleteIndex relative to original array (so backend index matches)
    const deleteIndex = currentRecords.length - 1 - index;
    const isMax = (r.date === today && maxPrice !== null && Number(r.price) === maxPrice);
    return `
      <div class="note" style="background:${isMax ? '#ffe0e0' : '#ecf0f1'}">
        <strong>${r.date} ${r.time}</strong><br/>
        價格：$${r.price} <br/>
        內容：${escapeHtml(r.content)}<br/>
        <button class="delete-btn" onclick="deleteRecord(${deleteIndex})">🗑 刪除</button>
      </div>
    `;
  }).join('');

  // draw charts
  drawTodayChart(currentRecords);
  drawMonthlyChart(currentRecords);
}

// keep deleteRecord global (HTML inline onclick calls it)
async function deleteRecord(index) {
  if (!confirm("確定要刪除這筆紀錄嗎？")) return;

  const payload = { deleteIndex: index };

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  loadRecords();
}

function drawTodayChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  const ctx = document.getElementById('dailyChart').getContext('2d');

  if (todayRecords.length === 0) {
    // clear existing chart if any
    if (chartToday) {
      chartToday.destroy();
      chartToday = null;
    }
    // clear canvas visually
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  // sort today's records by time to make line chart meaningful
  todayRecords.sort((a, b) => a.time.localeCompare(b.time));
  const labels = todayRecords.map(r => r.time);
  const data = todayRecords.map(r => Number(r.price));

  if (chartToday) chartToday.destroy();

  chartToday = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '當日金額變化',
        data,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52,152,219,0.15)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        fill: true
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

function drawMonthlyChart(records) {
  // monthly totals for current month
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const numDays = new Date(year, monthIndex + 1, 0).getDate();

  const labels = Array.from({length: numDays}, (_, i) => `${i+1}`);
  const totals = new Array(numDays).fill(0);

  let monthTotal = 0;
  records.forEach(r => {
    // r.date expected as YYYY-MM-DD
    const d = new Date(r.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const day = d.getDate();
      totals[day - 1] += Number(r.price) || 0;
      monthTotal += Number(r.price) || 0;
    }
  });

  // create or get monthly canvas context
  const monthlyCanvas = document.getElementById('monthlyChart');
  if (!monthlyCanvas) return;
  const ctx = monthlyCanvas.getContext('2d');

  if (chartMonth) chartMonth.destroy();

  chartMonth = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `${year}年 ${monthIndex + 1}月 每日總額`,
        data: totals,
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(39,174,96,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function(context) {
              const v = context.raw || 0;
              return ` ${v.toLocaleString(undefined, {minimumFractionDigits: (v%1?2:0), maximumFractionDigits: 2})}`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: '日期 (日)' } },
        y: { title: { display: true, text: '金額' }, beginAtZero: true }
      }
    }
  });

  // 顯示本月總計（在 monthlyChart 上方，如果頁面上有 recordList 的容器就放在其上方）
  let totalEl = document.getElementById('monthTotalDisplay');
  if (!totalEl) {
    totalEl = document.createElement('div');
    totalEl.id = 'monthTotalDisplay';
    totalEl.style.textAlign = 'right';
    totalEl.style.fontWeight = '700';
    totalEl.style.marginTop = '8px';
    // insert before monthlyCanvas
    monthlyCanvas.parentNode.insertBefore(totalEl, monthlyCanvas);
  }
  totalEl.textContent = `本月總計： ${monthTotal.toLocaleString(undefined, {minimumFractionDigits: (monthTotal%1?2:0), maximumFractionDigits: 2})}`;
}

// utility: escape HTML for safe insertion into innerHTML
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
