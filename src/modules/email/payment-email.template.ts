interface OrderDetails {
  orderNumber: string;
  orderUrl?: string | undefined;
  paymentReference: string;
}

export interface OrderConfirmationDetails extends OrderDetails {
  amount: string;
  currency: string;
  cancelled?: boolean;
  invoiceUrl?: string | undefined;
  items: { name: string; quantity: number; total: string }[];
}

export interface RefundEmailDetails extends OrderDetails {
  amount: string;
  currency: string;
  status: 'initiated' | 'processed' | 'failed';
}

export interface PaymentEmailContent {
  subject: string;
  html: string;
  text: string;
}

type DetailRow = [label: string, value: string];

interface PaymentMessage {
  subject: string;
  title: string;
  status: string;
  tone: 'success' | 'notice' | 'warning';
  intro: string;
  details: DetailRow[];
  actions: { label: string; url?: string | undefined }[];
  items?: { name: string; quantity: number; amount: string }[];
  note?: string;
}

const colors = {
  success: { background: '#dcfce7', text: '#14532d' },
  notice: { background: '#f0e5ff', text: '#542682' },
  warning: { background: '#fff0db', text: '#803900' },
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}

function safeLink(input?: string) {
  if (!input) return undefined;
  try {
    const url = new URL(input);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function amountLabel(amount: string, currency: string) {
  return currency === 'INR' ? `₹${amount}` : `${currency} ${amount}`;
}

function renderEmail(message: PaymentMessage): PaymentEmailContent {
  const { subject, title, status, tone, intro, details, items, note } = message;
  const s = escapeHtml;
  const badge = colors[tone];
  const actions = message.actions.flatMap(({ label, url }) => {
    const link = safeLink(url);
    return link ? [{ label, link }] : [];
  });
  const detailRows = details
    .map(
      ([label, value]) => `<tr>
      <th scope="row" align="left" valign="top" style="padding:8px 12px 8px 0;color:#564967;font-size:14px;font-weight:400;">${s(label)}</th>
      <td align="right" valign="top" style="padding:8px 0;color:#1f142d;font-size:14px;font-weight:700;word-break:break-word;">${s(value)}</td>
    </tr>`,
    )
    .join('');
  const itemRows = items
    ?.map(
      ({ name, quantity, amount }) => `<tr>
    <td style="padding:10px 10px 10px 0;border-bottom:1px solid #eee6f4;color:#1f142d;word-break:break-word;">${s(name)}</td>
    <td align="center" style="padding:10px 6px;border-bottom:1px solid #eee6f4;">${quantity}</td>
    <td align="right" style="padding:10px 0 10px 6px;border-bottom:1px solid #eee6f4;white-space:nowrap;">${s(amount)}</td>
  </tr>`,
    )
    .join('');
  const buttons = actions
    .map(({ label, link }, index) =>
      index === 0
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr>
          <td bgcolor="#351c4c" style="border-radius:8px">
            <a href="${s(link)}" style="display:inline-block;padding:13px 21px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${s(label)}</a>
          </td></tr></table>`
        : `<p style="margin:14px 0 0;"><a href="${s(link)}" style="color:#542682;font-weight:700;text-decoration:underline;">${s(label)}</a></p>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${s(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4eff9;color:#1f142d;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${s(intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4eff9">
    <tr><td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;border:1px solid #e7dbf0;border-radius:16px;">
        <tr><td bgcolor="#140824" style="padding:19px 26px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:2px;border-radius:15px 15px 0 0;">LUUNA</td></tr>
        <tr><td bgcolor="#f0e5ff" style="padding:24px 26px;">
          <p style="margin:0;"><span style="display:inline-block;padding:6px 10px;border-radius:999px;background-color:${badge.background};color:${badge.text};font-size:12px;font-weight:700;">${s(status)}</span></p>
          <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.15;color:#241435;">${s(title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#473554;">${s(intro)}</p>
        </td></tr>
        <tr><td style="padding:22px 26px 26px;font-size:14px;line-height:1.45;">
          <table width="100%" cellpadding="0" cellspacing="0" aria-label="Payment details">${detailRows}</table>
          ${
            itemRows
              ? `<h2 style="margin:22px 0 8px;font-size:16px;">Items in your order</h2>
            <table width="100%" cellpadding="0" cellspacing="0" aria-label="Items in your order" style="font-size:14px;">
              <thead><tr bgcolor="#f7f1fa">
                <th scope="col" align="left" style="padding:8px 6px;">Item</th>
                <th scope="col" align="center" style="padding:8px 6px;">Qty</th>
                <th scope="col" align="right" style="padding:8px 6px;">Total</th>
              </tr></thead><tbody>${itemRows}</tbody>
            </table>`
              : ''
          }
          ${buttons}
          ${note ? `<p style="margin:18px 0 0;color:#564967;font-size:13px;line-height:1.55;">${s(note)}</p>` : ''}
        </td></tr>
        <tr><td bgcolor="#faf6fc" style="padding:16px 26px;color:#5b4b66;font-size:12px;border-radius:0 0 15px 15px;">Luuna · Payment and order updates</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    title,
    intro,
    ...details.map(([label, value]) => `${label} — ${value}`),
    ...(items?.map(
      ({ name, quantity, amount }) => `${name} × ${quantity} — ${amount}`,
    ) ?? []),
    ...actions.map(({ label, link }) => `${label} — ${link}`),
    ...(note ? [note] : []),
    'Luuna',
  ].join('\n\n');

  return { subject, html, text };
}

export function renderOrderConfirmation(details: OrderConfirmationDetails) {
  const heading = details.cancelled
    ? {
        subject: `Payment received for cancelled order · ${details.orderNumber}`,
        title: 'Payment received for a cancelled order',
        status: 'Order cancelled',
        tone: 'warning' as const,
        intro:
          'We received your payment after the order was cancelled. Contact Luuna support with your payment reference for help.',
      }
    : {
        subject: `Order confirmed · ${details.orderNumber}`,
        title: 'Your order is confirmed',
        status: 'Payment received',
        tone: 'success' as const,
        intro:
          'Thanks for shopping with Luuna. We’ve received your payment and are preparing your order.',
      };
  return renderEmail({
    ...heading,
    details: [
      ['Order number', details.orderNumber],
      ['Payment reference', details.paymentReference],
      ['Amount paid', amountLabel(details.amount, details.currency)],
    ],
    items: details.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      amount: amountLabel(item.total, details.currency),
    })),
    actions: [
      { label: 'View order details', url: details.orderUrl },
      { label: 'Download invoice', url: details.invoiceUrl },
    ],
    ...(safeLink(details.invoiceUrl)
      ? {
          note: 'The invoice link is available for 10 minutes after it’s generated.',
        }
      : {}),
  });
}

export function renderPaymentFailure(details: OrderDetails) {
  return renderEmail({
    subject: `Payment not completed · ${details.orderNumber}`,
    title: 'Your payment wasn’t completed',
    status: 'Payment unsuccessful',
    tone: 'warning',
    intro:
      'We couldn’t confirm a successful payment for this order. Check the order status before trying again.',
    details: [
      ['Order number', details.orderNumber],
      ['Payment reference', details.paymentReference],
    ],
    actions: [{ label: 'View order status', url: details.orderUrl }],
    note: 'If your bank shows a debit, contact Luuna support and include your payment reference.',
  });
}

const refundCopy = {
  initiated: {
    title: 'Your refund has started',
    status: 'Refund initiated',
    tone: 'notice',
    intro:
      'We’ve requested your refund. We’ll email you when there’s an update.',
  },
  processed: {
    title: 'Your refund was processed',
    status: 'Refund processed',
    tone: 'success',
    intro:
      'Razorpay has processed your refund. Your bank may take additional time to show it in your account.',
  },
  failed: {
    title: 'Your refund needs attention',
    status: 'Refund unsuccessful',
    tone: 'warning',
    intro:
      'We couldn’t complete your refund. Contact Luuna support with your order number so we can look into it.',
  },
} as const;

export function renderRefundUpdate(details: RefundEmailDetails) {
  const copy = refundCopy[details.status];
  return renderEmail({
    ...copy,
    subject: `${copy.status} · ${details.orderNumber}`,
    details: [
      ['Order number', details.orderNumber],
      ['Payment reference', details.paymentReference],
      ['Refund amount', amountLabel(details.amount, details.currency)],
    ],
    actions: [{ label: 'View order details', url: details.orderUrl }],
  });
}
