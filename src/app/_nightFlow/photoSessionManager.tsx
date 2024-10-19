"use client";

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

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

const saveSession = async (session: PhotoSession): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('فشل في حفظ الجلسة');
  }
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

  const defaulSessiontName = "الصبيب الليلي " + new Date().toLocaleString('ar-ma', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
  const [startTime, setStartTime] = useState<string>('');  
  const [endTime, setEndTime] = useState<string>('');  
  const [interval, setIntervalValue] = useState<number>(1000); 
  const [sessionName, setSessionName] = useState<string>(defaulSessiontName);  
  const [sessions, setSessions] = useState<PhotoSession[]>([]);  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [sessionInProgress, setSessionInProgress] = useState<boolean>(false); // New state for session progress
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // New state for countdown
  const [intervalId, setIntervalId] = useState<NodeJS.Timer | null>(null); // Store interval ID for cancellation
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null); // New state to track selected camera
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]); // State to store available video devices


  const requestCameraPermission = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
  
      // If successful, return the stream
      return stream;
    } catch (err) {
      console.error("Error accessing camera: ", err);
      return null;
    }
  };
  
  const chooseCamera = async () => {
    try {

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
  
      if (videoDevices.length === 0) {
        throw new Error('لم يتم العثور على كاميرا');
      }
      setVideoDevices(videoDevices);
      const defaultCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back')) || videoDevices[0];
  
      if (defaultCamera) {
        setSelectedCamera(defaultCamera.deviceId);
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: defaultCamera.deviceId } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setHasCameraPermission(true);
      } else {
        throw new Error('No suitable camera found.');
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
      alert("فشل في الوصول إلى الكاميرا. يرجى التحقق من الأذونات."); // "Failed to access the camera. Please check permissions."
    }
  };
  
  const initCamera = async () => {
    const stream = await requestCameraPermission();
    
    if (stream) {
      chooseCamera();
    } else {
      alert("فشل في الوصول إلى الكاميرا. يرجى التحقق من الأذونات.");
    }
  };  

  const switchCamera = async (deviceId: string) => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop()); 
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } }
        });
        videoRef.current!.srcObject = newStream; 
      } catch (err) {
        console.error("Error switching camera: ", err);
      }
    }
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!startTime) {
      alert('يرجى ملء حقل وقت البدء.');
      return;
    }
    if (!endTime) {
      alert('يرجى ملء حقل وقت الانتهاء.');
      return;
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (start >= end) {
      alert('وقت الانتهاء يجب أن يكون بعد وقت البدء.');
      return;
    }

    setIsLoading(true); 
    const newSession: PhotoSession = { name: sessionName, photos: [] };
    await saveSession(newSession);
    const updatedSessions = await getSessions();
    setSessions(updatedSessions);


    startTakingPhotos(end, interval);

    setIsLoading(false);
  };

  const startTakingPhotos = ( end: number, interval: number) => {
    setSessionInProgress(true); 
    const id = setInterval(() => {
      const now = Date.now();
      const remainingTime = Math.max(0, end - now);
      setTimeLeft(Math.floor(remainingTime / 1000)); 

      if (now >= end) {
        clearInterval(id);
        setSessionInProgress(false); 
        setTimeLeft(null); 
        alert('تمت عملية التقاط الصور!');
        return;
      }
      captureImage();
    }, interval);

    setIntervalId(id); 
  };


  const captureImage = async () => {
    const video = document.querySelector('video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
  
    if (context && video && selectedSession) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
  
      const sessions = await getSessions();
      const sessionIndex = sessions.findIndex((session) => session.name === selectedSession);
  
      if (sessionIndex !== -1) {
        sessions[sessionIndex].photos.push({ timestamp: Date.now(), imageData });
        await saveSession(sessions[sessionIndex]);
        console.log('تم التقاط الصورة وحفظها في الجلسة:', selectedSession);
      }
    }
  };
  
  const handleStop = async () => {
    if (intervalId) {
      setIntervalId(null); // Reset interval ID
    }
  
    // Save the current session if there are photos
    if (selectedSession) {
      const sessions = await getSessions();
      const sessionIndex = sessions.findIndex((session) => session.name === selectedSession);
  
      if (sessionIndex !== -1) {
        await saveSession(sessions[sessionIndex]); // Save session to IndexedDB
        alert('تم حفظ الجلسة.'); // Notify user
      }
    }
  
    setSessionInProgress(false); // Mark the session as stopped
    setTimeLeft(null); // Reset countdown
  };
    
  const handleCancel = () => {
    console.log("-------------------------------------");
    console.log("handleCancel");
    console.log("-------------------------------------");
    
    if (intervalId) {
      setIntervalId(null)
    }
    setSessionInProgress(false); // Mark the session as canceled
    setTimeLeft(null); // Reset countdown
    alert('تم إلغاء الجلسة.');
  };

  const handleDeleteSession = async (sessionName: string) => {
    console.log("-------------------------------------");
    console.log("handleDeleteSession");
    console.log("-------------------------------------");
    
    const confirmed = window.confirm(`هل أنت متأكد أنك تريد حذف الجلسة: ${sessionName}?`);
    if (confirmed) {
      await deleteSession(sessionName);
      const updatedSessions = await getSessions();
      setSessions(updatedSessions);
      setSelectedSession(null);  // Clear selected session after deletion
    }
  };


  useEffect(() => {
    getSessions().then(setSessions).catch(console.error);
    initCamera()
    return () => {
      // Cleanup: stop video stream when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      // Clear the interval if component is unmounted while session is in progress
      if (intervalId) {
        setIntervalId(null)
      }
    };
  }, [intervalId, selectedCamera]);
  return (
    <Card className="w-[400px] text-right">
      <CardHeader>
        <CardTitle className='text-center'>الصبيب الليلي</CardTitle>
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
                  {/* Session Name */}
                  <div className="space-y-2">
                    <Label htmlFor="session-name">اسم الجلسة</Label>
                    <Input
                      id="session-name"
                      value={sessionName}
                      placeholder='الصبيب الليلي'
                      onChange={(e) => setSessionName(e.target.value)}
                      disabled={sessionInProgress} 
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
                      disabled={sessionInProgress}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">وقت الانتهاء</Label>
                    <Input
                      className='w-fit mr-auto bg-red-400'
                      id="end-time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={sessionInProgress}
                    />
                  </div>

                  {/* Interval */}
                  <div className="space-y-2">
                    <Label htmlFor="interval">الفاصل الزمني (بالدقائق)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={interval}
                      onChange={(e) => setIntervalValue(Number(e.target.value))}
                      min="1"
                      disabled={sessionInProgress}
                    />
                  </div>
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
                  <Button type="submit" disabled={isLoading || sessionInProgress}>بدء التصوير</Button>
                </form>

                {sessionInProgress && (
                  <div className="mt-4">
                    <p className="text-lg font-semibold">
                      الجلسة بدأت! الوقت المتبقي: {timeLeft !== null ? `${Math.floor(timeLeft / 60)} دقيقة و ${timeLeft % 60} ثانية` : "جاري العد..."}
                    </p>
                    <Button onClick={handleCancel} className="mt-2 text-red-600">إلغاء الجلسة</Button>
                    <Button onClick={handleStop} className="mt-2 text-red-600">إيقاف الجلسة</Button>
                    </div>
                )}

                <div id="video-container" className="w-full h-52 m-2">
                  <video ref={videoRef} className="w-full h-full" autoPlay playsInline></video>
                </div>
              </>
            )}
          </TabsContent>

          {/* Existing Sessions */}
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
                        <Image
                        width={200}
                        height={200}
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
