import React from 'react'
import { Card, SimpleCell, Avatar, Badge } from '@vkontakte/vkui'
import { Icon24ChevronRight } from '@vkontakte/icons'

// Названия типов событий
const EVENT_TYPE_NAMES = {
  birthday: 'День рождения',
  anniversary: 'Юбилей',
  wedding_anniversary: 'Годовщина свадьбы',
  valentines: '14 февраля',
  womens_day: '8 марта',
  mothers_day: 'День матери',
  other: 'Другое'
}

// Эмодзи для типов событий
const EVENT_TYPE_EMOJI = {
  birthday: '🎂',
  anniversary: '🎉',
  wedding_anniversary: '💍',
  valentines: '❤️',
  womens_day: '🌷',
  mothers_day: '👩',
  other: '📅'
}

// Названия месяцев
const MONTH_NAMES = [
  '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

function EventCard({ event, onClick }) {
  const typeName = event.event_type === 'other' 
    ? event.custom_event_name 
    : EVENT_TYPE_NAMES[event.event_type]
  
  const emoji = EVENT_TYPE_EMOJI[event.event_type] || '📅'
  
  const dateStr = `${event.event_day} ${MONTH_NAMES[event.event_month]}`
  
  // Вычисляем сколько дней до события
  const today = new Date()
  const eventDate = new Date(today.getFullYear(), event.event_month - 1, event.event_day)
  
  // Если дата уже прошла в этом году, берём следующий год
  if (eventDate < today) {
    eventDate.setFullYear(today.getFullYear() + 1)
  }
  
  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
  
  // Определяем текст для бейджа
  let badgeText = ''
  let badgeMode = 'secondary'
  
  if (daysUntil === 0) {
    badgeText = 'Сегодня!'
    badgeMode = 'prominent'
  } else if (daysUntil === 1) {
    badgeText = 'Завтра'
    badgeMode = 'prominent'
  } else if (daysUntil <= 7) {
    badgeText = `${daysUntil} дн.`
    badgeMode = 'prominent'
  } else if (daysUntil <= 30) {
    badgeText = `${daysUntil} дн.`
  }

  return (
    <Card mode="shadow" style={{ marginBottom: 8 }}>
      <SimpleCell
        onClick={() => onClick(event)}
        before={
          <Avatar size={48} style={{ background: '#f0f0f0', fontSize: 24 }}>
            {emoji}
          </Avatar>
        }
        after={<Icon24ChevronRight fill="var(--vkui--color_icon_secondary)" />}
        subtitle={dateStr}
        indicator={badgeText && <Badge mode={badgeMode}>{badgeText}</Badge>}
      >
        {typeName} — {event.recipient_name}
      </SimpleCell>
    </Card>
  )
}

export default EventCard
