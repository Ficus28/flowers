document.getElementById('statusForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    document.getElementById('result').classList.add('d-none');
    document.getElementById('notFound').classList.add('d-none');
  
    const email = this.email.value.trim();
  
    const res = await fetch('/api/order-status?email=' + encodeURIComponent(email));
    const data = await res.json();
  
    if (data && data.client_name) {
      document.getElementById('resName').textContent = data.client_name;
      document.getElementById('resPhone').textContent = data.phone_number;
      document.getElementById('resFlowers').textContent = data.flower_type;
      document.getElementById('resQuantity').textContent = data.quantity;
      document.getElementById('resDate').textContent = data.delivery_date;
      document.getElementById('resStatus').textContent = data.status;
  
      document.getElementById('result').classList.remove('d-none');
    } else {
      document.getElementById('notFound').classList.remove('d-none');
    }
  });
  