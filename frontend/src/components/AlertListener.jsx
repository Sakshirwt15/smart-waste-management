import { useEffect } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const socket = io("http://localhost:5173");

export default function AlertListener() {
  useEffect(() => {
    socket.on("bin_alert", (data) => {
      const { alert_type, message, bin_label } = data;

      if (alert_type === "critical") {
        toast.error(`${message}\nBin: ${bin_label}`, {
          duration: 6000,
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
            fontWeight: "600",
            border: "1px solid #FCA5A5",
          },
          icon: "🚨",
        });
      } else if (alert_type === "warning") {
        toast(`${message}\nBin: ${bin_label}`, {
          duration: 5000,
          style: {
            background: "#FEF3C7",
            color: "#92400E",
            fontWeight: "500",
            border: "1px solid #FCD34D",
          },
          icon: "⚠️",
        });
      } else {
        toast(`${message}\nBin: ${bin_label}`, {
          duration: 4000,
          style: {
            background: "#EFF6FF",
            color: "#1E40AF",
            border: "1px solid #BFDBFE",
          },
          icon: "📊",
        });
      }
    });

    // Listen for zone surge alerts
    socket.on("zone_surge", (data) => {
      toast(data.message, {
        duration: 7000,
        style: {
          background: "#F3E8FF",
          color: "#6B21A8",
          fontWeight: "600",
          border: "1px solid #D8B4FE",
        },
        icon: "📊",
      });
    });

    return () => {
      socket.off("bin_alert");
      socket.off("zone_surge");
    };
  }, []);

  return null;
}
