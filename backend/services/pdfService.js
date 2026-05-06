const PDFDocument = require('pdfkit');
const { computeInvoiceTotals } = require('../lib/invoiceTotals');

function generateInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Order info
      doc.fontSize(12).text(`Order ID: ${order._id}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.moveDown();

      // Shipping Address
      doc.text('Shipping Address:', { underline: true });
      doc.text(order.shippingAddress.fullName);
      doc.text(order.shippingAddress.address);
      doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`);
      doc.text(order.shippingAddress.country);
      doc.moveDown(2);

      // Product List (prices are VAT-inclusive)
      doc.text('Products:', { underline: true });
      doc.moveDown();

      order.items.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        doc.text(`${item.name} (x${item.quantity}) - $${itemTotal.toFixed(2)} (VAT incl.)`);
      });

      doc.moveDown();

      // Totals — reverse-calculated from the inclusive order.totalPrice
      // so the printed total matches what the customer actually paid.
      const { subtotal, vat, total, vatRate } = computeInvoiceTotals({
        totalPrice: order.totalPrice,
      });

      doc.text(`Subtotal (ex-VAT): $${subtotal.toFixed(2)}`);
      doc.text(`VAT (${Math.round(vatRate * 100)}%): $${vat.toFixed(2)}`);
      doc.moveDown();
      doc.fontSize(14).text(`Total Amount: $${total.toFixed(2)}`, { bold: true });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
