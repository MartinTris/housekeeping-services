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

const HousekeepingTrends = () => {
  const [data, setData] = useState([]);
  const [granularity, setGranularity] = useState("daily");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState("");

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (selectedServiceType) {
      fetchTrends();
    }
  }, [granularity, selectedServiceType]);

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch("http://localhost:5000/service-types", {
        headers: { token: localStorage.getItem("token") },
      });
      const types = await res.json();
      setServiceTypes(types);
      
      // Auto-select the first service type
      if (types.length > 0) {
        setSelectedServiceType(types[0].name);
      }
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/trends/housekeeping-trends?granularity=${granularity}`,
        {
          headers: { token: localStorage.getItem("token") },
        }
      );

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
        const record = rawData.find(
          (r) => r.period === day && r.service_type === selectedServiceType
        );

        return {
          period: day,
          [selectedServiceType]: record ? parseInt(record.quantity) : 0,
        };
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

        const record = rawData.find(
          (r) => r.period === monday && r.service_type === selectedServiceType
        );

        return {
          period: `${formatDate(mondayDate)} - ${formatDate(sundayDate)}`,
          [selectedServiceType]: record ? parseInt(record.quantity) : 0,
        };
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

        const record = rawData.find(
          (r) => r.period === monthKey && r.service_type === selectedServiceType
        );

        return {
          period: `${monthName} ${currentYear}`,
          [selectedServiceType]: record ? parseInt(record.quantity) : 0,
        };
      });
    }

    if (granularity === "yearly") {
      const currentYear = today.getFullYear();
      const years = Array.from({ length: 7 }, (_, i) => currentYear + i);

      return years.map((year) => {
        const yearKey = String(year);

        const record = rawData.find(
          (r) => r.period === yearKey && r.service_type === selectedServiceType
        );

        return {
          period: yearKey,
          [selectedServiceType]: record ? parseInt(record.quantity) : 0,
        };
      });
    }

    return [];
  };

  // Generate a color based on service type name
  const getColorForServiceType = (serviceType) => {
    const colors = {
      regular: "#16a34a",
      deep: "#b9a3cc",
      express: "#3b82f6",
      laundry: "#f59e0b",
      maintenance: "#ef4444",
    };
    
    // Return predefined color or generate one based on string hash
    if (colors[serviceType.toLowerCase()]) {
      return colors[serviceType.toLowerCase()];
    }
    
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < serviceType.length; i++) {
      hash = serviceType.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg mt-6">
      <h2 className="text-green-900 font-bold text-xl mb-4">
        Housekeeping Service Trends
      </h2>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <label className="text-gray-700 font-medium text-sm">
          Service Type:
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-gray-700 font-medium text-sm">
          View Type:
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      </div>

      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fill: "#374151", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#374151", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                border: "none",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey={selectedServiceType}
              fill={getColorForServiceType(selectedServiceType)}
              radius={[4, 4, 0, 0]}
              name={selectedServiceType}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HousekeepingTrends;