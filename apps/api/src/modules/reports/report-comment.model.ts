import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

const COMMENT_VISIBILITIES = ['PUBLIC', 'INTERNAL'] as const;

export type ReportCommentVisibility = (typeof COMMENT_VISIBILITIES)[number];

export interface ReportComment {
  reportId: Types.ObjectId;
  authorId: string;
  authorRole: 'CITIZEN' | 'AGENCY_ADMIN';
  body: string;
  visibility: ReportCommentVisibility;
}

const reportCommentSchema = new Schema<ReportComment>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorRole: {
      type: String,
      enum: ['CITIZEN', 'AGENCY_ADMIN'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    visibility: {
      type: String,
      enum: COMMENT_VISIBILITIES,
      default: 'PUBLIC',
      index: true,
    },
  },
  { timestamps: true },
);

reportCommentSchema.index({ reportId: 1, createdAt: -1 });

export type ReportCommentDocument = HydratedDocument<ReportComment>;

export const ReportCommentModel = model<ReportComment>('ReportComment', reportCommentSchema);
