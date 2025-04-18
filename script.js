const API_URL = 'https://script.google.com/macros/s/AKfycbzRhsu5ulkyBZkWO8A1l_SQM8jbHKYw9JWBR1ZTB8rmjhVdAmxwogxLUYnHD2i2zko5eg/exec';

document.addEventListener('DOMContentLoaded', () => {
  // 自動填入今日日期與現在時間
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
    const time = parseTimeString(r.time);
    return `
      <div class="note">
        <strong>${r.date} ${time}</strong><br/>
        價格：$${r.price} <br/>
        內容：${r.content}
      </div>
    `;
  }).join('');
}

// 處理時間欄位格式問題
function parseTimeString(timeStr) {
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    try {
      const t = new Date(timeStr);
      return t.toTimeString().slice(0, 5); // "13:45"
    } catch (e) {
      return timeStr;
    }
  }
  return timeStr; // 原樣輸出（"13:30" 這種正常時間）
}
