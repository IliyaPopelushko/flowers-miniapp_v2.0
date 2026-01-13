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
  Snackbar
} from '@vkontakte/vkui'
import '@vkontakte/vkui/dist/vkui.css'

import Home from './panels/Home'
import AddEvent from './panels/AddEvent'
import EditEvent from './panels/EditEvent'
import { initApi, getVkUser, saveUser, getEvents } from './api'

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

  // Инициализация приложения
  useEffect(() => {
    async function init() {
      try {
        // Получаем тему VK
        const vkAppearance = await vkBridge.send('VKWebAppGetConfig')
        setAppearance(vkAppearance.appearance || 'light')

        // Инициализируем API
        await initApi()

        // Получаем данные пользователя VK
        const vkUser = await getVkUser()
        if (vkUser) {
          setUser(vkUser)
          
          // Сохраняем пользователя в нашей БД
          await saveUser({
            first_name: vkUser.first_name,
            last_name: vkUser.last_name,
            photo_url: vkUser.photo_200
          })
        }

        // Загружаем события
        await loadEvents()
        
      } catch (error) {
        console.error('Init error:', error)
        showSnackbar('Ошибка загрузки', 'error')
      } finally {
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
      setEvents(result.events || [])
    } catch (error) {
      console.error('Load events error:', error)
      showSnackbar('Ошибка загрузки событий', 'error')
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

  // Рендер
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
