function formatCurrency(value) {
  return `${Number(value).toFixed(2)} ₺`;
}

function buildInvoiceNumber(order) {
  const idPart = String(order._id || order.id || '').slice(-6).toUpperCase();
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const y = createdAt.getUTCFullYear();
  const m = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(createdAt.getUTCDate()).padStart(2, '0');
  return `INV-${y}${m}${d}-${idPart || 'XXXXXX'}`;
}

function generateInvoice(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('order is required');
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('order.items must be a non-empty array');
  }

  const lines = order.items.map((item) => {
    const lineTotal = Number(item.price) * Number(item.quantity);
    return {
      code: item.code,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.price),
      lineTotal,
      display: `${item.code} · ${item.name} × ${item.quantity} = ${formatCurrency(lineTotal)}`,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  return {
    invoiceNumber: buildInvoiceNumber(order),
    issuedAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
    shippingAddress: order.shippingAddress || null,
    lines,
    subtotal,
    total: subtotal,
    formattedTotal: formatCurrency(subtotal),
  };
}

module.exports = { generateInvoice, buildInvoiceNumber, formatCurrency };
