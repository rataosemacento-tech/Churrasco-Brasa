(function () {
  'use strict';

  const STORAGE_KEY = 'churrascoPaymentOrder';
  const CART_STORAGE_KEY = 'churrasco-brasa-cart-draft';
  const DELIVERY_DRAFT_KEY = 'churrascoDeliveryDraft';
  const orderContent = document.getElementById('payment-content');
  const missingState = document.getElementById('payment-missing');
  const orderItems = document.getElementById('order-items');
  const orderRegion = document.getElementById('order-region');
  const orderSubtotal = document.getElementById('order-subtotal');
  const orderDelivery = document.getElementById('order-delivery');
  const orderDiscountRow = document.getElementById('order-discount-row');
  const orderDiscount = document.getElementById('order-discount');
  const orderTotal = document.getElementById('order-total');
  const paymentTotal = document.getElementById('payment-total');
  const paymentUpsellButton = document.getElementById('payment-upsell-button');
  const paymentUpsellStatus = document.getElementById('payment-upsell-status');
  const customerName = document.getElementById('customer-name');
  const customerPhone = document.getElementById('customer-phone');
  const customerRegion = document.getElementById('customer-region');
  const customerAddress = document.getElementById('customer-address');
  const couponForm = document.getElementById('coupon-form');
  const couponCode = document.getElementById('coupon-code');
  const couponFeedback = document.getElementById('coupon-feedback');
  const copyFirstOrderCode = document.getElementById('copy-first-order-code');
  const paymentInstructions = document.getElementById('payment-instructions');
  const cashChange = document.getElementById('cash-change');
  const cashChangeToggle = document.getElementById('cash-change-toggle');
  const cashChangeFields = document.getElementById('cash-change-fields');
  const cashAmount = document.getElementById('cash-amount');
  const cashChangeResult = document.getElementById('cash-change-result');
  const paymentError = document.getElementById('payment-error');
  const paymentNote = document.querySelector('.payment-note p');
  const confirmPayment = document.getElementById('confirm-payment');
  const paymentSectionToggle = document.getElementById('payment-section-toggle');
  const paymentSectionBody = document.getElementById('payment-section-body');
  const paymentSuccess = document.getElementById('payment-success');
  const pixPaymentPanel = document.getElementById('pix-payment-panel');
  const pixPaymentStatus = document.getElementById('pix-payment-status');
  const pixQrImage = document.getElementById('pix-qr-image');
  const pixQrEmpty = document.getElementById('pix-qr-empty');
  const pixCopyCode = document.getElementById('copy-pix-code');
  const pixPaymentCode = document.getElementById('pix-copy-code');
  const pixPaymentHelp = document.getElementById('pix-payment-help');
  const pixPaymentError = document.getElementById('pix-payment-error');
  const paymentRadios = Array.from(document.querySelectorAll('input[name="payment-method"]'));
  const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:4173' : '';
  const CASH_PAYMENT_ERROR = 'ERRO #3994 - network connection failed';
  const ATTRIBUTION_STORAGE_KEY = 'churrasco-brasa-attribution';
  const ATTRIBUTION_KEYS = Object.freeze([
    ['utm_source', 'source'],
    ['utm_medium', 'medium'],
    ['utm_campaign', 'campaign'],
    ['utm_content', 'content'],
    ['utm_term', 'term'],
    ['fbclid', 'fbclid'],
    ['ttclid', 'ttclid'],
    ['gclid', 'gclid']
  ]);
  if (paymentNote) {
    paymentNote.textContent = 'Pagamento dispon\u00edvel somente via Pix. O QR Code ser\u00e1 gerado nesta p\u00e1gina e o valor deve ser pago integralmente. N\u00e3o estamos utilizando pagamento na m\u00e1quina por tempo indeterminado.';
  }
  let cashChangeRequested = false;
  let pixStatusTimer = null;
  let pixStatusRequest = false;
  let pixCreationRequest = false;
  let redirectedAfterPaid = false;

  const PAYMENT_UPSELL = Object.freeze({
    name: 'Pudim Cremoso',
    price: 12.90,
    details: 'Sobremesa cremosa com calda de caramelo.'
  });

  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  function cleanText(value, maxLength) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, maxLength);
  }

  function readAttribution() {
    const attribution = {};
    try {
      const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
      ATTRIBUTION_KEYS.forEach(([urlKey, apiKey]) => {
        const queryValue = new URLSearchParams(window.location.search).get(urlKey);
        const value = queryValue || stored[urlKey] || stored[apiKey] || '';
        attribution[apiKey] = cleanText(value, 200);
        if (queryValue) stored[urlKey] = attribution[apiKey];
      });
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      ATTRIBUTION_KEYS.forEach(([, apiKey]) => { attribution[apiKey] = ''; });
    }
    return attribution;
  }

  function formatMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? currency.format(number) : currency.format(0);
  }

  function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
  }

  function fallbackCopyText(value) {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    helper.remove();
    return copied;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch { /* Use o fallback para páginas locais ou navegadores antigos. */ }
    }
    return fallbackCopyText(value);
  }

  function formatPhone(value) {
    const digits = cleanText(value, 20).replace(/\D/g, '').slice(0, 11);
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return digits || '—';
  }

  function getExternalReference(order) {
    if (order.externalReference) return cleanText(order.externalReference, 120);
    const reference = `churrasco-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    order.externalReference = reference;
    persistOrder(order);
    return reference;
  }

  function readOrder() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items) || !parsed.items.length) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clearChildren(element) {
    while (element && element.firstChild) element.removeChild(element.firstChild);
  }

  function renderOrder(order) {
    const regionLabel = cleanText(order.regionLabel, 60) || 'Cascavel';
    const name = cleanText(order.name, 80) || 'Cliente';
    const address = cleanText(order.address, 240) || 'Endereço informado no pedido';
    const total = Number(order.total);
    const discount = Math.max(0, Number(order.discountAmount) || 0);

    orderRegion.textContent = regionLabel;
    customerName.textContent = name;
    customerPhone.textContent = formatPhone(order.phone);
    customerRegion.textContent = regionLabel;
    customerAddress.textContent = address;
    orderSubtotal.textContent = formatMoney(order.subtotal);
    orderDelivery.textContent = formatMoney(order.deliveryFee);
    if (orderDiscountRow && orderDiscount) {
      orderDiscountRow.hidden = discount <= 0;
      orderDiscount.textContent = `- ${formatMoney(discount)}`;
    }
    orderTotal.textContent = formatMoney(total);
    paymentTotal.textContent = formatMoney(total);

    clearChildren(orderItems);
    order.items.slice(0, 40).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'order-item';

      const copy = document.createElement('div');
      copy.className = 'order-item-copy';
      const nameElement = document.createElement('strong');
      nameElement.textContent = `${Math.max(1, Math.min(99, Number(item.qty) || 1))}x ${cleanText(item.name, 120)}`;
      copy.appendChild(nameElement);
      if (item.details) {
        const details = document.createElement('small');
        details.textContent = cleanText(item.details, 400);
        copy.appendChild(details);
      }

      const price = document.createElement('strong');
      price.className = 'order-item-price';
      price.textContent = formatMoney((Number(item.price) || 0) * (Number(item.qty) || 1));

      row.append(copy, price);
      orderItems.appendChild(row);
    });
  }

  function renderPaymentUpsell(order) {
    if (!paymentUpsellButton) return;
    const item = order.items.find((entry) => cleanText(entry.name, 120) === PAYMENT_UPSELL.name);
    const quantity = item ? Math.max(0, Math.min(99, Number(item.qty) || 0)) : 0;
    paymentUpsellButton.textContent = quantity
      ? `Adicionar mais Â· ${formatMoney(PAYMENT_UPSELL.price)} (${quantity} na sacola)`
      : `Adicionar sobremesa Â· ${formatMoney(PAYMENT_UPSELL.price)}`;
    paymentUpsellButton.classList.toggle('is-added', quantity > 0);
    paymentUpsellButton.setAttribute('aria-label', quantity
      ? `Adicionar mais uma unidade de ${PAYMENT_UPSELL.name}. JÃ¡ hÃ¡ ${quantity} na sacola.`
      : `Adicionar ${PAYMENT_UPSELL.name} por ${formatMoney(PAYMENT_UPSELL.price)}`);
  }

  function recalculateOrder(order) {
    const subtotal = roundMoney(order.items.reduce((sum, item) => {
      const price = Number(item.price);
      const quantity = Math.max(1, Math.min(99, Number(item.qty) || 1));
      return sum + (Number.isFinite(price) ? price * quantity : 0);
    }, 0));
    const coupon = cleanText(order.couponCode, 32).toLocaleLowerCase('pt-BR');
    const discountAmount = coupon === 'brasa10' ? roundMoney(subtotal * 0.1) : 0;
    const deliveryFee = coupon === 'taxafree' ? 0 : Math.max(0, Number(order.deliveryFee) || 0);

    order.subtotal = subtotal;
    order.discountAmount = discountAmount;
    order.deliveryFee = roundMoney(deliveryFee);
    order.total = Math.max(0, roundMoney(subtotal - discountAmount + deliveryFee));
  }

  function addPaymentUpsell(order) {
    const item = order.items.find((entry) => cleanText(entry.name, 120) === PAYMENT_UPSELL.name);
    if (item) {
      item.qty = Math.min(99, Math.max(1, Number(item.qty) || 1) + 1);
    } else {
      order.items.push({
        name: PAYMENT_UPSELL.name,
        price: PAYMENT_UPSELL.price,
        qty: 1,
        details: PAYMENT_UPSELL.details
      });
    }

    const hadPix = invalidatePixForPriceChange(order);
    recalculateOrder(order);
    if (!persistOrder(order)) return;

    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(order.items));
    } catch {
      if (paymentUpsellStatus) paymentUpsellStatus.textContent = 'NÃ£o foi possÃ­vel atualizar a sacola. Tente novamente.';
      return;
    }

    renderOrder(order);
    renderPaymentUpsell(order);
    renderInstructions(getSelectedPayment(), order);
    syncPixPaymentVisibility(getSelectedPayment(), order);
    if (paymentUpsellStatus) {
      paymentUpsellStatus.textContent = hadPix
        ? 'Sobremesa adicionada. O Pix anterior foi atualizado; gere um novo cÃ³digo com o valor correto.'
        : 'Sobremesa adicionada à sua sacola. O total foi atualizado.';
    }
  }

  function getSelectedPayment() {
    const selected = paymentRadios.find((radio) => radio.checked);
    return selected ? selected.value : '';
  }

  function renderInstructions(method, order) {
    clearChildren(paymentInstructions);
    paymentInstructions.hidden = method === 'cash';
    const heading = document.createElement('strong');
    const text = document.createElement('span');
    if (method === 'cash') {
      syncCashChangeVisibility(method, order);
      return;
    } else {
      heading.textContent = 'Pagamento via Pix';
      text.textContent = `Ao prosseguir, geraremos o QR Code e o código Pix de ${formatMoney(order.total)}. O pagamento deve ser integral.`;
    }
    paymentInstructions.append(heading, text);
    syncCashChangeVisibility(method, order);
  }

  function parseCashAmount(value) {
    const raw = cleanText(value, 30).replace(/[^\d,.-]/g, '');
    if (!raw) return NaN;
    const normalized = raw.includes(',') && raw.includes('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(',', '.');
    return Number(normalized);
  }

  function updateCashChangePreview(order) {
    if (!cashChangeResult) return;
    cashChangeResult.classList.remove('is-valid', 'is-invalid');
    if (!cashChangeRequested) {
      cashChangeResult.textContent = 'Informe o valor que será entregue em dinheiro.';
      return;
    }

    const paidAmount = parseCashAmount(cashAmount?.value);
    const total = Number(order?.total);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      cashChangeResult.textContent = 'Informe quanto você vai entregar em dinheiro.';
      return;
    }
    if (!Number.isFinite(total) || paidAmount < total) {
      cashChangeResult.textContent = `O valor precisa ser igual ou maior que ${formatMoney(total)}.`;
      cashChangeResult.classList.add('is-invalid');
      return;
    }

    cashChangeResult.textContent = `Troco estimado: ${formatMoney(paidAmount - total)}.`;
    cashChangeResult.classList.add('is-valid');
  }

  function syncCashChangeVisibility(method, order) {
    const isCash = method === 'cash';
    if (!cashChange || !cashChangeToggle || !cashChangeFields) return;
    cashChange.hidden = !isCash;
    if (!isCash) {
      cashChangeRequested = false;
      cashChangeFields.hidden = true;
      cashChangeToggle.classList.remove('is-active');
      cashChangeToggle.setAttribute('aria-expanded', 'false');
      cashChangeToggle.textContent = 'Precisa de troco?';
    }
    updateCashChangePreview(order);
  }

  function getCashPaymentDetails(order) {
    if (getSelectedPayment() !== 'cash' || !cashChangeRequested) {
      return { requested: false, paidAmount: null, change: 0 };
    }

    const paidAmount = parseCashAmount(cashAmount?.value);
    const total = Number(order?.total);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount < total || paidAmount > 100000) {
      return null;
    }
    return { requested: true, paidAmount, change: paidAmount - total };
  }

  function syncPaymentSelection() {
    paymentRadios.forEach((radio) => {
      const methodCard = radio.closest('.payment-method');
      if (methodCard) methodCard.classList.toggle('is-selected', radio.checked);
    });
  }

  function clearPixPolling() {
    if (pixStatusTimer) window.clearInterval(pixStatusTimer);
    pixStatusTimer = null;
    pixStatusRequest = false;
  }

  function setConfirmState(label, disabled) {
    if (!confirmPayment) return;
    confirmPayment.textContent = label;
    confirmPayment.disabled = Boolean(disabled);
  }

  function setPaymentSectionOpen(isOpen) {
    const open = Boolean(isOpen);
    if (paymentSectionToggle) {
      paymentSectionToggle.setAttribute('aria-expanded', String(open));
    }
    if (paymentSectionBody) paymentSectionBody.hidden = !open;
  }

  function normalizePixStatus(value) {
    const status = cleanText(value, 32).toUpperCase();
    if (status === 'OK') return 'PENDING';
    if (status === 'COMPLETED' || status === 'SUCCESS') return 'PAID';
    return status || 'PENDING';
  }

  function setPixStatus(message, type = '') {
    if (!pixPaymentStatus) return;
    pixPaymentStatus.textContent = message;
    pixPaymentStatus.classList.toggle('is-paid', type === 'paid');
    pixPaymentStatus.classList.toggle('is-error', type === 'error');
  }

  function safePixImage(value) {
    const image = cleanText(value, 200000);
    return /^https:\/\//i.test(image) || /^data:image\//i.test(image) ? image : '';
  }

  function apiUrl(path) {
    return API_BASE + path;
  }

  function createLocalPixQr(code) {
    if (!code || typeof window.qrcode !== 'function') return '';
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(code, 'Byte');
      qr.make();
      const svg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      return '';
    }
  }

  function hidePixPayment() {
    if (pixPaymentPanel) pixPaymentPanel.hidden = true;
    if (pixQrImage) {
      pixQrImage.hidden = true;
      pixQrImage.removeAttribute('src');
    }
    if (pixQrEmpty) pixQrEmpty.hidden = false;
    if (pixQrEmpty) pixQrEmpty.textContent = 'O QR Code aparecerá aqui após prosseguir.';
    if (pixPaymentCode) pixPaymentCode.value = '';
    if (pixCopyCode) {
      pixCopyCode.disabled = true;
      pixCopyCode.textContent = 'Copiar código Pix';
    }
    if (pixPaymentError) {
      pixPaymentError.textContent = '';
      pixPaymentError.hidden = true;
    }
  }

  function invalidatePixForPriceChange(order) {
    const hadPix = Boolean(order?.pixPayment?.transactionId || order?.pixPayment?.code);
    clearPixPolling();
    if (order) delete order.pixPayment;
    hidePixPayment();
    return hadPix;
  }

  function showPixPaymentError(message) {
    if (pixPaymentPanel) pixPaymentPanel.hidden = false;
    setPixStatus('Não foi possível concluir', 'error');
    if (pixPaymentError) {
      pixPaymentError.textContent = cleanText(message, 240);
      pixPaymentError.hidden = false;
    }
  }

  function getPixTransactionId(data) {
    return cleanText(
      data?.transactionId || data?.id || data?.data?.transactionId || data?.data?.id ||
      data?.transaction?.id || data?.data?.transaction?.id || data?.result?.id,
      120
    );
  }

  function asPixObject(value) {
    if (typeof value === 'string') return { copy_paste: value };
    return value && typeof value === 'object' ? value : {};
  }

  function getPixDetails(data) {
    const containers = [
      data,
      data?.data,
      data?.transaction,
      data?.data?.transaction,
      data?.result,
      data?.data?.data
    ].filter((container) => container && typeof container === 'object');

    for (const container of containers) {
      const pix = asPixObject(
        container.pix ||
        container.pixInformation ||
        container.payment?.pix ||
        container.payment?.pixInformation
      );
      const code = cleanText(
        pix.code || pix.copy_paste || pix.copyPaste || pix.copyPasteCode || pix.qrCode ||
        pix.qr_code || pix.pix_code || container.code || container.copy_paste ||
        container.copyPaste || container.copy_paste_code,
        20000
      );
      const image = safePixImage(
        pix.image || pix.qrCodeImage || pix.qr_code_image || pix.url ||
        container.qrCodeImage || container.qr_code_image
      );
      const expiresAt = cleanText(
        pix.expires_at || pix.expiresAt || container.expiresAt || container.expires_at,
        80
      );
      if (code || image || expiresAt) return { code, image, expiresAt };
    }

    return { code: '', image: '', expiresAt: '' };
  }

  function renderPixPayment(data) {
    const pix = getPixDetails(data);
    const status = normalizePixStatus(data?.status);
    if (pixPaymentPanel) pixPaymentPanel.hidden = false;
    if (pixPaymentCode) pixPaymentCode.value = pix.code;
    if (pixCopyCode) {
      pixCopyCode.disabled = !pix.code;
      pixCopyCode.textContent = 'Copiar código Pix';
    }

    if (pixQrImage && pixQrEmpty) {
      const qrImage = createLocalPixQr(pix.code) || pix.image;
      if (qrImage) {
        pixQrImage.src = qrImage;
        pixQrImage.hidden = false;
        pixQrEmpty.hidden = true;
      } else {
        pixQrImage.hidden = true;
        pixQrImage.removeAttribute('src');
        pixQrEmpty.textContent = pix.code
          ? 'Copie o código Pix ao lado para pagar.'
          : 'O provedor ainda não retornou o código Pix.';
        pixQrEmpty.hidden = false;
      }
    }

    if (pixPaymentError) pixPaymentError.hidden = true;
    if (status === 'PAID') {
      setPixStatus('Pagamento confirmado', 'paid');
      if (pixPaymentHelp) pixPaymentHelp.textContent = 'Pagamento identificado. Redirecionando para a confirmação do pedido.';
      setConfirmState('Pagamento confirmado', true);
    } else if (['FAILED', 'REFUNDED', 'CHARGEBACK', 'CHARGED_BACK', 'EXPIRED', 'CANCELED', 'REJECTED'].includes(status)) {
      setPixStatus('Pagamento não aprovado', 'error');
      if (pixPaymentHelp) pixPaymentHelp.textContent = 'Gere um novo Pix para tentar novamente.';
      setConfirmState('Gerar novo Pix', false);
    } else {
      setPixStatus('Aguardando pagamento', '');
      if (pixPaymentHelp) pixPaymentHelp.textContent = 'Depois de pagar, aguarde a confirmação automática.';
      setConfirmState('Aguardando pagamento Pix…', true);
    }
  }

  function applyServerPricing(order, pricing) {
    if (!pricing || typeof pricing !== 'object') return;
    const subtotal = Number(pricing.subtotal);
    const deliveryFee = Number(pricing.deliveryFee);
    const discountAmount = Number(pricing.discountAmount);
    const total = Number(pricing.total);
    if (![subtotal, deliveryFee, discountAmount, total].every(Number.isFinite)) return;

    order.subtotal = roundMoney(subtotal);
    order.deliveryFee = roundMoney(deliveryFee);
    order.discountAmount = roundMoney(Math.max(0, discountAmount));
    order.total = roundMoney(Math.max(0, total));
    const appliedCoupon = cleanText(pricing.couponApplied, 32).toLocaleLowerCase('pt-BR');
    if (order.couponCode && !appliedCoupon) {
      order.couponCode = '';
      if (couponCode) {
        couponCode.disabled = false;
        couponCode.placeholder = 'Digite seu cupom';
      }
      couponForm?.querySelector('button')?.removeAttribute('disabled');
      setCouponFeedback('O cupom informado não pôde ser aplicado a este pedido.', 'error');
    }
    if (appliedCoupon) order.couponCode = appliedCoupon;
    persistOrder(order);
    renderOrder(order);
    renderInstructions(getSelectedPayment(), order);
  }

  async function checkPixStatus(order) {
    const transactionId = cleanText(order?.pixPayment?.transactionId, 120);
    if (!transactionId || pixStatusRequest) return;
    pixStatusRequest = true;
    try {
      const response = await fetch(apiUrl('/api/bravopay/status?id=' + encodeURIComponent(transactionId)), {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'same-origin'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Não foi possível consultar o status do Pix.');
      const status = normalizePixStatus(data.status);
      const pix = getPixDetails(data);
      order.pixPayment.status = status;
      if (pix.code) order.pixPayment.code = pix.code;
      if (pix.image) order.pixPayment.image = pix.image;
      if (pix.expiresAt) order.pixPayment.expiresAt = pix.expiresAt;
      persistOrder(order);
      renderPixPayment(order.pixPayment);

      if (status === 'PAID') {
        clearPixPolling();
        redirectToThankYou(order);
      } else if (['FAILED', 'REFUNDED', 'CHARGEBACK', 'CHARGED_BACK', 'EXPIRED', 'CANCELED', 'REJECTED'].includes(status)) {
        clearPixPolling();
        delete order.pixPayment;
        persistOrder(order);
        showPixPaymentError('O pagamento Pix não foi aprovado. Gere um novo código para tentar novamente.');
        setConfirmState('Gerar novo Pix', false);
      }
    } catch {
      if (pixPaymentHelp) pixPaymentHelp.textContent = 'Não foi possível consultar agora. Tentaremos novamente automaticamente.';
    } finally {
      pixStatusRequest = false;
    }
  }

  function startPixPolling(order) {
    clearPixPolling();
    if (!order?.pixPayment?.transactionId) return;
    checkPixStatus(order);
    pixStatusTimer = window.setInterval(() => checkPixStatus(order), 3000);
  }

  async function createPixPayment(order) {
    if (pixCreationRequest) return;
    if (order.pixPayment?.transactionId && order.pixPayment?.code && !['FAILED', 'REFUNDED', 'CHARGEBACK', 'CHARGED_BACK', 'EXPIRED', 'CANCELED', 'REJECTED'].includes(normalizePixStatus(order.pixPayment.status))) {
      renderPixPayment(order.pixPayment);
      startPixPolling(order);
      return;
    }

    pixCreationRequest = true;
    paymentError.hidden = true;
    setConfirmState('Gerando Pix…', true);
    try {
      const response = await fetch(apiUrl('/api/bravopay/create'), {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          items: order.items,
          region: order.region,
          couponCode: order.couponCode || '',
          externalReference: getExternalReference(order),
          customer: {
            name: cleanText(order.name, 120),
            phone: cleanText(order.phone, 20)
          },
          utm: readAttribution()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(cleanText(data.error, 240) || 'Não foi possível gerar o Pix agora.');
      const transactionId = getPixTransactionId(data);
      const pix = getPixDetails(data);
      if (!transactionId || !pix.code) throw new Error('O Pix não retornou um código válido.');

      applyServerPricing(order, data.pricing);
      order.pixPayment = {
        transactionId,
        status: normalizePixStatus(data.status),
        code: pix.code,
        image: pix.image,
        expiresAt: pix.expiresAt,
        amount: roundMoney(data.amount || order.total)
      };
      persistOrder(order);
      renderPixPayment(order.pixPayment);
      startPixPolling(order);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Não foi possível gerar o Pix agora.');
      showPixPaymentError(error instanceof Error ? error.message : 'Não foi possível gerar o Pix agora.');
      setConfirmState('Tentar gerar Pix novamente', false);
    } finally {
      pixCreationRequest = false;
    }
  }

  function syncPixPaymentVisibility(method, order) {
    if (method !== 'pix') {
      clearPixPolling();
      hidePixPayment();
      setConfirmState(method === 'cash' ? 'Fazer pedido' : 'Prosseguir para o pagamento', false);
      return;
    }

    if (order?.pixPayment?.transactionId && order?.pixPayment?.code) {
      renderPixPayment(order.pixPayment);
      if (normalizePixStatus(order.pixPayment.status) === 'PAID') {
        redirectToThankYou(order);
      } else {
        startPixPolling(order);
      }
      return;
    }

    hidePixPayment();
    setConfirmState('Prosseguir para o pagamento', false);
  }

  function showError(message) {
    const safeMessage = cleanText(message, 240);
    const isConnectionError = safeMessage === CASH_PAYMENT_ERROR;
    paymentError.classList.toggle('is-connection-error', isConnectionError);
    paymentError.replaceChildren();

    if (isConnectionError) {
      const icon = document.createElement('span');
      icon.className = 'payment-error-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '!';

      const copy = document.createElement('span');
      copy.className = 'payment-error-copy';

      const title = document.createElement('strong');
      title.textContent = 'Não foi possível concluir agora';

      const detail = document.createElement('span');
      detail.textContent = 'A conexão parece instável ou está muito lenta. Verifique sua internet e tente novamente em alguns instantes.';

      const code = document.createElement('small');
      code.textContent = safeMessage;
      copy.append(title, detail, code);
      paymentError.append(icon, copy);
    } else {
      paymentError.textContent = safeMessage;
    }
    paymentError.hidden = false;
  }

  function setCouponFeedback(message, type = '') {
    if (!couponFeedback) return;
    couponFeedback.textContent = message;
    couponFeedback.classList.toggle('is-success', type === 'success');
    couponFeedback.classList.toggle('is-error', type === 'error');
  }

  function lockCouponInput(message) {
    if (couponCode) {
      couponCode.value = '';
      couponCode.placeholder = 'Cupom aplicado';
      couponCode.disabled = true;
    }
    couponForm?.querySelector('button')?.setAttribute('disabled', 'true');
    setCouponFeedback(message, 'success');
  }

  function persistOrder(order) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
      return true;
    } catch {
      setCouponFeedback('Não foi possível salvar o cupom nesta sessão.', 'error');
      return false;
    }
  }

  function applyCoupon(order) {
    const code = cleanText(couponCode?.value, 32).toLocaleLowerCase('pt-BR');
    if (order.couponCode) {
      setCouponFeedback('Um cupom já foi aplicado a este pedido.', 'error');
      return;
    }

    const subtotal = Math.max(0, Number(order.subtotal) || 0);
    const deliveryFee = Math.max(0, Number(order.deliveryFee) || 0);

    if (code === 'brasa10') {
      order.couponCode = 'brasa10';
      order.discountAmount = roundMoney(subtotal * 0.1);
      order.total = Math.max(0, roundMoney(subtotal - order.discountAmount + deliveryFee));
      const hadPix = invalidatePixForPriceChange(order);
      if (!persistOrder(order)) return;

      renderOrder(order);
      const selectedMethod = getSelectedPayment();
      renderInstructions(selectedMethod, order);
      lockCouponInput('Desconto de 10% aplicado ao seu primeiro pedido.');
      syncPixPaymentVisibility(selectedMethod, order);
      if (hadPix) {
        setCouponFeedback('Desconto aplicado. Gere um novo Pix com o valor atualizado.', 'success');
      }
      return;
    }

    if (code !== 'taxafree') {
      setCouponFeedback('Cupom inválido. Confira o código e tente novamente.', 'error');
      return;
    }

    order.couponCode = 'taxafree';
    order.discountAmount = 0;
    order.deliveryFee = 0;
    order.total = subtotal;
    const hadPix = invalidatePixForPriceChange(order);
    if (!persistOrder(order)) return;

    renderOrder(order);
    const selectedMethod = getSelectedPayment();
    renderInstructions(selectedMethod, order);
    lockCouponInput('Cupom aplicado: taxa de entrega grátis.');
    syncPixPaymentVisibility(selectedMethod, order);
    if (hadPix) {
      setCouponFeedback('Cupom aplicado. Gere um novo Pix com a taxa atualizada.', 'success');
    }
  }

  function buildMessage(order, method, cashDetails) {
    const methodLabel = method === 'cash' ? 'Dinheiro (na entrega)' : 'Pix';
    const items = order.items.map((item) => {
      const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      const name = cleanText(item.name, 120);
      const details = item.details ? ` (${cleanText(item.details, 400)})` : '';
      return `${qty}x ${name}${details}`;
    }).join(', ');

    return [
      'Olá! Gostaria de confirmar meu pedido:',
      '',
      `Nome: ${cleanText(order.name, 80)}`,
      `Telefone: ${cleanText(order.phone, 20)}`,
      '',
      items,
      '',
      `Endereço de entrega: ${cleanText(order.address, 240)}`,
      `Região de entrega: ${cleanText(order.regionLabel, 60)}`,
      `Forma de pagamento: ${methodLabel}`,
      ...(Number(order.discountAmount) > 0 ? [`Desconto aplicado: -${formatMoney(order.discountAmount)}`] : []),
      ...(order.couponCode ? [`Cupom de desconto: ${cleanText(order.couponCode, 32).toUpperCase()}`] : []),
      ...(method === 'cash' && cashDetails?.requested
        ? [`Valor entregue: ${formatMoney(cashDetails.paidAmount)}`, `Troco solicitado: ${formatMoney(cashDetails.change)}`]
        : []),
      `Taxa de entrega: ${formatMoney(order.deliveryFee)}`,
      `Total: ${formatMoney(order.total)}`,
      '',
      method === 'cash'
        ? 'Farei o pagamento em dinheiro no momento da entrega.'
        : 'Pagamento via Pix confirmado. Aguardo a confirmação do pedido.'
    ].join('\n');
  }

  function redirectToThankYou(order) {
    if (redirectedAfterPaid) return;
    redirectedAfterPaid = true;
    clearPixPolling();
    paymentError.hidden = true;
    order.paymentConfirmed = true;
    persistOrder(order);
    const thankYouPath = window.location.protocol === 'file:'
      ? `${API_BASE}/obrigado`
      : '/obrigado';
    const thankYouUrl = new URL(thankYouPath, window.location.href);
    thankYouUrl.searchParams.set('transaction_id', cleanText(order.pixPayment?.transactionId, 120));
    window.location.assign(thankYouUrl.toString());
  }

  function confirmOrder(order) {
    const method = getSelectedPayment();
    if (!['pix', 'cash'].includes(method)) {
      showError('Selecione uma forma de pagamento para continuar.');
      return;
    }

    if (method === 'pix') {
      if (normalizePixStatus(order.pixPayment?.status) === 'PAID') {
        redirectToThankYou(order);
      } else {
        createPixPayment(order);
      }
      return;
    }

    showError(CASH_PAYMENT_ERROR);
    return;
  }

  copyFirstOrderCode?.addEventListener('click', async () => {
    const originalLabel = copyFirstOrderCode.textContent;
    const copied = await copyText('BRASA10');
    copyFirstOrderCode.textContent = copied ? 'Copiado!' : 'Tente novamente';
    copyFirstOrderCode.classList.toggle('is-copied', copied);
    window.setTimeout(() => {
      copyFirstOrderCode.textContent = originalLabel;
      copyFirstOrderCode.classList.remove('is-copied');
    }, 1800);
  });

  pixCopyCode?.addEventListener('click', async () => {
    const code = cleanText(pixPaymentCode?.value, 20000);
    if (!code) return;
    const originalLabel = pixCopyCode.textContent;
    const copied = await copyText(code);
    pixCopyCode.textContent = copied ? 'Código copiado!' : 'Tente novamente';
    window.setTimeout(() => {
      pixCopyCode.textContent = originalLabel;
    }, 1800);
  });

  paymentSectionToggle?.addEventListener('click', () => {
    const isOpen = paymentSectionToggle.getAttribute('aria-expanded') === 'true';
    setPaymentSectionOpen(!isOpen);
  });

  const order = readOrder();
  if (!order) {
    orderContent.hidden = true;
    missingState.hidden = false;
    return;
  }

  renderOrder(order);
  renderPaymentUpsell(order);
  if (order.couponCode === 'taxafree') {
    lockCouponInput('Cupom aplicado: taxa de entrega grátis.');
  } else if (order.couponCode === 'brasa10') {
    lockCouponInput('Desconto de 10% aplicado ao seu primeiro pedido.');
  }
  const initialPayment = order.payment === 'cash' ? 'cash' : 'pix';
  paymentRadios.forEach((radio) => {
    radio.checked = radio.value === initialPayment;
    radio.addEventListener('change', () => {
      paymentError.hidden = true;
      syncPaymentSelection();
      const selectedPayment = getSelectedPayment();
      renderInstructions(selectedPayment, order);
      syncPixPaymentVisibility(selectedPayment, order);
    });
  });
  syncPaymentSelection();
  renderInstructions(initialPayment, order);
  syncPixPaymentVisibility(initialPayment, order);
  cashChangeToggle?.addEventListener('click', () => {
    cashChangeRequested = !cashChangeRequested;
    cashChangeFields.hidden = !cashChangeRequested;
    cashChangeToggle.classList.toggle('is-active', cashChangeRequested);
    cashChangeToggle.setAttribute('aria-expanded', String(cashChangeRequested));
    cashChangeToggle.textContent = cashChangeRequested ? 'Não preciso de troco' : 'Precisa de troco?';
    updateCashChangePreview(order);
    if (cashChangeRequested) cashAmount?.focus();
  });
  cashAmount?.addEventListener('input', () => updateCashChangePreview(order));
  couponForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyCoupon(order);
  });
  paymentUpsellButton?.addEventListener('click', () => addPaymentUpsell(order));
  confirmPayment.addEventListener('click', () => confirmOrder(order));
}());
