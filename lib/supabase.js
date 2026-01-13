// ============================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ SUPABASE
// ============================================

const { createClient } = require('@supabase/supabase-js');

// Проверяем наличие переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
}

// Создаём клиент Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabase };
