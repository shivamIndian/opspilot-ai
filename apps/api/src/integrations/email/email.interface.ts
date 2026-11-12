export interface EmailMessage {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailAdapter {
  sendEmail(message: EmailMessage): Promise<void>;
}
