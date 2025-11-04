import { Search } from "lucide-react";

export default function Header({ title = "Dashboard" }) {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 border-b border-khaki/30">
      {/* Left: Page Title */}
      <h1 className="text-xl font-semibold text-dark">{title}</h1>

      {/* Right: Search + Profile */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-full bg-white/80 text-dark placeholder:text-dark/40 
                       focus:outline-none focus:ring-2 focus:ring-green transition"
          />
        </div>

        {/* Profile button */}
        <button className="w-10 h-10 rounded-full bg-khaki flex items-center justify-center text-white font-semibold">
          <span>WL</span> {/* replace with initials or profile image */}
        </button>
      </div>
    </header>
  );
}