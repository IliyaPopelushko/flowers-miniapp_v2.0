import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;

// Middleware для проверки админа
async function checkAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Проверяем роль (при входе по паролю ставится role: 'admin')
    if (decoded.role === 'admin') {
      return decoded;
    }
    
    // Или проверяем vk_id в списке админов
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_vk_ids')
      .single();

    if (settings?.value?.includes(decoded.vk_id)) {
      return decoded;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const admin = await checkAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    // GET — получение настроек или товаров VK
    if (req.method === 'GET') {
      const { action } = req.query;

      // Получаем товары из VK
      if (action === 'vk_products') {
        const url = `https://api.vk.com/method/market.get?owner_id=-${VK_GROUP_ID}&count=100&access_token=${VK_SERVICE_TOKEN}&v=5.131`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          console.error('VK market error:', data.error);
          return res.status(500).json({ error: 'Ошибка получения товаров VK' });
        }

        const products = data.response?.items?.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price?.amount ? Math.round(item.price.amount / 100) : 0,
          photo: item.thumb_photo,
          description: item.description
        })) || [];

        return res.status(200).json({ products });
      }

      // Получаем настройки букетов
      const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['bouquet_economy', 'bouquet_medium', 'bouquet_premium']);

      if (error) {
        console.error('Settings fetch error:', error);
        return res.status(500).json({ error: 'Ошибка загрузки настроек' });
      }

      const result = {};
      settings.forEach(s => {
        result[s.key] = s.value;
      });

      return res.status(200).json({ settings: result });
    }

    // POST — сохранение настроек букетов
    if (req.method === 'POST') {
      const { bouquet_economy, bouquet_medium, bouquet_premium } = req.body;

      const updates = [];
      
      if (bouquet_economy !== undefined) {
        updates.push({ key: 'bouquet_economy', value: bouquet_economy });
      }
      if (bouquet_medium !== undefined) {
        updates.push({ key: 'bouquet_medium', value: bouquet_medium });
      }
      if (bouquet_premium !== undefined) {
        updates.push({ key: 'bouquet_premium', value: bouquet_premium });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });

        if (error) {
          console.error('Settings update error:', error);
          return res.status(500).json({ error: 'Ошибка сохранения' });
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
