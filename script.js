const API_URL = 'https://script.google.com/macros/s/AKfycbzRhsu5ulkyBZkWO8A1l_SQM8jbHKYw9JWBR1ZTB8rmjhVdAmxwogxLUYnHD2i2zko5eg/exec';

document.addEventListener('DOMContentLoaded', () => {
  // 預設日期與時間
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
}
