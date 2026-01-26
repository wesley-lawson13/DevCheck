import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import api from "../api";
import { FaRegTrashCan } from "react-icons/fa6";

function Home() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [projectTasks, setProjectTasks] = useState({}); // New state to store tasks by project ID
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    getProjects();
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllProjectDetails();
    }
  }, [projects]);

  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }, [location.hash]);

  const fetchUser = async () => {
    try {
      const res = await api.get("/checklists/user/");
      if (res.status === 200 || res.status === 201) {
        setUser(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  const getProjects = () => {
    api
      .get("/checklists/projects/")
      .then((res) => res.data)
      .then((data) => {
        setProjects(data);
        console.log(data);
      })
      .catch((err) => alert(err));
  };

  const getProjectDetail = async (projectId) => {
    try {
      const res = await api.get(
        `/checklists/projects/${projectId}/detail/?dashboard=true`,
      );

      if (res.status === 200 || res.status === 201) {
        console.log(`Project detail for ${projectId}:`, res.data);
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching project detail for ${projectId}:`, err);
      return null;
    }
  };

  // New function to fetch details for all projects and count tasks
  const fetchAllProjectDetails = async () => {
    const tasksMap = {};

    for (const project of projects) {
      const detail = await getProjectDetail(project.id);

      if (detail) {
        // Count all tasks across all pages and sections
        let taskCount = 0;
        let completedCount = 0;

        if (detail.pages) {
          detail.pages.forEach((page) => {
            if (page.sections) {
              page.sections.forEach((section) => {
                if (section.tasks) {
                  taskCount += section.tasks.length;

                  const completedTasks = section.tasks.filter(
                    (task) => task.completed === true,
                  );
                  completedCount += completedTasks.length;
                }
              });
            }
          });
        }

        console.log(
          `Project "${project.name}" (ID: ${project.id}): ${taskCount} total tasks, ${completedCount} completed`,
        );
        tasksMap[project.id] = {
          completed: completedCount,
          total: taskCount,
          detail,
        };
      } else {
        tasksMap[project.id] = { completed: 0, count: 0, detail: null };
      }
    }

    console.log("Final tasksMap:", tasksMap);
    setProjectTasks(tasksMap);
  };

  const getTopThreeRecentlyEdited = (projects) => {
    if (!projects) return [];

    return [...projects]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3);
  };

  const sortedProjects = (projects) => {
    return [...projects].sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    );
  };

  const expandProjectsSection = async () => {
    if (showAllProjects) {
      setShowAllProjects(false);
    } else {
      setShowAllProjects(true);
    }
  };

  function calculateProgress(project) {
    const completed = projectTasks[project.id]?.completed ?? 0;
    const total = projectTasks[project.id]?.total ?? 0;

    if (projectTasks[project.id]?.total === 0) {
      return "0%";
    }

    return `${(completed / total) * 100}%`;
  }

  const deleteProject = async (projectId) => {
    if (!projectId) {
      console.log("No project id provided.");
      return;
    }

    try {
      const res = await api.delete(`checklists/projects/delete/${projectId}/`);

      if (res.status === 200 || res.status === 204) {
        setShowDeleteProjectModal(false);
        setProjectToDelete(null);
        await getProjects();
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project.");
    }
  };

  // Submit issue form logic
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue.trim()) return;

    setLoading(true);

    try {
      const res = await api.post("/checklists/issues/", {
        description: issue,
      });

      if (res.status === 200 || res.status === 201) {
        setIssue("");
        alert(
          "Issue submitted! Thank you for helping to make DevCheck better.",
        );
      }
    } catch (err) {
      console.error(err.response?.data);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const recentProjects = getTopThreeRecentlyEdited(projects);
  const allProjects = sortedProjects(projects);

  const formattedDateJoined = new Date(user?.date_joined).toLocaleDateString();

  const bgColors = {
    MVP: "bg-green",
    "In Development": "bg-beige",
    "In Deployment": "bg-blue",
  };

  const txtColors = {
    MVP: "text-green",
    "In Development": "text-beige",
    "In Deployment": "text-blue",
  };

  return (
    <div className="px-8 text-white">
      <h1 className="text-2xl font-medium mb-6">
        Welcome, <span className="font-bold">{user?.username}!</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        <div className="p-4 border-4 border-green bg-green rounded-lg hover:shadow-lg hover:scale-101 transition">
          <div className="flex justify-center mb-2">
            <h2 className="text-white font-medium text-2xl">
              Project in MVP Stage:
            </h2>
          </div>
          <div className="flex justify-center">
            <h2 className="text-white font-bold text-6xl justify-self-center">
              {
                projects.filter((project) => project.project_status === "MVP")
                  .length
              }
            </h2>
          </div>
        </div>
        <div className="p-4 border-4 border-beige bg-beige rounded-lg hover:shadow-lg hover:scale-101 transition">
          <div className="flex justify-center mb-2">
            <h2 className="text-dark font-medium text-2xl">
              Projects in Development:
            </h2>
          </div>
          <div className="flex justify-center">
            <h2 className="text-dark font-bold text-6xl justify-self-center">
              {
                projects.filter(
                  (project) => project.project_status === "In Development",
                ).length
              }
            </h2>
          </div>
        </div>
        <div className="p-4 border-4 border-blue bg-blue rounded-lg hover:shadow-lg hover:scale-101 transition">
          <div className="flex justify-center mb-2">
            <h2 className="text-dark font-medium text-2xl">
              Projects in Deployment:
            </h2>
          </div>
          <div className="flex justify-center">
            <h2 className="text-dark font-bold text-6xl justify-self-center">
              {
                projects.filter(
                  (project) => project.project_status === "In Deployment",
                ).length
              }
            </h2>
          </div>
        </div>
      </div>

      {/* Projects Section - Wrap everything in section tag */}
      <section id="projects">
        <h1 className="text-2xl font-bold mb-6">Your Projects:</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-4">
          {allProjects.length === 0 && (
            <span className="font-light italic text-md text-dark">
              No projects yet.{" "}
              <Link to="create-project" className="text-khaki font-semibold">
                Create Your First Project
              </Link>.
            </span>
          )}
          {!showAllProjects
            ? recentProjects.map((project, key) => (
                <Link
                  to={`/projects/${project.id}`}
                  key={key}
                  className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
                >
                  <div className="h-48 overflow-hidden rounded-xl mx-auto mb-5 bg-dark">
                    <img src={project.image} alt={project.name} />
                  </div>
                  <div className="mx-2 text-center text-xl">
                    <h5 className="text-dark font-bold mb-2">{project.name}</h5>
                    <p className="text-dark font-light text-sm mb-3">
                      {project.description}
                    </p>
                  </div>
                  <hr className="m-4 text-dark/20" />
                  <div className="m-2 flex text-center mb-5 justify-between items-center gap-auto">
                    <span
                      className={`text-white p-2 font-bold text-md ${
                        bgColors[project.project_status]
                      } rounded-xl`}
                    >
                      {project.project_status}
                    </span>
                    {projectTasks[project.id]?.total > 0 ? (
                      <span
                        className={`font-bold text-md ${
                          txtColors[project.project_status]
                        } mx-2 self-center`}
                      >
                        {projectTasks[project.id]?.completed} /{" "}
                        {projectTasks[project.id]?.total}{" "}
                        <span className="text-sm italic">completed.</span>
                      </span>
                    ) : (
                      <span
                        className={`font-bold text-sm ${
                          txtColors[project.project_status]
                        } mx-2 self-center italic`}
                      >
                        No tasks yet
                      </span>
                    )}
                  </div>
                </Link>
              ))
            : allProjects.map((project, key) => (
                <Link
                  to={`/projects/${project.id}`}
                  key={key}
                  className="block bg-white border-muted shadow-lg rounded-xl hover:scale-[1.02] hover:shadow-xl transition-transform duration-200"
                >
                  <div className="h-48 bg-dark overflow-hidden rounded-xl mx-auto mb-5">
                    <img src={project.image} alt={project.name} />
                  </div>
                  <div className="mx-2 text-center text-xl">
                    <h5 className="text-dark font-bold mb-2 align-self-center">
                      {project.name}
                    </h5>
                    <p className="text-dark font-light text-sm mb-3">
                      {project.description}
                    </p>
                  </div>
                  <hr className="m-4 text-dark/20" />
                  <div className="m-2 flex text-center mb-5 justify-between items-center gap-auto">
                    <span
                      className={`text-white p-2 font-bold text-md ${
                        bgColors[project.project_status]
                      } rounded-xl`}
                    >
                      {project.project_status}
                    </span>
                    {projectTasks[project.id]?.total > 0 ? (
                      <span
                        className={`font-bold text-md ${
                          txtColors[project.project_status]
                        } mx-2 self-center`}
                      >
                        {projectTasks[project.id]?.completed} /{" "}
                        {projectTasks[project.id]?.total}{" "}
                        <span className="text-sm italic">completed.</span>
                      </span>
                    ) : (
                      <span
                        className={`font-bold text-sm ${
                          txtColors[project.project_status]
                        } mx-2 self-center italic`}
                      >
                        No tasks yet
                      </span>
                    )}
                  </div>
                </Link>
              ))}
        </div>
        <div className="flex justify-end items-center p-2 mb-2">
          {projects.length <= 3 ? (
            <span className="text-dark italic font-light text-sm">
              Currently showing all projects.
            </span>
          ) : projects.length > 3 && !showAllProjects ? (
            <button
              className="text-dark font-bold text-md hover:underline"
              onClick={expandProjectsSection}
            >
              View All Projects
            </button>
          ) : (
            <button
              className="text-dark font-bold text-md hover:underline"
              onClick={expandProjectsSection}
            >
              Minimize
            </button>
          )}
        </div>
      </section>

      <hr className="text-dark/20 mb-5" />

      {/* Profile Section - Wrap everything in section tag */}
      <section id="profile" className="mb-8">
        <div className="flex m-2 justify-start gap-x-4 mb-6 items-center">
          <h2 className="text-dark text-2xl font-bold">Profile:</h2>
          <span className="text-dark text-md font-light">
            View information about your account, progress for each of your
            projects, and delete a project if you are no longer working on it.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 m-4">
          {/* Left column */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-lg p-4 text-center hover:shadow-lg">
              <h3 className="text-dark font-bold text-2xl my-2">
                @{user?.username}
              </h3>
              <hr className="text-dark/20 my-3" />
              <span className="text-dark font-light text-md">
                Account created{" "}
                <span className="font-semibold">{formattedDateJoined}</span>.
              </span>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg p-3 text-start hover:shadow-lg">
              <h5 className="text-dark font-bold text-lg">Project Status:</h5>
              <div className="text-center m-1">
                {projects.length == 0 && (
                  <span className="text-dark font-light italic text-lg">
                    No projects created yet.
                  </span>
                )}
                {allProjects.map((project, key) => (
                  <div
                    key={key}
                    className="grid grid-cols-8 gap-y-2 mb-3 shadow-md rounded-md"
                  >
                    <div className="col-span-2 p-2 text-center items-center">
                      <h6 className="text-lg text-dark font-semibold">
                        {project.name}
                      </h6>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <span
                        className={`text-sm font-bold  ${
                          txtColors[project.project_status]
                        }`}
                      >
                        {project.project_status}
                      </span>
                    </div>
                    <div className="col-span-4 flex p-2 items-center">
                      <div class="w-full bg-gray-200 rounded h-2 text-center">
                        <div
                          className={`${
                            bgColors[project.project_status]
                          } h-2 rounded
                          `}
                          style={{ width: calculateProgress(project) }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        onClick={async () => {
                          setShowDeleteProjectModal(true);
                          setProjectToDelete(project.id);
                        }}
                      >
                        <FaRegTrashCan
                          className="text-red-600 p-2 hover:scale-105"
                          size={40}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="text-dark/20 mb-5" />

      {/* Report Section - Wrap everything in section tag */}
      <section id="report" className="mb-8">
        <form onSubmit={handleSubmit}>
          <div className="flex m-2 justify-center items-center">
            <h2 className="text-dark font-bold text-2xl overflow-hidden">
              Report An Issue:
            </h2>
            <span className="text-dark text-md font-light">
              Feel free to help me out by reporting any issues you may be facing
              with the site. I appreciate any and all suggestions for DevCheck!
            </span>
          </div>
          <div className="flex my-5 gap-x-3 justify-center items-center">
            <textarea
              className="border-green border border-dashed rounded-lg resize-none bg-white w-full text-dark p-3"
              placeholder="Submit an Issue here..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded-lg bg-green text-white hover:scale-101 p-3"
              disabled={loading}
            >
              {loading ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      </section>

      {/* Delete Project Modal */}
      {showDeleteProjectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="p-6 bg-dark rounded-xl shadow-2xl w-80 border border-gray-200">
            <h2 className="text-xl font-semibold text-white mb-4">
              Delete Project?
            </h2>

            <p className="text-green mb-6">
              Are you sure you want to delete this project? This action cannot
              be undone and all related tasks will be deleted.
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-white text-dark font-semibold rounded-lg hover:bg-muted"
                onClick={() => {
                  setShowDeleteProjectModal(false);
                  setProjectToDelete(null);
                }}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-800"
                onClick={async () => deleteProject(projectToDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
