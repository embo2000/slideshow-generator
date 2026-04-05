import React, { useEffect, useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";

const DEFAULT_UPLOAD_LINK_KEY = "default-intake-token";

const parseTokenFromInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directTokenMatch = trimmed.match(/^[A-Za-z0-9_-]{16,}$/);
  if (directTokenMatch) return directTokenMatch[0];

  try {
    const url = new URL(trimmed);
    const intakeMatch = url.pathname.match(/^\/intake\/([^/]+)$/);
    return intakeMatch ? decodeURIComponent(intakeMatch[1]) : null;
  } catch {
    return null;
  }
};

const ShareTargetPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const payloadId = params.get("payload");
  const error = params.get("error");
  const savedToken = localStorage.getItem(DEFAULT_UPLOAD_LINK_KEY);

  const [uploadLinkInput, setUploadLinkInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const continueToIntake = (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return;

    localStorage.setItem(DEFAULT_UPLOAD_LINK_KEY, cleanToken);
    const nextUrl = payloadId
      ? `/intake/${encodeURIComponent(cleanToken)}?sharedPayload=${encodeURIComponent(payloadId)}`
      : `/intake/${encodeURIComponent(cleanToken)}`;
    window.location.assign(nextUrl);
  };

  useEffect(() => {
    if (savedToken && payloadId) {
      const cleanToken = savedToken.trim();
      if (!cleanToken) return;
      localStorage.setItem(DEFAULT_UPLOAD_LINK_KEY, cleanToken);
      const nextUrl = `/intake/${encodeURIComponent(cleanToken)}?sharedPayload=${encodeURIComponent(payloadId)}`;
      window.location.assign(nextUrl);
    }
  }, [savedToken, payloadId]);

  if (savedToken && payloadId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto bg-white border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Continue Shared Upload</h1>
            <p className="text-sm text-gray-600">
              Choose which upload link should receive these photos.
            </p>
          </div>
        </div>

        {error === "no-images" && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            No images were shared. Please share one or more photos.
          </div>
        )}

        {!payloadId && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            Shared payload was not found. Please try sharing the photos again.
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Paste your upload link (or token)
          </label>
          <input
            value={uploadLinkInput}
            onChange={(e) => {
              setUploadLinkInput(e.target.value);
              setInputError(null);
            }}
            placeholder="https://.../intake/your-token"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {inputError && <p className="text-xs text-red-600">{inputError}</p>}
        </div>

        <button
          onClick={() => {
            const parsedToken = parseTokenFromInput(uploadLinkInput);
            if (!parsedToken) {
              setInputError("Please paste a valid intake upload link or token.");
              return;
            }
            continueToIntake(parsedToken);
          }}
          className="w-full px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
        >
          Continue to Upload
        </button>
      </div>
    </div>
  );
};

export default ShareTargetPage;
