import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST — вход по паролю
  if (req.method === 'POST') {
    try {
      const { password, vk_id } = req.body;

      // Проверяем пароль
      if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }

      // Проверяем, что VK ID в списке админов (опционально)
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin_vk_ids')
        .single();

      const adminIds = settings?.value || [];
      const isAdmin = vk_id ? adminIds.includes(Number(vk_id)) : true;
      
      // Определяем имя админа
      let adminName = 'Администратор';
      if (vk_id && isAdmin) {
        adminName = `Админ (id${vk_id})`;
      }

      // Создаём JWT токен
      const token = jwt.sign(
        {
          vk_id: vk_id || 0,
          name: adminName,
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        token,
        admin: {
          vk_id: vk_id || 0,
          name: adminName
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  // GET — проверка токена
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
      }

      const token = authHeader.split(' ')[1];
      
      // Проверяем JWT
      const decoded = jwt.verify(token, JWT_SECRET);

      return res.status(200).json({
        admin: {
          vk_id: decoded.vk_id,
          name: decoded.name
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Недействительный токен' });
      }
      console.error('Auth error:', error);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
