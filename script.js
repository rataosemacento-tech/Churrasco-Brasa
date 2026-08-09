/* ============================================
   CHURRASCO & BRASA — JAVASCRIPT
   ============================================ */

// ---- ATRIBUIÇÃO DE CAMPANHAS ----
// Captura os parâmetros no primeiro acesso e os mantém até o checkout.
const attributionStorageKey = 'churrasco-brasa-attribution';
const attributionUrlKeys = Object.freeze([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'ttclid', 'gclid'
]);

function captureAttribution() {
  try {
    const current = JSON.parse(localStorage.getItem(attributionStorageKey) || '{}');
    const params = new URLSearchParams(window.location.search);
    attributionUrlKeys.forEach((key) => {
      const value = params.get(key);
      if (value) current[key] = value.slice(0, 200);
    });
    localStorage.setItem(attributionStorageKey, JSON.stringify(current));
  } catch {
    // O checkout continua funcionando mesmo se o armazenamento estiver bloqueado.
  }
}

captureAttribution();

// ---- NAVBAR SCROLL ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Active nav link
  const sections = ['inicio','cardapio','sobre','como-funciona','depoimentos'];
  const scrollPos = window.scrollY + 120;
  sections.forEach(id => {
    const el = document.getElementById(id);
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (!el || !link) return;
    if (scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
});

// ---- HAMBURGER MENU ----
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// ---- MENU CATEGORY TABS ----
const menuCategoryTabs = document.querySelectorAll('.menu-category-tab');
const filterTabs = document.querySelectorAll('.filter-tab');
const filterTabsContainer = document.getElementById('filter-tabs');
const menuFilterLabel = document.getElementById('menu-filter-label');
const menuCards = document.querySelectorAll('.menu-card');
const meatCategories = new Set(['bovinos', 'suinos', 'frango', 'combos', 'acompanhamentos']);

function updateMenuCards(matchesCard) {
  menuCards.forEach(card => {
    if (matchesCard(card)) {
      card.classList.remove('hidden');
      card.style.animation = 'fadeIn 0.4s ease';
    } else {
      card.classList.add('hidden');
    }
  });
}

function setActiveMeatFilter(filter) {
  filterTabs.forEach(tab => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });

  updateMenuCards(card => filter === 'todos'
    ? meatCategories.has(card.dataset.category)
    : card.dataset.category === filter
  );
}

function setMenuCategory(category) {
  menuCategoryTabs.forEach(tab => {
    const isActive = tab.dataset.menuCategory === category;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  const isMeatCategory = category === 'carnes';
  if (filterTabsContainer) filterTabsContainer.hidden = !isMeatCategory;
  if (menuFilterLabel) menuFilterLabel.hidden = !isMeatCategory;

  if (isMeatCategory) {
    setActiveMeatFilter('todos');
  } else {
    updateMenuCards(card => card.dataset.category === category);
  }
}

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveMeatFilter(tab.dataset.filter));
});
menuCategoryTabs.forEach(tab => {
  tab.addEventListener('click', () => setMenuCategory(tab.dataset.menuCategory));
});

setMenuCategory('carnes');

// ---- CART STATE ----
let cart = [];
const cartStorageKey = 'churrasco-brasa-cart-draft';
const paymentOrderStorageKey = 'churrascoPaymentOrder';
const deliveryDraftStorageKey = 'churrascoDeliveryDraft';
const deliveryFees = Object.freeze({
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
const deliveryRegionLabels = Object.freeze({
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
const productPrices = Object.freeze({
  'Picanha na Brasa': 39.90,
  'Costela Bovina Assada': 43.90,
  'Costela Suína BBQ': 39.90,
  'Frango na Brasa': 26.90,
  'Combo Família': 115.90,
  'Combo Churrasqueiro': 142.90,
  'Combo Iscas da Brasa': 41.90,
  'Vinagrete da Brasa': 9.90,
  'Coca-Cola Lata': 6.50,
  'Coca-Cola 600ml': 8.50,
  'Budweiser 330ml': 4.60,
  'Pack Budweiser 12x350ml': 38.90,
  'Coca-Cola Lata Zero Açúcar': 7.50,
  'Sprite Lata': 5.50,
  'Fanta Uva Lata': 6.00,
  'Fanta Laranja Lata': 6.00,
  'Guaraná Antarctica Lata': 6.00,
  'Suco de Laranja Prats': 7.90,
  'Fanta Uva 600ml': 7.50,
  'Fanta Laranja 600ml': 7.50,
  'Guaraná Antarctica 600ml': 7.50,
  'Sprite 1L': 10.90,
  'Guaraná Antarctica 1L': 11.90,
  'Coca-Cola Garrafa': 8.50,
  'Coca-Cola 2L': 14.80,
  'Guaraná Antarctica 2L': 13.50,
  'Kuat 2L': 11.90,
  'Tubaína Original 2L': 11.90,
  'Coca-Cola Zero Açúcar 2L': 13.50,
  'Sprite 2L': 13.50,
  'Fanta Uva 2L': 13.50,
  'Fanta Laranja 2L': 13.50,
  'Coca-Cola 2L Extra da Oferta': 6.50,
  'Água com Gás': 4.90,
  'Água sem Gás': 4.90,
  'Pudim Cremoso': 12.90,
  'Pudim Cremoso - Oferta 2 unidades': 20.90,
  'Brownie da Brasa': 14.90,
  'Brownie da Brasa - Oferta 2 unidades': 24.90,
  'Combo Coca-Cola 2L + Brownie Bites': 21.90,
  'Kit Brasa Completo': 88.90
});
const productDisplayNames = Object.freeze({
  'Coca-Cola Garrafa': 'Coca-Cola 600ml'
});

function getProductDisplayName(name) {
  return productDisplayNames[name] || name;
}

const deliveryRegion = document.getElementById('delivery-region');
const deliveryAddress = document.getElementById('delivery-address');
const deliveryFeeCallout = document.getElementById('delivery-fee-callout');
const deliverySummaryText = document.getElementById('delivery-summary-text');
const checkoutBackdrop = document.getElementById('checkout-backdrop');
const checkoutClose = document.getElementById('checkout-close');
const checkoutItems = document.getElementById('checkout-items');
const checkoutRegionLabel = document.getElementById('checkout-region-label');
const checkoutSubtotal = document.getElementById('checkout-subtotal');
const checkoutDelivery = document.getElementById('checkout-delivery');
const checkoutTotal = document.getElementById('checkout-total');
const checkoutName = document.getElementById('checkout-name');
const checkoutPhone = document.getElementById('checkout-phone');
const checkoutAddress = document.getElementById('checkout-address');
const checkoutPayment = document.getElementById('checkout-payment');
const checkoutForm = document.getElementById('checkout-form');
const cartItemsContainer = document.getElementById('cart-items');
let checkoutLastFocusedElement = null;

function formatBRL(value) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
  return `R$ ${safeValue.toFixed(2).replace('.', ',')}`;
}

function cleanUserText(value, maxLength = 240) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHTML(value) {
  const element = document.createElement('span');
  element.textContent = String(value ?? '');
  return element.innerHTML;
}

function normalizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  const normalized = [];
  items.slice(0, 50).forEach(item => {
    const safeName = cleanUserText(item?.name, 120);
    if (!Object.prototype.hasOwnProperty.call(productPrices, safeName)) return;
    const quantity = Math.max(1, Math.min(99, Math.trunc(Number(item?.qty) || 0)));
    if (!quantity) return;
    normalized.push({
      name: safeName,
      price: productPrices[safeName],
      qty: quantity,
      details: cleanUserText(item?.details, 400)
    });
  });
  return normalized;
}

function persistCartDraft() {
  try {
    sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
  } catch {
    // Some privacy modes block sessionStorage; the in-memory cart still works.
  }
}

function restoreCartDraft() {
  try {
    const storedCart = sessionStorage.getItem(cartStorageKey);
    if (storedCart) cart = normalizeCartItems(JSON.parse(storedCart));
  } catch {
    cart = [];
  }
}

function isValidDeliveryRegion(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(deliveryFees, value);
}

let deliveryDraft = null;

function restoreDeliveryDraft() {
  try {
    const rawDraft = sessionStorage.getItem(deliveryDraftStorageKey) || sessionStorage.getItem('churrascoPaymentOrder');
    if (!rawDraft) return;
    const draft = JSON.parse(rawDraft);
    if (!draft || typeof draft !== 'object' || !isValidDeliveryRegion(draft.region)) return;
    deliveryDraft = {
      region: draft.region,
      regionLabel: cleanUserText(draft.regionLabel || deliveryRegionLabels[draft.region], 60),
      address: cleanUserText(draft.address, 240),
      phone: cleanUserText(draft.phone, 20)
    };
  } catch {
    deliveryDraft = null;
  }
}

function getSelectedDeliveryRegion() {
  return deliveryRegion?.value || deliveryDraft?.region || '';
}

function getDeliveryFee() {
  const region = getSelectedDeliveryRegion();
  return isValidDeliveryRegion(region) ? deliveryFees[region] : 0;
}

function restoreCheckoutDraft() {
  try {
    const rawDraft = sessionStorage.getItem('churrascoPaymentOrder');
    if (!rawDraft) return;
    const draft = JSON.parse(rawDraft);
    if (!draft || typeof draft !== 'object') return;
    if (deliveryRegion && isValidDeliveryRegion(draft.region)) deliveryRegion.value = draft.region;
    if (deliveryAddress) deliveryAddress.value = cleanUserText(draft.address, 240);
    if (checkoutName) checkoutName.value = cleanUserText(draft.name, 80);
    if (checkoutPhone) checkoutPhone.value = cleanUserText(draft.phone, 20);
    if (checkoutPayment && ['pix', 'cash'].includes(draft.payment)) checkoutPayment.value = draft.payment;
  } catch {
    // An invalid draft is ignored; the customer can fill the checkout again.
  }
}

restoreCartDraft();
restoreDeliveryDraft();
restoreCheckoutDraft();

function addToCart(name, price, details = '', quantity = 1) {
  const safeName = cleanUserText(name, 120);
  const numericPrice = Number(price);
  const hasCatalogPrice = Object.prototype.hasOwnProperty.call(productPrices, safeName);
  const safePrice = hasCatalogPrice ? productPrices[safeName] : Math.round(numericPrice * 100) / 100;
  const safeDetails = cleanUserText(details, 400);
  const safeQuantity = Math.min(99, Math.max(1, Math.floor(Number(quantity) || 1)));

  if (!safeName || !hasCatalogPrice || !Number.isFinite(numericPrice) || !Number.isFinite(safePrice) || safePrice < 0 || safePrice > 10000) {
    showToast('Não foi possível adicionar este item.');
    return false;
  }

  const existing = cart.find(i => i.name === safeName);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + safeQuantity);
    if (safeDetails) existing.details = safeDetails;
  } else {
    if (cart.length >= 50) {
      showToast('A sacola atingiu o limite de itens.');
      return false;
    }
    cart.push({ name: safeName, price: safePrice, qty: safeQuantity, details: safeDetails });
  }
  persistCartDraft();
  updateCartUI();
  showToast(`${safeQuantity > 1 ? `${safeQuantity}x ` : ''}${safeName} adicionado à sacola!`);
  document.getElementById('cart-widget')?.style.setProperty('display', 'block');
  return true;
}

