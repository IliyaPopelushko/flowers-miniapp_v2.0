// ============================================
// GET /api/admin-products — Получение товаров из ВК
// ============================================

import { supabase } from '../lib/supabase.js';

const VK_API_TOKEN = process.env.VK_API_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID || '136756716';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

  // Проверка авторизации
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Получаем товары из ВК
    const params = new URLSearchParams({
      owner_id: `-${VK_GROUP_ID}`,
      count: 100,
      extended: 1,
      access_token: VK_API_TOKEN,
      v: '5.131'
    });

    const response = await fetch(
      `https://api.vk.com/method/market.get?${params}`
    );
    const data = await response.json();

    if (data.error) {
      console.error('VK API error:', data.error);
      return res.status(500).json({ 
        error: 'VK API error', 
        details: data.error.error_msg 
      });
    }

    // Форматируем товары
    const products = (data.response?.items || []).map(item => ({
      id: String(item.id),
      name: item.title,
      description: item.description || '',
      price: item.price?.amount ? Math.floor(item.price.amount / 100) : 0,
      photo: item.thumb_photo || '',
      availability: item.availability // 0 - доступен, 1 - удалён, 2 - недоступен
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
