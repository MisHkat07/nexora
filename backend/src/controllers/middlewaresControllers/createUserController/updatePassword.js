const mongoose = require('mongoose');

const setPassword = require('./setPassword');

// Sets another user's password (admin action). That user is signed out everywhere.
const updatePassword = async (userModel, req, res) => {
  const User = mongoose.model(userModel);
  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  const target = await User.findOne({ _id: req.params.id, removed: false }).exec();
  if (!target) {
    return res.status(404).json({ success: false, result: null, message: 'User not found' });
  }

  const isSelf = String(target._id) === String(userProfile._id);
  await setPassword({
    userModel,
    userId: target._id,
    user: target,
    password: req.body.password,
    keepSessionToken: isSelf ? req.authToken : undefined,
  });

  return res.status(200).json({
    success: true,
    result: {},
    message: 'we update the password by this id: ' + target._id,
  });
};

module.exports = updatePassword;
