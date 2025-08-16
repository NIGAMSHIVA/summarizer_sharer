const nodemailer = require("nodemailer");

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP config. Set SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass }
  });
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const transporter = makeTransport();
  const info = await transporter.sendMail({
    from, to, subject: subject || "Meeting Summary",
    text, html
  });
  return info;
}

module.exports = { sendMail };
