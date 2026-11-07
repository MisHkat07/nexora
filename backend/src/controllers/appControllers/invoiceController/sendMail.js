const { queueOrSend } = require('@/features/queueMail');

module.exports = queueOrSend('invoice');
