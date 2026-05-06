const PDFDocument = require('pdfkit');

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

      // Product List
      doc.text('Products:', { underline: true });
      doc.moveDown();

      let subtotal = 0;

      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        doc.text(`${item.name} (x${item.quantity}) - $${itemTotal.toFixed(2)}`);
      });

      doc.moveDown();
      
      // Totals
      const vat = subtotal * 0.18; // assuming 18% VAT
      const total = subtotal + vat;

      doc.text(`Subtotal: $${subtotal.toFixed(2)}`);
      doc.text(`VAT (18%): $${vat.toFixed(2)}`);
      doc.moveDown();
      doc.fontSize(14).text(`Total Amount: $${total.toFixed(2)}`, { bold: true });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
