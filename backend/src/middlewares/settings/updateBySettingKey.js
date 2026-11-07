const mongoose = require('mongoose');

const { currentTenant } = require('@/tenancy/context');
const { invalidateSettings } = require('./loadSettings');

const Model = mongoose.model('Setting');

const updateBySettingKey = async ({ settingKey, settingValue }) => {
  try {
    if (!settingKey || !settingValue) {
      return null;
    }

    const result = await Model.findOneAndUpdate(
      { settingKey },
      {
        settingValue,
      },
      {
        new: true, // return the new result instead of the old one
        runValidators: true,
      }
    ).exec();
    // If no results found, return document not found
    if (!result) {
      return null;
    }
    invalidateSettings(currentTenant());
    return result;
  } catch {
    return null;
  }
};

module.exports = updateBySettingKey;
