import React, { useEffect, useMemo, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { backendService, IntakeBootstrap } from "../services/api";

interface PhotoIntakePageProps {
  token: string;
}

const PhotoIntakePage: React.FC<PhotoIntakePageProps> = ({ token }) => {
  const [bootstrap, setBootstrap] = useState<IntakeBootstrap | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingSlideshowId, setExistingSlideshowId] = useState("");
  const [newSlideshowName, setNewSlideshowName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await backendService.intakeBootstrap(token);
        setBootstrap(data);
        const firstSlideshow = data.slideshows[0];
        if (firstSlideshow) {
          setExistingSlideshowId(firstSlideshow.id);
          setSelectedGroup(firstSlideshow.classes[0] || data.defaultClasses[0] || "");
          setMode("existing");
        } else {
          setMode("new");
          setSelectedGroup(data.defaultClasses[0] || "");
        }
      } catch (e) {
        setError("This upload link is invalid or expired.");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [token]);

  const selectedExisting = useMemo(
    () => bootstrap?.slideshows.find((s) => s.id === existingSlideshowId) || null,
    [bootstrap, existingSlideshowId]
  );

  const availableGroups = useMemo(() => {
    if (!bootstrap) return [];
    if (mode === "existing") {
      return selectedExisting?.classes || [];
    }
    return bootstrap.defaultClasses;
  }, [bootstrap, mode, selectedExisting]);

  useEffect(() => {
    if (!availableGroups.length) return;
    if (!selectedGroup || !availableGroups.includes(selectedGroup)) {
      setSelectedGroup(availableGroups[0]);
    }
  }, [availableGroups, selectedGroup]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []).filter((f) => f.type.startsWith("image/"));
    setFiles(picked);
  };

  const submit = async () => {
    if (!bootstrap) return;
    if (!selectedGroup) {
      setError("Please select a group.");
      return;
    }
    if (files.length === 0) {
      setError("Please choose at least one image.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      let slideshowId = existingSlideshowId;
      let slideshowLabel = selectedExisting?.slideshowName || selectedExisting?.name || "";

      if (mode === "new") {
        if (!newSlideshowName.trim()) {
          setError("Please enter a slideshow name.");
          setIsSubmitting(false);
          return;
        }

        const created = await backendService.intakeCreateSlideshow(token, {
          name: newSlideshowName.trim(),
          classes: bootstrap.defaultClasses,
        });
        slideshowId = created.id;
        slideshowLabel = created.slideshowName || created.name;
      }

      if (!slideshowId) {
        setError("Please select a slideshow.");
        setIsSubmitting(false);
        return;
      }

      const result = await backendService.intakeUploadPhotos(token, {
        slideshowId,
        groupName: selectedGroup,
        files,
      });

      setSuccess(
        `Uploaded ${result.uploadedCount} photo${result.uploadedCount === 1 ? "" : "s"} to "${slideshowLabel}" → "${selectedGroup}".`
      );
      setFiles([]);
      setNewSlideshowName("");
      if (mode === "new") {
        const refreshed = await backendService.intakeBootstrap(token);
        setBootstrap(refreshed);
        const createdItem = refreshed.slideshows.find((s) => s.id === slideshowId);
        if (createdItem) {
          setMode("existing");
          setExistingSlideshowId(createdItem.id);
          setSelectedGroup(createdItem.classes[0] || selectedGroup);
        }
      }
    } catch (e) {
      setError("Upload failed. Please verify slideshow/group selection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-600">Loading upload page...</div>
      </div>
    );
  }

  if (error && !bootstrap) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Upload link unavailable</h1>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white border rounded-xl shadow-sm p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Send Photos to Slideshow</h1>
          <p className="text-gray-600 text-sm mt-1">
            Pick a slideshow and group, then upload images.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Destination</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("existing")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                mode === "existing" ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              Existing Slideshow
            </button>
            <button
              onClick={() => setMode("new")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                mode === "new" ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              Create New
            </button>
          </div>
        </div>

        {mode === "existing" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slideshow</label>
            <select
              value={existingSlideshowId}
              onChange={(e) => setExistingSlideshowId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select slideshow</option>
              {bootstrap?.slideshows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.slideshowName || item.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New slideshow name</label>
            <input
              value={newSlideshowName}
              onChange={(e) => setNewSlideshowName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Week of Apr 6, 2026"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select group</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
          <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-sm text-gray-600 cursor-pointer hover:border-teal-400">
            <ImagePlus className="h-6 w-6 mb-2 text-teal-600" />
            Choose images from your device
            <input type="file" multiple accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
          {files.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">{files.length} image{files.length === 1 ? "" : "s"} selected</p>
          )}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{success}</div>}

        <button
          onClick={submit}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isSubmitting ? "Uploading..." : "Upload Photos"}
        </button>
      </div>
    </div>
  );
};

export default PhotoIntakePage;