document.querySelectorAll('.btn-add[data-cart-name], .cart-upsell-button[data-cart-name]').forEach(button => {
  button.addEventListener('click', () => {
    addToCart(button.dataset.cartName, button.dataset.cartPrice, button.dataset.cartDetails || '');
  });
});

const offerCountdownElement = document.getElementById('hero-offer-countdown');
const offerTimerElement = document.getElementById('hero-offer-timer');
const heroOfferButton = document.getElementById('btn-hero-offer');
const heroOfferCokeButton = document.getElementById('btn-hero-offer-coke-extra');
const heroOrderButton = document.getElementById('btn-peca-online');
const offerCountdownDuration = (2 * 60 * 60) + (35 * 60) + 47;
const offerCountdownStorageKey = 'churrasco-brasa-offer-deadline';
let offerDeadline = Date.now() + (offerCountdownDuration * 1000);

try {
  const storedDeadline = Number(window.sessionStorage.getItem(offerCountdownStorageKey));
  if (Number.isFinite(storedDeadline) && storedDeadline > Date.now()) {
    offerDeadline = storedDeadline;
  } else {
    window.sessionStorage.setItem(offerCountdownStorageKey, String(offerDeadline));
  }
} catch (error) {
  // Some privacy modes block sessionStorage; the in-memory countdown still works.
}

let offerCountdownInterval = null;

function getOfferSecondsRemaining() {
  return Math.max(0, Math.ceil((offerDeadline - Date.now()) / 1000));
}

function twoDigits(value) {
  return `0${value}`.slice(-2);
}

function setOfferExpired() {
  if (offerTimerElement) {
    offerTimerElement.classList.add('is-expired');
    const label = offerTimerElement.querySelector('.hero-offer-timer-label');
    if (label) label.textContent = 'Prazo da oferta encerrado';
  }
  if (offerCountdownElement) {
    offerCountdownElement.textContent = '00:00:00';
    offerCountdownElement.setAttribute('aria-label', 'Tempo da oferta encerrado');
  }
  if (heroOfferButton) {
    heroOfferButton.disabled = true;
    heroOfferButton.textContent = 'Oferta encerrada';
  }
  if (heroOfferCokeButton) {
    heroOfferCokeButton.disabled = true;
    heroOfferCokeButton.classList.remove('is-added');
    heroOfferCokeButton.textContent = 'Oferta encerrada';
  }
  if (heroOrderButton) {
    heroOrderButton.classList.add('is-disabled');
    heroOrderButton.setAttribute('aria-disabled', 'true');
    heroOrderButton.setAttribute('aria-label', 'Oferta encerrada');
  }
}

