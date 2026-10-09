import { Link } from "react-router-dom";
import { STATUS_BG, STATUS_LABELS, STATUS_TEXT } from "../constants";

// A single project tile, used both for the "recent" and "all projects" grids on Home.
export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
    >
      <div className="h-48 overflow-hidden rounded-xl mx-auto mb-5 bg-dark">
        <img src={project.image} alt={project.name} />
      </div>
      <div className="mx-2 text-center text-xl">
        <h5 className="text-dark font-bold mb-2">{project.name}</h5>
        <p
          title={project.description}
          className="text-dark font-light text-sm mb-3 line-clamp-3 break-words"
        >
          {project.description}
        </p>
      </div>
      <hr className="m-4 text-dark/20" />
      <div className="m-2 flex text-center mb-5 justify-between items-center gap-auto">
        <span
          className={`text-white p-2 font-bold text-md ${
            STATUS_BG[project.project_status]
          } rounded-xl`}
        >
          {STATUS_LABELS[project.project_status]}
        </span>
        {project.task_total > 0 ? (
          <span
            className={`font-bold text-md ${
              STATUS_TEXT[project.project_status]
            } mx-2 self-center`}
          >
            {project.task_completed} / {project.task_total}{" "}
            <span className="text-sm italic">completed.</span>
          </span>
        ) : (
          <span
            className={`font-bold text-sm ${
              STATUS_TEXT[project.project_status]
            } mx-2 self-center italic`}
          >
            No tasks yet
          </span>
        )}
      </div>
    </Link>
  );
}
