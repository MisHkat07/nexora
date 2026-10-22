const setPassword = require('./setPassword');

// Changes the signed-in user's own password; their other sessions are signed out.
const updateProfilePassword = async (userModel, req, res) => {
  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];
  const { password, passwordCheck } = req.body;

  if (!password || !passwordCheck) {
    return res
      .status(400)
      .json({ success: false, result: null, message: 'Not all fields have been entered.' });
  }

  if (password !== passwordCheck) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Enter the same password twice for verification.',
    });
  }

  await setPassword({
    userModel,
    userId: userProfile._id,
    user: userProfile,
    password,
    keepSessionToken: req.authToken,
  });

  return res.status(200).json({
    success: true,
    result: {},
    message: 'we update the password by this id: ' + userProfile._id,
  });
};

module.exports = updateProfilePassword;
