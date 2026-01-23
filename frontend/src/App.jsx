import React, { useState, useEffect } from 'react'
import vkBridge from '@vkontakte/vk-bridge'
import {
  ConfigProvider,
  AdaptivityProvider,
  AppRoot,
  SplitLayout,
  SplitCol,
  View,
  Snackbar,
  Banner,
  Panel,
  PanelHeader,
  Group,
  Placeholder,
  Button,
  Div,
  Spinner
} from '@vkontakte/vkui'
import { Icon56ErrorOutline } from '@vkontakte/icons'
import '@vkontakte/vkui/dist/vkui.css'

import Home from './panels/Home'
import AddEvent from './panels/AddEvent'
import EditEvent from './panels/EditEvent'
import { initApi, getVkUser, saveUser, getEvents, isInVk } from './api'

// Функция с таймаутом для VK Bridge
function vkBridgeWithTimeout(method, params = {}, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`VK Bridge timeout: ${method}`))
    }, timeout)

    vkBridge.send(method, params)
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

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

        // 2. Получаем тему (с таймаутом)
        console.log('2. Getting theme...')
        try {
          const vkConfig = await vkBridgeWithTimeout('VKWebAppGetConfig', {}, 1000)
          setAppearance(vkConfig.appearance || 'light')
          console.log('✅ Theme:', vkConfig.appearance)
        } catch (e) {
          console.warn('⚠️ Theme error (ok outside VK):', e.message)
          setAppearance('light')
        }

        // 3. Получаем пользователя (с таймаутом)
        console.log('3. Getting user...')
        try {
          const vkUser = await vkBridgeWithTimeout('VKWebAppGetUserInfo', {}, 1000)
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
              console.warn('⚠️ Save user error:', e.message)
            }
          } else {
            throw new Error('No user data')
          }
        } catch (e) {
          console.warn('⚠️ VK user error:', e.message)
          setUser({ id: 0, first_name: 'Гость', last_name: '' })
        }

        // 4. Загружаем события
        console.log('4. Loading events...')
        try {
          const eventsData = await getEvents()
          console.log('✅ Events loaded:', eventsData?.length || 0)
          setEvents(Array.isArray(eventsData) ? eventsData : [])
        } catch (e) {
          console.warn('⚠️ Events error:', e.message)
          setEvents([])
        }

        console.log('✅ Initialization complete!')
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

  // Показать уведомление
  const showSnackbar = (message, type = 'success') => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)} duration={3000}>
        {type === 'error' ? '❌ ' : '✅ '}{message}
      </Snackbar>
    )
  }

  // Навигация
  const goToPanel = (panel, data = null) => {
    if (panel === 'edit' && data) setEditingEvent(data)
    setActivePanel(panel)
  }

  const goBack = () => {
    setActivePanel('home')
    setEditingEvent(null)
  }

  // Загрузка событий
  const loadEvents = async () => {
    try {
      const eventsData = await getEvents()
      setEvents(Array.isArray(eventsData) ? eventsData : [])
    } catch (e) {
      console.error('Load events error:', e)
    }
  }

  // Обработчики
  const handleEventCreated = async () => {
    await loadEvents()
    showSnackbar('Событие добавлено!')
    goBack()
  }

  const handleEventUpdated = async () => {
    await loadEvents()
    showSnackbar('Событие обновлено!')
    goBack()
  }

  const handleEventDeleted = async () => {
    await loadEvents()
    showSnackbar('Событие удалено')
    goBack()
  }

  // Рендер ошибки
  if (error) {
    return (
      <ConfigProvider appearance={appearance}>
        <AdaptivityProvider>
          <AppRoot>
            <Panel id="error">
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
            <Div style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}>
              <Spinner size="large" />
              <div style={{ color: 'var(--vkui--color_text_secondary)' }}>
                Загрузка...
              </div>
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
