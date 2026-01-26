// ============================================
// /api/admin-settings — Настройки магазина и букетов
// ============================================

import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Проверка авторизации
  const admin = verifyToken(req.headers.authorization);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return getSettings(req, res);
  }

  if (req.method === 'PUT') {
    return updateSettings(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getSettings(req, res) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Если настроек нет — возвращаем дефолтные
    const settings = data || {
      shop_name: 'Цветы в лесопарке',
      shop_address: 'посёлок Лесопарк 30',
      shop_phone: '+7 912 797 1348',
      shop_hours: 'с 8:00 до 21:00',
      bouquet_economy_vk_id: null,
      bouquet_economy_name: null,
      bouquet_economy_price: null,
      bouquet_medium_vk_id: null,
      bouquet_medium_name: null,
      bouquet_medium_price: null,
      bouquet_premium_vk_id: null,
      bouquet_premium_name: null,
      bouquet_premium_price: null
    };

    return res.status(200).json({ success: true, settings });

  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body;

    // Проверяем, есть ли уже запись
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .single();

    let result;

    if (existing) {
      // Обновляем существующую
      result = await supabase
        .from('settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Создаём новую
      result = await supabase
        .from('settings')
        .insert({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    console.log('✅ Settings updated');

    return res.status(200).json({ 
      success: true, 
      settings: result.data 
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: error.message });
  }
}
