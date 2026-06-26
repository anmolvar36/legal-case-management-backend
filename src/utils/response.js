/**
 * Standardized API response format
 * @param {boolean} success - Operation success status
 * @param {string} message - Human readable message
 * @param {any} data - Response payload
 * @returns {object} Response object
 */
const sendResponse = (success, message, data = {}) => {
  return {
    success,
    message,
    data,
  };
};

module.exports = {
  sendResponse,
};
