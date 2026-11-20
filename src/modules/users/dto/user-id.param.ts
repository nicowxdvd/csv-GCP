import { z } from 'zod';

export const userIdParamSchema = z.object({ id: z.uuid() });

export type UserIdParam = z.infer<typeof userIdParamSchema>;
