const API_URL = 'https://script.google.com/macros/s/AKfycbzRhsu5ulkyBZkWO8A1l_SQM8jbHKYw9JWBR1ZTB8rmjhVdAmxwogxLUYnHD2i2zko5eg/exec';

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
  list.innerHTML = records.reverse().map(r => {
    const formattedDate = formatDate(r.date);
    const formattedTime = formatTime(r.time);

    return `
      <div class="note">
        <strong>${formattedDate} ${formattedTime}</strong><br/>
        價格：$${r.price} <br/>
        內容：${r.content}
      </div>
    `;
  }).join('');
}

// ✅ 時間字串修正（避免顯示 1899）
function formatTime(timeStr) {
  try {
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toTimeString().slice(0, 5);
    }
    return timeStr;
  } catch (e) {
    return timeStr;
  }
}

// ✅ 日期也處理一下（防止格式不一致）
function formatDate(dateStr) {
  try {
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      const d = new Date(dateStr);
      return d.toISOString().split('T')[0];
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}
