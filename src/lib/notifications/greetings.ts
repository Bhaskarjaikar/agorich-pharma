import { createClient } from '@supabase/supabase-js'
import { sendNotificationWithPush } from './service'
import { INDIAN_FESTIVALS, NotificationEvent } from './types'

export async function checkAndSendBirthdayWishes(supabase: any): Promise<{
  sent: number
  failed: number
}> {
  let sent = 0
  let failed = 0

  try {
    const { data: users, error } = await supabase
      .rpc('get_users_with_birthdays_today')

    if (error || !users || users.length === 0) {
      console.log('No birthdays today')
      return { sent, failed }
    }

    for (const user of users) {
      const event: NotificationEvent = {
        type: 'BIRTHDAY_WISH',
        title: '🎂 Happy Birthday!',
        body: `Wishing you a wonderful birthday, ${user.user_name || user.business_name}! 🎉`,
        data: {
          type: 'BIRTHDAY',
          user_id: user.id,
          link: '/profile',
        },
        target_user_ids: [user.id],
      }

      const result = await sendNotificationWithPush({ supabase, event })
      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    console.log(`Birthday wishes: sent=${sent}, failed=${failed}`)
  } catch (error) {
    console.error('Error sending birthday wishes:', error)
  }

  return { sent, failed }
}

export async function checkAndSendFestivalGreetings(supabase: any): Promise<{
  sent: number
  failed: number
}> {
  let sent = 0
  let failed = 0

  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0].slice(5)

    const todayFestival = INDIAN_FESTIVALS.find(f => f.date === todayStr)

    if (!todayFestival) {
      return { sent, failed }
    }

    console.log(`Today is ${todayFestival.name} - sending greetings`)

    const event: NotificationEvent = {
      type: 'FESTIVAL_GREETING',
      title: `🪔 ${todayFestival.name} Greetings!`,
      body: `Wishing you and your family a very happy ${todayFestival.name}! May this festival bring joy, prosperity, and happiness to your life.`,
      data: {
        type: 'FESTIVAL',
        festival: todayFestival.name,
        festival_type: todayFestival.type,
        link: '/dashboard',
      },
      target_roles: ['RETAILER', 'DISTRIBUTOR', 'SUPPORT'],
    }

    const result = await sendNotificationWithPush({ supabase, event })
    if (result.success) {
      sent = result.push_sent || 1
    } else {
      failed = 1
    }

    console.log(`Festival greetings: sent=${sent}, failed=${failed}`)
  } catch (error) {
    console.error('Error sending festival greetings:', error)
  }

  return { sent, failed }
}

export async function getUpcomingFestivals(): Promise<Array<{
  name: string
  date: string
  daysUntil: number
  type: string
}>> {
  const today = new Date()
  const currentYear = today.getFullYear()
  const upcoming: Array<{
    name: string
    date: string
    daysUntil: number
    type: string
  }> = []

  for (const festival of INDIAN_FESTIVALS) {
    const festivalDateStr = `${currentYear}-${festival.date}`
    const festivalDate = new Date(festivalDateStr)

    if (festivalDate < today) {
      const festivalDateNextYear = new Date(`${currentYear + 1}-${festival.date}`)
      festivalDate.setFullYear(currentYear + 1)
    }

    const daysUntil = Math.ceil((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil >= 0 && daysUntil <= 7) {
      upcoming.push({
        name: festival.name,
        date: festivalDate.toISOString().split('T')[0],
        daysUntil,
        type: festival.type,
      })
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
}
