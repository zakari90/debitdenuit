"use client"
import { useState, useEffect, useRef, FormEvent } from "react";
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

export default function PhotoSessionManager2() {
  const [startTime, setStartTime] = useState<string>('');  
  const [endTime, setEndTime] = useState<string>('');  
  const [interval, setIntervalValue] = useState<number>(10); // Default interval is 10 minutes
  const [sessionName, setSessionName] = useState<string>("الصبيب الليلي " + new Date().toLocaleString('ar-ma', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }));
  const [sessions, setSessions] = useState<PhotoSession[]>([]);  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);  
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null); // New state to track selected camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for submit button
  const [sessionInProgress, setSessionInProgress] = useState<boolean>(false); // New state for session progress
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // New state for countdown
  const [intervalId, setIntervalId] = useState<NodeJS.Timer | null>(null); // Store interval ID for cancellation
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]); // State to store available video devices

  useEffect(() => {
    console.log("useEffect - PhotoSessionManager");
    getSessions().then(setSessions).catch(console.error);
    getCameraStream(); // Request camera access on component mount

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId, selectedCamera]); // Include selectedCamera in the dependency array

  const getCameraStream = async () => {
    try {
    // Get available video devices (cameras)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      
      if (videoDevices.length > 0) {
        setVideoDevices(videoDevices); // Set available video devices
        
        const defaultCamera = videoDevices.find(device => device.label.includes('back')) || videoDevices[0];
        
        if (defaultCamera) {
          setSelectedCamera(defaultCamera.deviceId); // Set default camera
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: defaultCamera.deviceId } }
          });
          videoRef.current!.srcObject = stream;
          setHasCameraPermission(true);
        }
      } else {
        throw new Error('No camera devices found');
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop()); // Stop current camera

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } }
        });
        videoRef.current!.srcObject = newStream; // Switch to selected camera
      } catch (err) {
        console.error("Error switching camera: ", err);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      alert("يرجى ملء حقل وقت البدء ووقت الانتهاء.");
      return;
    }
    if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
      alert("وقت الانتهاء يجب أن يكون بعد وقت البدء.");
      return;
    }
    setIsLoading(true);

    const newSession: PhotoSession = { name: sessionName, photos: [] };
    await saveSession(newSession);
    const updatedSessions = await getSessions();
    setSessions(updatedSessions);

    startTakingPhotos(new Date(startTime).getTime(), new Date(endTime).getTime(), interval, sessionName);
    setIsLoading(false);
  };

  const startTakingPhotos = (start: number, end: number, interval: number, sessionName: string) => {
    setSessionInProgress(true);
    const id = setInterval(() => {
      const now = Date.now();
      const remainingTime = Math.max(0, end - now);
      setTimeLeft(Math.floor(remainingTime / 1000));

      if (now >= end) {
        clearInterval(id);
        setSessionInProgress(false);
        setTimeLeft(null);
        alert("تمت عملية التقاط الصور!");
        return;
      }
      captureImage(sessionName);
    }, interval * 60 * 1000);

    setIntervalId(id);
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
      const sessionIndex = sessions.findIndex(session => session.name === sessionName);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].photos.push({ timestamp: Date.now(), imageData });
        await saveSession(sessions[sessionIndex]);
      }
    }
  };

  return (
    <Card className="w-[400px] text-right">
      <CardHeader>
        <CardTitle className="text-center">الصبيب الليلي</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="sessionName">اسم الجلسة</Label>
            <Input id="sessionName" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
          </div>
          <div className="mb-4">
            <Label htmlFor="startTime">وقت البدء</Label>
            <Input type="datetime-local" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="mb-4">
            <Label htmlFor="endTime">وقت الانتهاء</Label>
            <Input type="datetime-local" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="mb-4">
            <Label htmlFor="interval">الفاصل الزمني (بالدقائق)</Label>
            <Input type="number" id="interval" value={interval} onChange={(e) => setIntervalValue(Number(e.target.value))} />
          </div>

          {/* Camera selection dropdown */}
          <div className="mb-4">
            <Label>اختر الكاميرا</Label>
            <select onChange={(e) => {
              setSelectedCamera(e.target.value);
              switchCamera(e.target.value);
            }} value={selectedCamera || ''}>
              <option value="">اختر الكاميرا</option>
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center mt-4">
            <Button disabled={isLoading || sessionInProgress} type="submit">
              {sessionInProgress ? "الانتظار..." : "بدء الجلسة"}
            </Button>
          </div>
        </form>
        <video ref={videoRef} autoPlay playsInline style={{ width: "100%" }} />
      </CardContent>
    </Card>
  );
}