function updateOfferCountdown() {
  if (!offerCountdownElement) return;
  const remaining = getOfferSecondsRemaining();
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  offerCountdownElement.textContent = `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
  offerCountdownElement.setAttribute(
    'aria-label',
    `Tempo restante: ${hours} horas, ${minutes} minutos e ${seconds} segundos`
  );
  if (remaining === 0) {
    setOfferExpired();
    if (offerCountdownInterval) window.clearInterval(offerCountdownInterval);
  }
}

if (offerCountdownElement) {
  updateOfferCountdown();
  offerCountdownInterval = window.setInterval(updateOfferCountdown, 1000);
}

function addOfferToCart() {
  if (getOfferSecondsRemaining() <= 0) {
    setOfferExpired();
    showToast('O prazo desta oferta terminou.');
    return;
  }
  const details = 'Costela bovina 680g · Picanha na brasa 730g · Costela suína + BBQ · Frango na brasa inteiro · 1x maionese caseira 290g ou queijo coalho de 180g (brinde) · Coca-Cola 2L inclusa · Coca-Cola 2L extra por R$ 6,50 na oferta';
  addToCart('Kit Brasa Completo', 88.90, details);
}

const offerExtraProductName = 'Coca-Cola 2L Extra da Oferta';

function updateOfferExtraButton() {
  if (!heroOfferCokeButton) return;
  const offerAdded = cart.some(item => item.name === 'Kit Brasa Completo');
  const extraAdded = cart.some(item => item.name === offerExtraProductName);
  const offerExpired = getOfferSecondsRemaining() <= 0;

  heroOfferCokeButton.disabled = offerExpired || !offerAdded || extraAdded;
  heroOfferCokeButton.classList.toggle('is-added', extraAdded);
  heroOfferCokeButton.textContent = offerExpired
    ? 'Oferta encerrada'
    : extraAdded
      ? 'Coca-Cola extra adicionada'
      : offerAdded
        ? 'Adicionar extra por R$ 6,50'
        : 'Adicione a oferta primeiro';
}

function addOfferCokeExtra() {
  if (getOfferSecondsRemaining() <= 0) {
    setOfferExpired();
    showToast('O prazo desta oferta terminou.');
    return;
  }
  if (!cart.some(item => item.name === 'Kit Brasa Completo')) {
    showToast('Adicione primeiro o Kit Brasa Completo.');
    return;
  }
  addToCart(offerExtraProductName, 6.50, 'Coca-Cola 2L extra com preço promocional da oferta');
}

heroOfferButton?.addEventListener('click', addOfferToCart);
heroOfferCokeButton?.addEventListener('click', addOfferCokeExtra);
heroOrderButton?.addEventListener('click', (event) => {
  event.preventDefault();
  if (getOfferSecondsRemaining() <= 0) {
    setOfferExpired();
    showToast('O prazo desta oferta terminou.');
    return;
  }
  addOfferToCart();
  toggleCart();
});

function updateCartUI() {
  const count  = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = getDeliveryFee();
  const grandTotal = subtotal + deliveryFee;
  const selectedRegion = getSelectedDeliveryRegion();
  const hasDeliveryRegion = isValidDeliveryRegion(selectedRegion);
  const regionName = hasDeliveryRegion ? deliveryRegionLabels[selectedRegion] : '';
  const hasDeliveryDetails = Boolean(
    hasDeliveryRegion && deliveryDraft?.address && deliveryDraft?.phone
  );

  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-widget').style.display = cart.length ? 'block' : 'none';
  chatFloat?.classList.toggle('chat-float-cart-offset', Boolean(cart.length));
  document.getElementById('cart-total-mini').textContent = !cart.length ? formatBRL(0) : (hasDeliveryRegion ? formatBRL(grandTotal) : 'Selecione o bairro ou cidade');
  document.getElementById('cart-total-val').textContent = formatBRL(subtotal);
  document.getElementById('delivery-fee-val').textContent = hasDeliveryRegion ? formatBRL(deliveryFee) : 'Selecione';
  document.getElementById('delivery-fee-label').textContent = regionName ? `Taxa (${regionName}):` : 'Taxa de entrega:';
  document.getElementById('cart-grand-total').textContent = hasDeliveryRegion ? formatBRL(grandTotal) : 'Selecione o bairro ou cidade';
  if (deliverySummaryText) {
    deliverySummaryText.textContent = hasDeliveryDetails
      ? `${regionName} · taxa ${formatBRL(deliveryFee)}. Dados de entrega preenchidos.`
      : 'Informe endereço, bairro ou cidade e telefone na próxima etapa.';
  }
  if (deliveryFeeCallout) {
    deliveryFeeCallout.textContent = hasDeliveryRegion
      ? `Taxa de entrega: ${formatBRL(deliveryFee)} · ${regionName}`
      : 'Selecione o bairro ou cidade para ver a taxa de entrega.';
    deliveryFeeCallout.classList.toggle('is-ready', hasDeliveryRegion);
  }
  const finalizeButton = document.getElementById('btn-finalizar');
  if (finalizeButton) {
    finalizeButton.classList.toggle('is-disabled', !cart.length);
    finalizeButton.setAttribute('aria-disabled', String(!cart.length));
  }
  updateOfferExtraButton();

  const itemsContainer = document.getElementById('cart-items');
  const empty = document.getElementById('cart-empty');
  const cartUpsell = document.getElementById('cart-upsell');
  const footer = document.getElementById('cart-footer');

  if (cartUpsell) {
    cartUpsell.hidden = cart.length === 0;
    cartUpsell.querySelectorAll('[data-cart-name]').forEach(button => {
      const item = cart.find(cartItem => cartItem.name === button.dataset.cartName);
      const quantity = item ? Math.max(0, Math.min(99, Number(item.qty) || 0)) : 0;
      button.textContent = quantity ? `Adicionar mais (${quantity})` : 'Adicionar';
      button.classList.toggle('is-added', quantity > 0);
    });
  }

  if (cart.length === 0) {
    itemsContainer.querySelectorAll('.cart-item-row').forEach(row => row.remove());
    if (empty) {
      empty.style.display = 'block';
      if (empty.parentElement !== itemsContainer) itemsContainer.appendChild(empty);
    }
    footer.style.display = 'none';
    return;
  }

  if (empty) empty.style.display = 'none';
  footer.style.display = 'flex';

  itemsContainer.querySelectorAll('.cart-item-row').forEach(row => row.remove());
  cart.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.id = `cart-item-${idx}`;
    const safeItemName = escapeHTML(getProductDisplayName(item.name));
    const safeItemDetails = item.details
      ? `<small class="cart-item-details">${escapeHTML(item.details)}</small>`
      : '';
    const safeQuantity = escapeHTML(Math.max(1, Math.min(99, Math.trunc(Number(item.qty) || 1))));
    const safeItemPrice = escapeHTML(formatBRL(Number(item.price) * Number(item.qty)));
    row.innerHTML = `
      <div class="cart-item-name">
        <span>${safeItemName}</span>
        ${safeItemDetails}
      </div>
      <div class="cart-item-qty">
        <button type="button" class="qty-btn" data-cart-action="decrease" data-cart-index="${idx}" id="qty-minus-${idx}" aria-label="Diminuir quantidade de ${safeItemName}">−</button>
        <span id="qty-val-${idx}" aria-live="polite">${safeQuantity}</span>
        <button type="button" class="qty-btn" data-cart-action="increase" data-cart-index="${idx}" id="qty-plus-${idx}" aria-label="Aumentar quantidade de ${safeItemName}">+</button>
      </div>
      <div class="cart-item-price">${safeItemPrice}</div>
      <button type="button" class="trash-btn" data-cart-action="remove" data-cart-index="${idx}" aria-label="Remover ${safeItemName} da sacola" title="Remover item">
        <span class="trash-icon" aria-hidden="true"></span>
      </button>
    `;
    itemsContainer.appendChild(row);
  });
}

function invalidatePendingPaymentOrder() {
  try {
    const rawOrder = sessionStorage.getItem(paymentOrderStorageKey);
    if (!rawOrder) return;
    const savedOrder = JSON.parse(rawOrder);
    if (!savedOrder?.paymentConfirmed) sessionStorage.removeItem(paymentOrderStorageKey);
  } catch {
    sessionStorage.removeItem(paymentOrderStorageKey);
  }
}

function changeQty(idx, delta) {
  if (!Number.isInteger(idx) || !cart[idx] || !Number.isFinite(delta)) return;
  const currentQty = Math.max(1, Math.min(99, Math.trunc(Number(cart[idx].qty) || 1)));
  const step = Math.trunc(delta);
  const nextQty = Math.max(1, Math.min(99, currentQty + step));
  if (nextQty === currentQty) return;
  cart[idx].qty = nextQty;
  invalidatePendingPaymentOrder();
  persistCartDraft();
  updateCartUI();
}

function removeFromCart(idx) {
  const index = Number(idx);
  if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
  const item = cart[index];
  if (!item) return;
  cart.splice(index, 1);
  invalidatePendingPaymentOrder();
  persistCartDraft();
  updateCartUI();
  showToast(`${getProductDisplayName(item.name)} removido da sacola.`);
}

function performCartAction(target) {
  if (!target || !cartItemsContainer.contains(target)) return;

  const index = Number.parseInt(target.dataset.cartIndex, 10);
  if (!Number.isInteger(index)) return;

  switch (target.dataset.cartAction) {
    case 'remove':
      removeFromCart(index);
      break;
    case 'decrease':
      changeQty(index, -1);
      break;
    case 'increase':
      changeQty(index, 1);
      break;
    default:
      break;
  }
}

function handleCartAction(event) {
  const target = event.target && typeof event.target.closest === 'function'
    ? event.target.closest('[data-cart-action]')
    : null;
  if (!target || !cartItemsContainer.contains(target)) return;
  event.preventDefault();
  performCartAction(target);
}

cartItemsContainer?.addEventListener('click', handleCartAction);

function toggleCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer || !overlay) return;
  const isOpen = drawer.classList.toggle('open');
  overlay.classList.toggle('open');
  chatFloat?.classList.toggle('chat-float-cart-open', isOpen);
  chatFloat?.setAttribute('aria-hidden', String(isOpen));
}

function updateCheckoutSummary() {
  if (!checkoutItems) return;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = getDeliveryFee();
  const selectedRegion = getSelectedDeliveryRegion();
  const regionName = isValidDeliveryRegion(selectedRegion)
    ? deliveryRegionLabels[selectedRegion]
    : 'Cascavel';

  checkoutRegionLabel.textContent = cleanUserText(regionName, 40);
  checkoutItems.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <div class="checkout-item-copy">
        <span>${escapeHTML(item.qty)}x ${escapeHTML(getProductDisplayName(item.name))}</span>
        ${item.details ? `<small>${escapeHTML(item.details)}</small>` : ''}
      </div>
      <strong>${escapeHTML(formatBRL(item.price * item.qty))}</strong>
    </div>
  `).join('');
  checkoutSubtotal.textContent = formatBRL(subtotal);
  checkoutDelivery.textContent = formatBRL(deliveryFee);
  checkoutTotal.textContent = formatBRL(subtotal + deliveryFee);
}

function openCheckout() {
  if (!cart.length) return;
  const region = getSelectedDeliveryRegion();
  if (!isValidDeliveryRegion(region)) {
    showToast('Escolha o bairro ou cidade de entrega para continuar.');
    deliveryRegion?.focus();
    return;
  }
  if (!checkoutBackdrop) return;

  checkoutLastFocusedElement = document.activeElement;
  if (checkoutAddress) checkoutAddress.value = deliveryDraft?.address || deliveryAddress?.value.trim() || '';
  updateCheckoutSummary();
  checkoutBackdrop.hidden = false;
  checkoutBackdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('checkout-open');
  window.requestAnimationFrame(() => checkoutBackdrop.classList.add('open'));
  checkoutName?.focus({ preventScroll: true });
}

function closeCheckout() {
  if (!checkoutBackdrop || checkoutBackdrop.hidden) return;
  checkoutBackdrop.classList.remove('open');
  checkoutBackdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('checkout-open');
  window.setTimeout(() => {
    if (!checkoutBackdrop.classList.contains('open')) checkoutBackdrop.hidden = true;
  }, 260);
  checkoutLastFocusedElement?.focus?.({ preventScroll: true });
}

