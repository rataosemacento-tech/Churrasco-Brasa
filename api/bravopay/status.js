'use strict';

const {
  bravopayRequest,
  cleanText,
  methodNotAllowed,
  safeImage,
  sendJson
} = require('../_bravopay');

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

function extractTransaction(provider, fallbackId) {
  const source = getTransactionSource(provider);
  const pix = typeof source.pix === 'string'
    ? { copy_paste: source.pix }
    : source.pix && typeof source.pix === 'object'
      ? source.pix
      : {};
  return {
    transactionId: cleanText(source.id || source.transaction_id || fallbackId, 120),
    status: normalizeStatus(source.status),
    pix: {
      code: cleanText(
        pix.copy_paste || pix.copyPaste || pix.copyPasteCode || pix.code || pix.qr_code ||
        pix.pix_code || source.copy_paste || source.copyPaste || source.code,
        20000
      ),
      expiresAt: cleanText(pix.expires_at || pix.expiresAt, 80),
      image: safeImage(pix.image || pix.qr_code_image || pix.qrCodeImage || pix.url)
    }
  };
}

module.exports = async function getBravoPayTransactionStatus(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const id = cleanText(req.query && req.query.id, 120);
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    sendJson(res, 400, { error: 'Identificador da transação não informado.' });
    return;
  }

  try {
    const provider = await bravopayRequest(`/transactions/${encodeURIComponent(id)}`, { method: 'GET' });
    sendJson(res, 200, extractTransaction(provider, id));
  } catch {
    sendJson(res, 502, { error: 'Não foi possível consultar o status do Pix agora.' });
  }
};
