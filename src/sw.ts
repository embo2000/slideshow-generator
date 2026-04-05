/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{
      url: string;
      revision: string | null;
    }>;
  }
}

const SHARE_PAYLOAD_CACHE = "share-target-payload-v1";
const META_PATH_PREFIX = "/share-target-payload/";

const metaRequest = (id: string) => new Request(`${META_PATH_PREFIX}${id}/meta`);
const fileRequest = (id: string, index: number) =>
  new Request(`${META_PATH_PREFIX}${id}/file/${index}`);

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
      const sharedFiles = formData
        .getAll("files")
        .filter((entry): entry is File => entry instanceof File)
        .filter((file) => file.type.startsWith("image/"));

      if (sharedFiles.length === 0) {
        return Response.redirect("/share-target?error=no-images", 303);
      }

      const payloadId = crypto.randomUUID();
      const cache = await caches.open(SHARE_PAYLOAD_CACHE);
      const createdAt = new Date().toISOString();

      await cache.put(
        metaRequest(payloadId),
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
          await cache.put(
            fileRequest(payloadId, index),
            new Response(file, {
              headers: {
                "Content-Type": file.type || "application/octet-stream",
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
