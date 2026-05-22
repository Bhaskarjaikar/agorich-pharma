export interface FCMDeviceToken {
  id: string
  user_id: string
  device_token: string
  device_type: 'android' | 'ios' | 'web'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PushNotificationPayload {
  title: string
  body: string
  image?: string
  icon?: string
  click_action?: string
  data?: Record<string, string>
}

export interface NotificationPreferences {
  id: string
  user_id: string
  push_enabled: boolean
  email_enabled: boolean
  invoice_created: boolean
  invoice_paid: boolean
  invoice_overdue: boolean
  payment_reminders: boolean
  scheme_announcements: boolean
  birthday_wishes: boolean
  festival_greetings: boolean
  stock_alerts: boolean
  created_at: string
  updated_at: string
}

export interface NotificationEvent {
  type: 'INVOICE_CREATED' | 'INVOICE_SENT' | 'INVOICE_PAID' | 'INVOICE_OVERDUE' |
        'PAYMENT_RECEIVED' | 'SCHEME_ANNOUNCEMENT' | 'STOCK_ALERT' |
        'BIRTHDAY_WISH' | 'FESTIVAL_GREETING' | 'PAYMENT_REMINDER'
  title: string
  body: string
  data?: Record<string, any>
  target_roles?: string[]
  target_user_ids?: string[]
  schedule_at?: Date
}

export interface Festival {
  name: string
  date: string
  type: 'national' | 'religious' | 'cultural'
}

export const INDIAN_FESTIVALS: Festival[] = [
  { name: 'Republic Day', date: '01-26', type: 'national' },
  { name: 'Independence Day', date: '08-15', type: 'national' },
  { name: 'Gandhi Jayanti', date: '10-02', type: 'national' },
  { name: 'Diwali', date: '11-01', type: 'cultural' },
  { name: 'Holi', date: '03-14', type: 'cultural' },
  { name: 'Dussehra', date: '10-12', type: 'cultural' },
  { name: 'Navratri', date: '10-03', type: 'religious' },
  { name: 'Eid-ul-Fitr', date: '04-11', type: 'religious' },
  { name: 'Eid-ul-Adha', date: '06-17', type: 'religious' },
  { name: 'Christmas', date: '12-25', type: 'cultural' },
  { name: 'New Year', date: '01-01', type: 'cultural' },
  { name: 'Raksha Bandhan', date: '08-09', type: 'cultural' },
  { name: 'Janmashtami', date: '08-26', type: 'religious' },
  { name: 'Maha Shivaratri', date: '03-08', type: 'religious' },
  { name: 'Guru Purnima', date: '07-21', type: 'cultural' },
  { name: 'Bhai Dooj', date: '11-03', type: 'cultural' },
  { name: 'Mahatma Gandhi Jayanti', date: '10-02', type: 'national' },
  { name: 'Lohri', date: '01-13', type: 'cultural' },
  { name: 'Pongal', date: '01-15', type: 'cultural' },
  { name: 'Bihu', date: '04-14', type: 'cultural' },
  { name: 'Onam', date: '09-15', type: 'cultural' },
  { name: 'Dr. B. R. Ambedkar Jayanti', date: '04-14', type: 'national' },
  { name: 'Jawaharlal Nehru Jayanti', date: '11-14', type: 'national' },
  { name: 'Valentine Day', date: '02-14', type: 'cultural' },
  { name: 'Mother Day', date: '05-12', type: 'cultural' },
  { name: 'Father Day', date: '06-16', type: 'cultural' },
  { name: 'Teachers Day', date: '09-05', type: 'national' },
]

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  push_enabled: true,
  email_enabled: true,
  invoice_created: true,
  invoice_paid: true,
  invoice_overdue: true,
  payment_reminders: true,
  scheme_announcements: true,
  birthday_wishes: true,
  festival_greetings: true,
  stock_alerts: true,
}
