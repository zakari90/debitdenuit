
export type Photo = {
    timestamp: number;
    imageData: string;
  };
  
export type PhotoSession = {
    name: string;
    photos: Photo[];
  };
  
  const DB_NAME = 'PhotoSessionDB';
  const STORE_NAME = 'sessions';
  const DB_VERSION = 1;
  
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      };
    });
  };
  
export const getSessions = async (): Promise<PhotoSession[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };
  
export const saveSession = async (session: PhotoSession): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };
  
export const deleteSession = async (sessionName: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };
  
  // Update a session (by its name)
export const updateSession = async (updatedSession: PhotoSession): Promise<void> => {
    const db = await initDB();
  
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Fetch the existing session first
      const getRequest = store.get(updatedSession.name);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = async () => {
        const existingSession = getRequest.result;
  
        if (existingSession) {
          // Update the session data (photos or other fields)
          existingSession.photos = updatedSession.photos;
          existingSession.name = updatedSession.name; // Optionally update the name if required
  
          // Save the updated session back into the store
          const updateRequest = store.put(existingSession);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        } else {
          reject('Session not found.');
        }
      };
    });
  };
  