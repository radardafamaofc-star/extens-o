import { z } from 'zod';
import { insertActivationCodeSchema, activationCodes } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  codes: {
    list: {
      method: 'GET' as const,
      path: '/api/codes' as const,
      responses: {
        200: z.array(z.custom<typeof activationCodes.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/codes' as const,
      input: z.object({
        daysValid: z.number().min(1).max(365).default(30),
      }),
      responses: {
        201: z.custom<typeof activationCodes.$inferSelect>(),
        401: errorSchemas.unauthorized,
        400: errorSchemas.validation,
      },
    },
    revoke: {
      method: 'POST' as const,
      path: '/api/codes/:id/revoke' as const,
      responses: {
        200: z.custom<typeof activationCodes.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    }
  },
  extension: {
    verify: {
      method: 'POST' as const,
      path: '/api/extension/verify' as const,
      input: z.object({
        code: z.string(),
      }),
      responses: {
        200: z.object({ valid: z.boolean(), expiresAt: z.string() }),
        400: errorSchemas.validation,
      }
    },
    improve: {
      method: 'POST' as const,
      path: '/api/extension/improve' as const,
      input: z.object({
        code: z.string(),
        prompt: z.string(),
      }),
      responses: {
        200: z.object({ improvedPrompt: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:\${key}`)) {
        url = url.replace(`:\${key}`, String(value));
      }
    });
  }
  return url;
}

export type CodeResponse = z.infer<typeof api.codes.create.responses[201]>;
