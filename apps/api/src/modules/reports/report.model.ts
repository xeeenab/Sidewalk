import { Schema, model, type HydratedDocument } from "mongoose";

export interface Report {
  snapshot: string;
  snapshot_hash: string;
  stellar_tx_hash: string | null;
  anchor_status: "PENDING" | "ANCHORED" | "FAILED";
  anchor_attempts: number;
  anchor_last_error: string | null;
}

const reportSchema = new Schema(
  {
    snapshot: {
      type: String,
      required: true,
    },
    snapshot_hash: {
      type: String,
      required: true,
      index: true,
    },
    stellar_tx_hash: {
      type: String,
      default: null,
      index: true,
    },
    anchor_status: {
      type: String,
      enum: ["PENDING", "ANCHORED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    anchor_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    anchor_last_error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export type ReportDocument = HydratedDocument<Report>;

export const ReportModel = model<Report>("Report", reportSchema);