checkoutClose?.addEventListener('click', closeCheckout);
checkoutBackdrop?.addEventListener('click', (event) => {
  if (event.target === checkoutBackdrop) closeCheckout();
});

document.getElementById('cart-btn')?.addEventListener('click', toggleCart);
document.getElementById('cart-overlay')?.addEventListener('click', toggleCart);
document.getElementById('cart-close')?.addEventListener('click', toggleCart);
document.getElementById('btn-finalizar')?.addEventListener('click', (event) => {
  if (cart.length) return;
  event.preventDefault();
  showToast('Adicione um item à sacola para continuar.');
});

function finalizarPedido(event) {
  event?.preventDefault();
  if (cart.length === 0) return;

  const region = getSelectedDeliveryRegion();
  if (!isValidDeliveryRegion(region)) {
    showToast('Escolha o bairro ou cidade de entrega para continuar.');
    deliveryRegion?.focus();
    return;
  }

  const name = cleanUserText(checkoutName?.value, 80);
  const phone = cleanUserText(checkoutPhone?.value, 20);
  const phoneDigits = phone.replace(/\D/g, '');
  const address = cleanUserText(checkoutAddress?.value || deliveryDraft?.address || deliveryAddress?.value, 240);
  const payment = checkoutPayment?.value;

  if (name.length < 2) {
    showToast('Informe seu nome para continuar.');
    checkoutName?.focus();
    return;
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    showToast('Informe um telefone válido.');
    checkoutPhone?.focus();
    return;
  }
  if (address.length < 5) {
    showToast('Informe o endereço de entrega para continuar.');
    checkoutAddress?.focus();
    return;
  }
  if (!['pix', 'cash'].includes(payment)) {
    showToast('Escolha a forma de pagamento.');
    checkoutPayment?.focus();
    return;
  }

  const paymentOption = checkoutPayment?.options?.[checkoutPayment.selectedIndex];
  const paymentLabel = cleanUserText(paymentOption?.textContent, 80);
  if (deliveryAddress) deliveryAddress.value = address;
  deliveryDraft = {
    region,
    regionLabel: cleanUserText(deliveryRegionLabels[region], 60),
    address,
    phone: phoneDigits
  };
  updateCartUI();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = deliveryFees[region];
  const paymentOrder = {
    name,
    phone: phoneDigits,
    address,
    region,
    regionLabel: cleanUserText(deliveryRegionLabels[region], 60),
    payment,
    paymentLabel,
    items: cart.map(item => ({
      name: cleanUserText(item.name, 120),
      details: item.details ? cleanUserText(item.details, 400) : '',
      qty: Math.trunc(item.qty),
      price: Number(item.price)
    })),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };

  try {
    sessionStorage.setItem('churrascoPaymentOrder', JSON.stringify(paymentOrder));
  } catch {
    showToast('Não foi possível abrir a página de pagamento. Tente novamente.');
    return;
  }

  if (checkoutName) checkoutName.value = '';
  if (checkoutPhone) checkoutPhone.value = '';
  if (checkoutAddress) checkoutAddress.value = '';
  if (checkoutPayment) checkoutPayment.value = '';
  if (deliveryAddress) deliveryAddress.value = '';
  closeCheckout();
  window.location.href = 'pagamento.html';
}

if (deliveryRegion) deliveryRegion.addEventListener('change', updateCartUI);
if (deliveryAddress) deliveryAddress.addEventListener('input', updateCartUI);
checkoutForm?.addEventListener('submit', finalizarPedido);

// ---- SODA OPTIONS MODAL ----
const sodaModalBackdrop = document.getElementById('soda-options-modal');
const sodaModalClose = document.getElementById('soda-modal-close');
const sodaOptionButtons = document.querySelectorAll('.soda-option');
let sodaModalLastFocusedElement = null;

