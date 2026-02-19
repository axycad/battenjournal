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
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM

  if (!host || !from) {
    if (!resendApiKey || !resendFrom) {
      return null
    }

    return {
      provider: 'resend' as const,
      apiKey: resendApiKey,
      from: resendFrom,
    }
  }

  return {
    provider: 'smtp' as const,
    host,
    port,
    user,
    pass,
    from,
    secure,
  }
}

export function isEmailConfigured() {
  return getEmailConfig() !== null
}

export async function sendEmail(payload: EmailPayload) {
  const config = getEmailConfig()
  if (!config) {
    throw new Error('Email service is not configured')
  }

  if (config.provider === 'smtp') {
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
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend request failed: ${response.status} ${errorText}`)
  }
}
