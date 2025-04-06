// public/admin.js
document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('/api/admin-data');
      const data = await res.json();
  
      const tbody = document.querySelector('#applicationsTable tbody');
      tbody.innerHTML = '';
  
      data.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${app.application_id}</td>
          <td>${app.client_name}</td>
          <td>${app.email}</td>
          <td>${app.phone_number}</td>
          <td>${app.flower_name}</td>
          <td>${app.quantity}</td>
          <td>${app.date}</td>
        `;
        tbody.appendChild(row);
      });
  
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
    }
  });
  