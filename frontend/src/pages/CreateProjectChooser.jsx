import { Link } from "react-router-dom";

const OPTIONS = [
  {
    to: "/create-project/manual",
    title: "Start from scratch",
    body: "Name your project, add pages, and fill in the checklist yourself.",
  },
  {
    to: "/create-project/ai",
    title: "Build with AI",
    body: "Describe your project and Claude drafts pages, MVP / development / deployment tasks, and a plan of attack. You review and edit it before anything is saved.",
  },
];

export default function CreateProjectChooser() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-dark">
          Create New Project
        </h1>
        <p className="mb-8 text-dark">
          How do you want to build your checklist?
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <Link
              key={option.to}
              to={option.to}
              className="rounded-lg bg-white p-6 shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
            >
              <h2 className="mb-2 text-xl font-bold text-dark">
                {option.title}
              </h2>
              <p className="text-dark/80">{option.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
