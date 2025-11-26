import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const PermissionsContext = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [allAccess, setAllAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userFacility, setUserFacility] = useState(null);

const fetchPermissions = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const decoded = jwtDecode(token);
    setUserRole(decoded.role);
    setUserFacility(decoded.facility);

    console.log("Fetching permissions for role:", decoded.role);
    console.log("User facility from token:", decoded.facility);  // ADD THIS LINE

    // Superadmin has access to everything
    if (decoded.role === "superadmin") {
      console.log("Superadmin detected - granting all access");
      setAllAccess(true);
      setPermissions([]);
      setLoading(false);
      return;
    }

    if (!decoded.facility) {
      console.error("ERROR: User has no facility in token!", decoded);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const response = await fetch(`${API_URL}/permissions/my-permissions`, {
      headers: { token },
    });

    const data = await response.json();
    console.log("Fetched permissions data:", data);
        setAllAccess(data.all_access || false);
        setPermissions(data.permissions || []);
      }
    catch (err) {
      console.error("Error fetching permissions:", err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("PermissionsProvider mounted - fetching permissions");
    fetchPermissions();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      console.log("Permission refresh event received - refetching permissions");
      fetchPermissions();
    };

    const handleFacilityUpdate = () => {
      console.log("Facility update event received - refetching permissions");
      fetchPermissions();
    };

    window.addEventListener('permissionsNeedRefresh', handleRefresh);
    window.addEventListener("userFacilityUpdated", handleFacilityUpdate);
    
    return () => {
      window.removeEventListener('permissionsNeedRefresh', handleRefresh);
      window.removeEventListener("userFacilityUpdated", handleFacilityUpdate);
    };
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        console.log("Polling for permission updates...");
        fetchPermissions();
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  const hasAccess = (pageKey) => {
    if (allAccess) {
      console.log(`Access check for ${pageKey}: granted (all access)`);
      return true;
    }
    const hasPermission = permissions.some((p) => p.page_key === pageKey && p.is_enabled);
    console.log(`Access check for ${pageKey}:`, hasPermission);
    return hasPermission;
  };

  const enabledPages = permissions
    .filter((p) => p.is_enabled)
    .map((p) => p.page_key);

  const value = {
    permissions,
    allAccess,
    loading,
    userRole,
    userFacility,
    hasAccess,
    enabledPages,
    refetch: fetchPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export default PermissionsContext;