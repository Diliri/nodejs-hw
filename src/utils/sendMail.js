import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendEmail = async (options) => {
  return transporter.sendMail(options);
};

// transporter створює з’єднання зі SMTP-сервером.
// nodemailer автоматично підбере безпечні налаштування відповідно до порту та відповіді сервера.
