import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.GMAIL_SMTP_USER, // logiteh045@gmail.com
    pass: process.env.GMAIL_SMTP_APP_PASSWORD, // 16-char app password, no spaces
  },
});