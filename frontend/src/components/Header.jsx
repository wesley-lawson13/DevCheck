import { Search } from "lucide-react";

export default function Header({ title }) {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 border-b border-khaki/30">
      {/* Left: Page Title */}
      <h1 className="text-xl font-semibold text-dark">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Profile button */}
        <button className="w-10 h-10 rounded-full bg-khaki flex items-center justify-center text-white font-semibold">
          <span>WL</span> {/* replace with initials or profile image */}
        </button>
      </div>
    </header>
  );
}