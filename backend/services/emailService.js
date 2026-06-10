const nodemailer = require('nodemailer');

let transporter;

function getEmailConfig() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.EMAIL_PORT || 587);
  return {
    host,
    port,
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  };
}

function getTransporter() {
  const config = getEmailConfig();
  if (!config) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(config);
  }

  return transporter;
}

function isEmailConfigured() {
  return Boolean(getEmailConfig());
}

async function sendInvoiceEmail(toEmail, order, pdfBuffer) {
  try {
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      throw new Error('Email service is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS.');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: toEmail,
      subject: `Your Invoice for Order #${order._id}`,
      text: `Hello,\n\nThank you for your order. Please find your invoice attached as a PDF.\n\nBest regards,\nYour Store`,
      attachments: [
        {
          filename: `invoice_${order._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await mailTransporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Email sending failed for order', order._id, ':', error);
    throw error;
  }
}

async function sendDiscountEmail(toEmail, product, oldPrice, newPrice, discountRate) {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    throw new Error('Email service is not configured.');
  }
  const subject = `${product.name} is now ${discountRate}% off!`;
  const text = [
    `Hello,`,
    ``,
    `Good news — a product on your wish list is on sale:`,
    ``,
    `  ${product.name} (${product.code})`,
    `  Was: $${Number(oldPrice).toFixed(2)}`,
    `  Now: $${Number(newPrice).toFixed(2)}  (-${discountRate}%)`,
    ``,
    `Grab it before stock runs out.`,
    ``,
    `Best regards,`,
    `Your Store`,
  ].join('\n');

  return mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject,
    text,
  });
}

async function sendRefundEmail(toEmail, returnDoc) {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    throw new Error('Email service is not configured.');
  }
  const subject = `Your refund for ${returnDoc.productName} has been approved`;
  const text = [
    `Hello,`,
    ``,
    `Good news — we have received your returned item and approved your refund:`,
    ``,
    `  ${returnDoc.productName} (${returnDoc.productCode})`,
    `  Quantity: ${returnDoc.quantity}`,
    `  Refund amount: $${Number(returnDoc.totalRefund).toFixed(2)}`,
    ``,
    `The amount has been refunded to your original payment method and the item`,
    `has been returned to our stock.`,
    ``,
    `Best regards,`,
    `Your Store`,
  ].join('\n');

  return mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject,
    text,
  });
}

module.exports = { sendInvoiceEmail, sendDiscountEmail, sendRefundEmail, isEmailConfigured };