function openSodaOptions(group = 'latas') {
  if (!sodaModalBackdrop) return;
  sodaModalLastFocusedElement = document.activeElement;
  sodaModalBackdrop.hidden = false;
  sodaModalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('soda-modal-open');
  window.requestAnimationFrame(() => {
    sodaModalBackdrop.classList.add('open');
    const targetId = group === '2l' ? 'soda-group-2l' : 'soda-group-latas';
    document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  sodaModalClose?.focus();
}

function closeSodaOptions() {
  if (!sodaModalBackdrop || sodaModalBackdrop.hidden) return;
  sodaModalBackdrop.classList.remove('open');
  sodaModalBackdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('soda-modal-open');
  window.setTimeout(() => {
    if (!sodaModalBackdrop.classList.contains('open')) sodaModalBackdrop.hidden = true;
  }, 260);
  sodaModalLastFocusedElement?.focus?.();
}

sodaModalClose?.addEventListener('click', closeSodaOptions);
sodaModalBackdrop?.addEventListener('click', (event) => {
  if (event.target === sodaModalBackdrop) closeSodaOptions();
});
sodaOptionButtons.forEach(option => {
  option.addEventListener('click', () => {
    const name = option.dataset.sodaName;
    const price = Number(option.dataset.sodaPrice);
    if (!name || !Number.isFinite(price)) return;
    addToCart(name, price);
    closeSodaOptions();
  });
});

// ---- WATER OPTIONS MODAL ----
const waterModalBackdrop = document.getElementById('water-options-modal');
const waterModalClose = document.getElementById('water-modal-close');
const waterOptionButtons = document.querySelectorAll('.water-option');
let waterModalLastFocusedElement = null;

function openWaterOptions() {
  if (!waterModalBackdrop) return;
  waterModalLastFocusedElement = document.activeElement;
  waterModalBackdrop.hidden = false;
  waterModalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('water-modal-open');
  window.requestAnimationFrame(() => waterModalBackdrop.classList.add('open'));
  waterModalClose?.focus();
}

function closeWaterOptions() {
  if (!waterModalBackdrop || waterModalBackdrop.hidden) return;
  waterModalBackdrop.classList.remove('open');
  waterModalBackdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('water-modal-open');
  window.setTimeout(() => {
    if (!waterModalBackdrop.classList.contains('open')) waterModalBackdrop.hidden = true;
  }, 260);
  waterModalLastFocusedElement?.focus?.();
}

waterModalClose?.addEventListener('click', closeWaterOptions);
waterModalBackdrop?.addEventListener('click', (event) => {
  if (event.target === waterModalBackdrop) closeWaterOptions();
});
waterOptionButtons.forEach(option => {
  option.addEventListener('click', () => {
    const name = option.dataset.waterName;
    const price = Number(option.dataset.waterPrice);
    if (!name || !Number.isFinite(price)) return;
    addToCart(name, price);
    closeWaterOptions();
  });
});

document.getElementById('add-refrigerante')?.addEventListener('click', () => openSodaOptions('latas'));
document.getElementById('add-refrigerante-2l')?.addEventListener('click', () => openSodaOptions('2l'));
document.getElementById('add-agua')?.addEventListener('click', openWaterOptions);
document.getElementById('add-agua-imagem')?.addEventListener('click', openWaterOptions);

// ---- TOAST ----
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- AI ORDER CHAT ----
const aiChat = document.getElementById('ai-chat');
const chatBackdrop = document.getElementById('chat-backdrop');
const chatTrigger = document.getElementById('btn-open-chat');
const chatFloat = document.getElementById('chat-float');
const chatClose = document.getElementById('chat-close');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('ai-chat-messages');
const chatQuickReplies = document.getElementById('chat-quick-replies');
let chatLastFocusedElement = null;
let chatReplyTimer = null;

function normalizeChatText(value) {
  return String(value)
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function chatTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function scrollChatToBottom() {
  if (!chatMessages) return;
  window.requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function appendChatMessage(text, type = 'incoming', recommendations = []) {
  if (!chatMessages) return;

  const message = document.createElement('div');
  message.className = 'chat-message ' + type;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const copy = document.createElement('span');
  copy.className = 'chat-bubble-copy';
  copy.textContent = text;

  const meta = document.createElement('span');
  meta.className = 'chat-bubble-meta';
  meta.textContent = chatTime();

  if (type === 'outgoing') {
    const ticks = document.createElement('span');
    ticks.className = 'chat-ticks';
    ticks.setAttribute('aria-label', 'Entregue e lida');
    ticks.textContent = '✓✓';
    meta.append(' ', ticks);
  }

  bubble.appendChild(copy);

  if (Array.isArray(recommendations) && recommendations.length) {
    const recommendationList = document.createElement('div');
    recommendationList.className = 'chat-recommendations';
    recommendationList.setAttribute('aria-label', 'Ofertas recomendadas');

    const recommendationLabel = document.createElement('span');
    recommendationLabel.className = 'chat-recommendations-label';
    recommendationLabel.textContent = recommendations.length === 1
      ? 'Oferta recomendada'
      : 'Opcoes recomendadas';
    recommendationList.appendChild(recommendationLabel);

    recommendations.slice(0, 3).forEach((product) => {
      const card = document.createElement('article');
      card.className = 'chat-recommendation';

      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.name;
      image.loading = 'lazy';
      image.decoding = 'async';

      const body = document.createElement('div');
      body.className = 'chat-recommendation-body';

      const name = document.createElement('strong');
      name.className = 'chat-recommendation-name';
      name.textContent = product.name;

      const details = document.createElement('span');
      details.className = 'chat-recommendation-details';
      details.textContent = product.details || '';

      const price = document.createElement('span');
      price.className = 'chat-recommendation-price';
      price.textContent = formatBRL(product.price);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'chat-recommendation-add';
      addButton.textContent = 'Adicionar';
      addButton.addEventListener('click', () => {
        if (!addToCart(product.name, product.price, product.details || '')) return;
        addButton.disabled = true;
        addButton.classList.add('is-added');
        addButton.textContent = 'Adicionado';
      });

      body.append(name, details, price, addButton);
      card.append(image, body);
      recommendationList.appendChild(card);
    });

    bubble.appendChild(recommendationList);
  }

  bubble.appendChild(meta);
  message.appendChild(bubble);
  chatMessages.appendChild(message);
  scrollChatToBottom();
}

function setChatTyping(isTyping) {
  if (!chatMessages) return;

  const currentTyping = document.getElementById('chat-typing');
  if (!isTyping) {
    currentTyping?.remove();
    return;
  }
  if (currentTyping) return;

  const message = document.createElement('div');
  message.className = 'chat-message incoming';
  message.id = 'chat-typing';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-typing';
  const dots = document.createElement('span');
  dots.className = 'chat-typing-dots';
  for (let index = 0; index < 3; index++) dots.appendChild(document.createElement('i'));
  bubble.appendChild(dots);
  message.appendChild(bubble);
  chatMessages.appendChild(message);
  scrollChatToBottom();
}

function setChatBusy(isBusy) {
  if (chatInput) chatInput.disabled = isBusy;
  if (chatSend) chatSend.disabled = isBusy;
  chatQuickReplies?.querySelectorAll('button').forEach(button => {
    button.disabled = isBusy;
  });
}

function getBaseChatResponse(message) {
  const text = normalizeChatText(message);

  if (/picanha/.test(text)) {
    return 'A Picanha na Brasa custa R$ 39,90 e vem com 700g. Para pedir, toque em + Adicionar no cardápio e depois revise sua sacola.';
  }
  if (/(costela bovina|costela.*bovina)/.test(text)) {
    return 'A Costela Bovina Assada custa R$ 43,90 e vem com 720g. Ela é assada lentamente, fica suculenta e pode ser adicionada pelo botão + Adicionar.';
  }
  if (/(costela|ribs)/.test(text)) {
    return 'A Costela Suína BBQ custa R$ 39,90 e vem com 800g. É uma ótima opção para compartilhar.';
  }
  if (/(frango|galeto)/.test(text)) {
    return 'O Frango na Brasa custa R$ 26,90 por unidade. Você pode adicionar quantas unidades quiser à sacola.';
  }
  if (/(vinagrete|acompanhamento)/.test(text)) {
    return 'O Vinagrete da Brasa custa R$ 9,90 e vem com 380g. É fresco, leve e combina muito bem com qualquer carne do cardápio.';
  }
  if (/(bebida|bebidas|refrigerante|agua)/.test(text)) {
    return 'Na aba Bebidas, os refrigerantes estão separados em Latas e 2L. A Coca-Cola 2L custa R$ 14,80. Também temos Budweiser 330ml por R$ 4,60, o Pack Budweiser com 12 latas por R$ 38,90 e Água com Gás e Água sem Gás por R$ 4,90 cada. Toque em + Adicionar na categoria desejada para escolher a opção e revisar a sacola.';
  }
  if (/(sobremesa|sobremesas|pudim|brownie)/.test(text)) {
    return 'Na aba Doces temos Pudim Cremoso por R$ 12,90 ou 2 por R$ 20,90, além do Brownie da Brasa: brownie bites com chocolate 55% por R$ 14,90 ou 2 por R$ 24,90. Escolha seu doce e toque em + Adicionar para colocar na sacola.';
  }
  if (/(oferta|promocao|promoção|kit.*brasa|88,90|88\.90)/.test(text)) {
    return 'A Oferta Principal de Carnes sai de R$ 168,60 por R$ 88,90, uma economia de R$ 79,70, e inclui costela bovina 680g, picanha na brasa 730g, costela suína + BBQ, frango na brasa inteiro, 1x maionese caseira 290g ou queijo coalho de 180g como brinde e Coca-Cola 2L. Se levar outra Coca-Cola 2L junto com a oferta, ela sai por R$ 6,50. Toque em Adicionar oferta à sacola no hero para pedir.';
  }
  if (/combo\s*familia|familia.*combo/.test(text)) {
    return 'O Combo Família custa R$ 115,90 e serve até 4 pessoas: 500g de picanha, 600g de costela, farofa, vinagrete e 4 pães de alho.';
  }
  if (/combo\s*churrasqueiro|churrasqueiro.*combo/.test(text)) {
    return 'O Combo Churrasqueiro custa R$ 142,90 e serve de 5 a 6 pessoas, com costela bovina de 860g, costela suína, frango e acompanhamentos.';
  }
  if (/combo\s*iscas|iscas.*brasa|mandioca/.test(text)) {
    return 'O Combo Iscas da Brasa custa R$ 41,90 e traz iscas de carne douradas na brasa com mandioca macia. É uma opção saborosa para uma refeição individual.';
  }
  if (/(combo|combos)/.test(text)) {
    return ['Temos três opções:', '• Combo Iscas da Brasa — R$ 41,90, carne com mandioca.', '• Combo Família — R$ 115,90, até 4 pessoas.', '• Combo Churrasqueiro — R$ 142,90, de 5 a 6 pessoas.', 'Quer que eu te ajude a escolher?'].join('\n');
  }
  if (/(melhor|escolh|decid|recomend|indica)/.test(text)) {
    return 'Claro! Vou considerar quantidade de pessoas, preferência e orçamento para indicar a melhor opção para o seu pedido.';
  }
  if (/(cardapio|menu|preco|valor|custa|quanto|carnes|opcoes|opcao)/.test(text) && !/(entrega|prazo|demora|motoboy|taxa|frete|tempo)/.test(text)) {
    return ['Nosso cardápio está assim:', '• Picanha — R$ 39,90 / 700g', '• Costela Bovina Assada — R$ 43,90 / 720g', '• Costela Suína — R$ 39,90 / 800g', '• Frango — R$ 26,90 / unidade', '• Bebidas — a partir de R$ 4,90', '• Doces — a partir de R$ 12,90', '• Combos — a partir de R$ 41,90'].join('\n');
  }
  if (/(pagamento|pix|cartao|credito|debito|dinheiro|antecip)/.test(text)) {
    return 'Aceitamos Pix ou dinheiro. No Pix, o pagamento é antecipado; em dinheiro, o pagamento acontece no momento da entrega. Não utilizamos máquina de cartão por tempo indeterminado.';
  }
  if (/(entrega|prazo|demora|motoboy|taxa|frete|tempo)/.test(text)) {
    if (/(taxa|frete|custo|valor)/.test(text)) return 'A taxa de entrega é R$ 12,00 para Cascavel e R$ 32,00 para Toledo-PR. O prazo informado é de até 45min.';
    return 'O prazo de entrega é de até 45min. Entregamos em Cascavel, com taxa de R$ 12,00, e em Toledo-PR, com taxa de R$ 32,00. Para concluir, informe seu endereço e escolha Pix ou dinheiro.';
  }
  if (/(horario|horas|aberto|funciona|sabado|domingo)/.test(text)) {
    return 'Atendemos aos sábados e domingos, das 10h às 23h.';
  }
  if (/(endereco|onde fica|localizacao|cascavel|rua)/.test(text)) {
    return 'Estamos na R. Tersilio Salgo, 575 — Santo Inácio, Cascavel/PR. Para pedir, use o cardápio do site e informe o endereço de entrega.';
  }
  if (/(status|rastrear|acompanhar|ja fiz|pedido confirmado)/.test(text)) {
    return 'Este chat orienta pedidos feitos pelo site, mas não mostra rastreamento em tempo real. Posso ajudar a revisar itens, pagamento e prazo de entrega.';
  }
  if (/(como.*(pedir|comprar)|fazer.*pedido|pedido|comprar|carrinho|sacola|adicionar|finalizar|checkout)/.test(text)) {
    return ['É simples:', '1. Escolha os itens no cardápio.', '2. Toque em + Adicionar.', '3. Abra a sacola, informe o endereço e escolha a região.', '4. Confira as quantidades e a taxa de entrega.', '5. Finalize escolhendo Pix ou dinheiro.'].join('\n');
  }
  if (/(indica|recomenda|melhor|familia|pessoas|acompanhar)/.test(text)) {
    return 'Para até 4 pessoas, recomendo o Combo Família. Para 5 ou 6 pessoas, o Combo Churrasqueiro é mais completo. Também posso te passar o preço de qualquer carne.';
  }
  if (/(alterar|trocar|cancelar|cancela|erro|problema)/.test(text)) {
    return 'Antes de finalizar, você pode alterar os itens e quantidades diretamente na sacola. Depois do pagamento, este chat não consegue editar ou cancelar o pedido.';
  }
  if (/^(oi|ola|bom dia|boa tarde|boa noite|ola tudo bem|tudo bem)/.test(text)) {
    return 'Olá! Sou a Brasa IA. Quer saber sobre cardápio, preços, pagamento, entrega ou como fazer um pedido?';
  }

  return 'Posso ajudar somente com dúvidas sobre pedidos no site: cardápio, preços, pagamento, entrega, sacola e finalização. Tente perguntar, por exemplo: “qual o preço da picanha?”';
}

function getChatDecisionGuide(normalizedText) {
  const peopleMatch = normalizedText.match(/\b(\d{1,2})\s*pessoas?\b/);
  const people = peopleMatch ? Number(peopleMatch[1]) : null;

  if (people >= 5) {
    return 'Para 5 pessoas ou mais, o Combo Churrasqueiro é a escolha mais completa: carnes variadas, acompanhamentos e 2 refrigerantes de 2L.';
  }
  if (people >= 3) {
    return 'Para 3 ou 4 pessoas, o Combo Família costuma ser o melhor equilíbrio entre variedade e quantidade.';
  }
  if (people === 2) {
    return 'Para 2 pessoas, recomendo a Picanha na Brasa para compartilhar ou o Combo Família se quiser mais variedade.';
  }
  if (people === 1) {
    return 'Para uma pessoa, o Combo Iscas da Brasa é prático e saboroso; se quiser uma refeição mais farta, escolha uma carne individual.';
  }
  if (/(melhor|escolh|decid|recomend|indica|opcao|qual)/.test(normalizedText)) {
    return 'Para indicar a melhor opção, me diga quantas pessoas vão comer e se você prefere variedade, uma carne específica ou algo mais econômico.';
  }
  return 'Se você me disser quantas pessoas vão comer, eu comparo as opções e indico o pedido mais adequado para você.';
}

function getChatUpsell(normalizedText) {
  if (/(sobremesa|sobremesas|pudim|brownie)/.test(normalizedText)) {
    return 'Para acompanhar o doce, o destaque é o combo Coca-Cola 2L + Brownie Bites: de R$ 28,40 por R$ 21,90.';
  }
  if (/(bebida|bebidas|refrigerante|agua)/.test(normalizedText)) {
    return 'Para fechar com chave de ouro, sugiro o combo Coca-Cola 2L + Brownie Bites: de R$ 28,40 por R$ 21,90.';
  }
  if (/(oferta|promocao|kit.*brasa)/.test(normalizedText)) {
    return 'Na oferta, você também pode adicionar outra Coca-Cola 2L por apenas R$ 6,50; para a sobremesa, o Brownie da Brasa custa R$ 14,90.';
  }
  return 'Para completar o pedido, sugiro o combo Coca-Cola 2L + Brownie Bites: de R$ 28,40 por R$ 21,90. É só tocar em + Adicionar.';
}

function getChatUpsellProducts(normalizedText) {
  const drink = {
    name: 'Coca-Cola 2L',
    price: productPrices['Coca-Cola 2L'],
    image: 'bebida-coca-2l.jpg',
    details: 'Garrafa de 2 litros para compartilhar.'
  };
  const offerDrink = {
    name: 'Coca-Cola 2L Extra da Oferta',
    price: productPrices['Coca-Cola 2L Extra da Oferta'],
    image: 'bebida-coca-2l.jpg',
    details: 'Coca-Cola 2L extra por R$ 6,50 na oferta.'
  };
  const pudding = {
    name: 'Pudim Cremoso',
    price: productPrices['Pudim Cremoso'],
    image: 'menu_pudim_cremoso-2k.jpg',
    details: 'Sobremesa cremosa com calda de caramelo.'
  };
  const brownie = {
    name: 'Brownie da Brasa',
    price: productPrices['Brownie da Brasa'],
    image: 'menu_brownie_bites_55-2k.jpg',
    details: 'Brownie bites com chocolate 55%.'
  };
  const dessertCombo = {
    name: 'Combo Coca-Cola 2L + Brownie Bites',
    price: productPrices['Combo Coca-Cola 2L + Brownie Bites'],
    image: 'menu_brownie_bites_55-2k.jpg',
    details: 'Combo promocional com Coca-Cola 2L e Brownie bites com chocolate 55%.'
  };

  if (/(sobremesa|sobremesas|pudim|brownie)/.test(normalizedText)) return [dessertCombo];
  if (/(bebida|bebidas|refrigerante|agua)/.test(normalizedText)) return [dessertCombo, pudding];
  if (/(oferta|promocao|kit.*brasa)/.test(normalizedText)) return [offerDrink, brownie];
  return [drink, dessertCombo, pudding];
}

function getChatCatalogProduct(name, image, details) {
  const catalogName = Object.keys(productPrices).find((item) => normalizeChatText(item) === normalizeChatText(name));
  if (!catalogName) return null;

  return {
    name: catalogName,
    price: productPrices[catalogName],
    image,
    details
  };
}

function getChatRecommendationProducts(normalizedText, actionResponse = '') {
  if (actionResponse) return getChatUpsellProducts(normalizedText);

  const peopleMatch = normalizedText.match(/\b(\d{1,2})\s*pessoas?\b/);
  const people = peopleMatch ? Number(peopleMatch[1]) : null;
  const comboFamily = getChatCatalogProduct(
    'combo familia',
    'combo-familia-prato.jpg',
    'Picanha, costela, acompanhamentos e Coca-Cola 2L. Serve ate 4 pessoas.'
  );
  const comboChurrasqueiro = getChatCatalogProduct(
    'combo churrasqueiro',
    'combo-churrasqueiro-prato.jpg',
    'Costela bovina, costela suina, frango, acompanhamentos e 2 refrigerantes de 2L.'
  );
  const comboIscas = getChatCatalogProduct(
    'combo iscas da brasa',
    'menu_combo_iscas_mandioca.jpg',
    'Iscas de carne douradas na brasa com mandioca macia.'
  );

  if (people >= 5 || /combo\s*churrasqueiro|churrasqueiro.*combo/.test(normalizedText)) {
    return comboChurrasqueiro ? [comboChurrasqueiro] : [];
  }
  if ((people >= 3 && people <= 4) || /combo\s*familia|familia.*combo/.test(normalizedText)) {
    return comboFamily ? [comboFamily] : [];
  }
  if (/combo\s*iscas|iscas.*brasa|mandioca/.test(normalizedText)) {
    return comboIscas ? [comboIscas] : [];
  }
  if (/\bcombos?\b/.test(normalizedText)) {
    return [comboFamily, comboChurrasqueiro, comboIscas].filter(Boolean);
  }

  return [];
}

const chatOrderCatalog = Object.freeze([
  { name: 'Picanha na Brasa', aliases: ['picanha'] },
  { name: 'Costela Bovina Assada', aliases: ['costela bovina assada', 'costela bovina'] },
  { name: 'Costela Suína BBQ', aliases: ['costela suina bbq', 'costela suina'] },
  { name: 'Frango na Brasa', aliases: ['frango na brasa', 'frango', 'galeto'] },
  { name: 'Combo Família', aliases: ['combo familia'] },
  { name: 'Combo Churrasqueiro', aliases: ['combo churrasqueiro'] },
  { name: 'Combo Iscas da Brasa', aliases: ['combo iscas', 'iscas da brasa'] },
  { name: 'Vinagrete da Brasa', aliases: ['vinagrete', 'acompanhamento', 'acompanhamentos'] },
  { name: 'Coca-Cola 2L', aliases: ['coca cola 2l', 'coca 2l'] },
  { name: 'Coca-Cola Lata', aliases: ['coca cola lata', 'coca lata'] },
  { name: 'Budweiser 330ml', aliases: ['budweiser', 'bud 330ml', 'budweiser 330'] },
  { name: 'Pack Budweiser 12x350ml', aliases: ['pack budweiser', 'budweiser pack', '12 latas budweiser', 'pack de budweiser'] },
  { name: 'Água com Gás', aliases: ['agua com gas'] },
  { name: 'Água sem Gás', aliases: ['agua sem gas'] },
  { name: 'Pudim Cremoso', aliases: ['pudim'] },
  { name: 'Brownie da Brasa', aliases: ['brownie'] },
  { name: 'Combo Coca-Cola 2L + Brownie Bites', aliases: ['combo coca brownie', 'coca cola brownie', 'coca brownie'] }
]);

function getChatOrderQuantity(text, matchIndex) {
  const beforeItem = text.slice(0, matchIndex);
  const numberMatch = beforeItem.match(/(?:^|\s)(\d{1,2})\s*x?\s*$/);
  if (numberMatch) return Math.min(99, Math.max(1, Number(numberMatch[1])));

  const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
  const wordMatch = beforeItem.match(/(?:^|\s)(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s*$/);
  return wordMatch ? numberWords[wordMatch[1]] : 1;
}

function parseSimpleChatOrder(message) {
  const text = normalizeChatText(message);
  const purchaseVerb = /(adicionar|add|colocar|incluir|quero|comprar|pedir|pedido|manda|mandar|leva|levar|separa|separar|bota|botar|me ve)/.test(text);
  const explicitAddVerb = /(adicionar|add|colocar|incluir|comprar|pedir|pedido|manda|mandar|leva|levar|separa|separar|bota|botar|me ve)/.test(text);
  const informationQuestion = /\b(quanto|preco|valor|custa|saber|duvida|informacao|qual|porque|por que)\b/.test(text);
  if (informationQuestion && !explicitAddVerb) return [];

  const matches = [];
  chatOrderCatalog.forEach((product) => {
    const match = product.aliases
      .map(alias => ({ alias, index: text.indexOf(alias) }))
      .filter(item => item.index >= 0)
      .sort((left, right) => right.alias.length - left.alias.length)[0];
    if (match) matches.push({ name: product.name, quantity: getChatOrderQuantity(text, match.index) });
  });

  if (!matches.length) return [];
  const simpleItemOnly = text.split(/\s+/).length <= 4 && !/[?!]/.test(text);
  const numericOrder = /\b\d{1,2}\s*x?\s*(?:unidades?|unid|porcoes?|porcao)?\b/.test(text);
  if (!purchaseVerb && !simpleItemOnly && !numericOrder) return [];
  return matches;
}

function executeSimpleChatOrder(message) {
  const orders = parseSimpleChatOrder(message);
  if (!orders.length) return '';

  const added = orders.filter(order => addToCart(order.name, productPrices[order.name], '', order.quantity));
  if (!added.length) return '';

  const summary = added.map(order => `${order.quantity}x ${order.name}`).join(', ');
  return `Feito: adicionei ${summary} à sua sacola. Abra a sacola para conferir o pedido e ajustar as quantidades antes de finalizar.`;
}

function getChatResponse(message, actionResponse = '') {
  const normalizedText = normalizeChatText(message);
  const baseResponse = actionResponse || getBaseChatResponse(message);
  const decisionGuide = actionResponse
    ? 'Boa escolha. Se quiser comparar este item com um combo mais completo, me diga quantas pessoas vão comer.'
    : getChatDecisionGuide(normalizedText);
  const upsell = getChatUpsell(normalizedText);

  // A IA sÃ³ oferece complementos depois de confirmar um item na sacola.
  if (!actionResponse) {
    return [baseResponse, decisionGuide].join('\n\n');
  }

  return [
    baseResponse,
    `Para te ajudar a decidir: ${decisionGuide}`,
    `Sugestão para completar: ${upsell}`
  ].join('\n\n');
}

function sendChatMessage(rawMessage) {
  const message = String(rawMessage || '').trim();
  if (!message || !chatInput || chatInput.disabled) return;

  appendChatMessage(message, 'outgoing');
  chatInput.value = '';
  setChatBusy(true);
  setChatTyping(true);
  window.clearTimeout(chatReplyTimer);
  chatReplyTimer = window.setTimeout(() => {
    setChatTyping(false);
    const actionResponse = executeSimpleChatOrder(message);
    const recommendations = getChatRecommendationProducts(normalizeChatText(message), actionResponse);
    appendChatMessage(getChatResponse(message, actionResponse), 'incoming', recommendations);
    setChatBusy(false);
    if (aiChat?.classList.contains('open')) chatInput.focus({ preventScroll: true });
  }, 720);
}

function setAiChatOpen(isOpen) {
  if (!aiChat || !chatBackdrop || !chatTrigger) return;
  const wasOpen = aiChat.classList.contains('open');

  if (isOpen) {
    chatLastFocusedElement = document.activeElement;
    aiChat.classList.add('open');
    chatBackdrop.classList.add('open');
    aiChat.setAttribute('aria-hidden', 'false');
    chatBackdrop.setAttribute('aria-hidden', 'false');
    chatTrigger.setAttribute('aria-expanded', 'true');
    chatFloat?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-open');
    scrollChatToBottom();
    if (window.matchMedia('(min-width: 481px)').matches) {
      window.setTimeout(() => chatInput?.focus({ preventScroll: true }), 180);
    }
    return;
  }

  aiChat.classList.remove('open');
  chatBackdrop.classList.remove('open');
  aiChat.setAttribute('aria-hidden', 'true');
  chatBackdrop.setAttribute('aria-hidden', 'true');
  chatTrigger.setAttribute('aria-expanded', 'false');
  chatFloat?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('chat-open');
  if (wasOpen && chatLastFocusedElement?.focus) chatLastFocusedElement.focus({ preventScroll: true });
}

if (chatTrigger) chatTrigger.addEventListener('click', () => setAiChatOpen(true));
if (chatFloat) chatFloat.addEventListener('click', () => setAiChatOpen(true));
if (chatClose) chatClose.addEventListener('click', () => setAiChatOpen(false));
if (chatBackdrop) chatBackdrop.addEventListener('click', () => setAiChatOpen(false));
if (chatForm) chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendChatMessage(chatInput?.value);
});
if (chatQuickReplies) chatQuickReplies.addEventListener('click', (event) => {
  const button = event.target.closest('[data-chat-question]');
  if (button) sendChatMessage(button.dataset.chatQuestion);
});

// ---- CONTACT FORM ----
function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-form-send');
  btn.textContent = '⏳ Enviando...';
  btn.disabled = true;
  setTimeout(() => {
    document.getElementById('form-success').style.display = 'block';
      btn.textContent = 'Enviado!';
    document.getElementById('contato-form').reset();
    setTimeout(() => {
      btn.textContent = 'Enviar Mensagem';
      btn.disabled = false;
      document.getElementById('form-success').style.display = 'none';
    }, 4000);
  }, 1500);
}

document.getElementById('contato-form')?.addEventListener('submit', submitForm);

// ---- LOCAL COMMENT FORM ----
const commentTrigger = document.getElementById('btn-open-comment');
const commentPanel = document.getElementById('comment-panel');
const commentClose = document.getElementById('btn-close-comment');
const commentForm = document.getElementById('comment-form');
const commentName = document.getElementById('comment-name');
const commentStatus = document.getElementById('comment-local-status');

function setCommentOpen(isOpen) {
  if (!commentTrigger || !commentPanel) return;
  commentPanel.hidden = !isOpen;
  commentTrigger.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    window.setTimeout(() => commentName?.focus({ preventScroll: true }), 80);
  } else {
    commentStatus?.setAttribute('hidden', '');
  }
}

if (commentTrigger) commentTrigger.addEventListener('click', () => {
  setCommentOpen(commentPanel.hidden);
});
if (commentClose) commentClose.addEventListener('click', () => setCommentOpen(false));
if (commentForm) commentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!commentStatus) return;

  commentStatus.textContent = 'Obrigado! Sua mensagem foi recebida apenas nesta sessão e não será publicada, salva ou enviada para o site.';
  commentStatus.removeAttribute('hidden');
  commentForm.reset();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && commentPanel && !commentPanel.hidden) setCommentOpen(false);
});

