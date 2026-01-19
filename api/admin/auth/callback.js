import jwt from 'jsonwebtoken';
import { supabase } from '../../../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const VK_APP_ID = process.env.VK_APP_ID;
const VK_APP_SECRET = process.env.VK_SECRET_KEY;
const ADMIN_URL = process.env.ADMIN_URL || 'https://your-domain.vercel.app/admin';

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  // Если VK вернул ошибку
  if (error) {
    console.error('VK OAuth error:', error, error_description);
    return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent(error_description || 'Ошибка авторизации')}`);
  }

  if (!code) {
    return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent('Код авторизации не получен')}`);
  }

  try {
    // 1. Обмениваем code на access_token
    const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/admin/auth/callback`;
    
    const tokenUrl = `https://oauth.vk.com/access_token?client_id=${VK_APP_ID}&client_secret=${VK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('VK token error:', tokenData);
      return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent(tokenData.error_description || 'Ошибка получения токена')}`);
    }

    const { access_token, user_id } = tokenData;

    // 2. Получаем информацию о пользователе
    const userInfoUrl = `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_100,first_name,last_name&access_token=${access_token}&v=5.131`;
    
    const userResponse = await fetch(userInfoUrl);
    const userData = await userResponse.json();

    if (userData.error) {
      console.error('VK user info error:', userData);
      return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent('Ошибка получения данных пользователя')}`);
    }

    const vkUser = userData.response[0];
    const vkId = vkUser.id;
    const userName = `${vkUser.first_name} ${vkUser.last_name}`;
    const userPhoto = vkUser.photo_100;

    // 3. Проверяем, является ли пользователь админом
    const { data: settings, error: dbError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_vk_ids')
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent('Ошибка базы данных')}`);
    }

    const adminIds = settings?.value || [];
    
    if (!adminIds.includes(vkId)) {
      return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent('У вас нет прав администратора')}`);
    }

    // 4. Создаём JWT токен
    const jwtToken = jwt.sign(
      {
        vk_id: vkId,
        name: userName,
        photo: userPhoto
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Редиректим обратно с токеном
    return res.redirect(`${ADMIN_URL}?token=${jwtToken}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${ADMIN_URL}?error=${encodeURIComponent('Внутренняя ошибка сервера')}`);
  }
}
