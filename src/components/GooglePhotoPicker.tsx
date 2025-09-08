// src/components/GooglePhotoPicker.tsx
import React, { useEffect, useState } from 'react';
import { googlePhotosService, GooglePhoto } from '../services/googlePhotos';

export const GooglePhotoPicker: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<GooglePhoto[]>([]);
  const [selectedItem, setSelectedItem] = useState<GooglePhoto | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Start a picker session on mount
  useEffect(() => {
    const startPicker = async () => {
      setLoading(true);
      try {
        const session = await googlePhotosService.createSession();
        setSessionId(session.id);
      } catch (err) {
        console.error('Failed to start session', err);
        
      } finally {
        setLoading(false);
      }
    };
    startPicker();
  }, []);

  // Poll for session completion
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const session = await googlePhotosService.getSession();
        if (session.mediaItemsSet) {
          clearInterval(interval);
          loadImages();
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadImages = async (pageToken?: string) => {
    try {
      const { mediaItems: items, nextPageToken } = await googlePhotosService.fetchImages(pageToken);
      setMediaItems(items);
      setNextPageToken(nextPageToken || null);
    } catch (err) {
      console.error('Failed to load images', err);
    }
  };

  return (
    <div className="photo-picker">
      {loading && <p>Loading Google Photos Picker...</p>}

      <div className="grid grid-cols-4 gap-4 p-4">
        {mediaItems.map((item) => (
          <img
            key={item.id}
            src={`${item.baseUrl}=w128-h128`}
            alt={item.name}
            className="cursor-pointer rounded-md"
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {nextPageToken && (
        <button onClick={() => loadImages(nextPageToken)} className="btn mt-4">
          Next Page
        </button>
      )}

      {/* Modal */}
      {selectedItem && (
        <div className="modal fixed inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white border p-4 rounded-lg relative max-w-2xl w-full">
            <button
              className="absolute top-2 right-2 text-red-500 font-bold"
              onClick={() => setSelectedItem(null)}
            >
              Close
            </button>
            {selectedItem.type === 'VIDEO' ? (
              <video src={`${selectedItem.baseUrl}=dv`} controls className="max-w-full" />
            ) : (
              <img src={selectedItem.baseUrl} alt={selectedItem.name} className="max-w-full" />
            )}

            <table className="mt-4 w-full border">
              <tbody>
                {selectedItem.metadata &&
                  Object.entries(selectedItem.metadata).map(([key, value]) => (
                    <tr key={key}>
                      <td className="border p-1 font-bold">{key}</td>
                      <td className="border p-1">{JSON.stringify(value)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
