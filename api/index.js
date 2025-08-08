// api/proxy.js
const GEMINI = 'https://generativelanguage.googleapis.com';
const OPENAI = 'https://api.openai.com';

// 从环境变量读取密钥
const { PROXY_KEY } = process.env;

export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 简单 API Key 校验
  if (req.headers['x-proxy-key'] !== PROXY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 路由分发
  const { pathname, search } = new URL(req.url, `http://localhost`);
  let upstream;
  if (pathname.startsWith('/gemini')) {
    upstream = GEMINI + pathname.replace('/gemini', '') + search;
  } else if (pathname.startsWith('/chatgpt')) {
    upstream = OPENAI + pathname.replace('/chatgpt', '') + search;
  } else {
    return res.status(400).json({ error: 'Use /gemini/* or /chatgpt/*' });
  }

  // 3. 透传 headers & body
  const headers = { ...req.headers };
  delete headers.host;
  const body = req.method !== 'GET' ? JSON.stringify(req.body) : undefined;

  const r = await fetch(upstream, { method: req.method, headers, body });
  const data = await r.text();
  res.status(r.status).send(data);
}
