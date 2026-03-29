export type AuthSessionResponse = {
  accessToken: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  expiresIn: string;
};

export type ReportSummary = {
  id: string;
  title: string;
  category: string;
  status: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  anchorStatus?: string;
  stellarTxHash?: string | null;
  integrityFlag?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReportListResponse = {
  data: ReportSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ReportDetailResponse = {
  data: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    media: Array<{
      id: string;
      url: string;
      originalUrl: string;
      processingStatus: string;
      exifVerified: boolean;
    }>;
    anchor: {
      status: string;
      attempts: number;
      txHash: string | null;
      lastError: string | null;
      needsAttention: boolean;
      failedAt: string | null;
      snapshotHash: string | null;
      contentHash: string;
      explorerUrl: string | null;
    };
    integrity: {
      exifVerified: boolean;
      exifDistanceMeters: number | null;
      flag: string;
    };
    history: Array<{
      id: string;
      previousStatus: string;
      nextStatus: string;
      note: string | null;
      actorId: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    }>;
    createdAt: string | null;
    updatedAt: string | null;
  };
};
