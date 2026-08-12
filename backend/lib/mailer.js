import dns from 'node:dns'
import nodemailer from 'nodemailer'

// ------------------------------------------------------------------
// Shared SMTP helpers for sending booking-related emails.
// Credentials come from env vars only - never hard-coded.
// ------------------------------------------------------------------
const buildTransport = async () => {
  const isConfigured = (v) => v && !v.startsWith('your_')
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!isConfigured(host) || !isConfigured(user) || !isConfigured(pass)) {
    return null
  }

  const port = Number(process.env.SMTP_PORT || 465)

  // Resolve the hostname through the OS resolver (dns.lookup) and connect
  // to the IP instead, keeping the hostname in tls.servername so TLS
  // certificate validation still works.
  let ip = host
  try {
    const { address } = await dns.promises.lookup(host, { family: 4 })
    ip = address
  } catch {
    // Fall back to the hostname if lookup fails
  }

  return nodemailer.createTransport({
    host: ip,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { servername: host }
  })
}

export const sendMail = async ({ to, subject, html }) => {
  const transport = await buildTransport()
  const from = process.env.OTP_FROM_EMAIL || process.env.SMTP_USER

  if (!transport || !from || !to) return false

  try {
    await transport.sendMail({
      from: `SDA Booking <${from}>`,
      to,
      subject,
      html
    })
    return true
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[mail] Failed to send email to', to, ':', err.message)
    }
    return false
  }
}

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]))

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const toDate = (v) => {
  if (!v) return null
  if (typeof v === 'object' && v._seconds != null) return new Date(v._seconds * 1000)
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const formatDateTime = (d) =>
  d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

const PAYMENT_LABELS = {
  airtel: 'Airtel Money',
  momo: 'MTN MoMo',
  card: 'Bank Card'
}

const shell = (content) => `
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
    <div style="background:#0f766e;padding:24px 32px;">
      <h2 style="color:#ffffff;margin:0;font-size:20px;">SDA Booking</h2>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;">
      SDA Booking &middot; Reserving Seventh-day Adventist books online
    </div>
  </div>
</body></html>`

const row = (label, value) => `
  <tr>
    <td style="padding:8px 0;color:#64748b;font-size:14px;width:45%;">${label}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
  </tr>`

// ------------------------------------------------------------------
// "Thanks for booking your book" - sent right after checkout.
// ------------------------------------------------------------------
export const sendBookingConfirmation = async (booking) => {
  const to = booking.email
  if (!to) return false

  const details = `
    ${row('Full Name', esc(booking.name))}
    ${row('Phone', esc(booking.phone))}
    ${row('District', esc(booking.district))}
    ${row('Sector', esc(booking.sector))}
    ${row('Book', esc(booking.title))}
    ${row('Quantity', Number(booking.qty) || 1)}
    ${row('Price', formatPrice(booking.price))}
    ${row('Payment Method', PAYMENT_LABELS[booking.paymentMethod] || booking.paymentMethod || '—')}
  `

  const html = shell(`
    <h3 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Thank you for booking your book!</h3>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear <strong>${esc(booking.name)}</strong>, your booking has been received and confirmed.
      We will prepare your book and notify you again by email as soon as it arrives.
    </p>
    <table style="width:100%;border-collapse:collapse;">
      ${details}
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:24px 0 0;">
      You can pick up your book at your selected church in
      <strong>${esc(booking.district)}</strong> - <strong>${esc(booking.sector)}</strong>.
      May God bless you!
    </p>
  `)

  return sendMail({ to, subject: 'Booking Confirmed - Thank You!', html })
}

// ------------------------------------------------------------------
// "Your book has arrived" - sent when the admin marks a booking Delivered.
// ------------------------------------------------------------------
export const sendBookArrived = async (booking) => {
  const to = booking.email
  if (!to) return false

  const html = shell(`
    <h3 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Your book has arrived!</h3>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear <strong>${esc(booking.name)}</strong>, good news — the book you booked is now available!
    </p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Book', esc(booking.title))}
      ${row('Quantity', Number(booking.qty) || 1)}
      ${row('Pickup District', esc(booking.district))}
      ${row('Pickup Sector', esc(booking.sector))}
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:24px 0 0;">
      Please come and pick it up at your selected church. If you have any questions,
      contact us and we will be happy to help.
    </p>
  `)

  return sendMail({ to, subject: 'Your Book Has Arrived - Ready for Pickup!', html })
}

// ------------------------------------------------------------------
// "Book delivered to the church" - sent to the admin account when a
// booking is marked Delivered/Complete so staff know it is ready for
// the customer to pick up.
// ------------------------------------------------------------------
export const sendBookArrivedToAdmin = async (booking) => {
  const to = process.env.ADMIN_EMAIL
  if (!to) return false

  const deliveredAt = toDate(booking.deliveredAt) || new Date()
  const qty = Number(booking.qty) || 1

  const html = shell(`
    <h3 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Book delivered to the church</h3>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      A booked book has arrived at the church and is ready for the customer to pick up.
    </p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Customer', esc(booking.name))}
      ${row('Phone', esc(booking.phone))}
      ${row('Book', esc(booking.title))}
      ${row('Quantity', qty)}
      ${row('Total', formatPrice(Number(booking.price) * qty))}
      ${row('Pickup Church', esc(booking.district) + ' - ' + esc(booking.sector))}
      ${row('Delivered on', formatDateTime(deliveredAt))}
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:24px 0 0;">
      The customer has been notified by email that their book is ready to be collected
      at the church. Please keep it in a safe place.
    </p>
  `)

  return sendMail({ to, subject: 'Book Delivered to Church - Ready for Pickup', html })
}
