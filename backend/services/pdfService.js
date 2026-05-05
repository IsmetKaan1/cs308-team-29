const PDFDocument = require('pdfkit');
const { generateInvoice, formatCurrency } = require('../lib/invoice');

function generateInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const invoice = generateInvoice(order);
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Order info
      doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.text(`Order ID: ${order._id}`);
      doc.text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`);
      doc.moveDown();

      // Shipping Address
      doc.text('Shipping Address:', { underline: true });
      doc.text(invoice.shippingAddress.fullName);
      doc.text(invoice.shippingAddress.address);
      doc.text(`${invoice.shippingAddress.city}, ${invoice.shippingAddress.postalCode}`);
      doc.text(invoice.shippingAddress.country);
      doc.moveDown(2);

      // Product List
      doc.text('Products:', { underline: true });
      doc.moveDown();

      invoice.lines.forEach((item) => {
        doc.text(`${item.code} - ${item.name} (x${item.quantity}) - ${formatCurrency(item.lineTotal)}`);
      });

      doc.moveDown();

      // Totals
      doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`);
      doc.moveDown();
      doc.fontSize(14).text(`Total Amount: ${invoice.formattedTotal}`, { bold: true });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
