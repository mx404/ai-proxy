const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

export default async (req, res) => {
  // 允许跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 验证访问令牌
    const token = req.query.access_token;
    if (!token || token !== ACCESS_TOKEN) {
      return res.status(401).json({ error: "无效访问令牌" });
    }
    
    // 获取用户API密钥
    const userKey = req.query.api_key;
    if (!userKey) return res.status(400).json({ error: "缺少API密钥" });
    
    // 提取必要参数
    const { 
      model = 'gemini-1.5-pro-latest', 
      prompt,
      temperature = 0.9,
      max_tokens = 2048,
      messages = []  // 支持消息数组格式
    } = req.body;
    
    // 转换消息格式为 Gemini 兼容格式
    const contents = messages.length > 0
      ? messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      : [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }];
    
    // 构建 Gemini 兼容的请求体
    const payload = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    };
    
    // 添加安全设置（Gemini 必需）
    if (!req.body.safetySettings) {
      payload.safetySettings = [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        }
      ];
    }
    
    // 发送请求到 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Gemini 可选但推荐的自定义头
          'x-goog-user-project': 'cherrystudio-proxy',
          'x-goog-api-client': 'cherrystudio/1.0'
        },
        body: JSON.stringify(payload)
      }
    );
    
    // 处理 Gemini 响应
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API 错误:', response.status, errorData);
      return res.status(response.status).json({
        error: `Gemini API 错误 (${response.status})`,
        details: errorData
      });
    }
    
    const data = await response.json();
    
    // 转换响应为兼容格式
    const result = {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: data.candidates?.map(candidate => ({
        message: {
          role: "assistant",
          content: candidate.content?.parts?.[0]?.text || ""
        }
      })) || []
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Gemini代理错误:', error);
    res.status(500).json({ 
      error: '代理请求失败',
      details: error.message
    });
  }
};
