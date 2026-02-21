import { z } from "zod";

const trimmed = (label: string) =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be a string`,
    })
    .trim()
    .min(1, `${label} is required`);

export const createReportBodySchema = z.object({
  description: trimmed("description"),
});

export const verifyReportBodySchema = z.object({
  txHash: trimmed("txHash"),
  originalDescription: trimmed("originalDescription"),
});

export const updateReportStatusBodySchema = z.object({
  originalTxHash: trimmed("originalTxHash"),
  status: trimmed("status"),
  evidence: z
    .string({
      invalid_type_error: "evidence must be a string",
    })
    .trim()
    .optional(),
});

export const verifyStatusBodySchema = z.object({
  statusTxHash: trimmed("statusTxHash"),
  originalTxHash: trimmed("originalTxHash"),
  status: trimmed("status"),
  evidence: z
    .string({
      invalid_type_error: "evidence must be a string",
    })
    .trim()
    .optional(),
});

export type CreateReportDTO = z.infer<typeof createReportBodySchema>;
export type VerifyReportDTO = z.infer<typeof verifyReportBodySchema>;
export type UpdateReportStatusDTO = z.infer<typeof updateReportStatusBodySchema>;
export type VerifyStatusDTO = z.infer<typeof verifyStatusBodySchema>;
