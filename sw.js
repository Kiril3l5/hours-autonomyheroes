// sw.js
const CACHE_NAME = 'hours-portal-v1';

// Files to cache for offline access
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/js/auth.js',
  '/js/calendar.js',
  '/js/modal.js',
  '/js/utils.js',
  '/css/styles.css'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
  );
});

// Fetch event - handle offline access
self.addEventListener('fetch', event => {
  // Handle time entry submissions
  if (event.request.url.includes('/timeEntries') && event.request.method === 'POST') {
    event.respondWith(handleTimeEntry(event.request));
    return;
  }

  // Handle regular file requests
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Function to handle time entries
async function handleTimeEntry(request) {
  try {
    // Try to submit normally if online
    const response = await fetch(request);
    return response;
  } catch (error) {
    // If offline, store the time entry
    const timeEntry = await request.json();
    const offlineEntries = await getOfflineEntries();
    offlineEntries.push({
      entry: timeEntry,
      timestamp: new Date().toISOString()
    });
    
    // Store in IndexedDB
    await saveOfflineEntries(offlineEntries);
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      offline: true,
      message: 'Entry saved offline'
    }));
  }
}

// IndexedDB setup for offline storage
const dbName = 'OfflineTimeEntriesDB';
const storeName = 'entries';

// Function to get offline entries
async function getOfflineEntries() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      const entriesRequest = store.getAll();
      entriesRequest.onsuccess = () => resolve(entriesRequest.result || []);
      entriesRequest.onerror = () => reject(entriesRequest.error);
    };

    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: 'timestamp' });
    };
  });
}

// Function to save offline entries
async function saveOfflineEntries(entries) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing entries
      store.clear();

      // Add new entries
      entries.forEach(entry => store.add(entry));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Sync event - handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-timeentries') {
    event.waitUntil(syncTimeEntries());
  }
});

// Function to sync offline entries
async function syncTimeEntries() {
  const offlineEntries = await getOfflineEntries();
  
  for (const { entry } of offlineEntries) {
    try {
      await fetch('/timeEntries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // If sync fails, keep entries in IndexedDB
      return;
    }
  }

  // Clear synced entries
  await saveOfflineEntries([]);
}