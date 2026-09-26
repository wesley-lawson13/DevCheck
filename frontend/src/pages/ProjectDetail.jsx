import React, { useState, useEffect, useCallback } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import ConfirmModal from "../components/ConfirmModal";
import SectionColumn from "../components/SectionColumn";
import * as projectsApi from "../services/projects";
import { SECTION_COLUMNS, STATUS_BG, STATUS_CODES, STATUS_LABELS } from "../constants";
import { getErrorMessage } from "../utils/errors";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [pages, setPages] = useState(null);
  const [addingTask, setAddingTask] = useState({}); // Track which section is adding a task
  const [newTaskTitle, setNewTaskTitle] = useState({}); // Track new task input values
  const [projectStatus, setProjectStatus] = useState(null);
  const [creatingNewPage, setCreatingNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [statusToSet, setStatusToSet] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const projectCreated = location.state?.message;

  // returns full project tree w/ associated pages, sections, tasks, etc.
  const getProject = useCallback(async () => {
    try {
      const res = await projectsApi.getProjectDetail(projectId);
      setProject(res.data);
      setPages(res.data.pages);
      setProjectStatus(res.data.project_status);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to fetch project details."));
    }
  }, [projectId]);

  const statusColors = STATUS_BG;

  const toggleTask = async (taskId, currentCompleted) => {
    // Optimistic update - update UI immediately
    setPages((prevPages) =>
      prevPages.map((page) => ({
        ...page,
        sections: page.sections.map((section) => ({
          ...section,
          tasks: section.tasks.map((task) =>
            task.id === taskId
              ? { ...task, completed: !currentCompleted }
              : task,
          ),
        })),
      })),
    );

    try {
      const res = await projectsApi.setTaskCompleted(taskId, !currentCompleted);

      if (res.status !== 200) {
        getProject();
      }
    } catch {
      getProject();
    }
  };

  const addTask = async (sectionId, title, key) => {
    try {
      const res = await projectsApi.createTask(sectionId, title);

      if (res.status === 200 || res.status === 201) {
        setNewTaskTitle((prev) => ({ ...prev, [key]: "" }));
        setAddingTask((prev) => ({ ...prev, [key]: false }));

        // Refresh data after a small delay to allow state to update
        setTimeout(async () => {
          await getProject();
        }, 50);
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to add task."));
    }
  };

  const deleteTask = async (taskId) => {
    setPages((prevPages) =>
      prevPages.map((page) => ({
        ...page,
        sections: page.sections.map((section) => ({
          ...section,
          tasks: section.tasks.filter((task) => task.id !== taskId),
        })),
      })),
    );

    try {
      const res = await projectsApi.deleteTask(taskId);

      if (res.status === 200 || res.status === 204) {
        getProject();
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to delete task."));

      getProject();
    }
  };

  const addNewPage = async (pageName) => {
    try {
      // The backend creates the page and its three sections atomically.
      const res = await projectsApi.createPage(projectId, pageName);

      if (res.status === 200 || res.status === 201) {
        await getProject();
        setCreatingNewPage(false);
        setNewPageTitle("");
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to create new page."));
    }
  };

  const deletePage = async (pageId) => {
    try {
      const res = await projectsApi.deletePage(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      setShowDeleteModal(false);

      if (res.status === 200 || res.status === 204) {
        setSuccessMessage("Page deleted successfully.");
        setShowDeleteModal(false);
        setPageToDelete(null);
        await getProject();
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to delete page."));
    }
  };

  const handleAddClick = (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    setAddingTask((prev) => ({ ...prev, [key]: true }));
  };

  const handleCancelAdd = (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    setAddingTask((prev) => ({ ...prev, [key]: false }));
    setNewTaskTitle((prev) => ({ ...prev, [key]: "" }));
  };

  const handleNewTaskTitleChange = (key, value) => {
    setNewTaskTitle((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitTask = async (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    const title = newTaskTitle[key]?.trim();

    if (!title) return;

    // Find the section ID if not provided
    let actualSectionId = sectionId;
    if (!actualSectionId) {
      const page = pages.find((p) => p.id === pageId);
      const section = page?.sections?.find((s) => s.title === sectionTitle);
      actualSectionId = section?.id;
    }

    if (actualSectionId) {
      await addTask(actualSectionId, title, key);
    }
  };

  const handleNewPageSubmit = () => {
    const title = newPageTitle.trim();
    if (!title) {
      setErrorMessage("Please enter a page name.");
      return;
    }
    addNewPage(title);
  };

  const handleNewPageCancel = () => {
    setCreatingNewPage(false);
    setNewPageTitle("");
  };

  const updateStatus = async (newStatus) => {
    try {
      const res = await projectsApi.updateProjectStatus(projectId, newStatus);

      if (res.status === 200 || res.status === 201) {
        setProjectStatus(newStatus);
        setSuccessMessage(
          `Project status updated to "${STATUS_LABELS[newStatus]}" successfully.`,
        );
        await getProject();
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update status."));
    }
  };

  useEffect(() => {
    getProject();
  }, [getProject]);

  useEffect(() => {
    projectsApi.markProjectViewed(projectId).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (projectCreated) {
      setSuccessMessage("Project created successfully!");
      window.history.replaceState({}, document.title);
    }
  }, [projectCreated]);

  if (!project) return <p>Loading...</p>;

  return (
    <div>
      {/* Success message for deleted page and updated status */}
      {successMessage && (
        <div className="flex justify-between w-full bg-green/60 border border-green text-white px-4 py-3 rounded mb-5">
          {successMessage}
          <button className="text-muted" onClick={() => setSuccessMessage("")}>
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex justify-between w-full bg-red-500/60 border border-red-500 text-white px-4 py-3 rounded mb-5">
          {errorMessage}
          <button className="text-muted" onClick={() => setErrorMessage("")}>
            &times;
          </button>
        </div>
      )}

      <div
        className={`min-h-screen p-4 transition-all duration-200 ${
          showDeleteModal || showUpdateStatusModal
            ? "blur-sm pointer-events-none"
            : ""
        }`}
      >
        {/* Status Bar */}
        <div className="max-w-5xl mx-auto mb-10">
          <h1 className="text-3xl font-bold mb-2 text-dark">
            To Do: {project.name}
          </h1>

          {project.description !== null && (
            <div className="flex justify-start items-center mb-2 gap-2">
              <h4 className="text-lg font-bold text-dark">Description:</h4>
              <span className="text-md font-light">{project.description}</span>
            </div>
          )}

          {project.link && (
            <div className="flex justify-start items-center mb-4 gap-2">
              <h4 className="text-md font-semibold text-dark">Link:</h4>
              <a className="text-md font-bold text-dblue" href={project.link}>
                {project.link}
              </a>
            </div>
          )}

          <div className="flex items-center justify-between bg-white shadow rounded-xl p-4">
            <span className="text-gray-600 font-medium">
              {project.name}'s Status:
            </span>
            <div className="flex gap-3">
              {STATUS_CODES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    if (projectStatus !== status) {
                      setStatusToSet(status);
                      setShowUpdateStatusModal(true);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    projectStatus === status
                      ? `${statusColors[status]} text-white shadow-md`
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {pages.length == 0 && !creatingNewPage && (
          <i className="flex text-dark font-semibold justify-center mb-10">
            No pages yet. Click 'Add New Page' to start your checklist!
          </i>
        )}
        {/* Page Checklists */}
        <div className="max-w-5xl mx-auto space-y-8">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-white rounded-2xl shadow p-6 transition hover:shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-dark">
                  {page.name}
                </h2>
                <button
                  className="text-dark font-bold"
                  onClick={() => {
                    setPageToDelete(page.id);
                    setShowDeleteModal(true);
                  }}
                >
                  <FaRegTrashCan size={25} />
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {SECTION_COLUMNS.map((columnConfig) => (
                  <SectionColumn
                    key={columnConfig.code}
                    page={page}
                    config={columnConfig}
                    addingTask={addingTask}
                    newTaskTitle={newTaskTitle}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onAddClick={handleAddClick}
                    onCancelAdd={handleCancelAdd}
                    onChangeNewTaskTitle={handleNewTaskTitleChange}
                    onSubmitTask={handleSubmitTask}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* New Page Creation Form */}
          {creatingNewPage && (
            <div className="bg-white rounded-2xl shadow p-6 border-2 border-dashed border-gray-300">
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="text"
                  className="flex-1 text-2xl font-semibold text-dark border-b-2 border-dark focus:outline-none focus:border-blue-500 px-2 py-1"
                  placeholder="Enter page name..."
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNewPageSubmit();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  className="bg-green text-white font-semibold px-6 py-2 rounded-lg hover:bg-dark transition"
                  onClick={handleNewPageSubmit}
                >
                  Create Page
                </button>
                <button
                  className="bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                  onClick={handleNewPageCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add New Page Button */}
          <div className="text-center mt-10">
            <button
              className="bg-dark text-white font-bold px-6 py-3 rounded-full font-semibold shadow hover:shadow-lg hover:scale-105 transition-transform"
              onClick={() => setCreatingNewPage(true)}
            >
              + Add New Page
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Page?"
          message="Are you sure you want to delete this page? This action cannot be undone."
          onCancel={() => {
            setShowDeleteModal(false);
            setPageToDelete(null);
          }}
          onConfirm={async () => deletePage(pageToDelete)}
        />
      )}

      {/* Status Modal */}
      {showUpdateStatusModal && (
        <ConfirmModal
          title="Update Status"
          message={
            <>
              Switch project status to{" "}
              <strong className="text-green">
                {STATUS_LABELS[statusToSet]}
              </strong>
              ?
            </>
          }
          confirmLabel="Update"
          confirmClass="bg-green hover:bg-khaki"
          overlayClass="bg-opacity-30"
          onCancel={() => {
            setShowUpdateStatusModal(false);
            setStatusToSet(null);
          }}
          onConfirm={async () => {
            await updateStatus(statusToSet);
            setShowUpdateStatusModal(false);
            setStatusToSet(null);
          }}
        />
      )}
    </div>
  );
}
