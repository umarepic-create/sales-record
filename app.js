/* Fal-Breeze Sales Record - Supabase version */
const { createClient } = window.supabase;
const sb = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const money = (v) => 'NGN' + Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let currentUser = null;
let profile = null;
let sales = [];
let stock = [];

const loginScreen = $('loginScreen');
const loginForm = $('loginForm');
const loginError = $('loginError');
const tableBody = $('salesTableBody');
const recordDate = $('recordDate');
const dailyTotal = $('dailyTotal');
const saleForm = $('saleForm');
const stockForm = $('stockForm');
const stockList = $('stockList');

function showError(message) {
  loginError.textContent = message || '';
}

function setToday() {
  const today = new Date().toISOString().slice(0, 10);
  $('saleDate').value = today;
  recordDate.value = today;
}

async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  if (error) throw error;
  if (!data) {
    const name = prompt('Enter your name (this will appear in the sales audit log):');
    if (!name || !name.trim()) throw new Error('Your name is required.');
    const { data: created, error: createError } = await sb.from('profiles')
      .insert({ id: currentUser.id, full_name: name.trim() })
      .select().single();
    if (createError) throw createError;
    profile = created;
  } else {
    profile = data;
  }
}

async function loadData() {
  const [salesResult, stockResult] = await Promise.all([
    sb.from('sales').select('*').order('created_at', { ascending: false }),
    sb.from('stock').select('*').order('name')
  ]);
  if (salesResult.error) throw salesResult.error;
  if (stockResult.error) throw stockResult.error;
  sales = salesResult.data || [];
  stock = stockResult.data || [];
  renderSales();
  renderStock();
  renderDashboard();
}

function renderSales() {
  const selected = recordDate.value;
  const visible = sales.filter(s => !selected || s.sale_date === selected);
  tableBody.innerHTML = visible.length ? visible.map(s => `
    <tr>
      <td>#FB-${s.order_number}</td>
      <td>${s.sale_date}</td>
      <td>${escapeHtml(s.customer)}</td>
      <td>${escapeHtml(s.item)}</td>
      <td>${s.qty}</td>
      <td>${money(s.amount)}</td>
      <td>${escapeHtml(s.payment_method)}</td>
      <td><span class="status ${s.status.toLowerCase()}">${s.status}</span></td>
    </tr>`).join('') :
    '<tr><td colspan="8" style="text-align:center;color:var(--muted);">No sales recorded for this day.</td></tr>';
  dailyTotal.textContent = 'Total sales for selected day: ' +
    money(visible.filter(s => s.status !== 'Cancelled').reduce((n, s) => n + Number(s.amount), 0));
}

function renderStock() {
  stockList.innerHTML = stock.length ? stock.map((s, i) => `
    <div class="stock-row">
      <div class="stock-edit">
        <input type="text" value="${escapeAttr(s.name)}" data-stock-name="${s.id}">
        <input type="number" min="0" step="0.01" value="${s.qty}" data-stock-qty="${s.id}">
      </div>
      <button type="button" class="logout-button" data-save-stock="${s.id}">Save</button>
    </div>`).join('') :
    '<span style="color:var(--muted);">No food items stocked yet.</span>';
}

function renderDashboard() {
  const validSales = sales.filter(s => s.status !== 'Cancelled');
  const total = validSales.reduce((n, s) => n + Number(s.amount), 0);
  $('totalRevenue').textContent = money(total);
  $('ordersServed').textContent = validSales.length;
  $('averageTicket').textContent = money(validSales.length ? total / validSales.length : 0);
  $('refundsCount').textContent = sales.filter(s => s.status === 'Cancelled').length;

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0,10);
    days.push({ key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), value:
      validSales.filter(s => s.sale_date === key).reduce((n, s) => n + Number(s.amount), 0) });
  }
  const max = Math.max(...days.map(d => d.value), 1);
  document.querySelectorAll('#weeklyBars .bar-group').forEach((group, i) => {
    const bar = group.querySelector('.bar');
    if (!days[i]) return;
    bar.style.height = (days[i].value / max * 100) + '%';
    bar.dataset.value = money(days[i].value);
    group.lastElementChild.textContent = days[i].label;
  });

  const payments = {};
  validSales.forEach(s => payments[s.payment_method] = (payments[s.payment_method] || 0) + 1);
  const top = Object.entries(payments).sort((a,b) => b[1]-a[1])[0];
  $('topPayment').textContent = top ? top[0] : 'No data yet';

  const customers = {};
  validSales.forEach(s => customers[s.customer] = (customers[s.customer] || 0) + 1);
  const repeats = Object.values(customers).filter(n => n > 1).length;
  $('repeatRate').textContent = Object.keys(customers).length ?
    Math.round(repeats / Object.keys(customers).length * 100) + '%' : 'No data yet';

  const itemTotals = {};
  validSales.forEach(s => itemTotals[s.item] = (itemTotals[s.item] || 0) + Number(s.amount));
  const topItems = Object.entries(itemTotals).sort((a,b) => b[1]-a[1]).slice(0,4);
  const legend = document.querySelector('.legend');
  if (legend) legend.innerHTML = topItems.length ? topItems.map(([name,value]) =>
    `<div class="legend-row"><div class="legend-name"><span class="dot coffee"></span>${escapeHtml(name)}</div><strong>${money(value)}</strong></div>`).join('') :
    '<div style="color:var(--muted);">No sales yet.</div>';
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(v) { return escapeHtml(v); }

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showError(error.message); return; }
  currentUser = data.user;
  await startApp();
});

$('logoutButton').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});

saleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const payload = {
    sale_date: $('saleDate').value,
    customer: $('customerName').value.trim(),
    item: $('saleItem').value,
    qty: Number($('saleQty').value),
    amount: Number($('saleAmount').value),
    payment_method: $('paymentMethod').value,
    status: 'Paid',
    created_by: currentUser.id
  };
  const { error } = await sb.from('sales').insert(payload);
  if (error) { alert(error.message); return; }
  saleForm.reset();
  setToday();
  $('saleQty').value = 1;
});

recordDate.addEventListener('change', renderSales);

stockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('stockItem').value.trim();
  const qty = Number($('stockQty').value);
  if (!name || qty < 0) return;
  const existing = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
  let result;
  if (existing) {
    result = await sb.from('stock').update({ qty, updated_by: currentUser.id }).eq('id', existing.id);
  } else {
    result = await sb.from('stock').insert({ name, qty, created_by: currentUser.id, updated_by: currentUser.id });
  }
  if (result.error) { alert(result.error.message); return; }
  stockForm.reset();
});

stockList.addEventListener('click', async (e) => {
  const button = e.target.closest('[data-save-stock]');
  if (!button) return;
  const id = button.dataset.saveStock;
  const name = stockList.querySelector(`[data-stock-name="${id}"]`).value.trim();
  const qty = Number(stockList.querySelector(`[data-stock-qty="${id}"]`).value);
  if (!name || qty < 0) return;
  const { error } = await sb.from('stock').update({ name, qty, updated_by: currentUser.id }).eq('id', id);
  if (error) alert(error.message);
});

async function startApp() {
  loginScreen.style.display = 'none';
  setToday();
  await loadProfile();
  await loadData();
  sb.channel('sales-and-stock')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, loadData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, loadData)
    .subscribe();
}

(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session?.user) {
    currentUser = data.session.user;
    try { await startApp(); }
    catch (err) { console.error(err); showError(err.message); loginScreen.style.display = 'grid'; }
  } else {
    loginScreen.style.display = 'grid';
  }
})();
