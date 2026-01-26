import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function EditProject() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const { projectId } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    link: "",
  });
  const [initialData, setInitialData] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [initialThumbnail, setInitialThumbnail] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await api.get(`checklists/projects/${projectId}/detail/`);

        const projectData = {
          name: res.data.name || "",
          description: res.data.description || "",
          link: res.data.link || "",
        };

        setFormData(projectData);
        setInitialData(projectData);

        // Set initial thumbnail preview if exists
        if (res.data.image) {
          setThumbnailPreview(res.data.image);
          setInitialThumbnail(res.data.image);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchProject();
  }, [projectId]);

  console.log("EditProject projectId:", projectId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, image: "Image must be less than 10MB" });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({ ...errors, image: "Please upload an image file" });
        return;
      }

      setErrors({ ...errors, image: null });
      setThumbnail(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that a thumbnail exists
    if (!thumbnailPreview) {
      setErrors({ ...errors, image: "Please upload a thumbnail image" });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // If there's a new thumbnail file, use FormData
      if (thumbnail) {
        const submitData = new FormData();
        submitData.append("name", formData.name);
        submitData.append("description", formData.description);
        submitData.append("link", formData.link);
        submitData.append("image", thumbnail);

        const res = await api.patch(
          `checklists/projects/${projectId}/detail/`,
          submitData
        );

        if (res.status === 200 || res.status === 201) {
          navigate(`/projects/${projectId}`);
        }
      } else {
        // If no new image, just send JSON (keeps existing image)
        const res = await api.patch(
          `checklists/projects/${projectId}/detail/`,
          {
            name: formData.name,
            description: formData.description,
            link: formData.link,
          }
        );

        if (res.status === 200 || res.status === 201) {
          navigate(`/projects/${projectId}`);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("Error saving project:", err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const resetData = (e) => {
    e.preventDefault();
    if (initialData) {
      setFormData(initialData);
      setThumbnailPreview(initialThumbnail);
      setThumbnail(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading project...</div>;
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-dark mb-2">Edit Project</h1>
          <p className="text-dark mb-8">Update your project details below.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Thumbnail Image <span className="text-red-500">*</span>
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
                  <p className="text-sm text-gray-600 mt-2">
                    Click the X to change the thumbnail
                  </p>
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
              <label className="block text-sm font-medium text-dark mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500
                         focus:border-transparent outline-none transition-all"
                placeholder="Enter project title"
              />
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500
                         focus:border-transparent outline-none transition-all resize-none"
                placeholder="Describe your project..."
              />
            </div>

            {/* Project Link */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Project URL <span className="text-dark-400">(optional)</span>
              </label>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500
                         focus:border-transparent outline-none transition-all"
                placeholder="https://example.com"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-green text-white py-3 px-6 rounded-lg font-medium
                         hover:bg-green/80 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={resetData}
                className="px-6 py-3 border bg-dark rounded-lg font-medium text-white
                         hover:bg-dark/60 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-dark focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
