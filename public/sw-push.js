// Sprint 5b-2: Push notification handler.
// Se importa desde el service worker generado por workbox vía importScripts.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Fla MpM", body: event.data.text() };
  }
  const title = payload.title || "Fla MpM — Cobros del día";
  const options = {
    body: payload.body || "Tienes cobros pendientes.",
    icon: "/pwa-192.png",
    badge: "/favicon-32.png",
    tag: "daily-brief",
    renotify: true,
    data: { url: "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
