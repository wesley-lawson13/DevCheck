import React, { useState } from "react";

export default function ProjectChecklist() {
  const [pages, setPages] = useState([
    {
      name: "Landing Page",
      sections: {
        mvp: ["Hero section", "CTA button", "Responsive design"],
        dev: ["Animations", "SEO improvements"],
        deploy: ["Optimize images", "Setup analytics"],
      },
    },
    {
      name: "Dashboard Page",
      sections: {
        mvp: ["User login", "Data display", "Basic navigation"],
        dev: ["Dark mode", "Filtering options"],
        deploy: ["Final QA", "Push to staging"],
      },
    },
  ]);

  const [projectStatus, setProjectStatus] = useState("MVP");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Status Bar */}
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
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
        {pages.map((page, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow p-6 transition hover:shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {page.name}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* MVP Section */}
              <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-2">
                  MVP
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections.mvp.map((task, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input type="checkbox" className="accent-blue-600" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>

              {/* In Development Section */}
              <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                  In Development
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections.dev.map((task, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input type="checkbox" className="accent-yellow-600" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>

              {/* In Deployment Section */}
              <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  In Deployment
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections.deploy.map((task, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <input type="checkbox" className="accent-green-600" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Page Button */}
        <div className="text-center mt-10">
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full font-semibold shadow hover:shadow-lg hover:scale-105 transition-transform"
            onClick={() => alert("Add new page feature coming soon!")}
          >
            + Add New Page
          </button>
        </div>
      </div>
    </div>
  );
}