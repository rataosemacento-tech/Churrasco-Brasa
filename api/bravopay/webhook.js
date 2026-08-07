'use strict';

const crypto = require('node:crypto');
const {
  cleanText,
  createError,
  getHeader,
  methodNotAllowed,
  parseRequestBody,
  sendJson
} = require('../_bravopay');

// O bodyParser precisa ficar desligado no Vercel para validar o HMAC sobre o corpo cru.
module.exports.config = { api: { bodyParser: false } };

const seenEventIds = new Set();

function readRawBody(req) {
  if (Buffer.isBuffer(req && req.rawBody)) return Promise.resolve(req.rawBody.toString('utf8'));
  if (typeof (req && req.rawBody) === 'string') return Promise.resolve(req.rawBody);
  if (Buffer.isBuffer(req && req.body)) return Promise.resolve(req.body.toString('utf8'));
  if (typeof (req && req.body) === 'string') return Promise.resolve(req.body);
  if (!req || typeof req.on !== 'function') return Promise.resolve('');

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 100000) {
        reject(createError('Payload muito grande.', 'INVALID_BODY', 413));
        req.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function verifySignature(rawBody, headerValue, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(String(headerValue || '').split(',').map((part) => {
    const separator = part.indexOf('=');
    return separator > 0 ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] : ['', ''];
  }).filter(([key, value]) => key && value));
  const timestamp = Number(parts.t);
  const provided = String(parts.v1 || '').toLowerCase();
  if (!timestamp || !/^[a-f0-9]{64}$/.test(provided)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = async function receiveBravoPayWebhook(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const secret = String(process.env.BRAVOPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    sendJson(res, 503, { error: 'Webhook ainda não configurado.' });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = getHeader(req, 'BravoPay-Signature') || getHeader(req, 'X-Bravopay-Signature');
    if (!rawBody || !verifySignature(rawBody, signature, secret)) {
      sendJson(res, 401, { error: 'Assinatura do webhook inválida.' });
      return;
    }

    const payload = parseRequestBody({ rawBody });
    const eventId = cleanText(payload.id, 120);
    const eventType = cleanText(payload.type || payload.event, 80);
    const transaction = payload.data || payload.transaction || {};
    const transactionId = cleanText(transaction.id || transaction.transaction_id, 120);
    if (!eventId || !eventType || !transactionId) {
      sendJson(res, 400, { error: 'Evento de webhook incompleto.' });
      return;
    }

    // Dedupe em memória evita reprocessar retries no mesmo processo.
    // Em produção, grave eventId/status em banco para dedupe durável e fulfillment.
    if (!seenEventIds.has(eventId)) {
      seenEventIds.add(eventId);
      if (seenEventIds.size > 10000) seenEventIds.delete(seenEventIds.values().next().value);
      console.log(JSON.stringify({ source: 'bravopay-webhook', eventId, eventType, transactionId }));
    }

    sendJson(res, 200, { received: true });
  } catch (error) {
    const status = error && error.status === 413 ? 413 : 400;
    sendJson(res, status, { error: 'Não foi possível processar o webhook.' });
  }
};
