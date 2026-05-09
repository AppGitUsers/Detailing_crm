import { Navigate, useLocation } from 'react-router-dom';
import { tokens } from '../api/auth';

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!tokens.getAccess()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
