import nodemailer from "nodemailer";
import { env } from "../env";

/**
 * Mailer abstraction.
 *  - MAIL_TRANSPORT=console (default): emails are printed to the server log (dev/testing).
 *  - MAIL_TRANSPORT=smtp: sent via SMTP_* settings (any provider: Postmark, SES, Mailgun, Gmail…).
 * To add another transport (e.g. an HTTP API), implement `Mailer` and return it from getMailer().
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(msg: MailMessage) {
    console.log(
      `\n[mail] ─────────────────────────────\n[mail] To: ${msg.to}\n[mail] Subject: ${msg.subject}\n${msg.text}\n[mail] ─────────────────────────────\n`,
    );
  }
}

class SmtpMailer implements Mailer {
  private transport = nodemailer.createTransport({
    host: env().SMTP_HOST,
    port: env().SMTP_PORT,
    secure: env().SMTP_SECURE,
    auth: env().SMTP_USER ? { user: env().SMTP_USER, pass: env().SMTP_PASS } : undefined,
  });

  async send(msg: MailMessage) {
    await this.transport.sendMail({ from: env().MAIL_FROM, ...msg });
  }
}

let mailer: Mailer | null = null;

export function getMailer(): Mailer {
  if (mailer) return mailer;
  mailer = env().MAIL_TRANSPORT === "smtp" && env().SMTP_HOST ? new SmtpMailer() : new ConsoleMailer();
  return mailer;
}

/** Sends without throwing – email problems must never break checkout. */
export async function sendMailSafe(msg: MailMessage): Promise<boolean> {
  try {
    await getMailer().send(msg);
    return true;
  } catch (err) {
    console.error("[mail] failed to send", msg.subject, err);
    return false;
  }
}
