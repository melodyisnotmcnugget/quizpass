const https = require('https');

module.exports = (req, res) => {
  // === 👇 必须添加的 CORS 跨域配置（救命用的三行） 👇 ===
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允许任何前端（包括 Netlify）访问
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理浏览器的 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // === 👆 跨域配置结束 👆 ===

  if (req.method !== 'POST') return res.status(405).end();

  // 解析 JSON body
  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', () => {
    const { prompt } = JSON.parse(body || '{}');
    if (!prompt) return res.status(400).json({ error: 'Need prompt' });

    const payload = JSON.stringify({
      model: 'deepseek-chat',
      stream: true,
      messages: [
        { role: 'system', content: '你是刷题讲解老师，回答200字以内。' },
        { role: 'user',   content: prompt }
      ]
    });

    const ds = https.request(
      {
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        }
      },
      dsRes => {
        // 告诉浏览器：SSE 流
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        dsRes.on('data', chunk => res.write(chunk)); // 逐块转发
        dsRes.on('end',  () => res.end());           // 结束
      }
    );

    ds.on('error', e => res.end(`data: {"error":"${e}"}\n\n`));
    ds.write(payload);
    ds.end();
  });
};
