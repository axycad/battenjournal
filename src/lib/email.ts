import nodemailer from 'nodemailer'

export type EmailPayload = {
  to: string
  subject: string
  html: string
  text: string
}

function getEmailConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  if (!host || !from) {
    return null
  }

  return { host, port, user, pass, from, secure }
}

export async function sendEmail(payload: EmailPayload) {
  const config = getEmailConfig()
  if (!config) {
    throw new Error('Email service is not configured')
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  })

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })
}
