import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "🗺️ Dashboard" },
    { to: "/report", label: "🧑‍💻 Report a Bin" },
    { to: "/how-it-works", label: "⚙️ How It Works" },
  ];

  return (
    <nav className="w-full bg-zinc-900 border-b border-zinc-700 shadow-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl font-bold font-[Poppins] bg-gradient-to-r from-teal-300 to-teal-200 bg-clip-text text-transparent leading-tight">
            SWMS Simulator
          </h1>
          <h2 className="text-[11px] font-medium font-[Lora] text-gray-400 uppercase tracking-[0.2em] -mt-1">
            A Smart Waste Management and Collection System Simulator
          </h2>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-2">
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
