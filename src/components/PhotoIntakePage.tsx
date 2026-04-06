import React, { useEffect, useMemo, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { backendService, IntakeBootstrap } from "../services/api";
import { clearSharedPayload, readSharedPayload } from "../utils/shareTargetPayload";
import { emitUploadSync } from "../utils/slideshowSync";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "../utils/pwaInstallPrompt";

interface PhotoIntakePageProps {
  token: string;
}

const PhotoIntakePage: React.FC<PhotoIntakePageProps> = ({ token }) => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const sharedPayloadId = searchParams.get("sharedPayload");
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
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [shareTargetReady, setShareTargetReady] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("default-intake-token", token);
  }, [token]);

  useEffect(() => {
    const evaluatePwaStatus = () => {
      const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const legacyStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const installed = standaloneMedia || legacyStandalone;
      const canUseShareTargetInfra =
        "serviceWorker" in navigator && "caches" in window && !!navigator.serviceWorker.controller;

      setPwaInstalled(installed);
      setShareTargetReady(installed && canUseShareTargetInfra);
    };

    evaluatePwaStatus();
    const interval = window.setInterval(evaluatePwaStatus, 1500);
    const onVisibility = () => evaluatePwaStatus();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    setDeferredInstallPrompt(getDeferredInstallPrompt());
    const unsubscribe = subscribeDeferredInstallPrompt((prompt) => {
      setDeferredInstallPrompt(prompt);
      if (!prompt) {
        setPwaInstalled((window.navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches);
      }
    });
    return unsubscribe;
  }, []);

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

  useEffect(() => {
    if (!sharedPayloadId) return;

    const importSharedFiles = async () => {
      const sharedFiles = await readSharedPayload(sharedPayloadId);
      if (sharedFiles.length === 0) {
        return;
      }

      setFiles(sharedFiles);
      setSuccess(
        `Loaded ${sharedFiles.length} shared photo${sharedFiles.length === 1 ? "" : "s"} from Android Share.`
      );
      await clearSharedPayload(sharedPayloadId);
    };

    importSharedFiles().catch((error) => {
      console.error("Failed to import shared photos:", error);
    });
  }, [sharedPayloadId]);

  const previewItems = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewItems]);

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
      emitUploadSync({ slideshowId, slideshowName: slideshowLabel });

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

        <div
          className={`text-sm rounded-lg border p-3 ${
            shareTargetReady
              ? "bg-green-50 border-green-200 text-green-700"
              : pwaInstalled
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          {shareTargetReady
            ? "PWA installed and Share Target ready. Android Send To can upload photos here."
            : pwaInstalled
            ? "PWA installed. Finalizing Share Target support — if needed, reopen the app once."
            : "For Android Send To: install this app from Chrome menu -> Install app."}
          {!pwaInstalled && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (deferredInstallPrompt) {
                    await deferredInstallPrompt.prompt();
                    await deferredInstallPrompt.userChoice;
                    clearDeferredInstallPrompt();
                  } else {
                    setShowInstallHelp((prev) => !prev);
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
              >
                {deferredInstallPrompt ? "Install App" : "Show Install Steps"}
              </button>
              {showInstallHelp && (
                <span className="text-xs">
                  Open Chrome menu (three dots) and tap <strong>Install app</strong> or{" "}
                  <strong>Add to Home screen</strong>.
                </span>
              )}
            </div>
          )}
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
          {previewItems.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {previewItems.map((item, index) => (
                <button
                  key={`${item.file.name}-${index}`}
                  type="button"
                  onClick={() => setActivePreviewIndex(index)}
                  className="group relative rounded-md overflow-hidden border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  title={`Preview ${item.file.name}`}
                >
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="w-full h-20 object-cover transition-transform duration-150 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
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

      {activePreviewIndex !== null && previewItems[activePreviewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActivePreviewIndex(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-800 truncate pr-4">
                {previewItems[activePreviewIndex].file.name}
              </p>
              <button
                type="button"
                onClick={() => setActivePreviewIndex(null)}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[80vh]">
              <img
                src={previewItems[activePreviewIndex].url}
                alt={previewItems[activePreviewIndex].file.name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoIntakePage;
