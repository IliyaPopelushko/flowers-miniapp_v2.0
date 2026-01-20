// ============================================
// /api/user — Управление пользователем
// GET  — получить данные пользователя
// POST — создать/обновить пользователя
// ============================================

import { supabase } from '../lib/supabase.js';
const { verifyVKSignature, extractVkUserId } = require('../lib/vk');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Получаем параметры VK из заголовка или query
    const vkParams = req.headers['x-vk-params'] 
      ? JSON.parse(req.headers['x-vk-params'])
      : req.query;

    // В режиме разработки можно пропустить проверку
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && !verifyVKSignature(vkParams)) {
      return res.status(401).json({ error: 'Invalid VK signature' });
    }

    const vkUserId = extractVkUserId(vkParams);
    
    if (!vkUserId) {
      return res.status(400).json({ error: 'Missing vk_user_id' });
    }

    // GET — получить данные пользователя
    if (req.method === 'GET') {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('vk_user_id', vkUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return res.status(200).json({
        user: user || null,
        isNewUser: !user
      });
    }

    // POST — создать/обновить пользователя
    if (req.method === 'POST') {
      const { first_name, last_name, photo_url, messages_allowed } = req.body;

      // Проверяем, существует ли пользователь
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('vk_user_id', vkUserId)
        .single();

      if (existingUser) {
        // Обновляем только переданные поля
        const updateData = { updated_at: new Date().toISOString() };
        
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (photo_url !== undefined) updateData.photo_url = photo_url;
        if (messages_allowed !== undefined) updateData.messages_allowed = messages_allowed;

        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('vk_user_id', vkUserId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ user: data });
        
      } else {
        // Создаём нового пользователя
        const insertData = {
          vk_user_id: vkUserId,
          first_name: first_name || null,
          last_name: last_name || null,
          photo_url: photo_url || null,
          messages_allowed: messages_allowed ?? false
        };

        const { data, error } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ user: data });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
