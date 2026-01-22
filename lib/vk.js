// lib/vk.js
export function getVkUserFromParams(param) {
  try {
    if (!param) return null;

    let str = param;
    if (typeof param === 'object') {
      str = param['vk_params'] || Object.keys(param)[0];
    }

    const decoded = decodeURIComponent(str);
    const params = new URLSearchParams(decoded.split('?')[1] || decoded);
    const userStr = params.get('vk_user_id') ||
                    params.get('vk_profile_id') ||
                    params.get('id');

    if (!userStr) return null;

    const [id, first_name, last_name] = userStr.split('_');
    return {
      vk_user_id: parseInt(id || userStr),
      first_name: first_name || '',
      last_name: last_name || '',
    };
  } catch (e) {
    console.error('VK params parse error:', e);
    return null;
  }
}
