import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="w-full bg-zinc-900 border-b border-zinc-400 shadow-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding Section */}
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl font-bold font-[Poppins] bg-gradient-to-r from-teal-300 to-teal-200 bg-clip-text text-transparent leading-tight">
            SWMS Simulator
          </h1>
          <h2 className="text-[11px] font-medium font-[Lora] text-gray-400 uppercase tracking-[0.2em] -mt-1">
            A Smart Waste Management and Collection System Simulator
          </h2>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
