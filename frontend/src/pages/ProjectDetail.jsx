import React, { useState, useEffect, use } from "react";
import api from "../api";
import { useParams } from "react-router-dom";

export default function ProjectDetail() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null);
  const [pages, setPages] = useState(null);
  const [projectStatus, setProjectStatus] = useState("MVP");

  // returns full project tree w/ associated pages, sections, tasks, etc.
  const getProject = async () => {
    try {
      const res = await api.get(`/checklists/projects/${projectId}/detail/`);
      setProject(res.data);
      setPages(res.data.pages);
      console.log(res.data);
    } catch (err) {
      console.error("Failed to fetch project:", err);
    }
  };

  const toggleTask = async (taskId, currentCompleted) => {
    // Optimistic update - update UI immediately
    setPages(prevPages => 
      prevPages.map(page => ({
        ...page,
        sections: page.sections.map(section => ({
          ...section,
          tasks: section.tasks.map(task => 
            task.id === taskId 
              ? { ...task, completed: !currentCompleted }
              : task
          )
        }))
      }))
    );

    // Save to backend
    try {
      const res = await api.patch(`/checklists/tasks/${taskId}/`, {
        completed: !currentCompleted,
      });
      
      // Optional: If you want to sync with backend response
      if (res.status !== 200) {
        // Revert on failure
        getProject();
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
      // Revert the optimistic update on error
      getProject();
    }
  }; 

  useEffect(() => {
    getProject();
  }, [projectId]);

  // Debug: Log the structure to console
  useEffect(() => {
    if (pages) {
      console.log("Pages structure:", pages);
      pages.forEach((page, i) => {
        console.log(`Page ${i} (${page.name}):`, page.sections);
      });
    }
  }, [pages]);

  if (!project) return <p>Loading...</p>; 

  return (
    <div className="min-h-screen p-8">
      {/* Status Bar */}
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl font-bold mb-4 text-dark">
          Project Checklist
        </h1>
        <div className="flex items-center justify-between bg-white shadow rounded-xl p-4">
          <span className="text-gray-600 font-medium">Project Status:</span>
          <div className="flex gap-3">
            {["MVP", "In Development", "In Deployment"].map((status) => (
              <button
                key={status}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  projectStatus === status
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setProjectStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Checklists */}
      <div className="max-w-5xl mx-auto space-y-8">
        {pages.map((page) => (
          <div
            key={page.id}
            className="bg-white rounded-2xl shadow p-6 transition hover:shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-dark mb-4">
              {page.name}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* MVP Section */}
              <div className="p-4 border-l-4 border-green bg-lgreen rounded-lg">
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold text-dark mb-2">MVP</h3>
                  <button className="rounded-xl bg-green text-sm text-white p-2">+ Add</button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'MVP')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            className="accent-green"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id, task.completed)}
                          />
                          <span>{task.title}</span>
                        </li>
                      ))
                    )}
                  {(!page.sections || page.sections.filter(s => s.title === 'MVP').length === 0) && (
                    <li className="text-gray-400 italic">No MVP tasks</li>
                  )}
                </ul>
              </div>

              {/* In Development Section */}
              <div className="p-4 border-l-4 border-beige bg-lbeige rounded-lg">
                <h3 className="text-lg font-semibold text-dark mb-2">
                  In Development
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'DEV')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            className="accent-beige"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id, task.completed)}
                          />
                          <span>{task.title}</span>
                        </li>
                      ))
                    )}
                  {(!page.sections || page.sections.filter(s => s.title === 'DEV').length === 0) && (
                    <li className="text-gray-400 italic">No development tasks</li>
                  )}
                </ul>
              </div>

              {/* In Deployment Section */}
              <div className="p-4 border-l-4 border-blue bg-lblue rounded-lg">
                <h3 className="text-lg font-semibold text-dark mb-2">
                  In Deployment
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'DEPLOY')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            className="accent-blue"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id, task.completed)}
                          />
                          <span>{task.title}</span>
                        </li>
                      ))
                    )}
                  {(!page.sections || page.sections.filter(s => s.title === 'DEPLOY').length === 0) && (
                    <li className="text-gray-400 italic">No deployment tasks</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Page Button */}
        <div className="text-center mt-10">
          <button
            className="bg-khaki text-white font-bold px-6 py-3 rounded-full font-semibold shadow hover:shadow-lg hover:scale-105 transition-transform"
            onClick={() => alert("Add new page feature coming soon!")}
          >
            + Add New Page
          </button>
        </div>
      </div>
    </div>
  );
}