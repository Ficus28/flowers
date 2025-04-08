// Обработка переключения наличия
document.querySelectorAll('.toggle-availability').forEach(button => {
  button.addEventListener('click', () => {
    const status = button.previousElementSibling;
    if (status.classList.contains('available')) {
      status.textContent = 'Отсутствует';
      status.classList.remove('available');
      status.classList.add('unavailable');
    } else {
      status.textContent = 'Есть в наличии';
      status.classList.remove('unavailable');
      status.classList.add('available');
    }
  });
});


// Загрузка цветов из БД
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/flowers');
    const flowers = await res.json();
    const select = document.getElementById('flowerSelect');
    select.innerHTML = '<option value="">-- Выберите цветок --</option>';
    flowers.forEach(flower => {
      const option = document.createElement('option');
      option.value = flower.name;
      option.textContent = `${flower.name} (${flower.quantity} шт)`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Ошибка при загрузке цветов:', err);
  }
});

// Обработка отправки формы
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

  if (res.ok) {
    this.reset(); // очищаем форму после успеха
  }
});
// ------------------------------Дополнение-------------------------------------------
let flowersData = {};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/flowers');
    const flowers = await res.json();
    flowersData = {}; // сохраняем данные для расчётов
    const select = document.getElementById('flowerSelect');
    select.innerHTML = '<option value="">-- Выберите цветок --</option>';
    flowers.forEach(flower => {
      flowersData[flower.name] = flower; // сохраняем
      const option = document.createElement('option');
      option.value = flower.name;
      option.textContent = `${flower.name} (${flower.quantity} шт)`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Ошибка при загрузке цветов:', err);
  }
});
//-------------------------------Обработчики дополнения------------------------------
document.getElementById('flowerSelect').addEventListener('change', function () {
  const flower = flowersData[this.value];
  const stockSpan = document.getElementById('flowerStock');
  const priceSpan = document.getElementById('totalPrice');
  const quantityInput = document.getElementById('quantity');

  if (flower) {
    stockSpan.textContent = `Остаток: ${flower.quantity} шт`;
    const total = flower.price * quantityInput.value;
    priceSpan.textContent = `Итого: ${total}₽`;
    quantityInput.max = flower.quantity; // ограничение ввода
  } else {
    stockSpan.textContent = '';
    priceSpan.textContent = '';
    quantityInput.removeAttribute('max');
  }
});

document.getElementById('quantity').addEventListener('input', function () {
  const flowerName = document.getElementById('flowerSelect').value;
  const flower = flowersData[flowerName];
  const priceSpan = document.getElementById('totalPrice');

  if (flower) {
    const total = flower.price * this.value;
    priceSpan.textContent = `Итого: ${total}₽`;
  }
});
