'use strict';

const CART_STORAGE_KEY = 'churrasco-brasa-cart-draft';
const DELIVERY_DRAFT_KEY = 'churrascoDeliveryDraft';
const PAYMENT_ORDER_KEY = 'churrascoPaymentOrder';
const ATTRIBUTION_STORAGE_KEY = 'churrasco-brasa-attribution';
const ATTRIBUTION_URL_KEYS = Object.freeze([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'ttclid', 'gclid'
]);

function captureAttribution() {
  try {
    const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
    const params = new URLSearchParams(window.location.search);
    ATTRIBUTION_URL_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) stored[key] = value.slice(0, 200);
    });
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // O armazenamento local pode estar bloqueado em alguns navegadores.
  }
}

captureAttribution();

const DELIVERY_FEES = Object.freeze({
  'cascavel-14-de-novembro': 12,
  'cascavel-alto-alegre': 12,
  'cascavel-brasilia': 12,
  'cascavel-brasmadeira': 12,
  'cascavel-canada': 12,
  'cascavel-cancelli': 12,
  'cascavel-cascavel-velho': 12,
  'cascavel-cataratas': 12,
  'cascavel-centro': 12,
  'cascavel-coqueiral': 12,
  'cascavel-country': 12,
  'cascavel-esmeralda': 12,
  'cascavel-floresta': 12,
  'cascavel-guaruja': 12,
  'cascavel-interlagos': 12,
  'cascavel-maria-luiza': 12,
  'cascavel-morumbi': 12,
  'cascavel-neva': 12,
  'cascavel-pacaembu': 12,
  'cascavel-parque-sao-paulo': 12,
  'cascavel-parque-verde': 12,
  'cascavel-periolo': 12,
  'cascavel-pioneiros-catarinenses': 12,
  'cascavel-recanto-tropical': 12,
  'cascavel-regiao-do-lago': 12,
  'cascavel-santa-cruz': 12,
  'cascavel-santa-felicidade': 12,
  'cascavel-santo-inacio': 12,
  'cascavel-santos-dumont': 12,
  'cascavel-sao-cristovao': 12,
  'cascavel-universitario': 12,
  toledo: 32
});

const DELIVERY_REGION_LABELS = Object.freeze({
  'cascavel-14-de-novembro': '14 de Novembro',
  'cascavel-alto-alegre': 'Alto Alegre',
  'cascavel-brasilia': 'Brasília',
  'cascavel-brasmadeira': 'Brasmadeira',
  'cascavel-canada': 'Canadá',
  'cascavel-cancelli': 'Cancelli',
  'cascavel-cascavel-velho': 'Cascavel Velho',
  'cascavel-cataratas': 'Cataratas',
  'cascavel-centro': 'Centro',
  'cascavel-coqueiral': 'Coqueiral',
  'cascavel-country': 'Country',
  'cascavel-esmeralda': 'Esmeralda',
  'cascavel-floresta': 'Floresta',
  'cascavel-guaruja': 'Guarujá',
  'cascavel-interlagos': 'Interlagos',
  'cascavel-maria-luiza': 'Maria Luiza',
  'cascavel-morumbi': 'Morumbi',
  'cascavel-neva': 'Neva',
  'cascavel-pacaembu': 'Pacaembu',
  'cascavel-parque-sao-paulo': 'Parque São Paulo',
  'cascavel-parque-verde': 'Parque Verde',
  'cascavel-periolo': 'Periolo',
  'cascavel-pioneiros-catarinenses': 'Pioneiros Catarinenses',
  'cascavel-recanto-tropical': 'Recanto Tropical',
  'cascavel-regiao-do-lago': 'Região do Lago',
  'cascavel-santa-cruz': 'Santa Cruz',
  'cascavel-santa-felicidade': 'Santa Felicidade',
  'cascavel-santo-inacio': 'Santo Inácio',
  'cascavel-santos-dumont': 'Santos Dumont',
  'cascavel-sao-cristovao': 'São Cristóvão',
  'cascavel-universitario': 'Universitário',
  toledo: 'Toledo-PR, Brasil'
});

