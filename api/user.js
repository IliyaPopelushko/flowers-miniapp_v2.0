// ============================================
// /api/user — Управление пользователем
// ============================================

const { supabase } = require('../lib/supabase');
const { verifyVKSignature, extractVkUserId } = require('../lib/vk');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Получаем параметры VK
    let vkParams = {};
    
    if (req.headers['x-vk-params']) {
      try {
        vkParams = JSON.parse(req.headers['x-vk-params']);
      } catch (e) {
        console.warn('Failed to parse X-VK-Params');
      }
    }
    
    if (Object.keys(vkParams).length === 0 && req.query) {
      vkParams = req.query;
    }

    // Извлекаем user ID
    let vkUserId = extractVkUserId(vkParams);
    
    if (!vkUserId) {
      console.warn('⚠️ No vk_user_id, using test ID');
      vkUserId = 518565944;
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

      const userData = {
        vk_user_id: vkUserId,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        messages_allowed: messages_allowed ?? false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(userData, { 
          onConflict: 'vk_user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ user: data });
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
