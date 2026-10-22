const jwt = require('jsonwebtoken');

// Only these documents can be rendered and downloaded as PDFs
const DOWNLOADABLE_ENTITIES = ['invoice', 'quote', 'payment'];

const AUDIENCE = 'download';
const DEFAULT_TTL = '5m';

/** Signs a short-lived token that allows downloading one specific document. */
const signDownloadToken = (entity, id, expiresIn = DEFAULT_TTL) =>
  jwt.sign({ entity, id: String(id) }, process.env.JWT_SECRET, { audience: AUDIENCE, expiresIn });

/** Returns true only for a valid, unexpired token issued for this exact entity and id. */
const verifyDownloadToken = (token, entity, id) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: AUDIENCE });
    return payload.entity === entity && payload.id === String(id);
  } catch (error) {
    return false;
  }
};

/** Relative URL (no leading slash) that downloads the document's PDF. */
const signDownloadUrl = (entity, id, expiresIn) =>
  `download/${entity}/${entity}-${id}.pdf?token=${signDownloadToken(entity, id, expiresIn)}`;

module.exports = { DOWNLOADABLE_ENTITIES, signDownloadToken, verifyDownloadToken, signDownloadUrl };
