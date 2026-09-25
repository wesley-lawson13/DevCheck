// Shared confirmation dialog used for destructive/impactful actions
// (deleting a page, deleting a project, changing a project's status).
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  confirmClass = "bg-red-600 hover:bg-red-800",
  overlayClass = "",
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${overlayClass}`}
    >
      <div className="p-6 bg-dark rounded-xl shadow-2xl w-80 border border-gray-200">
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>

        <p className="text-green mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-white text-dark font-semibold rounded-lg hover:bg-muted"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className={`px-4 py-2 text-white font-semibold rounded-lg ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
