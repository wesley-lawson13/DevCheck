import React, { useState, useEffect } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import api from "../api";
import { useParams } from "react-router-dom";

export default function ProjectDetail() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null);
  const [pages, setPages] = useState(null);
  const [addingTask, setAddingTask] = useState({}); // Track which section is adding a task
  const [newTaskTitle, setNewTaskTitle] = useState({}); // Track new task input values
  const [projectStatus, setProjectStatus] = useState(null);
  const [creatingNewPage, setCreatingNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  // returns full project tree w/ associated pages, sections, tasks, etc.
  const getProject = async () => {
    try {
      console.log('Fetching project with ID:', projectId);
      const res = await api.get(`/checklists/projects/${projectId}/detail/`);
      console.log('Project fetched successfully');
      setProject(res.data);
      setPages(res.data.pages);
      setProjectStatus(res.data.project_status);
      console.log(res.data);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      console.error("Error status:", err.response?.status);
      console.error("Error data:", err.response?.data);
      
      // If it's a 401 error, don't show alert since task was still created
      if (err.response?.status !== 401) {
        alert("Failed to fetch project details");
      }
    }
  };

  const statusColors = {
    "MVP": "bg-green",
    "In Development": "bg-beige",
    "In Deployment": "bg-blue",
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

  const addTask = async (sectionId, title, key) => {
    console.log('Adding task with key:', key);
    console.log('Section ID:', sectionId);
    console.log('Current addingTask state:', addingTask);
    console.log('Current newTaskTitle state:', newTaskTitle);
    
    try {
      const res = await api.post(`/checklists/projects/${sectionId}/tasks/`, {
        title,
        completed: false,
      });

      console.log('Task created successfully, status:', res.status);

      if (res.status === 200 || res.status === 201) {
        // Clear the input and hide the form BEFORE refreshing
        setNewTaskTitle(prev => {
          const updated = { ...prev, [key]: '' };
          console.log('Clearing newTaskTitle for key:', key, 'Updated state:', updated);
          return updated;
        });
        setAddingTask(prev => {
          const updated = { ...prev, [key]: false };
          console.log('Hiding form for key:', key, 'Updated state:', updated);
          return updated;
        });
        
        // Refresh data after a small delay to allow state to update
        setTimeout(async () => {
          await getProject();
        }, 50);
      }
    } catch (err) {
      console.error("Failed to add task:", err);
      console.error("Error details:", err.response);
      alert("Failed to add task.");
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
      }))
    );

    try {
      const res = await api.delete(`checklists/tasks/${taskId}/`);
      console.log("Task deleted successfully: ", res.status);

      if (res.status === 200 || res.status === 201) {
        getProject()
      }
    } catch (err) {
      console.error("Failed to delete task:", err)
      console.error("Error details: ", err.response)
      alert("Failed to delete task.")

      getProject()
    }
  }

  const addNewPage = async (pageName) => {
    try {
      console.log('Creating new page:', pageName);
      
      // Create the page
      const res = await api.post(`checklists/projects/${projectId}/pages/`, {
        name: pageName
      });

      if (res.status === 200 || res.status === 201) {
        console.log("Page created successfully:", res.data);
        const newPageId = res.data.id;

        // Create the three sections for this page
        const sectionTitles = ['MVP', 'DEV', 'DEPLOY'];
        const sectionPromises = sectionTitles.map(title => 
          api.post(`checklists/projects/${newPageId}/sections/`, {
            title: title
          })
        );

        await Promise.all(sectionPromises);
        console.log("All sections created successfully");

        // Refresh the project data
        await getProject();
        
        // Reset the new page state
        setCreatingNewPage(false);
        setNewPageTitle("");
      }
    } catch (err) {
      console.error("Failed to create new page:", err);
      console.error("Error details:", err.response);
      alert("Failed to create new page.");
    }
  };

  const handleAddClick = (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    console.log('Opening add form with key:', key);
    setAddingTask(prev => ({ ...prev, [key]: true }));
  };

  const handleCancelAdd = (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    setAddingTask(prev => ({ ...prev, [key]: false }));
    setNewTaskTitle(prev => ({ ...prev, [key]: '' }));
  };

  const handleSubmitTask = async (pageId, sectionTitle, sectionId) => {
    const key = `${sectionId || `${pageId}-${sectionTitle}`}`;
    const title = newTaskTitle[key]?.trim();
    
    console.log('Submitting task with key:', key);
    console.log('Title:', title);
    console.log('Section ID:', sectionId);
    
    if (!title) return;

    // Find the section ID if not provided
    let actualSectionId = sectionId;
    if (!actualSectionId) {
      const page = pages.find(p => p.id === pageId);
      const section = page?.sections?.find(s => s.title === sectionTitle);
      actualSectionId = section?.id;
    }
    
    if (actualSectionId) {
      await addTask(actualSectionId, title, key);
    }
  };

  const handleNewPageSubmit = () => {
    const title = newPageTitle.trim();
    if (!title) {
      alert("Please enter a page name");
      return;
    }
    addNewPage(title);
  };

  const handleNewPageCancel = () => {
    setCreatingNewPage(false);
    setNewPageTitle("");
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
                onClick={async () => {
                  try {
                    setProjectStatus(status); // Optimistic UI update
                    await api.patch(`/checklists/projects/${projectId}/detail/`, {
                      project_status: status,
                    });
                  } catch (err) {
                    console.error("Failed to update project status:", err);
                    alert("Could not update status");
                    getProject(); // revert on failure
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  projectStatus === status
                    ? `${statusColors[status]} text-white shadow-md`
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-dark">
                {page.name}
              </h2>
              <button className="text-dark font-bold">
                <FaRegTrashCan size={25} />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">

              {/* MVP Section */}
              <div className="p-4 border-l-4 border-green bg-lgreen rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-dark">MVP</h3>
                  <button 
                    className="rounded-xl bg-green text-sm text-white p-2"
                    onClick={() => {
                      const section = page.sections?.find(s => s.title === 'MVP');
                      handleAddClick(page.id, 'MVP', section?.id);
                    }}
                  >
                    + Add
                  </button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'MVP')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="accent-green"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id, task.completed)}
                            />
                            <span>{task.title}</span>
                          </div>
                                                    
                          <button
                            className="text-green font-thin"
                            onClick={() => deleteTask(task.id)}
                          >
                            <FaRegTrashCan size={15}/>
                          </button>
                        </li>
                      ))
                    )}
                    {(
                      !page.sections ||
                      page.sections.length === 0 ||
                      !page.sections.some(
                        (s) => 
                          s.title === 'MVP' && 
                          ((s.tasks && s.tasks.length > 0) || addingTask[s.id])
                      )                   
                    ) && (
                      <li className="text-gray-400 italic">No deployment tasks</li>
                    )}
                  {(() => {
                    const section = page.sections?.find(s => s.title === 'MVP');
                    const key = section?.id || `${page.id}-MVP`;
                    return addingTask[key] && (
                      <li className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          className="accent-green"
                          disabled
                        />
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border border-green rounded"
                          placeholder="New task..."
                          value={newTaskTitle[key] || ''}
                          onChange={(e) => setNewTaskTitle(prev => ({ 
                            ...prev, 
                            [key]: e.target.value 
                          }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitTask(page.id, 'MVP', section?.id);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="text-green font-bold"
                          onClick={() => handleSubmitTask(page.id, 'MVP', section?.id)}
                        >
                          ✓
                        </button>
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => handleCancelAdd(page.id, 'MVP', section?.id)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })()}
                </ul>
              </div>

              {/* In Development Section */}
              <div className="p-4 border-l-4 border-beige bg-lbeige rounded-lg">
                <div className="flex justify-between mb-3 items-center">
                  <h3 className="text-lg font-semibold text-dark">In Development</h3>
                  <button 
                    className="rounded-xl bg-khaki text-sm text-white p-2"
                    onClick={() => {
                      const section = page.sections?.find(s => s.title === 'DEV');
                      handleAddClick(page.id, 'DEV', section?.id);
                    }}
                  >
                    + Add
                  </button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'DEV')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="accent-khaki"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id, task.completed)}
                            />
                            <span>{task.title}</span>
                          </div>
                          
                          <button
                            className="text-khaki font-thin"
                            onClick={() => deleteTask(task.id)}
                          >
                            <FaRegTrashCan size={15}/>
                          </button>
                        </li>
                      ))
                    )}
                  {(
                    !page.sections ||
                    page.sections.length === 0 ||
                    !page.sections.some(
                      (s) => 
                        s.title === 'DEV' && 
                        ((s.tasks && s.tasks.length > 0) || addingTask[s.id])
                    )                   
                  ) && (
                    <li className="text-gray-400 italic">No deployment tasks</li>
                  )}
                  {(() => {
                    const section = page.sections?.find(s => s.title === 'DEV');
                    const key = section?.id || `${page.id}-DEV`;
                    return addingTask[key] && (
                      <li className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          className="accent-khaki"
                          disabled
                        />
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border border-beige rounded"
                          placeholder="New task..."
                          value={newTaskTitle[key] || ''}
                          onChange={(e) => setNewTaskTitle(prev => ({ 
                            ...prev, 
                            [key]: e.target.value 
                          }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitTask(page.id, 'DEV', section?.id);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="text-khaki font-bold"
                          onClick={() => handleSubmitTask(page.id, 'DEV', section?.id)}
                        >
                          ✓
                        </button>
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => handleCancelAdd(page.id, 'DEV', section?.id)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })()}
                </ul>
              </div>

              {/* In Deployment Section */}
              <div className="p-4 border-l-4 border-blue bg-lblue rounded-lg">
                <div className="flex justify-between mb-3 items-center">
                  <h3 className="text-lg font-semibold text-dark">In Deployment</h3>
                  <button 
                    className="rounded-xl bg-dblue text-sm text-white p-2"
                    onClick={() => {
                      const section = page.sections?.find(s => s.title === 'DEPLOY');
                      handleAddClick(page.id, 'DEPLOY', section?.id);
                    }}
                  >
                    + Add
                  </button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {page.sections
                    ?.filter(section => section.title === 'DEPLOY')
                    .flatMap((section) => 
                      (section.tasks || []).map((task) => (
                        <li key={task.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="accent-blue"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id, task.completed)}
                            />
                            <span>{task.title}</span>
                          </div> 
                          <button
                            className="text-dblue font-thin"
                            onClick={() => deleteTask(task.id)}
                          >
                            <FaRegTrashCan size={15}/>
                          </button>
                        </li>
                      ))
                    )}
                  {(
                    !page.sections ||
                    page.sections.length === 0 ||
                    !page.sections.some(
                      (s) => 
                        s.title === 'DEPLOY' && 
                        ((s.tasks && s.tasks.length > 0) || addingTask[s.id])
                    )                   
                  ) && (
                    <li className="text-gray-400 italic">No deployment tasks</li>
                  )}
                  {(() => {
                    const section = page.sections?.find(s => s.title === 'DEPLOY');
                    const key = section?.id || `${page.id}-DEPLOY`;
                    return addingTask[key] && (
                      <li className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          className="accent-blue"
                          disabled
                        />
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border border-blue rounded"
                          placeholder="New task..."
                          value={newTaskTitle[key] || ''}
                          onChange={(e) => setNewTaskTitle(prev => ({ 
                            ...prev, 
                            [key]: e.target.value 
                          }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitTask(page.id, 'DEPLOY', section?.id);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="text-dblue font-bold"
                          onClick={() => handleSubmitTask(page.id, 'DEPLOY', section?.id)}
                        >
                          ✓
                        </button>
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => handleCancelAdd(page.id, 'DEPLOY', section?.id)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })()}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* New Page Creation Form (Inline) */}
        {creatingNewPage && (
          <div className="bg-white rounded-2xl shadow p-6 border-2 border-dashed border-gray-300">
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                className="flex-1 text-2xl font-semibold text-dark border-b-2 border-dark focus:outline-none focus:border-blue-500 px-2 py-1"
                placeholder="Enter page name..."
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
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
  );
}