import nodemailer, { type Transporter } from "nodemailer";

export type Mail = { to: string; subject: string; text: string; html?: string };

/** Messages "sent" under test. Never populated outside NODE_ENV=test. */
export const outbox: Mail[] = [];

let transporter: Transporter | undefined;

function smtp(): Transporter {
  const port = Number(process.env.SMTP_PORT || 587);
  return (transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }));
}

export async function sendEmail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    outbox.push(mail);
    return;
  }
  await smtp().sendMail({ from: process.env.SMTP_FROM, ...mail });
}

export function magicLinkEmail(to: string, url: string): Mail {
  return {
    to,
    subject: "Your sign-in link",
    text: `Use this link to sign in. It works once and expires in 15 minutes.\n\n${url}\n\nIf you didn't ask for it, you can ignore this email.`,
  };
}

export function resetPasswordEmail(to: string, url: string): Mail {
  return {
    to,
    subject: "Reset your password",
    text: `Use this link to choose a new password. It expires in 1 hour.\n\n${url}\n\nIf you didn't ask for it, you can ignore this email.`,
  };
}
