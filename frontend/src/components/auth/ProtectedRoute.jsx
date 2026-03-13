import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/giris-yap" replace />;
  }

  return children;
};

export default ProtectedRoute;
