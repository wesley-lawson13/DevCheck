export const ACCESS_TOKEN = "access";
export const REFRESH_TOKEN = "refresh"

// Project status codes match the backend's Project.Status choices.
export const STATUS_CODES = ["MVP", "DEV", "DEPLOY"];
export const STATUS_LABELS = {
  MVP: "MVP",
  DEV: "In Development",
  DEPLOY: "In Deployment",
};
export const STATUS_BG = {
  MVP: "bg-green",
  DEV: "bg-beige",
  DEPLOY: "bg-blue",
};
export const STATUS_TEXT = {
  MVP: "text-green",
  DEV: "text-beige",
  DEPLOY: "text-blue",
};

// Per-column styling for the checklist board (ProjectDetail's SectionColumn).
// Distinct from STATUS_BG/STATUS_TEXT, which color the project-level status badge.
export const SECTION_COLUMNS = [
  {
    code: "MVP",
    label: "MVP",
    outerClass: "p-4 border-l-4 border-green bg-lgreen rounded-lg",
    addButtonClass: "rounded-xl bg-green text-sm text-white p-2",
    taskLiClass: "flex justify-between",
    accentClass: "accent-green",
    deleteButtonClass: "text-green font-thin",
    emptyText: "No MVP tasks",
    inputBorderClass: "border-green",
    submitButtonClass: "text-green font-bold",
  },
  {
    code: "DEV",
    label: "In Development",
    outerClass: "p-4 border-l-4 border-beige bg-lbeige rounded-lg",
    addButtonClass: "rounded-xl bg-khaki text-sm text-white p-2",
    taskLiClass: "flex justify-between",
    accentClass: "accent-khaki",
    deleteButtonClass: "text-khaki font-thin",
    emptyText: "No development tasks",
    inputBorderClass: "border-beige",
    submitButtonClass: "text-khaki font-bold",
  },
  {
    code: "DEPLOY",
    label: "In Deployment",
    outerClass: "p-4 border-l-4 border-blue bg-lblue rounded-lg",
    addButtonClass: "rounded-xl bg-dblue text-sm text-white p-2",
    taskLiClass: "flex items-center justify-between",
    accentClass: "accent-blue",
    deleteButtonClass: "text-dblue font-thin",
    emptyText: "No deployment tasks",
    inputBorderClass: "border-blue",
    submitButtonClass: "text-dblue font-bold",
  },
];
