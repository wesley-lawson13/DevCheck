import api from "../api";

export const listProjects = () => api.get("/checklists/projects/");

export const getCurrentUser = () => api.get("/checklists/user/");

export const deleteProject = (projectId) =>
  api.delete(`checklists/projects/${projectId}/`);

export const reportIssue = (description) =>
  api.post("/checklists/issues/", { description });

export const getProjectDetail = (projectId) =>
  api.get(`/checklists/projects/${projectId}/detail/`);

export const markProjectViewed = (projectId) =>
  api.post(`/checklists/projects/${projectId}/viewed/`);

export const updateProjectStatus = (projectId, projectStatus) =>
  api.patch(`/checklists/projects/${projectId}/detail/`, {
    project_status: projectStatus,
  });

export const createPage = (projectId, name) =>
  api.post(`checklists/projects/${projectId}/pages/`, { name });

export const deletePage = (pageId) => api.delete(`checklists/pages/${pageId}/`);

export const createTask = (sectionId, title) =>
  api.post(`/checklists/sections/${sectionId}/tasks/`, {
    title,
    completed: false,
  });

export const setTaskCompleted = (taskId, completed) =>
  api.patch(`/checklists/tasks/${taskId}/`, { completed });

export const deleteTask = (taskId) => api.delete(`checklists/tasks/${taskId}/`);
