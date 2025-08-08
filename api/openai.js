// 验证访问令牌
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

export default async (req, res) => {
  // 允许跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    // 验证访问令牌
    const token = req.query.access_token;
    if (!token || token !== ACCESS_TOKEN) {
      return res.status(401).json({ error: "无效访问令牌" });
    }
    
    // 获取用户API密钥
    const userKey = req.query.api_key;
    if (!userKey) return res.status(400).json({ error: "缺少API密钥" });
    
    // 转发到OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    // 返回结果
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('OpenAI代理错误:', error);
    res.status(500).json({ error: '代理请求失败' });
  }
};
