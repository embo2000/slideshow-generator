import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, ImagePlus, ExternalLink } from "lucide-react";
import { backendService, IntakeBootstrap } from "../services/api";
import { clearSharedPayload, readSharedPayload } from "../utils/shareTargetPayload";
import { dedupeFiles } from "../utils/dedupeFiles";
import { isSharedImageFile } from "../utils/sharedImageFiles";
import PhotoPreviewModal from "./PhotoPreviewModal";
import PhotoThumbnail from "./PhotoThumbnail";
import { revokePhotoPreviews, revokePhotoPreview } from "../utils/photoPreviewCache";
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

type SavedDestination = {
  mode: "existing" | "new";
  slideshowId: string;
  groupName: string;
  updatedAt: string;
};

const destinationPreferenceKey = (token: string) => `intake-destination:${token}`;
const MAX_PHOTOS_PER_GROUP = 5;

const stripSharedPayloadFromUrl = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("sharedPayload")) return;
  url.searchParams.delete("sharedPayload");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
};

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
  const [uploadedSlideshowId, setUploadedSlideshowId] = useState<string | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [shareTargetReady, setShareTargetReady] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const sharedPayloadImportedRef = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem("default-intake-token", token);
  }, [token]);

  const saveDestinationPreference = (payload: {
    mode: "existing" | "new";
    slideshowId?: string;
    groupName?: string;
  }) => {
    const stored: SavedDestination = {
      mode: payload.mode,
      slideshowId: payload.slideshowId || "",
      groupName: payload.groupName || "",
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(destinationPreferenceKey(token), JSON.stringify(stored));
  };

  const readDestinationPreference = (): SavedDestination | null => {
    const raw = localStorage.getItem(destinationPreferenceKey(token));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SavedDestination;
      if (!parsed || typeof parsed !== "object") return null;
      if (parsed.mode !== "existing" && parsed.mode !== "new") return null;
      return parsed;
    } catch {
      return null;
    }
  };

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
        const saved = readDestinationPreference();

        if (saved?.mode === "existing") {
          const savedSlideshow = data.slideshows.find((s) => s.id === saved.slideshowId);
          if (savedSlideshow) {
            setMode("existing");
            setExistingSlideshowId(savedSlideshow.id);
            setSelectedGroup(
              savedSlideshow.classes.includes(saved.groupName)
                ? saved.groupName
                : savedSlideshow.classes[0] || data.defaultClasses[0] || ""
            );
            return;
          }
        }

        if (saved?.mode === "new") {
          setMode("new");
          setSelectedGroup(
            data.defaultClasses.includes(saved.groupName)
              ? saved.groupName
              : data.defaultClasses[0] || ""
          );
          return;
        }

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

  const openSlideshowTargetId = useMemo(() => {
    if (uploadedSlideshowId) return uploadedSlideshowId;
    if (mode === "existing" && existingSlideshowId) return existingSlideshowId;
    return null;
  }, [uploadedSlideshowId, mode, existingSlideshowId]);

  const showOpenSlideshowButton = useMemo(() => {
    if (!openSlideshowTargetId) return false;
    if (uploadedSlideshowId) return true;
    return (
      !!sharedPayloadId &&
      files.length > 0 &&
      !!success?.toLowerCase().includes("shared photo")
    );
  }, [openSlideshowTargetId, uploadedSlideshowId, sharedPayloadId, files.length, success]);

  const existingGroupPhotoCount = useMemo(() => {
    if (mode !== "existing" || !existingSlideshowId || !selectedGroup) {
      return 0;
    }
    const slideshow = bootstrap?.slideshows.find((item) => item.id === existingSlideshowId);
    return slideshow?.groupPhotoCounts?.[selectedGroup] ?? 0;
  }, [bootstrap, mode, existingSlideshowId, selectedGroup]);

  const remainingPhotoSlots = Math.max(0, MAX_PHOTOS_PER_GROUP - existingGroupPhotoCount);

  useEffect(() => {
    if (!sharedPayloadId || isLoading || !bootstrap) return;
    if (sharedPayloadImportedRef.current === sharedPayloadId) return;
    sharedPayloadImportedRef.current = sharedPayloadId;

    const importSharedFiles = async () => {
      const sharedFiles = dedupeFiles(await readSharedPayload(sharedPayloadId));

      if (sharedFiles.length === 0) {
        stripSharedPayloadFromUrl();
        setError(
          "Shared photos could not be loaded. Close the app completely and try sharing again."
        );
        return;
      }

      if (remainingPhotoSlots === 0) {
        stripSharedPayloadFromUrl();
        await clearSharedPayload(sharedPayloadId);
        setError(
          `"${selectedGroup}" already has ${MAX_PHOTOS_PER_GROUP} photos. Choose a different group, then share the photo again.`
        );
        return;
      }

      const capped = sharedFiles.slice(0, remainingPhotoSlots);
      setFiles(capped);
      stripSharedPayloadFromUrl();
      await clearSharedPayload(sharedPayloadId);

      const messages = [
        `Loaded ${capped.length} shared photo${capped.length === 1 ? "" : "s"}.`,
      ];
      if (sharedFiles.length > remainingPhotoSlots) {
        messages.push(`Only ${remainingPhotoSlots} slot${remainingPhotoSlots === 1 ? "" : "s"} were available in this group.`);
      }
      setSuccess(messages.join(" "));
    };

    importSharedFiles().catch((error) => {
      console.error("Failed to import shared photos:", error);
      setError("Shared photos could not be loaded. Please try sharing again.");
    });
  }, [sharedPayloadId, isLoading, bootstrap, remainingPhotoSlots, selectedGroup]);

  const applySelectedFiles = (incoming: File[]) => {
    const images = dedupeFiles(incoming.filter(isSharedImageFile));
    const capped = images.slice(0, remainingPhotoSlots);
    setFiles(capped);

    const skippedDuplicates = incoming.length - images.length;
    const skippedForLimit = images.length - capped.length;
    if (skippedDuplicates > 0 || skippedForLimit > 0) {
      const messages: string[] = [];
      if (skippedDuplicates > 0) {
        messages.push(`${skippedDuplicates} duplicate photo${skippedDuplicates === 1 ? "" : "s"} were skipped.`);
      }
      if (skippedForLimit > 0) {
        messages.push(`Only ${remainingPhotoSlots} photo slot${remainingPhotoSlots === 1 ? "" : "s"} remain in this group.`);
      }
      setSuccess(messages.join(" "));
    }
  };

  const removePhoto = (index: number) => {
    revokePhotoPreview(files[index]);
    setFiles((current) => current.filter((_, i) => i !== index));
  };

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

  useEffect(() => {
    if (!bootstrap) return;
    if (mode === "existing" && existingSlideshowId) {
      saveDestinationPreference({
        mode,
        slideshowId: existingSlideshowId,
        groupName: selectedGroup,
      });
      return;
    }
    if (mode === "new") {
      saveDestinationPreference({
        mode,
        groupName: selectedGroup,
      });
    }
  }, [bootstrap, mode, existingSlideshowId, selectedGroup]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    applySelectedFiles(Array.from(event.target.files || []));
    event.target.value = "";
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
    if (remainingPhotoSlots === 0) {
      setError(`This group already has the maximum of ${MAX_PHOTOS_PER_GROUP} photos.`);
      return;
    }
    if (files.length > remainingPhotoSlots) {
      setError(`This group only has room for ${remainingPhotoSlots} more photo${remainingPhotoSlots === 1 ? "" : "s"}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setUploadedSlideshowId(null);
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
      saveDestinationPreference({
        mode: "existing",
        slideshowId,
        groupName: selectedGroup,
      });

      setSuccess(
        `Uploaded ${result.uploadedCount} photo${result.uploadedCount === 1 ? "" : "s"} to "${slideshowLabel}" → "${selectedGroup}". Open the main app on desktop to see them — it refreshes automatically when you switch back to that tab.`
      );
      setUploadedSlideshowId(slideshowId);
      revokePhotoPreviews(files);
      setFiles([]);
      setNewSlideshowName("");

      const refreshed = await backendService.intakeBootstrap(token);
      setBootstrap(refreshed);

      if (mode === "new") {
        const createdItem = refreshed.slideshows.find((s) => s.id === slideshowId);
        if (createdItem) {
          setMode("existing");
          setExistingSlideshowId(createdItem.id);
          setSelectedGroup(createdItem.classes[0] || selectedGroup);
          saveDestinationPreference({
            mode: "existing",
            slideshowId: createdItem.id,
            groupName: createdItem.classes[0] || selectedGroup,
          });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDestinationForLater = () => {
    if (!bootstrap) return;

    if (mode === "existing") {
      if (!existingSlideshowId) {
        setError("Please select a slideshow first.");
        return;
      }
      saveDestinationPreference({
        mode: "existing",
        slideshowId: existingSlideshowId,
        groupName: selectedGroup,
      });
      const selected = bootstrap.slideshows.find((s) => s.id === existingSlideshowId);
      setError(null);
      setSuccess(
        `Saved destination: "${selected?.slideshowName || selected?.name || "Selected Slideshow"}" → "${selectedGroup}".`
      );
      return;
    }

    saveDestinationPreference({
      mode: "new",
      groupName: selectedGroup,
    });
    setError(null);
    setSuccess(
      `Saved destination for new slideshow mode${selectedGroup ? ` with group "${selectedGroup}"` : ""}.`
    );
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
              {bootstrap?.slideshows.map((item) => {
                const totalPhotos =
                  item.totalPhotoCount ??
                  Object.values(item.groupPhotoCounts || {}).reduce((sum, count) => sum + count, 0);
                const label = `${item.slideshowName || item.name} (${totalPhotos} photo${totalPhotos === 1 ? "" : "s"})`;
                return (
                  <option key={item.id} value={item.id}>
                    {label}
                  </option>
                );
              })}
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
          {mode === "existing" && selectedGroup && (
            <p className="text-xs text-gray-500 mb-2">
              {existingGroupPhotoCount}/{MAX_PHOTOS_PER_GROUP} photos already in this group
              {remainingPhotoSlots > 0
                ? ` · ${remainingPhotoSlots} slot${remainingPhotoSlots === 1 ? "" : "s"} available`
                : " · group is full"}
            </p>
          )}
          <label
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-sm cursor-pointer ${
              remainingPhotoSlots === 0
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-600 hover:border-teal-400"
            }`}
          >
            <ImagePlus className="h-6 w-6 mb-2 text-teal-600" />
            {remainingPhotoSlots === 0 ? "This group is full" : "Choose images from your device"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
              disabled={remainingPhotoSlots === 0}
            />
          </label>
          {files.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {files.length} image{files.length === 1 ? "" : "s"} selected
              {remainingPhotoSlots > 0 ? ` (up to ${remainingPhotoSlots} can be uploaded)` : ""}
            </p>
          )}
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {files.map((file, index) => (
                <button
                  key={`${file.name}-${index}`}
                  type="button"
                  onClick={() => setActivePreviewIndex(index)}
                  className="group relative rounded-md overflow-hidden border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  title={`Preview ${file.name}`}
                >
                  <PhotoThumbnail
                    file={file}
                    alt={file.name}
                    className="w-full h-20 object-cover transition-transform duration-150 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
            <p>{success}</p>
            {showOpenSlideshowButton && openSlideshowTargetId && (
              <button
                type="button"
                onClick={() => {
                  window.location.assign(
                    `/?loadSlideshow=${encodeURIComponent(openSlideshowTargetId)}`
                  );
                }}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Slideshow
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={saveDestinationForLater}
            type="button"
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
          >
            Save Destination for Later
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting || remainingPhotoSlots === 0 || files.length === 0}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isSubmitting ? "Uploading..." : "Upload Photos"}
          </button>
        </div>
      </div>

      {activePreviewIndex !== null && files[activePreviewIndex] && (
        <PhotoPreviewModal
          file={files[activePreviewIndex]}
          onClose={() => setActivePreviewIndex(null)}
          onDelete={() => {
            removePhoto(activePreviewIndex);
            setActivePreviewIndex(null);
          }}
        />
      )}
    </div>
  );
};

export default PhotoIntakePage;
