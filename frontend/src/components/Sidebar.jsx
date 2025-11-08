import { Home, FolderKanban, Settings, LogOut, ChartColumnIncreasing } from "lucide-react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import Header from "./Header";
import logo from '../assets/DevCheckLogo.png';
import { useState, useEffect } from "react";
import api from "../api";

export default function Sidebar() {
  const location = useLocation();
  const { projectId } = useParams()
  const [title, setTitle] = useState("Dashboard")

  const navItems = [
    { name: "Dashboard", path: "/", icon: <Home className="w-5 h-5" /> },
    { name: "Projects", path: "/projects", icon: <FolderKanban className="w-5 h-5" /> },
    { name: "Statistics", path: "/statistics", icon: <ChartColumnIncreasing className="w-5 h-5" /> },
    { name: "Settings", path: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  useEffect(() => {
    // If we are on the dashboard/home route
    if (location.pathname === "/") {
      setTitle("Dashboard");
    }

    // If we are on a project detail route
    else if (projectId) {
      api.get(`/checklists/projects/${projectId}/detail/`)
        .then(res => setTitle(res.data.name))
        .catch(() => setTitle("Project"));
    }

    // You can extend this logic for other routes
    else if (location.pathname.startsWith("/settings")) {
      setTitle("Settings");
    }

    // Default fallback
    else {
      setTitle("DevCheck");
    }
  }, [location, projectId]);

  return (
    <div className="flex min-h-screen bg-muted text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-dark flex flex-col p-4">
        <div className="flex flex-col items-center mb-8">
            <img
                src={logo}
                alt="DevCheck logo"
                className="w-25 h-25 align-self-bottom object-contain"
            />
            <h1 className="text-2xl font-semibold text-white text-center tracking-wide">
                DevCheck
            </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-2 transition 
                  ${isActive ? "bg-green text-dark font-medium" : "hover:bg-khaki/20"}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <Link 
          className="flex items-center gap-3 mt-auto px-4 py-2 rounded-xl hover:bg-khaki/20 transition"
          to="/logout"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Link>
      </aside>

        <main className="flex-1 bg-muted text-dark flex flex-col overflow-y-auto">
            <Header title={title} />
            <div className="p-6">
                <Outlet />
            </div>
        </main>
    </div>
  );
}