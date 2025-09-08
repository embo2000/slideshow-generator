import { useEffect, useState } from "react";
import { googlePhotosService, GooglePhotoPickerResult } from "../services/googlePhotos";

interface GooglePhotoPickerProps {
  accessToken: string; // OAuth2 token obtained after login
  sessionData: any; // session object from your backend /get_session
  maxSelectable?: number;
  onSelected: (items: GooglePhotoPickerResult[]) => void;
}

export const GooglePhotoPicker = ({
  accessToken,
  sessionData,
  maxSelectable = 50,
  onSelected,
}: GooglePhotoPickerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPicker = async () => {
      try {
        await googlePhotosService.loadPickerScript();
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to load Google Photos Picker script", err);
        setError("Failed to load Google Photos Picker script");
        setLoading(false);
      }
    };

    loadPicker();
  }, []);

  const handleOpenPicker = async () => {
    if (!accessToken || !sessionData) {
      setError("Missing access token or session data");
      return;
    }

    try {
      const selected = await googlePhotosService.openPicker(
        accessToken,
        sessionData,
        maxSelectable
      );
      onSelected(selected);
    } catch (err: any) {
      console.error("Failed to open Google Photos Picker:", err);
      setError(err.message || "Unknown error opening picker");
    }
  };

  if (loading) return <div>Loading Google Photos Picker...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <button
        onClick={handleOpenPicker}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Google Photos Picker
      </button>
    </div>
  );
};

export default GooglePhotoPicker;
