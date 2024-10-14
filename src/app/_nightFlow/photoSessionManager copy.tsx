"use client"

import { useState, useEffect, FormEvent, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Photo = {
  timestamp: number
  imageData: string
}

export type PhotoSession = {
  name: string
  photos: Photo[]
}

const DB_NAME = 'PhotoSessionDB';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

// Initialize IndexedDB
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

// Get all sessions from IndexedDB
const getSessions = async (): Promise<PhotoSession[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Save a session to IndexedDB
const saveSession = async (session: PhotoSession): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(session);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Delete a session from IndexedDB
const deleteSession = async (sessionName: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(sessionName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export default function PhotoSessionManager() {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [interval, setIntervalValue] = useState<number>(1000)
  const [sessionName, setSessionName] = useState<string>('')
  const [sessions, setSessions] = useState<PhotoSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getCameraStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setHasCameraPermission(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error);
    getCameraStream(); // Request camera access on component mount
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (start >= end) {
      alert('End time must be after start time.');
      return;
    }

    if (!sessionName.trim()) {
      alert('Session name cannot be empty.');
      return;
    }

    const newSession: PhotoSession = { name: sessionName, photos: [] };
    await saveSession(newSession);
    const updatedSessions = await getSessions();
    setSessions(updatedSessions);

    startTakingPhotos(start, end, interval, sessionName);
  };

  const startTakingPhotos = (start: number, end: number, interval: number, sessionName: string) => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now >= end) {
        clearInterval(intervalId);
        alert('Photo-taking process complete!');
        return;
      }

      captureImage(sessionName);
    }, interval);
  };

  const captureImage = async (sessionName: string) => {
    const video = document.querySelector('video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg');

      const sessions = await getSessions();
      const sessionIndex = sessions.findIndex((session) => session.name === sessionName);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].photos.push({ timestamp: Date.now(), imageData });
        await saveSession(sessions[sessionIndex]);
        console.log('Image captured and saved to IndexedDB under session:', sessionName);
      }
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the session: ${sessionName}?`);
    if (confirmed) {
      await deleteSession(sessionName);
      const updatedSessions = await getSessions();
      setSessions(updatedSessions);
      setSelectedSession(null);  // Clear selected session after deletion
    }
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Photo Session Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="new-session">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-session">New Session</TabsTrigger>
            <TabsTrigger value="existing-sessions">Existing Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="new-session">
            {hasCameraPermission === null && <p>Loading camera...</p>}
            {hasCameraPermission === false && <p>Permission denied or error occurred</p>}
            {hasCameraPermission === true && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-name">Session Name</Label>
                    <Input
                      id="session-name"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value + " " + new Date().getDay().toLocaleString())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">Interval (seconds)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={interval / 1000}
                      onChange={(e) => setIntervalValue(Number(e.target.value) * 1000)}
                      min="1"
                    />
                  </div>
                  <Button type="submit">Start Photo Session</Button>
                </form>
                <div id="video-container" className="w-full h-52 m-2">
                  <video id="video-element" className="w-full h-full" autoPlay playsInline></video>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="existing-sessions">
            {selectedSession === null ? (
              sessions.length === 0 ? (
                <p>No photo sessions created yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSession(session.name)}
                        className="w-[75%]"
                      >
                        {session.name}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteSession(session.name)}
                        className="ml-2 text-red-600"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <Button onClick={() => setSelectedSession(null)}>Back to Sessions</Button>
                <h3 className="text-lg font-semibold">Photos in Session: {selectedSession}</h3>
                <div className="grid gap-4">
                  {sessions.find((session) => session.name === selectedSession)?.photos.length === 0 ? (
                    <p>No photos taken in this session yet.</p>
                  ) : (
                    sessions.find((session) => session.name === selectedSession)?.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="space-y-2">
                        <img
                          src={photo.imageData}
                          alt={`Photo taken at ${new Date(photo.timestamp).toLocaleString()}`}
                          className="w-full rounded-md"
                        />
                        <p className="text-sm text-muted-foreground">
                          Captured at: {new Date(photo.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
