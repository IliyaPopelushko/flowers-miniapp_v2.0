// ============================================
// GET /api/health — Проверка работоспособности
// ============================================

const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  // Разрешаем только GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем подключение к Supabase
    const { data, error } = await supabase
      .from('settings')
      .select('shop_name')
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      shop: data.shop_name
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
};
