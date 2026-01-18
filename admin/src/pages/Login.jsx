import React, { useState } from 'react';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)'
  },
  card: {
    background: '#fff',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%'
  },
  logo: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '24px',
    marginBottom: '8px',
    color: '#333'
  },
  subtitle: {
    color: '#666',
    marginBottom: '32px'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: '#0077ff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  error: {
    color: '#d32f2f',
    marginTop: '16px',
    padding: '12px',
    background: '#ffebee',
    borderRadius: '8px'
  }
};

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVkLogin = () => {
    // Редирект на VK OAuth
    const clientId = import.meta.env.VITE_VK_APP_ID; // ID приложения VK
    const redirectUri = encodeURIComponent(window.location.origin + '/api/admin/auth/callback');
    const vkAuthUrl = `https://oauth.vk.com/authorize?client_id=${clientId}&display=page&redirect_uri=${redirectUri}&scope=&response_type=code&v=5.131`;
    
    window.location.href = vkAuthUrl;
  };

  // Проверяем, есть ли токен в URL (после редиректа)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const errorMsg = params.get('error');
    
    if (token) {
      // Успешная авторизация
      fetch('/api/admin/auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.admin) {
            onLogin(data.admin, token);
          } else {
            setError('Ошибка авторизации');
          }
        })
        .catch(() => setError('Ошибка авторизации'));
      
      // Очищаем URL
      window.history.replaceState({}, '', '/admin');
    }
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState({}, '', '/admin');
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🌸</div>
        <h1 style={styles.title}>Админ-панель</h1>
        <p style={styles.subtitle}>Цветы в лесопарке</p>
        
        <button 
          style={{...styles.button, opacity: loading ? 0.7 : 1}}
          onClick={handleVkLogin}
          disabled={loading}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.576-1.496c.588-.19 1.341 1.26 2.14 1.818.605.422 1.064.33 1.064.33l2.137-.03s1.117-.071.587-.964c-.043-.073-.308-.661-1.588-1.87-1.34-1.264-1.16-1.059.453-3.246.983-1.332 1.376-2.145 1.253-2.493-.117-.332-.84-.244-.84-.244l-2.406.015s-.178-.025-.31.056c-.13.079-.212.262-.212.262s-.382 1.03-.89 1.907c-1.07 1.85-1.499 1.948-1.674 1.832-.407-.267-.305-1.075-.305-1.648 0-1.793.267-2.54-.521-2.733-.262-.065-.454-.107-1.123-.114-.858-.009-1.585.003-1.996.208-.274.136-.485.44-.356.457.159.022.519.099.71.363.246.341.237 1.107.237 1.107s.142 2.11-.33 2.371c-.325.18-.77-.187-1.725-1.865-.489-.859-.859-1.81-.859-1.81s-.07-.176-.198-.272c-.154-.115-.37-.151-.37-.151l-2.286.015s-.343.01-.469.161C3.94 7.721 4.043 8 4.043 8s1.79 4.258 3.817 6.403c1.858 1.967 3.968 1.838 3.968 1.838h.957z"/>
          </svg>
          {loading ? 'Вход...' : 'Войти через ВКонтакте'}
        </button>
        
        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default Login;
