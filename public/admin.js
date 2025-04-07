// public/admin.js
document.addEventListener('DOMContentLoaded', async () => {
    try {
    //   const res = await fetch('/api/admin-data');
      const res = await fetch('/api/applications');
      const data = await res.json();
  
      const tbody = document.querySelector('#applicationsTable tbody');
      tbody.innerHTML = '';


  
      data.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${app.application_id}</td>
          <td>${app.full_name}</td>
          <td>${app.email}</td>
          <td>${app.phone}</td>
          <td>${app.flower_name}</td>
          <td>${app.flower_quantity}</td>
          <td>${app.date}</td>
        `;
        tbody.appendChild(row);
      });
      
  
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
    }
  });

  document.getElementById('addFlowerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
  
    const res = await fetch('/api/flowers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  
    const result = await res.json();
    const msg = document.getElementById('flowerMessage');
    msg.textContent = result.message || 'Готово';
    msg.className = res.ok ? 'text-success' : 'text-danger';
  
    if (res.ok) e.target.reset();
  });

  async function loadFlowers() {
    const res = await fetch('/api/flowers');
    const flowers = await res.json();
  
    const tbody = document.querySelector('#flowersTable tbody');
    tbody.innerHTML = '';
  
    flowers.forEach(flower => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${flower.id}</td>
        <td>${flower.name}</td>
        <td>${flower.description}</td>
        <td>${flower.price}</td>
        <td>${flower.quantity}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editFlower(${flower.id})">✏️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // Загружаем цветы при открытии страницы
  loadFlowers();
    
  let currentFlowerId = null;

window.editFlower = async (id) => {
  const res = await fetch(`/api/flowers/${id}`);
  const flower = await res.json();

  const form = document.getElementById('editFlowerForm');
  form.id.value = flower.id;
  form.name.value = flower.name;
  form.description.value = flower.description;
  form.price.value = flower.price;
  form.quantity.value = flower.quantity;

  new bootstrap.Modal(document.getElementById('editFlowerModal')).show();
};

document.getElementById('editFlowerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());

  const res = await fetch(`/api/flowers/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    bootstrap.Modal.getInstance(document.getElementById('editFlowerModal')).hide();
    loadFlowers();
  } else {
    alert('Ошибка при сохранении');
  }
});

// Загрузка всех цветов
async function loadFlowers() {
  try {
    const res = await fetch('/api/flowers');
    const data = await res.json();

    const tbody = document.querySelector('#flowersTable tbody');
    tbody.innerHTML = '';

    data.forEach(flower => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${flower.id}</td>
        <td>${flower.name}</td>
        <td>${flower.description}</td>
        <td>${flower.price}</td>
        <td>${flower.quantity}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Ошибка загрузки цветов:', err);
  }
}

// Обработка формы редактирования
document.getElementById('editFlowerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  const res = await fetch(`/api/flowers/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  const msgEl = document.getElementById('editFlowerMessage');

  if (res.ok) {
    msgEl.textContent = '✅ Цветок обновлён';
    this.reset();
    loadFlowers();
  } else {
    msgEl.textContent = '❌ ' + (result.message || 'Ошибка обновления');
  }
});



document.getElementById('deleteFlowerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = this.id.value;

  try {
    const res = await fetch(`/api/flowers/${id}`, {
      method: 'DELETE'
    });

    const result = await res.json();
    if (res.ok) {
      document.getElementById('deleteFlowerMessage').textContent = `Цветок с ID ${id} удалён.`;
      loadFlowers(); // обновить таблицу
    } else {
      document.getElementById('deleteFlowerMessage').textContent = result.error || 'Ошибка удаления';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('deleteFlowerMessage').textContent = 'Ошибка удаления';
  }
});

async function loadClients() {
  try {
    const res = await fetch('/api/clients');
    const clients = await res.json();

    const tbody = document.querySelector('#clientsTable tbody');
    tbody.innerHTML = '';

    clients.forEach(client => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${client.id}</td>
        <td>${client.full_name}</td>
        <td>${client.email}</td>
        <td>${client.phone}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Ошибка загрузки клиентов:', err);
  }
}


loadClients();


loadFlowers();
