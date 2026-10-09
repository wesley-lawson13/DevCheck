import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import DraftReview from "../components/DraftReview";
import { draftChecklist } from "../services/projects";
import { getErrorMessage } from "../utils/errors";

// mode "ai": Claude drafts the pages, tasks and plan, which the user reviews before creating.
export default function CreateProject({ mode = "manual" }) {
  const isAi = mode === "ai";
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    thumbnail: null,
  });
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [showAddPageForm, setShowAddPageForm] = useState(false);
  const [pages, setPages] = useState([]);
  const [newPageName, setNewPageName] = useState("");
  const [errors, setErrors] = useState({});
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        thumbnail: file,
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: null,
    }));
    setThumbnailPreview(null);
  };

  const handleAddPage = (e) => {
    e.preventDefault();
    if (newPageName.trim()) {
      setPages((prev) => [
        ...prev,
        { id: Date.now(), name: newPageName.trim() },
      ]);
      setNewPageName("");
      setShowAddPageForm(false);
    }
  };

  const handleRemovePage = (pageId) => {
    setPages((prev) => prev.filter((page) => page.id !== pageId));
  };

  const handleGenerate = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setAiError("Enter a project title and description first.");
      return;
    }
    setAiError("");
    setGenerating(true);
    try {
      const res = await draftChecklist({
        name: formData.title,
        description: formData.description,
        link: formData.url || undefined,
        pages: pages.map((page) => page.name),
      });
      setDraft(res.data);
    } catch (err) {
      setAiError(getErrorMessage(err, "Failed to generate a checklist."));
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (isAi && !draft?.pages.length) {
      setAiError("Generate a checklist first, then create the project.");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.title);
      formDataToSend.append("description", formData.description);
      if (formData.url) formDataToSend.append("link", formData.url);
      if (formData.thumbnail)
        formDataToSend.append("image", formData.thumbnail);

      const res = await api.post("checklists/projects/", formDataToSend);

      const projectId = res.data.id;

      if ((res.status === 200 || res.status === 201) && isAi) {
        // Pages, tasks and the plan are saved together by the backend.
        await api.post(`checklists/projects/${projectId}/tree/`, {
          pages: draft.pages.map(({ name, tasks }) => ({
            name,
            tasks: Object.fromEntries(
              Object.entries(tasks).map(([code, titles]) => [
                code,
                titles.filter((title) => title.trim()),
              ]),
            ),
          })),
          plan: draft.plan,
        });
      } else if (
        (res.status === 200 || res.status === 201) &&
        pages.length > 0
      ) {
        // Backend creates every page, its sections and its tasks atomically.
        await api.post(`checklists/projects/${projectId}/tree/`, {
          pages: pages.map((page) => ({ name: page.name })),
        });
      }

      navigate(`/projects/${projectId}`, {
        state: { message: "Project created successfully!" },
      });
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-dark mb-2">
            Create New Project
          </h1>
          <p className="text-dark mb-8">
            {isAi
              ? "Describe your project and Claude will draft the checklist and a plan of attack."
              : "Fill in the project details and add pages to create your project!"}
          </p>

          <div className="space-y-6">
            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Thumbnail Image <span className="text-dark">(optional)</span>
              </label>

              {thumbnailPreview ? (
                <div className="relative inline-block">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-10 h-10 mb-3 text-dark"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-dark">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-dark">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                    />
                  </label>
                </div>
              )}
              {errors.image && (
                <p className="text-red-500 text-sm mt-1">{errors.image}</p>
              )}
            </div>

            {/* Project Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-dark mb-2"
              >
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
                placeholder="Enter project title"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-dark mb-2"
              >
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                className={`w-full px-4 py-2 border ${
                  errors.description ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none`}
                placeholder="Describe your project..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Project URL */}
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-dark mb-2"
              >
                Project URL <span className="text-dark-400">(optional)</span>
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border ${
                  errors.link ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
                placeholder="https://example.com"
              />
              {errors.link && (
                <p className="text-red-500 text-sm mt-1">{errors.link}</p>
              )}
            </div>

            <hr className="text-dark/20" />

            {/* Add Pages Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-dark text-2xl font-bold">
                  {isAi ? "Page hints (optional):" : "Add Pages:"}
                </h2>
                <button
                  type="button"
                  className="px-3 py-2 bg-blue text-white shadow-lg rounded-xl font-bold text-md hover:bg-blue/80"
                  onClick={() => setShowAddPageForm(true)}
                >
                  + Add
                </button>
              </div>

              {isAi && (
                <p className="text-dark/70 text-sm mb-4">
                  Leave empty to let AI suggest the pages, or add the ones you
                  want filled in.
                </p>
              )}

              {/* Add Page Form */}
              {showAddPageForm && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter page name"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddPage}
                      className="px-4 py-2 bg-green text-white rounded-lg font-medium hover:bg-green/80 transition-colors"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPageForm(false);
                        setNewPageName("");
                      }}
                      className="px-4 py-2 bg-dark text-white rounded-lg font-medium hover:bg-dark/60 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Pages List */}
              {pages.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between bg-beige rounded-full border border-khaki/20 shadow-md px-4 py-3 hover:scale-[1.02] hover:shadow-lg transition-colors gap-4"
                    >
                      <span className="text-dark text-lg font-medium">
                        {page.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePage(page.id)}
                        className="text-khaki hover:text-dark transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pages.length === 0 && !showAddPageForm && (
                <p className="text-gray-500 text-sm italic">
                  No pages added yet.
                </p>
              )}
            </div>

            {isAi && (
              <div className="space-y-4">
                <hr className="text-dark/20" />
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-dark text-2xl font-bold">AI Draft</h2>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-4 py-2 bg-blue text-white rounded-lg font-bold hover:bg-blue/80 transition-colors disabled:opacity-60"
                  >
                    {generating
                      ? "Generating..."
                      : draft
                        ? "Regenerate"
                        : "Generate checklist"}
                  </button>
                </div>
                {generating && (
                  <p className="text-dark/70 text-sm italic">
                    Claude is drafting your checklist. This can take up to a
                    minute.
                  </p>
                )}
                {aiError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{aiError}</p>
                  </div>
                )}
                {draft && <DraftReview draft={draft} onChange={setDraft} />}
              </div>
            )}

            {/* General Error Display */}
            {errors.non_field_errors && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">
                  {errors.non_field_errors}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-green text-white py-3 px-6 rounded-lg font-medium hover:bg-green/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    title: "",
                    description: "",
                    url: "",
                    thumbnail: null,
                  });
                  setThumbnailPreview(null);
                  setPages([]);
                  setDraft(null);
                  setAiError("");
                  setShowAddPageForm(false);
                  setNewPageName("");
                  setErrors({});
                }}
                className="px-6 py-3 border bg-dark rounded-lg font-medium text-white hover:bg-dark/60 transition-colors focus:outline-none focus:ring-2 focus:ring-dark focus:ring-offset-2"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
