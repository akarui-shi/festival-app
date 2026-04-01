export const ROLE = {
  RESIDENT: 'RESIDENT',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN'
};

export const hasAnyRole = (user, allowedRoles = []) => {
  if (!user || !Array.isArray(user.roles)) return false;
  return allowedRoles.some((role) => user.roles.includes(role));
};
