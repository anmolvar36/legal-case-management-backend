const { sendResponse } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    return res.status(400).json(sendResponse(false, 'Validation Error', err.errors));
  }
};

module.exports = { validate };
