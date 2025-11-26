import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeepingTrends = () => {
  const [data, setData] = useState([]);
  const [granularity, setGranularity] = useState("daily");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (selectedServiceType) {
      fetchTrends();
    }
  }, [granularity, selectedServiceType, selectedFacility]);

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/service-types`, {
        headers: { token: localStorage.getItem("token") },
      });
      const types = await res.json();
      setServiceTypes(types);
      
      setSelectedServiceType("all");
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  };

  const fetchTrends = async () => {
    try {
      let url = `${API_URL}/api/trends/housekeeping-trends?granularity=${granularity}`;
      
      if (userRole === 'superadmin' && selectedFacility) {
        url += `&facility=${selectedFacility}`;
      }

      const res = await fetch(url, {
        headers: { token: localStorage.getItem("token") },
      });

      const raw = await res.json();
      const formatted = formatTrends(raw);
      setData(formatted);
    } catch (err) {
      console.error("Error fetching trends:", err);
    }
  };

  const formatTrends = (rawData) => {
    const today = new Date();

    if (granularity === "daily") {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 3);
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      return days.map((day) => {
        const dataPoint = { period: day };
        
        if (selectedServiceType === "all") {
          const serviceTypeFacilityKeys = new Set();
          rawData.forEach((r) => {
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              serviceTypeFacilityKeys.add(`${r.service_type} (${r.facility})`);
            } else {
              serviceTypeFacilityKeys.add(r.service_type);
            }
          });

          serviceTypeFacilityKeys.forEach((key) => {
            let record;
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              const [serviceType, facility] = key.match(/(.+) \((.+)\)/).slice(1);
              record = rawData.find(
                (r) => r.period === day && r.service_type === serviceType && r.facility === facility
              );
            } else {
              record = rawData.find(
                (r) => r.period === day && r.service_type === key
              );
            }
            dataPoint[key] = record ? parseInt(record.quantity) : 0;
          });
        } else {
          const record = rawData.find(
            (r) => r.period === day && r.service_type === selectedServiceType
          );
          dataPoint[selectedServiceType] = record ? parseInt(record.quantity) : 0;
        }

        return dataPoint;
      });
    }

    if (granularity === "weekly") {
      const weeksFromDB = [...new Set(rawData.map((r) => r.period))].sort();
      let weeks;
      if (weeksFromDB.length > 0) {
        weeks = weeksFromDB.slice(-7);
      } else {
        const currentMonday = new Date(today);
        const dayOfWeek = currentMonday.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        currentMonday.setDate(currentMonday.getDate() + diff);

        const startMonday = new Date(currentMonday);
        startMonday.setDate(currentMonday.getDate() - 42);

        weeks = Array.from({ length: 7 }, (_, i) => {
          const monday = new Date(startMonday);
          monday.setDate(startMonday.getDate() + i * 7);
          return monday.toISOString().split("T")[0];
        });
      }

      return weeks.map((monday) => {
        const mondayDate = new Date(monday);
        const sundayDate = new Date(mondayDate);
        sundayDate.setDate(mondayDate.getDate() + 6);

        const formatDate = (date) => {
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const year = String(date.getFullYear()).slice(-2);
          return `${month}-${day}-${year}`;
        };

        const dataPoint = {
          period: `${formatDate(mondayDate)} - ${formatDate(sundayDate)}`,
        };

        if (selectedServiceType === "all") {
          const serviceTypeFacilityKeys = new Set();
          rawData.forEach((r) => {
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              serviceTypeFacilityKeys.add(`${r.service_type} (${r.facility})`);
            } else {
              serviceTypeFacilityKeys.add(r.service_type);
            }
          });

          serviceTypeFacilityKeys.forEach((key) => {
            let record;
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              const [serviceType, facility] = key.match(/(.+) \((.+)\)/).slice(1);
              record = rawData.find(
                (r) => r.period === monday && r.service_type === serviceType && r.facility === facility
              );
            } else {
              record = rawData.find(
                (r) => r.period === monday && r.service_type === key
              );
            }
            dataPoint[key] = record ? parseInt(record.quantity) : 0;
          });
        } else {
          const record = rawData.find(
            (r) => r.period === monday && r.service_type === selectedServiceType
          );
          dataPoint[selectedServiceType] = record ? parseInt(record.quantity) : 0;
        }

        return dataPoint;
      });
    }

    if (granularity === "monthly") {
      const currentYear = today.getFullYear();
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      return months.map((monthName, index) => {
        const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`;

        const dataPoint = {
          period: `${monthName} ${currentYear}`,
        };

        if (selectedServiceType === "all") {
          const serviceTypeFacilityKeys = new Set();
          rawData.forEach((r) => {
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              serviceTypeFacilityKeys.add(`${r.service_type} (${r.facility})`);
            } else {
              serviceTypeFacilityKeys.add(r.service_type);
            }
          });

          serviceTypeFacilityKeys.forEach((key) => {
            let record;
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              const [serviceType, facility] = key.match(/(.+) \((.+)\)/).slice(1);
              record = rawData.find(
                (r) => r.period === monthKey && r.service_type === serviceType && r.facility === facility
              );
            } else {
              record = rawData.find(
                (r) => r.period === monthKey && r.service_type === key
              );
            }
            dataPoint[key] = record ? parseInt(record.quantity) : 0;
          });
        } else {
          const record = rawData.find(
            (r) => r.period === monthKey && r.service_type === selectedServiceType
          );
          dataPoint[selectedServiceType] = record ? parseInt(record.quantity) : 0;
        }

        return dataPoint;
      });
    }

    if (granularity === "yearly") {
      const currentYear = today.getFullYear();
      const years = Array.from({ length: 7 }, (_, i) => currentYear + i);

      return years.map((year) => {
        const yearKey = String(year);

        const dataPoint = {
          period: yearKey,
        };

        if (selectedServiceType === "all") {
          const serviceTypeFacilityKeys = new Set();
          rawData.forEach((r) => {
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              serviceTypeFacilityKeys.add(`${r.service_type} (${r.facility})`);
            } else {
              serviceTypeFacilityKeys.add(r.service_type);
            }
          });

          serviceTypeFacilityKeys.forEach((key) => {
            let record;
            if (userRole === 'superadmin' && selectedFacility === 'all') {
              const [serviceType, facility] = key.match(/(.+) \((.+)\)/).slice(1);
              record = rawData.find(
                (r) => r.period === yearKey && r.service_type === serviceType && r.facility === facility
              );
            } else {
              record = rawData.find(
                (r) => r.period === yearKey && r.service_type === key
              );
            }
            dataPoint[key] = record ? parseInt(record.quantity) : 0;
          });
        } else {
          const record = rawData.find(
            (r) => r.period === yearKey && r.service_type === selectedServiceType
          );
          dataPoint[selectedServiceType] = record ? parseInt(record.quantity) : 0;
        }

        return dataPoint;
      });
    }

    return [];
  };

  const getColorForServiceType = (serviceType) => {
    const colors = {
      regular: "#16a34a",
      deep: "#b9a3cc",
      express: "#3b82f6",
      laundry: "#f59e0b",
      maintenance: "#ef4444",
      checkout: "#8b5cf6",
    };

    const baseType = serviceType.includes('(') 
      ? serviceType.split(' (')[0].toLowerCase() 
      : serviceType.toLowerCase();
    
    if (colors[baseType]) {
      return colors[baseType];
    }
    
    let hash = 0;
    for (let i = 0; i < serviceType.length; i++) {
      hash = serviceType.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  const getServiceTypeKeys = () => {
    if (data.length === 0) return [];
    
    const keys = Object.keys(data[0]).filter(key => key !== 'period');
    return keys;
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg mt-4 sm:mt-6">
      <h2 className="text-green-900 font-bold text-lg sm:text-xl mb-3 sm:mb-4">
        Housekeeping Service Trends
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        {userRole === 'superadmin' && (
          <label className="text-gray-700 font-medium text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>Facility:</span>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
            >
              <option value="all">All Facilities</option>
              <option value="RCC">RCC</option>
              <option value="Hotel Rafael">Hotel Rafael</option>
            </select>
          </label>
        )}

        <label className="text-gray-700 font-medium text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span>Service Type:</span>
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
          >
            <option value="all">All Service Types</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-gray-700 font-medium text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span>View Type:</span>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      </div>

      <div className="w-full h-64 sm:h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ 
              top: 20, 
              right: 10, 
              left: 0, 
              bottom: 5 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: "#374151", fontSize: 10 }} 
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "#374151", fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                border: "none",
                fontSize: "12px"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 11 }} 
              iconSize={10}
            />
            
            {getServiceTypeKeys().map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getColorForServiceType(key)}
                radius={[4, 4, 0, 0]}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HousekeepingTrends;