const { sendDocumentEmail } = require('@/services/documentMail');

// POST /payment/mail  { id, to?, cc?, message? }
const mail = async (req, res) => {
  const result = await sendDocumentEmail({ entity: 'payment', body: req.body, user: req.admin });
  return res.status(200).json({
    success: true,
    result,
    message: `Email sent to ${result.to}`,
  });
};

module.exports = mail;
