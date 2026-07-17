/**
 * Handles XFA PDF detection and processing placeholder.
 */
async function processXfa(buffer) {
  return {
    requiresXfaProcessing: true,
    message: 'XFA PDF detected. Please use Adobe/Apryse integrated endpoint for form filling.',
    status: 'xfa_pending'
  };
}

module.exports = {
  processXfa
};
