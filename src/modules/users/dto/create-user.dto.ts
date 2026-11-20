import { z } from 'zod';

export const createUserSchema = z.object({
  email : z.string().trim().toLowerCase().pipe(z.email()),
  name  : z.string().trim().min(1).max(100).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
