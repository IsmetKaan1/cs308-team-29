const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-email-password',
  },
});

async function sendInvoiceEmail(toEmail, order, pdfBuffer) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Your Store" <noreply@yourstore.com>',
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

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    // We log the error but don't throw to prevent breaking the main flow
    console.error('Email sending failed for order', order._id, ':', error);
    throw error;
  }
}

module.exports = { sendInvoiceEmail };
