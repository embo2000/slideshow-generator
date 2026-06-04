/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { dedupeFiles } from "./utils/dedupeFiles";
import {
  collectSharedImageFiles,
  SHARE_PAYLOAD_CACHE,
  sharePayloadFileRequest,
  sharePayloadMetaRequest,
} from "./utils/sharedImageFiles";

declare let self: ServiceWorkerGlobalScope;
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{
      url: string;
      revision: string | null;
    }>;
  }
}

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "POST" || url.pathname !== "/share-target") {
    return;
  }

  event.respondWith(
    (async () => {
      const formData = await request.formData();
      const sharedFiles = dedupeFiles(collectSharedImageFiles(formData));

      if (sharedFiles.length === 0) {
        return Response.redirect("/share-target?error=no-images", 303);
      }

      const payloadId = crypto.randomUUID();
      const cache = await caches.open(SHARE_PAYLOAD_CACHE);
      const origin = self.location.origin;
      const createdAt = new Date().toISOString();

      await cache.put(
        sharePayloadMetaRequest(payloadId, origin),
        new Response(
          JSON.stringify({
            id: payloadId,
            fileCount: sharedFiles.length,
            createdAt,
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      await Promise.all(
        sharedFiles.map(async (file, index) => {
          const contentType =
            file.type && file.type.startsWith("image/")
              ? file.type
              : "image/jpeg";

          await cache.put(
            sharePayloadFileRequest(payloadId, index, origin),
            new Response(file, {
              headers: {
                "Content-Type": contentType,
                "X-File-Name": encodeURIComponent(file.name || `shared-image-${index + 1}`),
              },
            })
          );
        })
      );

      return Response.redirect(`/share-target?payload=${encodeURIComponent(payloadId)}`, 303);
    })()
  );
});
