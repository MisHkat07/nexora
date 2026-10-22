const { sendDocumentEmail } = require('@/services/documentMail');

// POST /quote/mail  { id, to?, cc?, message? }
const mail = async (req, res) => {
  const result = await sendDocumentEmail({
    entity: 'quote',
    body: req.body,
    user: req.admin,
    senderVerified: req.emailVerified,
  });
  return res.status(200).json({
    success: true,
    result,
    message: `Email sent to ${result.to}`,
  });
};

module.exports = mail;
