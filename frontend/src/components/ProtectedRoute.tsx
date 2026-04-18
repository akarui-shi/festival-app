import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user) {
    const granted = new Set((user.roles || []).map((role) => role.toUpperCase()));
    const allowed = roles.some((role) => granted.has(role) || granted.has(`ROLE_${role}`));
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
