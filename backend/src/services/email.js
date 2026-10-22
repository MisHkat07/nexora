const { Resend } = require('resend');

const config = require('@/config');
const HttpError = require('@/handlers/httpError');

/** Why email can't be sent right now, or null when it can. */
const missingConfiguration = () => {
  const missing = [];
  if (!config.email.apiKey) missing.push('RESEND_API');
  if (!config.email.from) missing.push('EMAIL_FROM');
  if (!config.appUrl) missing.push('APP_URL');
  return missing.length ? missing : null;
};

let client;
const getClient = () => (client ??= new Resend(config.email.apiKey));

/**
 * Sends one email through Resend. Throws an HttpError the API can return as-is:
 * 422 when email isn't configured, 502 when the provider rejects the message.
 */
const sendEmail = async ({ to, cc, replyTo, subject, html, text, attachments }) => {
  const missing = missingConfiguration();
  if (missing) {
    throw new HttpError(422, `Email is not set up on the server (missing ${missing.join(', ')}).`);
  }

  const { data, error } = await getClient().emails.send({
    from: config.email.from,
    to,
    cc: cc?.length ? cc : undefined,
    replyTo: replyTo || undefined,
    subject,
    html,
    text,
    attachments,
  });

  if (error) {
    throw new HttpError(502, `The email could not be sent: ${error.message || 'provider error'}`);
  }
  return { id: data?.id };
};

/** Absolute URL in the frontend, e.g. appLink('/resetpassword/…'). */
const appLink = (path) => `${config.appUrl}${path.startsWith('/') ? path : `/${path}`}`;

module.exports = { sendEmail, appLink, missingConfiguration };
