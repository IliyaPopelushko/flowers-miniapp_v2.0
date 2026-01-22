// ============================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ SUPABASE
// ============================================

import { createClient } from '@supabase/supabase-js';

// Проверяем наличие переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase Connection check:', { 
  url: !!supabaseUrl, 
  key: !!supabaseKey

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
}

// Создаём клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