const PRODUCT_PRICES = Object.freeze({
  'Picanha na Brasa': 39.90,
  'Costela Bovina Assada': 46.90,
  'Costela Suína BBQ': 39.90,
  'Frango na Brasa': 29.90,
  'Combo Família': 115.90,
  'Combo Churrasqueiro': 149.90,
  'Coca-Cola Lata': 6.50,
  'Coca-Cola Lata Zero Açúcar': 7.50,
  'Sprite Lata': 5.50,
  'Fanta Uva Lata': 6.00,
  'Fanta Laranja Lata': 6.00,
  'Coca-Cola 2L': 13.50,
  'Coca-Cola Zero Açúcar 2L': 13.50,
  'Sprite 2L': 13.50,
  'Fanta Uva 2L': 13.50,
  'Fanta Laranja 2L': 13.50,
  'Coca-Cola 2L Extra da Oferta': 6.50,
  'Água com Gás': 4.90,
  'Água sem Gás': 4.90,
  'Pudim Cremoso': 12.90,
  'Brownie da Brasa': 14.90,
  'Kit Brasa Completo': 88.90
});

const form = document.getElementById('delivery-form');
const nameField = document.getElementById('delivery-name');
const addressField = document.getElementById('delivery-address');
const regionField = document.getElementById('delivery-region');
const phoneField = document.getElementById('delivery-phone');
const feePreview = document.getElementById('delivery-fee-preview');
const errorMessage = document.getElementById('delivery-error');
const deliveryContent = document.getElementById('delivery-content');
const missingState = document.getElementById('delivery-missing');
const itemsContainer = document.getElementById('delivery-items');
const regionSummary = document.getElementById('delivery-order-region');
const subtotalSummary = document.getElementById('delivery-subtotal');
const feeSummary = document.getElementById('delivery-fee');
const totalSummary = document.getElementById('delivery-total');
const upsellStatus = document.getElementById('delivery-upsell-status');
const upsellButtons = Array.from(document.querySelectorAll('[data-upsell-name]'));

function formatBRL(value) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `R$ ${safeValue.toFixed(2).replace('.', ',')}`;
}

function cleanText(value, maxLength = 240) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeCart(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).reduce((safeItems, item) => {
    const name = cleanText(item?.name, 120);
    if (!Object.prototype.hasOwnProperty.call(PRODUCT_PRICES, name)) return safeItems;
    const qty = Math.max(1, Math.min(99, Math.trunc(Number(item?.qty) || 0)));
    if (!qty) return safeItems;
    safeItems.push({
      name,
      price: PRODUCT_PRICES[name],
      qty,
      details: cleanText(item?.details, 400)
    });
    return safeItems;
  }, []);
}

function readCart() {
  try {
    return normalizeCart(JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
}

function readDeliveryDraft() {
  try {
    const raw = sessionStorage.getItem(DELIVERY_DRAFT_KEY) || sessionStorage.getItem(PAYMENT_ORDER_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
}

const cart = readCart();

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function persistCart() {
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.map(item => ({
    name: item.name,
    details: item.details,
    qty: item.qty,
    price: item.price
  }))));
}

function renderUpsell() {
  upsellButtons.forEach(button => {
    const name = button.dataset.upsellName;
    const price = Number(button.dataset.upsellPrice);
    const item = cart.find(cartItem => cartItem.name === name);
    const quantity = item ? item.qty : 0;
    button.textContent = quantity
      ? `Adicionar mais · ${formatBRL(price)} (${quantity} na sacola)`
      : `Adicionar · ${formatBRL(price)}`;
    button.classList.toggle('is-added', quantity > 0);
    button.setAttribute('aria-label', quantity
      ? `${name}: adicionar mais uma unidade. Já há ${quantity} na sacola.`
      : `Adicionar ${name} por ${formatBRL(price)}`);
  });
}

function addUpsell(button) {
  const name = cleanText(button.dataset.upsellName, 120);
  const price = Number(button.dataset.upsellPrice);
  if (!name || !Number.isFinite(price) || price <= 0) return;

  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + 1);
  } else {
    cart.push({
      name,
      price,
      qty: 1,
      details: name === 'Pudim Cremoso'
        ? 'Sobremesa cremosa com calda de caramelo.'
        : 'Brownie bites com chocolate 55%.'
    });
  }

  try {
    persistCart();
  } catch {
    if (upsellStatus) upsellStatus.textContent = 'Não foi possível atualizar a sacola. Tente novamente.';
    return;
  }

  renderOrder();
  renderFee();
  renderUpsell();
  if (upsellStatus) upsellStatus.textContent = `${name} foi adicionado à sua sacola. O total foi atualizado.`;
}

function selectedFee() {
  return Object.prototype.hasOwnProperty.call(DELIVERY_FEES, regionField.value)
    ? DELIVERY_FEES[regionField.value]
    : 0;
}

