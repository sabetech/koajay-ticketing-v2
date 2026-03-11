import { Navigate } from "react-router-dom";
import { authService } from "@/services/auth";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const token = localStorage.getItem("token");
    const user = authService.getCurrentUser();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
