/*
  HTML email templates. Every value inserted into the HTML goes through `escape`,
  because client names, notes and messages are user input.
*/

const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Keeps line breaks from plain-text messages
const paragraphs = (text) =>
  escape(text)
    .split(/\r?\n\r?\n/)
    .map((block) => `<p style="margin:0 0 16px">${block.replace(/\r?\n/g, '<br />')}</p>`)
    .join('');

const button = (href, label) => `
  <a href="${escape(href)}" style="display:inline-block;background:#0061ff;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escape(label)}</a>`;

const layout = ({ companyName, preview, body }) => `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;background:#f5f8fc;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#12263f">
    <span style="display:none;max-height:0;overflow:hidden">${escape(preview)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3ebf6;border-radius:12px;padding:32px;font-size:15px;line-height:1.6">
          <tr><td>
            <p style="margin:0 0 24px;font-size:18px;font-weight:700">${escape(companyName)}</p>
            ${body}
          </td></tr>
        </table>
        <p style="color:#6e84a3;font-size:12px;margin:16px 0 0">Sent by ${escape(companyName)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

exports.passwordReset = ({ name, link, companyName = 'Nexora' }) => ({
  subject: 'Reset your password',
  html: layout({
    companyName,
    preview: 'Reset your password',
    body: `
      <p style="margin:0 0 16px">Hello ${escape(name)},</p>
      <p style="margin:0 0 24px">We received a request to reset your password. This link is valid for 1 hour.</p>
      <p style="margin:0 0 24px">${button(link, 'Reset password')}</p>
      <p style="margin:0;color:#6e84a3;font-size:13px">If you didn't ask for this, you can ignore this email; your password won't change.</p>`,
  }),
  text: `Hello ${name},\n\nReset your password (valid for 1 hour): ${link}\n\nIf you didn't ask for this, ignore this email.`,
});

/**
 * Email that delivers an invoice, quote or payment receipt.
 * `details` is a list of [label, value] rows shown in a summary table.
 */
exports.documentEmail = ({ companyName, clientName, title, intro, details, message, downloadUrl }) => {
  const rows = details
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#6e84a3">${escape(label)}</td>
          <td style="padding:6px 0;text-align:right;font-weight:600">${escape(value)}</td>
        </tr>`
    )
    .join('');

  return {
    html: layout({
      companyName,
      preview: `${title} from ${companyName}`,
      body: `
        <p style="margin:0 0 16px">Hello ${escape(clientName)},</p>
        ${message ? paragraphs(message) : `<p style="margin:0 0 16px">${escape(intro)}</p>`}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-top:1px solid #e3ebf6;border-bottom:1px solid #e3ebf6">${rows}</table>
        <p style="margin:0 0 8px">The PDF is attached. You can also download it here:</p>
        <p style="margin:0 0 24px">${button(downloadUrl, `Download ${title}`)}</p>
        <p style="margin:0;color:#6e84a3;font-size:13px">The download link works for 7 days.</p>`,
    }),
    text: [
      `Hello ${clientName},`,
      '',
      message || intro,
      '',
      ...details.map(([label, value]) => `${label}: ${value}`),
      '',
      `Download (valid for 7 days): ${downloadUrl}`,
      '',
      companyName,
    ].join('\n'),
  };
};

exports.escape = escape;
