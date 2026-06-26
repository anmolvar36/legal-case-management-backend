const { z } = require('zod');

const authSchema = {
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(4),
    }),
  }),
  register: z.object({
    body: z.object({
      full_name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(4),
      role: z.enum(['admin', 'lawyer', 'client']).optional(),
    }),
  }),
};

module.exports = { authSchema };
