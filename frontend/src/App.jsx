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
  Banner,
  Panel,
  PanelHeader,
  Group,
  Placeholder,
  Button,
  Div
} from '@vkontakte/vkui'
import { Icon56ErrorOutline } from '@vkontakte/icons'
import '@vkontakte/vkui/dist/vkui.css'

import Home from './panels/Home'
import AddEvent from './panels/AddEvent'
import EditEvent from './panels/EditEvent'
import { initApi, getVkUser, saveUser, getEvents, isInVk } from './api'

function App() {
  // Навигация
  const [activePanel, setActivePanel] = useState('home')
  const [editingEvent, setEditingEvent] = useState(null)

  // Данные
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])

  // Состояния
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [snackbar, setSnackbar] = useState(null)
  const [appearance, setAppearance] = useState('light')
  const [isDemo, setIsDemo] = useState(false)

  // Логирование
  useEffect(() => {
    console.log('=== APP STARTED ===')
    console.log('Initial state:', { loading, user, events })
  }, [])

  // Инициализация
  useEffect(() => {
    async function initialize() {
      console.log('🚀 Starting initialization...')

      try {
        // 1. Инициализируем API
        console.log('1. Initializing API...')
        await initApi()
        const inVk = isInVk()
        setIsDemo(!inVk)
        console.log('✅ API initialized. In VK:', inVk)

        // 2. Получаем тему
        console.log('2. Getting theme...')
        try {
          const vkConfig = await vkBridge.send('VKWebAppGetConfig')
          setAppearance(vkConfig.appearance || 'light')
          console.log('✅ Theme:', vkConfig.appearance)
        } catch (e) {
          console.warn('Theme error (ok outside VK):', e.message)
          setAppearance('light')
        }

        // 3. Получаем пользователя
        console.log('3. Getting user...')
        try {
          const vkUser = await getVkUser()
          if (vkUser) {
            setUser(vkUser)
            console.log('✅ VK User:', vkUser.first_name)

            // Сохраняем в БД
            try {
              await saveUser({
                first_name: vkUser.first_name,
                last_name: vkUser.last_name,
                photo_url: vkUser.photo_200
              })
            } catch (e) {
              console.warn('Save user error:', e.message)
            }
          } else {
            console.log('No VK user, using guest')
            setUser({ id: 0, first_name: 'Гость', last_name: '' })
          }
        } catch (e) {
          console.warn('VK user error:', e.message)
          setUser({ id: 0, first_name: 'Гость', last_name: '' })
        }

        // 4. Загружаем события
        console.log('4. Loading events...')
        try {
          const result = await getEvents()
          console.log('Events result:', result)
          setEvents(result.events || [])
        } catch (e) {
          console.error('Events error:', e.message)
          setEvents([])
        }

        console.log('✅ Initialization complete')
      } catch (err) {
        console.error('❌ Initialization failed:', err)
        setError(err.message)
      } finally {
        console.log('🏁 Setting loading to false')
        setLoading(false)
      }
    }

    initialize()
  }, [])

  // Хелперы
  const showSnackbar = (message, type = 'success') => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)} duration={3000}>
        {type === 'error' ? '❌ ' : '✅ '}{message}
      </Snackbar>
    )
  }

  const goToPanel = (panel, data = null) => {
    if (panel === 'edit' && data) setEditingEvent(data)
    setActivePanel(panel)
  }

  const goBack = () => {
    setActivePanel('home')
    setEditingEvent(null)
  }

  // Обработчики событий
  const handleEventCreated = async () => {
    try {
      const result = await getEvents()
      setEvents(result.events || [])
      showSnackbar('Событие добавлено!')
      goBack()
    } catch (e) {
      showSnackbar('Ошибка при обновлении списка', 'error')
    }
  }

  const handleEventUpdated = async () => {
    try {
      const result = await getEvents()
      setEvents(result.events || [])
      showSnackbar('Событие обновлено!')
      goBack()
    } catch (e) {
      showSnackbar('Ошибка при обновлении списка', 'error')
    }
  }

  const handleEventDeleted = async () => {
    try {
      const result = await getEvents()
      setEvents(result.events || [])
      showSnackbar('Событие удалено')
      goBack()
    } catch (e) {
      showSnackbar('Ошибка при обновлении списка', 'error')
    }
  }

  // Рендер ошибки
  if (error) {
    return (
      <ConfigProvider appearance={appearance}>
        <AdaptivityProvider>
          <AppRoot>
            <Panel>
              <PanelHeader>Ошибка</PanelHeader>
              <Group>
                <Placeholder
                  icon={<Icon56ErrorOutline />}
                  header="Что-то пошло не так"
                  action={
                    <Button size="m" onClick={() => window.location.reload()}>
                      Перезагрузить
                    </Button>
                  }
                >
                  {error}
                </Placeholder>
              </Group>
            </Panel>
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    )
  }

  // Рендер загрузки
  if (loading) {
    return (
      <ConfigProvider appearance={appearance}>
        <AdaptivityProvider>
          <AppRoot>
            <Div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScreenSpinner size="large" />
            </Div>
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    )
  }

  // Основной рендер
  return (
    <ConfigProvider appearance={appearance}>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout>
            <SplitCol>
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
                  onRefresh={() => getEvents().then(r => setEvents(r.events || []))}
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
