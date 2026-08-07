import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const maxBodySize = 100000;

function loadLocalEnv() {
  try {
    const source = readFileSync(path.join(rootDirectory, '.env'), 'utf8');
    source.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!match || match[1].startsWith('#') || process.env[match[1]]) return;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    });
  } catch {
    // O ambiente hospedado fornece as variáveis diretamente.
  }
}

loadLocalEnv();

const port = Number(process.env.PORT || 4173);

const require = createRequire(import.meta.url);
const createBravoPay = require('./api/bravopay/create.js');
const bravoPayStatus = require('./api/bravopay/status.js');
const bravoPayWebhook = require('./api/bravopay/webhook.js');

const mimeTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webp': 'image/webp'
});

function allowLocalCors(req, res) {
  const origin = String(req.headers.origin || '');
  const localOrigins = new Set(['null', `http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  if (!localOrigins.has(origin)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function sendText(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

function wrapApiResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    end(value) {
      res.end(value);
    }
  };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodySize) throw new Error('Payload muito grande.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handleApi(req, res, url) {
  const handler = url.pathname === '/api/bravopay/create'
    ? createBravoPay
    : url.pathname === '/api/bravopay/status'
      ? bravoPayStatus
      : url.pathname === '/api/bravopay/webhook'
        ? bravoPayWebhook
        : null;
  if (!handler) return false;

  let rawBody = Buffer.alloc(0);
  if ((url.pathname === '/api/bravopay/create' || url.pathname === '/api/bravopay/webhook') && req.method === 'POST') {
    try {
      rawBody = await readBody(req);
    } catch {
      sendText(res, 413, 'Payload inválido.');
      return true;
    }
  }

  const apiRequest = {
    method: req.method,
    rawBody,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: req.headers
  };
  const apiResponse = wrapApiResponse(res);
  await handler(apiRequest, apiResponse);
  return true;
}

async function serveStatic(res, pathname) {
  const requestedPath = pathname === '/'
    ? '/index.html'
    : pathname === '/obrigado'
      ? '/obrigado.html'
      : pathname;
  const filePath = path.resolve(rootDirectory, `.${requestedPath}`);
  if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
    sendText(res, 403, 'Acesso negado.');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(file);
  } catch (error) {
    sendText(res, error.code === 'ENOENT' ? 404 : 500, 'Arquivo não encontrado.');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    allowLocalCors(req, res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (await handleApi(req, res, url)) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Método não permitido.');
      return;
    }
    await serveStatic(res, url.pathname);
  } catch {
    if (!res.writableEnded) sendText(res, 500, 'Erro interno.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Churrasco & Brasa disponível em http://127.0.0.1:${port}`);
});
