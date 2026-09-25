import { FaRegTrashCan } from "react-icons/fa6";

// One MVP/DEV/DEPLOY column of a page's checklist. `config` is one entry of
// SECTION_COLUMNS (constants.js), which carries the column's label and styling.
export default function SectionColumn({
  page,
  config,
  addingTask,
  newTaskTitle,
  onToggleTask,
  onDeleteTask,
  onAddClick,
  onCancelAdd,
  onChangeNewTaskTitle,
  onSubmitTask,
}) {
  const {
    code,
    label,
    outerClass,
    addButtonClass,
    taskLiClass,
    accentClass,
    deleteButtonClass,
    emptyText,
    inputBorderClass,
    submitButtonClass,
  } = config;

  const section = page.sections?.find((s) => s.title === code);
  const key = section?.id || `${page.id}-${code}`;
  const tasks = section?.tasks || [];
  const hasVisibleContent = tasks.length > 0 || addingTask[key];

  return (
    <div className={outerClass}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-dark">{label}</h3>
        <button
          className={addButtonClass}
          onClick={() => onAddClick(page.id, code, section?.id)}
        >
          + Add
        </button>
      </div>
      <ul className="space-y-1 text-sm text-gray-700">
        {tasks.map((task) => (
          <li key={task.id} className={taskLiClass}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className={accentClass}
                checked={task.completed}
                onChange={() => onToggleTask(task.id, task.completed)}
              />
              <span>{task.title}</span>
            </div>

            <button
              className={deleteButtonClass}
              onClick={() => onDeleteTask(task.id)}
            >
              <FaRegTrashCan size={15} />
            </button>
          </li>
        ))}
        {!hasVisibleContent && (
          <li className="text-gray-400 italic">{emptyText}</li>
        )}
        {addingTask[key] && (
          <li className="flex items-center gap-2 mt-2">
            <input type="checkbox" className={accentClass} disabled />
            <input
              type="text"
              className={`flex-1 px-2 py-1 border ${inputBorderClass} rounded`}
              placeholder="New task..."
              value={newTaskTitle[key] || ""}
              onChange={(e) => onChangeNewTaskTitle(key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmitTask(page.id, code, section?.id);
                }
              }}
              autoFocus
            />
            <button
              className={submitButtonClass}
              onClick={() => onSubmitTask(page.id, code, section?.id)}
            >
              ✓
            </button>
            <button
              className="text-red-500 font-bold"
              onClick={() => onCancelAdd(page.id, code, section?.id)}
            >
              ✕
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
