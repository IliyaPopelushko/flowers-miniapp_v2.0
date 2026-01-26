// ============================================
// GET /api/admin-products — Получение товаров из ВК
// ============================================

import jwt from 'jsonwebtoken';

// Используем сервисный ключ для market.get
const VK_SERVICE_TOKEN2 = process.env.VK_SERVICE_TOKEN2;
const VK_GROUP_ID = process.env.VK_GROUP_ID || '229962076';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Проверка JWT токена
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка авторизации админа
  const admin = verifyToken(req.headers.authorization);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Проверка наличия сервисного ключа
  if (!VK_SERVICE_TOKEN2) {
    console.error('VK_SERVICE_TOKEN2 not configured');
    return res.status(500).json({ 
      error: 'VK_SERVICE_TOKEN2 не настроен',
      details: 'Добавьте сервисный ключ VK в настройки Vercel'
    });
  }

  try {
    // Получаем товары из ВК (используем сервисный ключ)
    const params = new URLSearchParams({
      owner_id: `-${VK_GROUP_ID}`,
      count: 100,
      extended: 1,
      access_token: VK_SERVICE_TOKEN2,
      v: '5.199'
    });

    console.log(`📦 Fetching products for group ${VK_GROUP_ID}...`);

    const response = await fetch(
      `https://api.vk.com/method/market.get?${params}`
    );
    const data = await response.json();

    if (data.error) {
      console.error('VK API error:', JSON.stringify(data.error));
      return res.status(500).json({ 
        error: 'VK API error', 
        details: data.error.error_msg,
        error_code: data.error.error_code
      });
    }

    // Форматируем товары
    const products = (data.response?.items || []).map(item => ({
      id: String(item.id),
      name: item.title,
      description: item.description || '',
      price: item.price?.amount ? Math.floor(item.price.amount / 100) : 0,
      photo: item.thumb_photo || '',
      availability: item.availability
    })).filter(p => p.availability === 0); // Только доступные

    console.log(`📦 Loaded ${products.length} products from VK`);

    return res.status(200).json({
      success: true,
      products
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
