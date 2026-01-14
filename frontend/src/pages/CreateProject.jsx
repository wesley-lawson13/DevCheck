import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function CreateProject() {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.title);
      formDataToSend.append("description", formData.description);
      if (formData.url) formDataToSend.append("link", formData.url);
      if (formData.thumbnail)
        formDataToSend.append("image", formData.thumbnail);

      const res = await api.post("checklists/projects/", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const projectId = res.data.id;

      if ((res.status === 200 || res.status === 201) && pages.length > 0) {
        // add pages
        for (const page of pages) {
          const pageRes = await api.post(
            `checklists/projects/${projectId}/pages/`,
            {
              name: page.name,
            }
          );

          const newPageId = pageRes.data.id;

          // Create the three sections for this page
          const sectionTitles = ["MVP", "DEV", "DEPLOY"];
          const sectionPromises = sectionTitles.map((title) =>
            api.post(`checklists/projects/${newPageId}/sections/`, {
              title: title,
            })
          );
          await Promise.all(sectionPromises);
        }
      }

      console.log("Project, pages, and sections all created successfully.");
      navigate(`/projects/${projectId}`, {
        state: { message: "Project created successfully!" },
      });
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        setErrors(err.response.data);
        console.log("Validation errors:", err.response.data);
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
            Fill in the project details and add pages to create your project!
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
                <h2 className="text-dark text-2xl font-bold">Add Pages:</h2>
                <button
                  type="button"
                  className="px-3 py-2 bg-blue text-white shadow-lg rounded-xl font-bold text-md hover:bg-blue/80"
                  onClick={() => setShowAddPageForm(true)}
                >
                  + Add
                </button>
              </div>

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
