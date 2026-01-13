import React from 'react'
import ReactDOM from 'react-dom/client'
import vkBridge from '@vkontakte/vk-bridge'
import App from './App'

// Инициализируем VK Bridge
vkBridge.send('VKWebAppInit')
  .then(() => {
    console.log('VK Bridge initialized')
  })
  .catch((error) => {
    console.error('VK Bridge init error:', error)
  })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
