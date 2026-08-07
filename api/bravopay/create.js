'use strict';

const {
  bravopayRequest,
  cleanText,
  createError,
  methodNotAllowed,
  parseRequestBody,
  roundMoney,
  safeImage,
  sendJson
} = require('../_bravopay');

const CASCAVEL_NEIGHBORHOODS = Object.freeze([
  'cascavel-14-de-novembro', 'cascavel-alto-alegre', 'cascavel-brasilia',
  'cascavel-brasmadeira', 'cascavel-canada', 'cascavel-cancelli',
  'cascavel-cascavel-velho', 'cascavel-cataratas', 'cascavel-centro',
  'cascavel-coqueiral', 'cascavel-country', 'cascavel-esmeralda',
  'cascavel-floresta', 'cascavel-guaruja', 'cascavel-interlagos',
  'cascavel-maria-luiza', 'cascavel-morumbi', 'cascavel-neva',
  'cascavel-pacaembu', 'cascavel-parque-sao-paulo', 'cascavel-parque-verde',
  'cascavel-periolo', 'cascavel-pioneiros-catarinenses', 'cascavel-recanto-tropical',
  'cascavel-regiao-do-lago', 'cascavel-santa-cruz', 'cascavel-santa-felicidade',
  'cascavel-santo-inacio', 'cascavel-santos-dumont', 'cascavel-sao-cristovao',
  'cascavel-universitario'
]);

const DELIVERY_FEES = Object.freeze(
  Object.fromEntries([...CASCAVEL_NEIGHBORHOODS.map((region) => [region, 12]), ['toledo', 32]])
);

const CATALOG = Object.freeze([
  ['Picanha na Brasa', 39.90],
  ['Costela Bovina Assada', 46.90],
  ['Costela Suína BBQ', 39.90],
  ['Frango na Brasa', 29.90],
  ['Combo Família', 115.90],
  ['Combo Churrasqueiro', 149.90],
  ['Coca-Cola Lata', 6.50],
  ['Coca-Cola Lata Zero Açúcar', 7.50],
  ['Sprite Lata', 5.50],
  ['Fanta Uva Lata', 6.00],
  ['Fanta Laranja Lata', 6.00],
  ['Coca-Cola 2L', 13.50],
  ['Coca-Cola Zero Açúcar 2L', 13.50],
  ['Sprite 2L', 13.50],
  ['Fanta Uva 2L', 13.50],
  ['Fanta Laranja 2L', 13.50],
  ['Coca-Cola 2L Extra da Oferta', 6.50],
  ['Água com Gás', 4.90],
  ['Água sem Gás', 4.90],
  ['Pudim Cremoso', 12.90],
  ['Brownie da Brasa', 14.90],
  ['Kit Brasa Completo', 88.90]
].map(([name, price]) => Object.freeze({ name, price })));

const CATALOG_BY_NAME = new Map(CATALOG.map((product) => [normalizeName(product.name), product]));
const UTM_FIELDS = Object.freeze([
  ['source', 'utm_source'],
  ['medium', 'utm_medium'],
  ['campaign', 'utm_campaign'],
  ['content', 'utm_content'],
  ['term', 'utm_term'],
  ['fbclid', 'fbclid'],
  ['ttclid', 'ttclid'],
  ['gclid', 'gclid']
]);
const MAX_ORDER_AMOUNT_CENTS = 10000000;

function normalizeName(value) {
  return cleanText(value, 120)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeItems(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) {
    throw createError('O pedido não possui itens válidos.', 'INVALID_ORDER', 400);
  }
  return value.map((item) => {
    const product = CATALOG_BY_NAME.get(normalizeName(item && item.name));
    const qty = Math.trunc(Number(item && item.qty));
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw createError('Um dos itens do pedido não está disponível.', 'INVALID_ORDER', 400);
    }
    return { ...product, qty };
  });
}

function normalizeCustomer(value) {
  const customer = value && typeof value === 'object' ? value : {};
  const name = cleanText(customer.name, 120);
  const email = cleanText(customer.email, 160).toLocaleLowerCase('pt-BR');
  const phone = cleanText(customer.phone, 20).replace(/\D/g, '');
  if (name.length < 2) throw createError('Informe o nome do pagador.', 'INVALID_CUSTOMER', 400);
  if (phone.length < 10 || phone.length > 15) throw createError('Informe um telefone válido.', 'INVALID_CUSTOMER', 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError('Informe um e-mail válido.', 'INVALID_CUSTOMER', 400);
  }
  return email ? { name, email, phone } : { name, phone };
}

function normalizeUtm(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(UTM_FIELDS.map(([apiKey, urlKey]) => [
    apiKey,
    cleanText(source[apiKey] || source[urlKey], 200)
  ]));
}

function normalizeCoupon(value) {
  return cleanText(value, 32).toLocaleLowerCase('pt-BR');
}

