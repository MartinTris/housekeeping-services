import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "../context/PermissionsContext";

const ProtectedRoute = ({ children, pageKey, fallbackPath }) => {
  const { hasAccess, allAccess, loading } = usePermissions();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Checking permissions...</div>
      </div>
    );
  }

  // Superadmin has access to everything
  if (allAccess) {
    return children;
  }

  // Check if user has access to this page
  if (!hasAccess(pageKey)) {
    // Determine fallback based on current role
    const defaultFallback = fallbackPath || location.pathname.split("/")[1] || "/";
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-700 mb-4">
            This page has been disabled by your administrator.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;