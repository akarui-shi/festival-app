import type { User, UserRole } from '@/types';

const ROLE_ALIASES: Record<string, UserRole> = {
  RESIDENT: 'RESIDENT',
  ROLE_RESIDENT: 'RESIDENT',
  ЖИТЕЛЬ: 'RESIDENT',
  ORGANIZER: 'ORGANIZER',
  ROLE_ORGANIZER: 'ORGANIZER',
  ORGANISER: 'ORGANIZER',
  ROLE_ORGANISER: 'ORGANIZER',
  ОРГАНИЗАТОР: 'ORGANIZER',
  ROLE_ОРГАНИЗАТОР: 'ORGANIZER',
  ADMIN: 'ADMIN',
  ROLE_ADMIN: 'ADMIN',
  АДМИНИСТРАТОР: 'ADMIN',
};

function normalizeRole(raw: string): UserRole | null {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return ROLE_ALIASES[normalized] ?? null;
}

export function getUserRoles(user: User | null): UserRole[] {
  if (!user) {
    return [];
  }

  const candidates = [
    ...(user.roles || []),
    ...(user.role ? [user.role] : []),
  ];

  const resolved = new Set<UserRole>();
  candidates.forEach((role) => {
    const mapped = normalizeRole(String(role));
    if (mapped) {
      resolved.add(mapped);
    }
  });

  return Array.from(resolved);
}

export function userHasRole(user: User | null, role: UserRole): boolean {
  return getUserRoles(user).includes(role);
}
