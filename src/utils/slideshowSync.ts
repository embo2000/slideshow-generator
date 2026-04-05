export interface UploadSyncPayload {
  eventId: string;
  slideshowId: string;
  slideshowName?: string;
  updatedAt: string;
}

const CHANNEL_NAME = "slideshow-upload-sync";
const STORAGE_KEY = "slideshow-upload-sync-event";

export const emitUploadSync = (payload: { slideshowId: string; slideshowName?: string }) => {
  const event: UploadSyncPayload = {
    eventId: crypto.randomUUID(),
    slideshowId: payload.slideshowId,
    slideshowName: payload.slideshowName,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(event));

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  }
};

export const subscribeUploadSync = (onEvent: (event: UploadSyncPayload) => void) => {
  const seenEvents = new Set<string>();

  const processEvent = (event: UploadSyncPayload) => {
    if (!event?.eventId || seenEvents.has(event.eventId)) return;
    seenEvents.add(event.eventId);
    onEvent(event);
  };

  const onStorage = (evt: StorageEvent) => {
    if (evt.key !== STORAGE_KEY || !evt.newValue) return;
    try {
      processEvent(JSON.parse(evt.newValue) as UploadSyncPayload);
    } catch {
      // Ignore invalid payload
    }
  };

  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (msg) => {
      processEvent(msg.data as UploadSyncPayload);
    };
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
};
