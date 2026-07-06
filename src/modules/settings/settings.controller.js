const settingsService = require('./settings.service');
const { sendResponse } = require('../../utils/response');

exports.getSettings = async (req, res, next) => {
  try {
    const data = await settingsService.getAll();
    res.json(sendResponse(true, 'Settings fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    await settingsService.update(req.body);
    res.json(sendResponse(true, 'Settings updated successfully'));
  } catch (err) {
    next(err);
  }
};

exports.getCompanyProfile = async (req, res, next) => {
  try {
    const profile = await settingsService.getCompanyProfile();
    res.json(sendResponse(true, 'Company profile fetched', profile));
  } catch (err) {
    next(err);
  }
};

exports.updateCompanyProfile = async (req, res, next) => {
  try {
    const profile = await settingsService.updateCompanyProfile(req.body);
    res.json(sendResponse(true, 'Company profile updated', profile));
  } catch (err) {
    next(err);
  }
};

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const url = `/uploads/company/${req.file.filename}`;
    const profile = await settingsService.updateCompanyProfile({ logo_url: url });
    res.json(sendResponse(true, 'Logo uploaded', profile));
  } catch (err) {
    next(err);
  }
};

exports.uploadLetterhead = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const url = `/uploads/company/${req.file.filename}`;
    const profile = await settingsService.updateCompanyProfile({ letterhead_url: url });
    res.json(sendResponse(true, 'Letterhead uploaded', profile));
  } catch (err) {
    next(err);
  }
};

exports.removeLogo = async (req, res, next) => {
  try {
    const profile = await settingsService.updateCompanyProfile({ logo_url: null });
    res.json(sendResponse(true, 'Logo removed', profile));
  } catch (err) {
    next(err);
  }
};

exports.removeLetterhead = async (req, res, next) => {
  try {
    const profile = await settingsService.updateCompanyProfile({ letterhead_url: null });
    res.json(sendResponse(true, 'Letterhead removed', profile));
  } catch (err) {
    next(err);
  }
};
