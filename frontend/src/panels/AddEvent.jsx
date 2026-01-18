import React, { useState } from 'react'
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Select,
  Input,
  Checkbox,
  Button,
  Div,
  Spacing,
  FormLayoutGroup,
  Textarea
} from '@vkontakte/vkui'

import { createEvent, requestMessagesPermission } from '../api'

// Типы событий
const EVENT_TYPES = [
  { value: 'birthday', label: '🎂 День рождения' },
  { value: 'anniversary', label: '🎉 Юбилей' },
  { value: 'wedding_anniversary', label: '💍 Годовщина свадьбы' },
  { value: 'valentines', label: '❤️ 14 февраля' },
  { value: 'womens_day', label: '🌷 8 марта' },
  { value: 'mothers_day', label: '👩 День матери' },
  { value: 'other', label: '📅 Другое' }
]

// Дни для выбора
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1)
}))

// Месяцы для выбора
const MONTHS = [
  { value: '1', label: 'Января' },
  { value: '2', label: 'Февраля' },
  { value: '3', label: 'Марта' },
  { value: '4', label: 'Апреля' },
  { value: '5', label: 'Мая' },
  { value: '6', label: 'Июня' },
  { value: '7', label: 'Июля' },
  { value: '8', label: 'Августа' },
  { value: '9', label: 'Сентября' },
  { value: '10', label: 'Октября' },
  { value: '11', label: 'Ноября' },
  { value: '12', label: 'Декабря' }
]

function AddEvent({ id, onBack, onSuccess, showSnackbar }) {
  const [loading, setLoading] = useState(false)
  
  // Форма
  const [eventType, setEventType] = useState('')
  const [customEventName, setCustomEventName] = useState('')
  const [eventDay, setEventDay] = useState('')
  const [eventMonth, setEventMonth] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [comment, setComment] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Автозаполнение даты для фиксированных праздников
  function handleEventTypeChange(e) {
    const type = e.target.value
    setEventType(type)
    
    // Автозаполняем даты для фиксированных праздников
    if (type === 'valentines') {
      setEventDay('14')
      setEventMonth('2')
    } else if (type === 'womens_day') {
      setEventDay('8')
      setEventMonth('3')
    }
  }

  // Валидация формы
  function isFormValid() {
    if (!eventType) return false
    if (!eventDay || !eventMonth) return false
    if (!recipientName.trim()) return false
    if (eventType === 'other' && !customEventName.trim()) return false
    return true
  }

  // Отправка формы
  async function handleSubmit() {
    if (!isFormValid()) {
      showSnackbar('Заполните все обязательные поля', 'error')
      return
    }

    setLoading(true)

    try {
      // Если включены уведомления, запрашиваем разрешение
      if (notificationsEnabled) {
        const allowed = await requestMessagesPermission()
        if (!allowed) {
          showSnackbar('Разрешите сообщения для получения напоминаний', 'error')
          // Продолжаем сохранение, но уведомления не будут приходить
        }
      }

      // Создаём событие
      await createEvent({
        event_type: eventType,
        custom_event_name: eventType === 'other' ? customEventName.trim() : null,
        event_day: parseInt(eventDay),
        event_month: parseInt(eventMonth),
        recipient_name: recipientName.trim(),
        comment: comment.trim() || null,
        notifications_enabled: notificationsEnabled
      })

      onSuccess()
      
    } catch (error) {
      console.error('Create event error:', error)
      showSnackbar(error.message || 'Ошибка при создании события', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={onBack} />}>
        Новое событие
      </PanelHeader>

      <Group>
        {/* Тип события */}
        <FormItem top="Тип события">
          <Select
            placeholder="Выберите тип"
            value={eventType}
            onChange={handleEventTypeChange}
            options={EVENT_TYPES}
          />
        </FormItem>

        {/* Название (если "Другое") */}
        {eventType === 'other' && (
          <FormItem top="Название события">
            <Input
              placeholder="Например: Выпускной"
              value={customEventName}
              onChange={(e) => setCustomEventName(e.target.value)}
              maxLength={100}
            />
          </FormItem>
        )}

        {/* Дата */}
        <FormLayoutGroup mode="horizontal">
          <FormItem top="День">
            <Select
              placeholder="День"
              value={eventDay}
              onChange={(e) => setEventDay(e.target.value)}
              options={DAYS}
              disabled={eventType === 'valentines' || eventType === 'womens_day'}
            />
          </FormItem>
          <FormItem top="Месяц">
            <Select
              placeholder="Месяц"
              value={eventMonth}
              onChange={(e) => setEventMonth(e.target.value)}
              options={MONTHS}
              disabled={eventType === 'valentines' || eventType === 'womens_day'}
            />
          </FormItem>
        </FormLayoutGroup>

        {/* Имя получателя */}
        <FormItem top="Кого поздравляем?">
          <Input
            placeholder="Имя получателя"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            maxLength={100}
          />
        </FormItem>

        {/* Комментарий */}
        <FormItem top="Комментарий (необязательно)">
          <Textarea
            placeholder="Любые заметки для себя..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
        </FormItem>

        {/* Согласие на уведомления */}
        <FormItem>
          <Checkbox
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
          >
            Напоминать за 7, 3 и 1 день до события
          </Checkbox>
        </FormItem>

        <Div>
          <Button
            size="l"
            stretched
            onClick={handleSubmit}
            loading={loading}
            disabled={!isFormValid() || loading}
          >
            Сохранить
          </Button>
        </Div>
        
        <Spacing size={40} />
      </Group>
    </Panel>
  )
}

export default AddEvent
