// ============================================
// /api/user — Управление пользователем
// GET  — получить данные пользователя
// POST — создать/обновить пользователя
// ============================================

const { supabase } = require('../lib/supabase');
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
        throw 
