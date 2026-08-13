// ------------------------------------------------------------------
// SMS notifications for order confirmations.
// Provider: Africa's Talking (works with Rwandan MTN/Airtel numbers).
// Credentials come from env vars only - never hard-coded.
//   AT_API_KEY    - Africa's Talking API key
//   AT_USERNAME   - Africa's Talking username (defaults to 'sandbox')
//   AT_SENDER_ID  - optional registered sender ID (alphanumeric)
// If AT_API_KEY is not set, SMS sending is skipped gracefully so the
// app keeps working with email notifications only.
// ------------------------------------------------------------------
const normalizePhone = (value) => {
  let phone = String(value || '').replace(/[^0-9+]/g, '')
  if (phone.startsWith('0')) phone = '+250' + phone.slice(1)
  if (!phone.startsWith('+')) phone = '+' + phone
  return phone
}

export const sendSms = async ({ to, message }) => {
  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME || 'sandbox'
  const senderId = process.env.AT_SENDER_ID

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[sms] SMS not configured (set AT_API_KEY). Skipping SMS.')
    }
    return false
  }

  const phone = normalizePhone(to)
  if (!phone || !message) return false

  try {
    const body = new URLSearchParams({
      username,
      to: phone,
      message,
      ...(senderId ? { from: senderId } : {})
    })

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        apiKey
      },
      body
    })

    if (!res.ok) {
      console.warn('[sms] Africa\'s Talking error:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.warn('[sms] SMS failed:', err.message)
    return false
  }
}

// Message sent to the customer when their booked book arrives at the church.
export const sendBookArrivedSms = async (booking) => {
  const to = booking.phone
  const qty = Number(booking.qty) || 1
  if (!to) return false

  const message =
    `Dear ${String(booking.name || 'customer')}, the book "${String(booking.title || '')}" ` +
    `(${qty} pcs) you booked has arrived at the church (${String(booking.district || '')} - ` +
    `${String(booking.sector || '')}). Please come and pick it up. - SDA Booking`

  return sendSms({ to, message })
}
