document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
  
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
  
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  
    const result = await res.json();
    document.getElementById('message').textContent = result.message || 'Заявка отправлена';
  });
  