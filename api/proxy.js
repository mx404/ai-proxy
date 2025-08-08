// api/proxy.js  ——  统一反向代理：/gemini/* 和 /chatgpt/*
const GEMINI  = 'https://generativelanguage.googleapis.com';
const OPENAI  = 'https://api.openai.com';

export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { pathname, search } = new URL(req.url, `http://localhost`);
  let upstream;
  if (pathname.startsWith('/gemini')) {
    upstream = GEMINI + pathname.replace('/gemini', '') + search;
  } else if (pathname.startsWith('/chatgpt')) {
    upstream = OPENAI + pathname.replace('/chatgpt', '') + search;
  } else {
    return res.status(400).json({ error: 'Use /gemini/* or /chatgpt/*' });
  }

  // 透传 headers & body
  const headers = { ...req.headers };
  delete headers.host;   // 让上游自己填
  const body = req.method !== 'GET' ? JSON.stringify(req.body) : undefined;

  const r = await fetch(upstream, { method: req.method, headers, body });
  const data = await r.text();
  res.status(r.status).send(data);
}
