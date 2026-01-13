import React, { useState, useEffect } from 'react'
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
  Textarea,
  Alert
} from '@vkontakte/vkui'
import { Icon24DeleteOutline } from '@vkontakte/icons'

import { updateEvent, deleteEvent } from '../api'

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

// Дни и месяцы
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1)
}))

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

function EditEvent({ id, event, onBack, onSuccess, onDelete, showSnackbar }) {
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  
  // Форма
  const [eventType, setEventType] = useState('')
  const [customEventName, setCustomEventName] = useState('')
  const [eventDay, setEventDay] = useState('')
  const [eventMonth, setEventMonth] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [comment, setComment] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Заполняем форму данными события
  useEffect(() => {
    if (event) {
      setEventType(event.event_type)
      setCustomEventName(event.custom_event_name || '')
      setEventDay(String(event.event_day))
      setEventMonth(String(event.event_month))
      setRecipientName(event.recipient_name)
      setComment(event.comment || '')
      setNotificationsEnabled(event.notifications_enabled)
    }
  }, [event])

  // Валидация
  function isFormValid() {
    if (!eventType) return false
    if (!eventDay || !eventMonth) return false
    if (!recipientName.trim()) return false
    if (eventType === 'other' && !customEventName.trim()) return false
    return true
  }

  // Сохранение
  async function handleSubmit() {
    if (!isFormValid()) {
      showSnackbar('Заполните все обязательные поля', 'error')
      return
    }

    setLoading(true)

    try {
      await updateEvent(event.id, {
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
      console.error('Update event error:', error)
      showSnackbar(error.message || 'Ошибка при обновлении', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Удаление
  async function handleDelete() {
    setLoading(true)

    try {
      await deleteEvent(event.id)
      onDelete()
    } catch (error) {
      console.error('Delete event error:', error)
      showSnackbar(error.message || 'Ошибка при удалении', 'error')
    } finally {
      setLoading(false)
      setDeleteConfirm(false)
    }
  }

  if (!event) return null

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={onBack} />}>
        Редактирование
      </PanelHeader>

      <Group>
        {/* Тип события */}
        <FormItem top="Тип события">
          <Select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
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
              value={eventDay}
              onChange={(e) => setEventDay(e.target.value)}
              options={DAYS}
            />
          </FormItem>
          <FormItem top="Месяц">
            <Select
              value={eventMonth}
              onChange={(e) => setEventMonth(e.target.value)}
              options={MONTHS}
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
        <FormItem top="Комментарий">
          <Textarea
            placeholder="Заметки..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
        </FormItem>

        {/* Уведомления */}
        <FormItem>
          <Checkbox
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
          >
            Напоминать за 7, 3 и 1 день
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
            Сохранить изменения
          </Button>
          
          <Spacing size={12} />
          
          <Button
            size="l"
            stretched
            mode="outline"
            appearance="negative"
            before={<Icon24DeleteOutline />}
            onClick={() => setDeleteConfirm(true)}
            disabled={loading}
          >
            Удалить событие
          </Button>
        </Div>
        
        <Spacing size={40} />
      </Group>

      {/* Диалог подтверждения удаления */}
      {deleteConfirm && (
        <Alert
          actions={[
            {
              title: 'Отмена',
              mode: 'cancel',
              action: () => setDeleteConfirm(false)
            },
            {
              title: 'Удалить',
              mode: 'destructive',
              action: handleDelete
            }
          ]}
          onClose={() => setDeleteConfirm(false)}
          header="Удалить событие?"
          text="Это действие нельзя отменить"
        />
      )}
    </Panel>
  )
}

export default EditEvent
