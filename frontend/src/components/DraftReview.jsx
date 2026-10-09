import { PlanStepList } from "./AIPlanCard";
import { SECTION_COLUMNS } from "../constants";

// Editable preview of an AI draft: remove pages, tasks or plan steps before creating.
export default function DraftReview({ draft, onChange }) {
  const removePage = (pageIndex) =>
    onChange({
      ...draft,
      pages: draft.pages.filter((_, i) => i !== pageIndex),
    });

  const removeTask = (pageIndex, code, taskIndex) =>
    onChange({
      ...draft,
      pages: draft.pages.map((page, i) =>
        i === pageIndex
          ? {
              ...page,
              tasks: {
                ...page.tasks,
                [code]: page.tasks[code].filter((_, t) => t !== taskIndex),
              },
            }
          : page,
      ),
    });

  const removeStep = (stepIndex) =>
    onChange({
      ...draft,
      plan: {
        ...draft.plan,
        steps: draft.plan.steps.filter((_, i) => i !== stepIndex),
      },
    });

  return (
    <div className="space-y-6">
      {draft.pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-dark">{page.name}</h3>
            <button
              type="button"
              aria-label={`Remove page ${page.name}`}
              onClick={() => removePage(pageIndex)}
              className="text-sm font-semibold text-dark/70 hover:text-dark"
            >
              Remove page
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SECTION_COLUMNS.map((column) => (
              <div key={column.code} className={column.outerClass}>
                <h4 className="mb-2 font-semibold text-dark">{column.label}</h4>
                {page.tasks[column.code].length === 0 ? (
                  <p className="text-sm italic text-dark/60">
                    {column.emptyText}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {page.tasks[column.code].map((task, taskIndex) => (
                      <li
                        key={taskIndex}
                        className="flex items-start justify-between gap-2 text-sm text-dark"
                      >
                        <span>{task}</span>
                        <button
                          type="button"
                          aria-label={`Remove task ${task}`}
                          onClick={() =>
                            removeTask(pageIndex, column.code, taskIndex)
                          }
                          className="text-dark/60 hover:text-dark"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {draft.pages.length === 0 && (
        <p className="text-sm italic text-dark/70">
          You removed every page. Regenerate to get a new draft.
        </p>
      )}

      {draft.plan.steps.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-bold text-dark">Plan of attack</h3>
          <PlanStepList steps={draft.plan.steps} onRemove={removeStep} />
        </div>
      )}
    </div>
  );
}