function calculatePricing(items, region, coupon) {
  if (!Object.prototype.hasOwnProperty.call(DELIVERY_FEES, region)) {
    throw createError('Selecione uma região de entrega válida.', 'INVALID_ORDER', 400);
  }
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.qty, 0));
  const discountAmount = coupon === 'brasa10' ? roundMoney(subtotal * 0.1) : 0;
  const privateCoupon = normalizeCoupon(process.env.TAXAFREE_COUPON || 'taxafree');
  const freeDelivery = Boolean(coupon && coupon === privateCoupon);
  const deliveryFee = freeDelivery ? 0 : DELIVERY_FEES[region];
  const total = roundMoney(Math.max(0, subtotal - discountAmount + deliveryFee));
  const amountCents = Math.round(total * 100);
  if (!Number.isInteger(amountCents) || amountCents < 500 || amountCents > MAX_ORDER_AMOUNT_CENTS) {
    throw createError('O valor do pedido não é válido.', 'INVALID_ORDER', 400);
  }
  return {
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    amountCents,
    couponApplied: coupon === 'brasa10' || freeDelivery ? coupon : ''
  };
}

function normalizeStatus(value) {
  const status = cleanText(value, 32).toUpperCase();
  return status === 'COMPLETED' || status === 'SUCCESS' ? 'PAID' : status || 'PENDING';
}

function getTransactionSource(provider) {
  const root = provider && typeof provider === 'object' ? provider : {};
  const candidates = [
    root,
    root.data,
    root.transaction,
    root.data && root.data.transaction,
    root.result,
    root.data && root.data.data
  ].filter((candidate) => candidate && typeof candidate === 'object');
  return candidates.find((candidate) => (
    candidate.id || candidate.transaction_id || candidate.pix || candidate.copy_paste || candidate.code
  )) || root;
}

function extractTransaction(provider) {
  const source = getTransactionSource(provider);
  const pix = typeof source.pix === 'string'
    ? { copy_paste: source.pix }
    : source.pix && typeof source.pix === 'object'
      ? source.pix
      : {};
  return {
    transactionId: cleanText(source.id || source.transaction_id, 120),
    status: normalizeStatus(source.status),
    code: cleanText(
      pix.copy_paste || pix.copyPaste || pix.copyPasteCode || pix.code || pix.qr_code ||
      pix.pix_code || source.copy_paste || source.copyPaste || source.code,
      20000
    ),
    expiresAt: cleanText(pix.expires_at || pix.expiresAt, 80),
    image: safeImage(pix.image || pix.qr_code_image || pix.qrCodeImage || pix.url)
  };
}

function errorResponse(error) {
  if (error && error.code === 'CONFIG_MISSING') {
    return { status: 500, message: 'O pagamento Pix ainda não está configurado no servidor.' };
  }
  if (error && error.code === 'INVALID_BODY') return { status: 400, message: error.message };
  if (error && (error.code === 'INVALID_ORDER' || error.code === 'INVALID_CUSTOMER')) {
    return { status: 400, message: error.message };
  }
  if (error && (error.status === 401 || error.status === 403)) {
    return { status: 502, message: 'A credencial do BravoPay foi recusada. Verifique a configuração do servidor.' };
  }
  if (error && error.status === 429) {
    return { status: 503, message: 'O gateway está temporariamente ocupado. Tente novamente em instantes.' };
  }
  return { status: 502, message: 'Não foi possível gerar o Pix agora. Tente novamente em instantes.' };
}

module.exports = async function createBravoPayTransaction(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = parseRequestBody(req);
    const items = normalizeItems(body.items);
    const region = cleanText(body.region, 80);
    const coupon = normalizeCoupon(body.couponCode);
    const pricing = calculatePricing(items, region, coupon);
    const customer = normalizeCustomer(body.customer);
    const externalReference = cleanText(body.externalReference, 120) || `churrasco-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const utm = normalizeUtm(body.utm);
    const productId = cleanText(process.env.BRAVOPAY_PRODUCT_ID, 120);
    const requestBody = {
      amount_cents: pricing.amountCents,
      method: 'pix',
      customer,
      description: `Pedido Churrasco & Brasa · ${items.map((item) => `${item.qty}x ${item.name}`).join(', ')}`.slice(0, 300),
      external_reference: externalReference,
      metadata: {
        delivery_region: region,
        coupon: pricing.couponApplied || ''
      },
      utm
    };
    if (productId) requestBody.product_id = productId;

    const provider = await bravopayRequest('/transactions', {
      method: 'POST',
      headers: { 'Idempotency-Key': externalReference },
      body: JSON.stringify(requestBody)
    });
    const transaction = extractTransaction(provider);
    if (!transaction.transactionId || !transaction.code) {
      throw createError('O BravoPay não retornou um código Pix válido.', 'BRAVOPAY_INVALID_RESPONSE', 502);
    }

    sendJson(res, 200, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: pricing.total,
      amountCents: pricing.amountCents,
      pricing,
      pix: {
        code: transaction.code,
        expiresAt: transaction.expiresAt,
        image: transaction.image
      }
    });
  } catch (error) {
    const result = errorResponse(error);
    sendJson(res, result.status, { error: result.message });
  }
};