function renderOrder() {
  const subtotal = getSubtotal();
  subtotalSummary.textContent = formatBRL(subtotal);
  itemsContainer.replaceChildren();

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'order-item';

    const copy = document.createElement('div');
    copy.className = 'order-item-copy';
    const name = document.createElement('strong');
    name.textContent = `${item.qty}x ${item.name}`;
    copy.appendChild(name);
    if (item.details) {
      const details = document.createElement('small');
      details.textContent = item.details;
      copy.appendChild(details);
    }

    const price = document.createElement('span');
    price.className = 'order-item-price';
    price.textContent = formatBRL(item.price * item.qty);
    row.append(copy, price);
    itemsContainer.appendChild(row);
  });
}

function renderFee() {
  const fee = selectedFee();
  const subtotal = getSubtotal();
  const hasRegion = fee > 0;
  const label = DELIVERY_REGION_LABELS[regionField.value] || '';

  regionSummary.textContent = hasRegion ? label : 'Selecione a região';
  feePreview.textContent = hasRegion
    ? `Taxa de entrega: ${formatBRL(fee)} · ${label}`
    : 'A taxa será exibida após a seleção.';
  feePreview.classList.toggle('is-ready', hasRegion);
  feeSummary.textContent = hasRegion ? formatBRL(fee) : 'Selecione a região';
  totalSummary.textContent = hasRegion ? formatBRL(subtotal + fee) : 'Selecione a região';
}

function restoreDraft() {
  const draft = readDeliveryDraft();
  if (!draft) return;
  if (typeof draft.name === 'string') nameField.value = cleanText(draft.name, 120);
  if (Object.prototype.hasOwnProperty.call(DELIVERY_FEES, draft.region)) regionField.value = draft.region;
  if (typeof draft.address === 'string') addressField.value = cleanText(draft.address, 240);
  if (typeof draft.phone === 'string') phoneField.value = cleanText(draft.phone, 20);
}

function persistDraft() {
  try {
    sessionStorage.setItem(DELIVERY_DRAFT_KEY, JSON.stringify({
      name: cleanText(nameField.value, 120),
      address: cleanText(addressField.value, 240),
      region: regionField.value,
      regionLabel: DELIVERY_REGION_LABELS[regionField.value] || '',
      phone: cleanText(phoneField.value, 20)
    }));
  } catch {
    // A sessão indisponível não impede o preenchimento desta etapa.
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function saveOrder(event) {
  event.preventDefault();
  clearError();

  const name = cleanText(nameField.value, 120);
  const address = cleanText(addressField.value, 240);
  const region = regionField.value;
  const phone = cleanText(phoneField.value, 20);
  const phoneDigits = phone.replace(/\D/g, '');

  if (name.length < 2) {
    showError('Informe seu nome completo para continuar.');
    nameField.focus();
    return;
  }

  if (address.length < 5) {
    showError('Informe um endereço completo para continuar.');
    addressField.focus();
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(DELIVERY_FEES, region)) {
    showError('Selecione o bairro ou a cidade de entrega.');
    regionField.focus();
    return;
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    showError('Informe um telefone válido com DDD.');
    phoneField.focus();
    return;
  }
  const subtotal = getSubtotal();
  const deliveryFee = DELIVERY_FEES[region];
  const safeItems = cart.map(item => ({
    name: item.name,
    details: item.details,
    qty: item.qty,
    price: item.price
  }));
  const paymentOrder = {
    name,
    phone: phoneDigits,
    address,
    region,
    regionLabel: DELIVERY_REGION_LABELS[region],
    payment: 'pix',
    paymentLabel: 'Pix',
    items: safeItems,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };

  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safeItems));
    sessionStorage.setItem(DELIVERY_DRAFT_KEY, JSON.stringify({
      name,
      address,
      region,
      regionLabel: DELIVERY_REGION_LABELS[region],
      phone: phoneDigits
    }));
    sessionStorage.setItem(PAYMENT_ORDER_KEY, JSON.stringify(paymentOrder));
  } catch {
    showError('Não foi possível salvar os dados neste navegador. Tente novamente.');
    return;
  }

  window.location.href = 'pagamento.html';
}

if (!cart.length) {
  deliveryContent.hidden = true;
  missingState.hidden = false;
} else {
  restoreDraft();
  renderOrder();
  renderFee();
  renderUpsell();
  nameField.addEventListener('input', persistDraft);
  addressField.addEventListener('input', persistDraft);
  phoneField.addEventListener('input', persistDraft);
  regionField.addEventListener('change', () => {
    clearError();
    persistDraft();
    renderFee();
  });
  upsellButtons.forEach(button => {
    button.addEventListener('click', () => addUpsell(button));
  });
  form.addEventListener('submit', saveOrder);
}
