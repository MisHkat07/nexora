const { sendDocumentEmail } = require('@/services/documentMail');

// POST /invoice/mail  { id, to?, cc?, message? }
const mail = async (req, res) => {
  const result = await sendDocumentEmail({ entity: 'invoice', body: req.body, user: req.admin });
  return res.status(200).json({
    success: true,
    result,
    message: `Email sent to ${result.to}`,
  });
};

module.exports = mail;
