const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const { sendError } = require('@/handlers/errorHandlers');

const unauthorized = (res, message) =>
  res.status(401).json({
    success: false,
    result: null,
    message,
    jwtExpired: true,
  });

const isValidAuthToken = async (req, res, next, { userModel, jwtSecret = 'JWT_SECRET' }) => {
  try {
    const UserPassword = mongoose.model(userModel + 'Password');
    const User = mongoose.model(userModel);

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token

    if (!token) return unauthorized(res, 'No authentication token, authorization denied.');

    let verified;
    try {
      verified = jwt.verify(token, process.env[jwtSecret]);
    } catch (error) {
      return unauthorized(res, 'Token verification failed, authorization denied.');
    }

    // Download links are signed with the same secret but must not work as session tokens
    if (!verified.id || verified.aud)
      return unauthorized(res, 'Token verification failed, authorization denied.');

    const userPasswordPromise = UserPassword.findOne({ user: verified.id, removed: false });
    const userPromise = User.findOne({ _id: verified.id, removed: false });

    const [user, userPassword] = await Promise.all([userPromise, userPasswordPromise]);

    if (!user || !userPassword)
      return unauthorized(res, "User doesn't exist, authorization denied.");

    if (!user.enabled) return unauthorized(res, 'Your account is disabled.');

    if (!userPassword.loggedSessions.includes(token))
      return unauthorized(res, 'User is already logout try to login, authorization denied.');

    const reqUserName = userModel.toLowerCase();
    req[reqUserName] = user;
    next();
  } catch (error) {
    return sendError(error, req, res);
  }
};

module.exports = isValidAuthToken;
