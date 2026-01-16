import { Link, useParams, useLocation } from "react-router-dom";
import { IoCreateOutline } from "react-icons/io5";
import { ArrowBigLeft } from "lucide-react";

export default function Header({ title }) {
  const { projectId } = useParams();
  const location = useLocation();

  console.log(location);

  const isProjectPage = Boolean(projectId);
  const isEditPage = location.pathname.endsWith("/edit");
  console.log(isEditPage);

  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 border-b border-khaki/30">
      {/* Left: Page Title */}
      <h1 className="text-xl font-semibold text-dark">{title}</h1>

      <div className="flex items-center gap-4">
        {isProjectPage && !isEditPage ? (
          <Link
            to={`projects/${projectId}/edit`}
            className="flex gap-2 px-4 py-2 text-md font-bold bg-khaki/80 text-white rounded-lg hover:bg-khaki hover:shadow-lg transition"
          >
            <IoCreateOutline size={25} />
            <span className="pt-1">Edit Project</span>
          </Link>
        ) : isEditPage ? (
          <Link
            to={`projects/${projectId}`}
            className="flex gap-2 px-4 py-2 text-md font-bold bg-dark text-white rounded-lg hover:bg-dark/60 hover:shadow-lg transition"
          >
            <ArrowBigLeft size={25} />
            <span className="">Back to Project</span>
          </Link>
        ) : (
          <Link
            to={`create-project`}
            className="flex gap-2 items-end px-4 py-2 text-md font-bold bg-khaki/80 text-white rounded-lg hover:bg-khaki hover:shadow-lg transition"
          >
            <IoCreateOutline size={25} />
            <span className="pt-1">Create Project </span>
          </Link>
        )}
      </div>
    </header>
  );
}
