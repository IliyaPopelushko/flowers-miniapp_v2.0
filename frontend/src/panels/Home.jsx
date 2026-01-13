import React from 'react'
import {
  Panel,
  PanelHeader,
  Group,
  Placeholder,
  Button,
  Div,
  Title,
  Text,
  Spacing,
  PullToRefresh
} from '@vkontakte/vkui'
import { Icon56CalendarOutline, Icon24Add } from '@vkontakte/icons'

import EventCard from '../components/EventCard'

function Home({ id, user, events, onAddEvent, onEditEvent, onRefresh }) {
  const [refreshing, setRefreshing] = React.useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <Panel id={id}>
      <PanelHeader>Цветы в лесопарке 🌸</PanelHeader>
      
      <PullToRefresh onRefresh={handleRefresh} isFetching={refreshing}>
        {/* Приветствие */}
        {user && (
          <Group>
            <Div>
              <Title level="2">
                Привет, {user.first_name}! 👋
              </Title>
              <Spacing size={8} />
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                Добавь важные даты, и мы напомним о них заранее
              </Text>
            </Div>
          </Group>
        )}

        {/* Кнопка добавления */}
        <Group>
          <Div>
            <Button
              size="l"
              stretched
              before={<Icon24Add />}
              onClick={onAddEvent}
            >
              Добавить событие
            </Button>
          </Div>
        </Group>

        {/* Список событий или заглушка */}
        <Group header={events.length > 0 && (
          <Div style={{ paddingBottom: 0 }}>
            <Title level="3">Мои события ({events.length}/10)</Title>
          </Div>
        )}>
          {events.length === 0 ? (
            <Placeholder
              icon={<Icon56CalendarOutline />}
              header="Нет событий"
              action={
                <Button size="m" onClick={onAddEvent}>
                  Добавить первое событие
                </Button>
              }
            >
              Добавьте дни рождения и праздники,
              чтобы не забыть поздравить близких
            </Placeholder>
          ) : (
            <Div>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={onEditEvent}
                />
              ))}
            </Div>
          )}
        </Group>

        {/* Информация о магазине */}
        <Group>
          <Div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
            <Text>📍 посёлок Лесопарк 30</Text>
            <Text>🕐 с 8:00 до 21:00</Text>
            <Text>📞 +7 912 797 1348</Text>
          </Div>
        </Group>
        
        <Spacing size={60} />
      </PullToRefresh>
    </Panel>
  )
}

export default Home
