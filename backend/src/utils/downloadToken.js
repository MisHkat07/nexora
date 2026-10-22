const jwt = require('jsonwebtoken');

const { currentTenant } = require('@/tenancy/context');

// Only these documents can be rendered and downloaded as PDFs
const DOWNLOADABLE_ENTITIES = ['invoice', 'quote', 'payment'];

const AUDIENCE = 'download';
const DEFAULT_TTL = '5m';

/**
 * Signs a short-lived token that allows downloading one specific document of the
 * current organization. Must be called inside a tenant context (an authenticated request).
 */
const signDownloadToken = (entity, id, expiresIn = DEFAULT_TTL) => {
  const org = currentTenant();
  if (!org) throw new Error('signDownloadToken needs a tenant context');
  return jwt.sign({ entity, id: String(id), org }, process.env.JWT_SECRET, {
    audience: AUDIENCE,
    expiresIn,
  });
};

/**
 * Returns the organization id for a valid, unexpired token issued for this exact
 * entity and id, or null.
 */
const verifyDownloadToken = (token, entity, id) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: AUDIENCE });
    return payload.entity === entity && payload.id === String(id) && payload.org ? payload.org : null;
  } catch (error) {
    return null;
  }
};

/** Relative URL (no leading slash) that downloads the document's PDF. */
const signDownloadUrl = (entity, id, expiresIn) =>
  `download/${entity}/${entity}-${id}.pdf?token=${signDownloadToken(entity, id, expiresIn)}`;

module.exports = { DOWNLOADABLE_ENTITIES, signDownloadToken, verifyDownloadToken, signDownloadUrl };