// ---- SCROLL REVEAL ----
const revealEls = document.querySelectorAll(
  '.stat-item, .menu-card, .step-card, .depo-card, ' +
  '.feature-item, .sobre-img-wrap, .sobre-content, ' +
  '.video-showcase-copy, .video-showcase-media, ' +
  '.comment-cta-wrap, ' +
  '.footer-brand, .footer-contact'
);

revealEls.forEach((el, i) => {
  if (el.classList.contains('sobre-img-wrap')) {
    el.classList.add('reveal-left');
  } else if (el.classList.contains('sobre-content')) {
    el.classList.add('reveal-right');
  } else {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 0.1}s`;
  }
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => el.classList.add('visible'));
}

// ---- VIDEO CAROUSEL ----
const videoCarousel = document.getElementById('video-carousel');
const videoSlides = videoCarousel ? [...videoCarousel.querySelectorAll('.video-slide')] : [];
const videoCarouselDots = [...document.querySelectorAll('.video-carousel-dot')];
const videoCarouselPrev = document.getElementById('video-carousel-prev');
const videoCarouselNext = document.getElementById('video-carousel-next');
const carouselVideos = videoSlides.map(slide => slide.querySelector('video')).filter(Boolean);
let activeVideoSlide = 0;
let videoCarouselScrollFrame = null;

function setActiveVideoSlide(index, shouldScroll = true) {
  if (!videoSlides.length) return;
  activeVideoSlide = (index + videoSlides.length) % videoSlides.length;

  videoSlides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === activeVideoSlide;
    slide.classList.toggle('is-active', isActive);
    if (isActive) slide.setAttribute('aria-current', 'true');
    else slide.removeAttribute('aria-current');
  });
  videoCarouselDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeVideoSlide;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', String(isActive));
  });
  carouselVideos.forEach((video, videoIndex) => {
    if (videoIndex !== activeVideoSlide) {
      video.pause();
      video.preload = 'metadata';
      return;
    }

    if (video.dataset.autoplay === 'true') {
      video.preload = 'auto';
      video.muted = true;
      const playPromise = video.play();
      playPromise?.catch?.(() => {});
    }
  });

  if (shouldScroll && videoCarousel) {
    const targetSlide = videoSlides[activeVideoSlide];
    const targetLeft = targetSlide.offsetLeft - videoCarousel.offsetLeft;
    videoCarousel.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }
}

if (videoCarouselPrev) videoCarouselPrev.addEventListener('click', () => {
  setActiveVideoSlide(activeVideoSlide - 1);
});
if (videoCarouselNext) videoCarouselNext.addEventListener('click', () => {
  setActiveVideoSlide(activeVideoSlide + 1);
});
videoCarouselDots.forEach(dot => {
  dot.addEventListener('click', () => setActiveVideoSlide(Number(dot.dataset.videoIndex)));
});
carouselVideos.forEach(video => {
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.addEventListener('volumechange', () => {
    if (!video.muted) video.muted = true;
  });
  const startTime = Number(video.dataset.startTime || 0);
  if (startTime > 0) {
    video.addEventListener('loadedmetadata', () => {
      if (video.currentTime < startTime) video.currentTime = Math.min(startTime, video.duration - 0.05);
      }, { once: true });
  }
});
const silentVideos = [...document.querySelectorAll('video[data-silent-video]')];

function isSilentVideoOnScreen(video) {
  const rect = video.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

function playSilentVideoWhenVisible(video) {
  if (document.hidden || !isSilentVideoOnScreen(video)) {
    video.pause();
    return;
  }

  if (video.ended) video.currentTime = 0;
  video.muted = true;
  video.defaultMuted = true;
  const playPromise = video.play();
  playPromise?.catch?.(() => {});
}

function startSilentVideosAfterInteraction(event) {
  const target = event.target;
  const isVideoControlInteraction = target?.closest?.('video[data-silent-video]');

  // Keep the native play/pause controls usable. Page interactions still start the video.
  if (isVideoControlInteraction && event.type !== 'scroll' && event.type !== 'wheel') return;
  silentVideos.forEach(playSilentVideoWhenVisible);
}

silentVideos.forEach(video => {
  video.muted = true;
  video.defaultMuted = true;
  video.addEventListener('volumechange', () => {
    if (!video.muted) video.muted = true;
  });
});
['pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
  document.addEventListener(eventName, startSilentVideosAfterInteraction, { passive: true });
});
['scroll', 'wheel'].forEach(eventName => {
  window.addEventListener(eventName, startSilentVideosAfterInteraction, { passive: true });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) silentVideos.forEach(video => video.pause());
});
if (videoCarousel) videoCarousel.addEventListener('scroll', () => {
  if (videoCarouselScrollFrame) return;
  videoCarouselScrollFrame = window.requestAnimationFrame(() => {
    videoCarouselScrollFrame = null;
    const nearestSlide = videoSlides.reduce((nearestIndex, slide, slideIndex) => {
      const nearestDistance = Math.abs((videoSlides[nearestIndex].offsetLeft - videoCarousel.offsetLeft) - videoCarousel.scrollLeft);
      const slideDistance = Math.abs((slide.offsetLeft - videoCarousel.offsetLeft) - videoCarousel.scrollLeft);
      return slideDistance < nearestDistance ? slideIndex : nearestIndex;
    }, 0);
    if (nearestSlide !== activeVideoSlide) setActiveVideoSlide(nearestSlide, false);
  });
});
setActiveVideoSlide(0, false);

// ---- SMOOTH SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ---- CONTINUOUS HERO VIDEO PLAYLIST ----
const heroVideo = document.getElementById('hero-bg-video');
const heroSection = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const deviceConnection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const isLowPowerDevice = Boolean(
  deviceConnection?.saveData ||
  /2g|3g/.test(deviceConnection?.effectiveType || '') ||
  (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 2) ||
  (Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 2)
);
if (isLowPowerDevice) document.documentElement.classList.add('low-power');
const heroVideoSources = [
  'hero-healthy-weekend-2k-muted.mp4',
  'hero-smoke-2k-muted.mp4'
];
const heroCyclesPerSource = 5;
const heroPlaybackRate = reduceMotion ? 0.4 : 1;
let heroSourceIndex = 0;
let heroCycleCount = 0;
let heroIsVisible = true;
let heroSourceToken = 0;
let heroPageReady = document.readyState === 'complete';

function playHeroVideo() {
  if (!heroVideo || !heroIsVisible || !heroPageReady || !heroVideo.classList.contains('is-ready')) return;
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playbackRate = heroPlaybackRate;
  const playPromise = heroVideo.play();
  playPromise?.catch?.(() => {});
}

function loadHeroVideoSource(index) {
  if (!heroVideo || !heroPageReady) return;
  const source = heroVideo.querySelector('source');
  if (!source) return;

  heroSourceIndex = (index + heroVideoSources.length) % heroVideoSources.length;
  heroCycleCount = 0;
  heroSourceToken += 1;
  const currentToken = heroSourceToken;

  heroVideo.pause();
  heroVideo.classList.remove('is-ready');
  heroVideo.preload = 'auto';
  source.src = heroVideoSources[heroSourceIndex];
  heroVideo.addEventListener('loadedmetadata', () => {
    if (currentToken !== heroSourceToken) return;
    heroVideo.currentTime = 0;
    heroVideo.playbackRate = heroPlaybackRate;
  }, { once: true });
  heroVideo.load();
}

function scheduleHeroVideoStart() {
  const start = async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch (error) {
      // Font loading should never prevent the visual background from starting.
    }
    heroPageReady = true;
    window.requestAnimationFrame(() => loadHeroVideoSource(0));
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
}

if (heroVideo) {
  heroVideo.loop = false;
  heroVideo.preload = 'none';
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playbackRate = heroPlaybackRate;
  heroVideo.addEventListener('canplay', () => {
    if (!heroPageReady) return;
    heroVideo.classList.add('is-ready');
    if (heroIsVisible && heroVideo.paused) playHeroVideo();
  });
  heroVideo.addEventListener('ended', () => {
    heroCycleCount += 1;
    if (heroCycleCount >= heroCyclesPerSource) {
      loadHeroVideoSource(heroSourceIndex + 1);
      return;
    }
    heroVideo.currentTime = 0;
    playHeroVideo();
  });

  window.addEventListener('scroll', () => {
    heroVideo.style.setProperty('--hero-scroll-y', `${window.scrollY * 0.04}px`);
  }, { passive: true });

  if ('IntersectionObserver' in window && heroSection) {
    const heroVideoObserver = new IntersectionObserver(([entry]) => {
      heroIsVisible = entry.isIntersecting;
      if (heroIsVisible) playHeroVideo();
      else heroVideo.pause();
    }, { threshold: 0.12 });
    heroVideoObserver.observe(heroSection);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      heroVideo.pause();
    } else {
      playHeroVideo();
    }
  });

  if (!reduceMotion && heroSection) {
    heroSection.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = heroSection.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
      heroVideo.style.setProperty('--hero-pointer-x', `${x}px`);
      heroVideo.style.setProperty('--hero-pointer-y', `${y}px`);
    });
    heroSection.addEventListener('pointerleave', () => {
      heroVideo.style.setProperty('--hero-pointer-x', '0px');
      heroVideo.style.setProperty('--hero-pointer-y', '0px');
    });
  }

  if (isLowPowerDevice) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    heroVideo.querySelector('source')?.removeAttribute('src');
    heroVideo.load();
  } else {
    scheduleHeroVideoStart();
  }
}

// Init
updateCartUI();

// Keydown ESC closes cart
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    setAiChatOpen(false);
    closeSodaOptions();
    closeWaterOptions();
    closeCheckout();
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
    chatFloat?.classList.remove('chat-float-cart-open');
    chatFloat?.setAttribute('aria-hidden', 'false');
    navLinks.classList.remove('open');
  }
});
