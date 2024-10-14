"use client"

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Photo = {
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
  const [startTime, setStartTime] = useState<string>('');  
  const [endTime, setEndTime] = useState<string>('');  
  const [interval, setIntervalValue] = useState<number>(10); // Set to 10 minutes by default
  const [sessionName, setSessionName] = useState<string>('الصبيب الليلي');  
  const [sessions, setSessions] = useState<PhotoSession[]>([]);  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for submit button

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
    
    setIsLoading(true); // Disable button and show loading

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (start >= end) {
      alert('وقت الانتهاء يجب أن يكون بعد وقت البدء.');
      setIsLoading(false); // Reset loading state
      return;
    }

    if (!sessionName.trim()) {
      alert('اسم الجلسة لا يمكن أن يكون فارغاً.');
      setIsLoading(false); // Reset loading state
      return;
    }

    const newSession: PhotoSession = { name: sessionName, photos: [] };
    await saveSession(newSession);
    const updatedSessions = await getSessions();
    setSessions(updatedSessions);

    startTakingPhotos(start, end, interval, sessionName);

    setIsLoading(false); // Reset loading state after the session starts
  };

  const startTakingPhotos = (start: number, end: number, interval: number, sessionName: string) => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now >= end) {
        clearInterval(intervalId);
        alert('تمت عملية التقاط الصور!');
        return;
      }

      captureImage(sessionName);
    }, interval * 60 * 1000); // Adjusting interval to minutes
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
        console.log('تم التقاط الصورة وحفظها في IndexedDB تحت الجلسة:', sessionName);
      }
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    const confirmed = window.confirm(`هل أنت متأكد أنك تريد حذف الجلسة: ${sessionName}?`);
    if (confirmed) {
      await deleteSession(sessionName);
      const updatedSessions = await getSessions();
      setSessions(updatedSessions);
      setSelectedSession(null);  // Clear selected session after deletion
    }
  };

  return (
    <Card className="w-[400px] text-right ">
      <CardHeader>
        <CardTitle className='text-center' >الصبيب الليلي</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="new-session">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-session">جديد</TabsTrigger>
            <TabsTrigger value="existing-sessions">السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="new-session">
            {hasCameraPermission === null && <p>جارٍ تحميل الكاميرا...</p>}
            {hasCameraPermission === false && <p>تم رفض الإذن أو حدث خطأ</p>}
            {hasCameraPermission === true && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-name">اسم الجلسة</Label>
                    <Input
                      id="session-name"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value 
                        + " " + 
                        new Date().toLocaleString('ar-ma', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">وقت البدء</Label>
                    <Input
                      id="start-time"
                      className='w-fit bg-blue-400 ml-auto'
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 ">
                    <Label htmlFor="end-time">وقت الانتهاء</Label>
                    <Input
                    className='w-fit mr-auto  bg-red-400'
                      id="end-time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">الفاصل الزمني (بالدقائق)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={interval}
                      onChange={(e) => setIntervalValue(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>بدء التصوير</Button>
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
                <p>لم تُنشأ أي جلسات تصوير بعد.</p>
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
                        className="ml-2 text-red-600">
                        حذف
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <Button onClick={() => setSelectedSession(null)}>العودة إلى الجلسات</Button>
                <h3 className="text-lg font-semibold">الصور في الجلسة: {selectedSession}</h3>
                <div className="grid gap-4">
                  {sessions.find((session) => session.name === selectedSession)?.photos.length === 0 ? (
                    <p>لم تُلتقط أي صور في هذه الجلسة بعد.</p>
                  ) : (
                    sessions.find((session) => session.name === selectedSession)?.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="space-y-2">
                        <img
                          src={photo.imageData}
                          alt={`تم التقاط الصورة في ${new Date(photo.timestamp).toLocaleString()}`}
                          className="w-full rounded-md"
                        />
                        <p className="text-sm text-muted-foreground">
                          تم التقاطها في: {new Date(photo.timestamp).toLocaleString()}
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
