import React, { useState, useEffect } from 'react';

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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: '#e91e63',
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
    borderRadius: '8px',
    fontSize: '14px'
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px'
  }
};

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка авторизации');
        setLoading(false);
        return;
      }

      // Успешный вход
      onLogin(data.admin, data.token);

    } catch (err) {
      console.error('Login error:', err);
      setError('Ошибка соединения с сервером');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🌸</div>
        <h1 style={styles.title}>Админ-панель</h1>
        <p style={styles.subtitle}>Цветы в лесопарке</p>
        
        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Введите пароль"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          
          <button 
            type="submit"
            style={{
              ...styles.button, 
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <p style={styles.hint}>
          Пароль можно получить у владельца магазина
        </p>
      </div>
    </div>
  );
}

export default Login;
