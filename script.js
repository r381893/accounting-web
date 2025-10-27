// 更新後的 script.js
// 變更重點：
// - 在留言板每筆紀錄顯示星期幾（例如：2025-10-27 星期一 14:30）
// - 本月統計改為「逐筆顯示」的曲線圖（若一天有多筆紀錄會顯示多個點），使用折線 + 點（曲線圖），方便看變化
// - 保留當日折線圖（日內變化）與刪除/新增的 API 邏輯

const API_URL = 'https://script.google.com/macros/s/AKfycbzb6mVWD0lqrLU1OQRydoNyU4fVW2IpPacngUQDZOpWPv_eddIIQMr5uLlOqDEBYKbB5A/exec';

let chartToday = null;
let chartMonth = null;
let currentRecords = [];

function ensureUIElements() {
  const dateInput = document.getElementById('date');
  if (dateInput) {
    let weekday = document.getElementById('weekdayDisplay');
    if (!weekday) {
      weekday = document.createElement('span');
      weekday.id = 'weekdayDisplay';
      weekday.style.marginLeft = '8px';
      weekday.style.fontWeight = '600';
      weekday.className = 'small';
      dateInput.insertAdjacentElement('afterend', weekday);
    }
  }

  if (!document.getElementById('monthlyChart')) {
    const dailyCanvas = document.getElementById('dailyChart');
    const monthlyCanvas = document.createElement('canvas');
    monthlyCanvas.id = 'monthlyChart';
    monthlyCanvas.style.width = '100%';
    monthlyCanvas.style.height = '300px';
    if (dailyCanvas && dailyCanvas.parentNode) {
      dailyCanvas.parentNode.insertBefore(monthlyCanvas, dailyCanvas.nextSibling);
    } else {
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

// 格式化顯示用時間標籤：MM-DD HH:MM （若需完整 YYYY-MM-DD 可改）
function formatLabelForPoint(dateObj) {
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

document.addEventListener('DOMContentLoaded', () => {
  ensureUIElements();

  const now = new Date();
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  if (dateEl) dateEl.value = now.toISOString().split('T')[0];
  if (timeEl) timeEl.value = now.toTimeString().slice(0, 5);

  const dateInput = document.getElementById('date');
  const weekdayDisplay = document.getElementById('weekdayDisplay');
  if (dateInput && weekdayDisplay) {
    dateInput.addEventListener('change', () => {
      weekdayDisplay.textContent = getWeekdayLabel(dateInput.value);
    });
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

  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });

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
  currentRecords = records || [];

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = currentRecords.filter(r => r.date === today);
  const maxPrice = todayRecords.length ? Math.max(...todayRecords.map(r => Number(r.price))) : null;

  const list = document.getElementById('recordList');
  const rev = [...currentRecords].reverse();
  list.innerHTML = rev.map((r, index) => {
    // 計算 deleteIndex 相對於原陣列的位置（保留原 API 相容性）
    const deleteIndex = currentRecords.length - 1 - index;
    const isMax = (r.date === today && maxPrice !== null && Number(r.price) === maxPrice);
    const weekday = getWeekdayLabel(r.date);
    // 顯示：YYYY-MM-DD 星期X HH:MM
    return `
      <div class="note" style="background:${isMax ? '#ffe0e0' : '#ecf0f1'}">
        <strong>${escapeHtml(r.date)} ${escapeHtml(weekday)} ${escapeHtml(r.time)}</strong><br/>
        價格：$${Number(r.price)} <br/>
        內容：${escapeHtml(r.content)}<br/>
        <button class="delete-btn" onclick="deleteRecord(${deleteIndex})">🗑 刪除</button>
      </div>
    `;
  }).join('');

  drawTodayChart(currentRecords);
  drawMonthlyPointChart(currentRecords);
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

function drawTodayChart(records) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  const ctx = document.getElementById('dailyChart').getContext('2d');

  if (todayRecords.length === 0) {
    if (chartToday) {
      chartToday.destroy();
      chartToday = null;
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

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
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#3498db',
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

function drawMonthlyPointChart(records) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  // 過濾出本月的「逐筆」紀錄
  const monthRecords = records.filter(r => {
    // 若 r.time 可能為空，補 00:00
    const timePart = (r.time && r.time.length <= 5) ? r.time : (r.time || '00:00');
    const dt = new Date(`${r.date}T${timePart}:00`);
    return dt.getFullYear() === year && dt.getMonth() === monthIndex;
  });

  const monthlyCanvas = document.getElementById('monthlyChart');
  if (!monthlyCanvas) return;
  const ctx = monthlyCanvas.getContext('2d');

  if (!monthRecords || monthRecords.length === 0) {
    if (chartMonth) {
      chartMonth.destroy();
      chartMonth = null;
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // 更新本月總計為 0
    let totalEl = document.getElementById('monthTotalDisplay');
    if (!totalEl) {
      totalEl = document.createElement('div');
      totalEl.id = 'monthTotalDisplay';
      totalEl.style.textAlign = 'right';
      totalEl.style.fontWeight = '700';
      totalEl.style.marginTop = '8px';
      monthlyCanvas.parentNode.insertBefore(totalEl, monthlyCanvas);
    }
    totalEl.textContent = `本月總筆數：0`;
    return;
  }

  // 將每一筆轉成 Date 物件並排序（時間先後）
  const items = monthRecords.map(r => {
    const timePart = (r.time && r.time.length <= 5) ? r.time : (r.time || '00:00');
    const d = new Date(`${r.date}T${timePart}:00`);
    return { record: r, dateObj: d, price: Number(r.price) || 0 };
  }).sort((a, b) => a.dateObj - b.dateObj);

  const labels = items.map(it => formatLabelForPoint(it.dateObj));
  const data = items.map(it => it.price);

  if (chartMonth) chartMonth.destroy();

  chartMonth = new Chart(ctx, {
    type: 'line', // 折線圖顯示點
    data: {
      labels,
      datasets: [{
        label: `${year}年 ${monthIndex + 1}月 紀錄價格（逐筆）`,
        data,
        borderColor: 'rgba(231,76,60,0.9)',
        backgroundColor: 'rgba(231,76,60,0.2)',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(231,76,60,1)',
        fill: false,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: function(context) {
              // 顯示完整的日期時間標籤
              return context[0].label;
            },
            label: function(context) {
              const v = context.raw || 0;
              return ` ${v.toLocaleString(undefined, {minimumFractionDigits: (v%1?2:0), maximumFractionDigits: 2})} 元`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '日期 時間 (MM-DD HH:MM)' },
          ticks: { maxRotation: 45, minRotation: 30 }
        },
        y: {
          title: { display: true, text: '金額' },
          beginAtZero: true
        }
      }
    }
  });

  // 顯示本月總筆數與加總（如需加總）
  let monthTotal = items.reduce((s, it) => s + it.price, 0);
  let totalEl = document.getElementById('monthTotalDisplay');
  if (!totalEl) {
    totalEl = document.createElement('div');
    totalEl.id = 'monthTotalDisplay';
    totalEl.style.textAlign = 'right';
    totalEl.style.fontWeight = '700';
    totalEl.style.marginTop = '8px';
    monthlyCanvas.parentNode.insertBefore(totalEl, monthlyCanvas);
  }
  totalEl.textContent = `本月筆數：${items.length}    本月總計： ${monthTotal.toLocaleString(undefined, {minimumFractionDigits: (monthTotal%1?2:0), maximumFractionDigits: 2})}`;
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
