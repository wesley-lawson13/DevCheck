import {
  Home,
  FolderKanban,
  LogOut,
  ChartColumnIncreasing,
  MessageSquareWarning,
} from "lucide-react";
import { CgProfile } from "react-icons/cg";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import Header from "./Header";
import logo from "../assets/CroppedDevCheckLogo.png";
import { useState, useEffect } from "react";
import api from "../api";
import Footer from "./Footer";

export default function Sidebar() {
  const location = useLocation();
  const { projectId } = useParams();
  const [title, setTitle] = useState("Dashboard");
  const navigate = useNavigate();

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <Home className="w-5 h-5" />,
    },

    //* Extend after MVP stage
    {
      name: "Projects",
      path: "/dashboard",
      section: "projects",
      icon: <FolderKanban className="w-5 h-5" />,
    },
    //{ name: "User Statistics", path: "#statistics", icon: <ChartColumnIncreasing className="w-5 h-5" /> },
    {
      name: "Profile",
      path: "/dashboard",
      section: "profile",
      icon: <CgProfile className="w-5 h-5" />,
    },
    {
      name: "Report Issues",
      path: "/dashboard",
      section: "report",
      icon: <MessageSquareWarning className="2-5 h-5" />,
    },
  ];

  useEffect(() => {
    // If we are on the dashboard/home route
    if (location.pathname === "/dashboard") {
      setTitle("Dashboard");
    }

    // If we are on a project detail route
    else if (projectId) {
      api
        .get(`/checklists/projects/${projectId}/detail/`)
        .then((res) => setTitle(res.data.name))
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

  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    const container = document.querySelector("main");
    const sections = container.querySelectorAll("section[id]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: container, // IMPORTANT: scroll container, not window
        threshold: 0.6,
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  // Scroll to hash section when navigating from different page
  useEffect(() => {
    if (!location.hash || location.pathname !== "/dashboard") return;

    const id = location.hash.replace("#", "");

    const scrollToSection = () => {
      const el = document.getElementById(id);
      if (el) {
        // Scroll the main container, not the window
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        console.log(`Element with id "${id}" not found`);
      }
    };

    // Try multiple strategies to ensure content is loaded
    const timer = setTimeout(scrollToSection, 150);

    // Also try after next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToSection);
    });

    return () => clearTimeout(timer);
  }, [location.hash, location.pathname]);

  return (
    <div className="flex h-screen bg-muted text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-dark flex flex-col p-4">
        <Link to="" className="flex flex-col items-center mb-8">
          <img
            src={logo}
            alt="DevCheck logo"
            className="w-25 h-25 align-self-bottom object-contain"
          />
          <h1 className="text-2xl font-semibold text-white text-center tracking-wide">
            DevCheck
          </h1>
        </Link>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            // Check both URL hash AND scroll position
            const isActive = item.section
              ? location.pathname === "/dashboard" &&
                (location.hash === `#${item.section}` ||
                  activeSection === item.section)
              : location.pathname === item.path &&
                !location.hash &&
                !activeSection;

            return (
              <a
                key={item.name}
                href={item.section ? `/dashboard#${item.section}` : item.path}
                onClick={(e) => {
                  e.preventDefault();

                  if (item.section) {
                    navigate(`/dashboard#${item.section}`);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-2 transition
                  ${
                    isActive
                      ? "bg-green text-dark font-medium"
                      : "hover:bg-khaki/20"
                  }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </a>
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
        <Footer />
      </main>
    </div>
  );
}
