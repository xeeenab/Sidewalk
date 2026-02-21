export const ROLES = ['CITIZEN', 'AGENCY_ADMIN'] as const;

export type Role = (typeof ROLES)[number];

export type AuthenticatedUser = {
  id: string;
  role: Role;
  district?: string;
};
