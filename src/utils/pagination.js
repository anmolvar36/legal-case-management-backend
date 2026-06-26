/**
 * Pagination helper for Prisma queries
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} skip and take for Prisma
 */
const getPagination = (page = 1, limit = 10) => {
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  return {
    skip,
    take,
  };
};

module.exports = {
  getPagination,
};
