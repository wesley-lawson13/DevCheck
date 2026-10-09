import { STATUS_BG, STATUS_LABELS } from "../constants";

// Ordered plan of attack. Shared by the project page and the create-with-AI review.
export function PlanStepList({ steps, onRemove }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark text-sm font-bold text-white">
            {index + 1}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-dark">{step.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${STATUS_BG[step.stage]}`}
              >
                {STATUS_LABELS[step.stage]}
              </span>
            </div>
            <p className="text-sm text-dark/80">{step.detail}</p>
          </div>
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove step ${step.title}`}
              onClick={() => onRemove(index)}
              className="self-start text-dark/60 hover:text-dark"
            >
              &times;
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function AIPlanCard({ plan, generating, onGenerate }) {
  const hasPlan = Boolean(plan?.steps?.length);
  const suggestions = plan?.suggestions ?? [];

  return (
    <section
      aria-label="AI Plan"
      className="mx-auto mb-10 max-w-5xl rounded-2xl bg-white p-6 shadow"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-dark">AI Plan</h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="rounded-lg bg-khaki px-4 py-2 font-semibold text-white transition hover:bg-khaki/80 disabled:opacity-60"
        >
          {generating
            ? "Generating..."
            : hasPlan
              ? "Regenerate plan"
              : "Generate plan"}
        </button>
      </div>

      {!hasPlan && (
        <p className="text-sm italic text-dark/70">
          {generating
            ? "Claude is reading your checklist. This can take up to a minute."
            : "No plan yet. Generate one for next steps and ideas to extend this project. Your checklist is not changed."}
        </p>
      )}

      {hasPlan && <PlanStepList steps={plan.steps} />}

      {suggestions.length > 0 && (
        <div className="mt-6 border-t border-dark/10 pt-4">
          <h3 className="mb-2 text-lg font-semibold text-dark">
            Ideas to extend
          </h3>
          <ul className="space-y-2">
            {suggestions.map((idea, index) => (
              <li key={index}>
                <span className="font-semibold text-dark">{idea.title}</span>
                <p className="text-sm text-dark/80">{idea.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
