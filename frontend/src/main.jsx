import React from 'react'
import ReactDOM from 'react-dom/client'
import vkBridge from '@vkontakte/vk-bridge'
import App from './App'

// Инициализируем VK Bridge
try {
  vkBridge.send('VKWebAppInit')
    .then(() => console.log('VK Bridge initialized'))
    .catch((error) => console.warn('VK Bridge init error:', error))
} catch (e) {
  console.warn('VK Bridge not available:', e.message)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
