import React, { useState, useEffect } from 'react'
import vkBridge from '@vkontakte/vk-bridge'
import {
  ConfigProvider,
  AdaptivityProvider,
  AppRoot,
  SplitLayout,
  SplitCol,
  View,
  ScreenSpinner,
  Snackbar,
  Banner
} from '@vkontakte/vkui'
import '@vkontakte/vkui/dist/vkui.css'

import Home from './panels/Home'
import AddEvent from './panels/AddEvent'
import EditEvent from './panels/EditEvent'
import { initApi, getVkUser, saveUser, getEvents, isInVk } from './api'

function App() {
  // Навигация
  const [activePanel, setActivePanel] = useState('home')
  
  // Данные
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [editingEvent, setEditingEvent] = useState(null)
  
  // UI состояния
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState(null)
  const [appearance, setAppearance] = useState('light')
  const [isDemo, setIsDemo] = useState(false)

  // Инициализация приложения
  useEffect(() => {
    async function init() {
      console.log('🚀 Starting app initialization...')
      
      try {
        // Инициализируем API
        await initApi()
        console.log('✅ API initialized')
        
        // Проверяем, в VK ли мы
        const inVk = isInVk()
        setIsDemo(!inVk)
        console.log('📱 In VK:', inVk)

        // Получаем тему VK
        try {
          const vkConfig = await vkBridge.send('VKWebAppGetConfig')
          setAppearance(vkConfig.appearance || 'light')
          console.log('🎨 Theme:', vkConfig.appearance)
        } catch (e) {
          console.warn('Theme error (ok outside VK):', e.message)
        }

        // Получаем данные пользователя VK
        try {
          const vkUser = await getVkUser()
          if (vkUser) {
            setUser(vkUser)
            console.log('👤 VK User:', vkUser.first_name)
            
            // Сохраняем пользователя в БД
            try {
              await saveUser({
                first_name: vkUser.first_name,
                last_name: vkUser.last_name,
                photo_url: vkUser.photo_200
              })
            } catch (e) {
              console.warn('Save user error:', e.message)
            }
          }
        } catch (e) {
          console.warn('VK user error (ok outside VK):', e.message)
        }
        
        // Если нет пользователя — создаём демо
        if (!user) {
          setUser({
            id: 0,
            first_name: 'Гость',
            last_name: ''
          })
        }

        // Загружаем события
        console.log('📅 Loading events...')
        await loadEvents()
        console.log('✅ Events loaded')
        
      } catch (error) {
        console.error('❌ Init error:', error)
      } finally {
        console.log('🏁 Initialization complete')
        setLoading(false)
      }
    }

    init()

    // Подписываемся на изменение темы
    vkBridge.subscribe((e) => {
      if (e.detail.type === 'VKWebAppUpdateConfig') {
        setAppearance(e.detail.data.appearance || 'light')
      }
    })
  }, [])

  // Загрузка событий
  async function loadEvents() {
    try {
      const result = await getEvents()
      console.log('📅 Events result:', result)
      setEvents(result.events || [])
    } catch (error) {
      console.warn('Load events error:', error.message)
      setEvents([])
    }
  }

  // Показать уведомление
  function showSnackbar(message, type = 'success') {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        duration={3000}
      >
        {type === 'error' ? '❌ ' : '✅ '}{message}
      </Snackbar>
    )
  }

  // Навигация
  function goToPanel(panel, data = null) {
    if (panel === 'edit' && data) {
      setEditingEvent(data)
    }
    setActivePanel(panel)
  }

  function goBack() {
    setActivePanel('home')
    setEditingEvent(null)
  }

  // Обработчики событий
  async function handleEventCreated() {
    await loadEvents()
    showSnackbar('Событие добавлено!')
    goBack()
  }

  async function handleEventUpdated() {
    await loadEvents()
    showSnackbar('Событие обновлено!')
    goBack()
  }

  async function handleEventDeleted() {
    await loadEvents()
    showSnackbar('Событие удалено')
    goBack()
  }

  // Рендер загрузки
  if (loading) {
    return (
      <ConfigProvider appearance={appearance}>
        <AdaptivityProvider>
          <AppRoot>
            <ScreenSpinner />
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider appearance={appearance}>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout>
            <SplitCol>
              {/* Баннер демо-режима */}
              {isDemo && (
                <Banner
                  mode="image"
                  size="s"
                  header="Демо-режим"
                  subheader="Откройте приложение в VK для полного функционала"
                  background={
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      width: '100%',
                      height: '100%'
                    }}/>
                  }
                />
              )}
              
              <View activePanel={activePanel}>
                <Home
                  id="home"
                  user={user}
                  events={events}
                  onAddEvent={() => goToPanel('add')}
                  onEditEvent={(event) => goToPanel('edit', event)}
                  onRefresh={loadEvents}
                />
                
                <AddEvent
                  id="add"
                  onBack={goBack}
                  onSuccess={handleEventCreated}
                  showSnackbar={showSnackbar}
                />
                
                <EditEvent
                  id="edit"
                  event={editingEvent}
                  onBack={goBack}
                  onSuccess={handleEventUpdated}
                  onDelete={handleEventDeleted}
                  showSnackbar={showSnackbar}
                />
              </View>
              
              {snackbar}
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  )
}

export default App
