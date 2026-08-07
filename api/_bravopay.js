'use strict';

// Helpers compartilhados da integração BravoPay.
// A chave nunca é enviada ao navegador: todas as chamadas ao gateway passam por este módulo.
const BRAVOPAY_API_BASE_URL = (process.env.BRAVOPAY_API_BASE_URL || 'https://bravopay.club/api/v1').replace(/\/+$/, '');

function createError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function getApiKey() {
  const apiKey = String(process.env.BRAVOPAY_API_KEY || '').trim();
  if (!apiKey) {
    throw createError('A chave do BravoPay ainda não foi configurada no servidor.', 'CONFIG_MISSING', 500);
  }
  return apiKey;
}

function parseRequestBody(req) {
  if (req && req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const rawBody = req && (req.rawBody || req.body);
  if (!rawBody) return {};
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  if (text.length > 100000) throw createError('Payload muito grande.', 'INVALID_BODY', 413);
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid object');
    return parsed;
  } catch {
    throw createError('Payload inválido.', 'INVALID_BODY', 400);
  }
}

function cleanText(value, maxLength = 240) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function roundMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Método não permitido.' });
}

function safeImage(value) {
  const image = cleanText(value, 200000);
  return /^https:\/\//i.test(image) || /^data:image\//i.test(image) ? image : '';
}

function providerErrorMessage(data, fallback) {
  const error = data && typeof data.error === 'object' ? data.error : data && data.error;
  return cleanText(error && typeof error === 'object' ? error.message : error, 240) || fallback;
}

async function bravopayRequest(path, options = {}) {
  const apiKey = getApiKey();
  const response = await fetch(`${BRAVOPAY_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw createError(
      providerErrorMessage(data, 'O BravoPay recusou a solicitação.'),
      'BRAVOPAY_REQUEST_FAILED',
      response.status
    );
  }
  return data;
}

function getHeader(req, name) {
  const headers = req && req.headers ? req.headers : {};
  const target = name.toLowerCase();
  const key = Object.keys(headers).find((headerName) => headerName.toLowerCase() === target);
  const value = key ? headers[key] : '';
  return Array.isArray(value) ? value[0] : String(value || '');
}

module.exports = {
  bravopayRequest,
  cleanText,
  createError,
  getHeader,
  methodNotAllowed,
  parseRequestBody,
  roundMoney,
  safeImage,
  sendJson
};
