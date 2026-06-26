const service = require('./search.service');
const { sendResponse } = require('../../utils/response');

const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const data = await service.searchAll(q, req.user);
    res.status(200).json(sendResponse(true, 'Search results fetched', data));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  search
};
