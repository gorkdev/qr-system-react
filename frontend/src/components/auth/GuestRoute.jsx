import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/genel" replace />;
  }

  return children;
};

export default GuestRoute;
