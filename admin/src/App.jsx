import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Events from './pages/Events';
import Preorders from './pages/Preorders';
import Settings from './pages/Settings';

// Стили
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  header: {
    background: '#fff',
    padding: '16px 24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e91e63'
  },
  nav: {
    display: 'flex',
    gap: '24px'
  },
  navLink: {
    textDecoration: 'none',
    color: '#666',
    fontWeight: '500',
    padding: '8px 0',
    borderBottom: '2px solid transparent'
  },
  navLinkActive: {
    color: '#e91e63',
    borderBottomColor: '#e91e63'
  },
  logout: {
    background: 'none',
    border: '1px solid #ddd',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  main: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  }
};

function App() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const saved = localStorage.getItem('admin_token');
      if (saved) {
        const res = await fetch('/api/admin/auth', {
          headers: { 'Authorization': `Bearer ${saved}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          localStorage.removeItem('admin_token');
        }
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
    setLoading(false);
  };

  const handleLogin = (adminData, token) => {
    localStorage.setItem('admin_token', token);
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!admin) {
    return <Login onLogin={handleLogin} />;
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>🌸 Админ-панель</div>
        <nav style={styles.nav}>
          <Link 
            to="/events" 
            style={{...styles.navLink, ...(isActive('/events') ? styles.navLinkActive : {})}}
          >
            📅 События
          </Link>
          <Link 
            to="/preorders" 
            style={{...styles.navLink, ...(isActive('/preorders') ? styles.navLinkActive : {})}}
          >
            🛒 Предзаказы
          </Link>
          <Link 
            to="/settings" 
            style={{...styles.navLink, ...(isActive('/settings') ? styles.navLinkActive : {})}}
          >
            ⚙️ Настройки
          </Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>👤 {admin.name}</span>
          <button style={styles.logout} onClick={handleLogout}>Выйти</button>
        </div>
      </header>
      
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<Events />} />
          <Route path="/preorders" element={<Preorders />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
