"use client";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { FormEvent, useCallback, useRef, useState, useEffect } from "react";
import { deleteSession, getSessions, Photo, PhotoSession, saveSession } from "./db";



function PhotoSessionManager() {
  const webcamRef = useRef<Webcam>(null);
  const [img, setImg] = useState<string | null>(null);
  const defaultSessionName = "الصبيب الليلي " + new Date().toLocaleString('ar-ma');
  const [startTime, setStartTime] = useState<string>('');  
  const [endTime, setEndTime] = useState<string>('');  
  const [interval, setIntervalValue] = useState<number>(10); 
  const [sessionName, setSessionName] = useState<string>(defaultSessionName);  
  const [sessions, setSessions] = useState<PhotoSession[]>([]);  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [sessionInProgress, setSessionInProgress] = useState<boolean>(false); 
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer | null>(null); 
  const [cameraMode, setCameraMode] = useState<"user" | "environment">("environment");
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false); // Used for webcam activation

  const videoConstraints = {
    width: 280,
    height: 280,
    facingMode: cameraMode,  
  };
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setImg(imageSrc || null);
    return imageSrc;
  }, [webcamRef]);

  console.log(img)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!startTime || !endTime) {
      alert('يرجى ملء حقل وقت البدء ووقت الانتهاء.');
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

    startTakingPhotos(end, interval);
    
    setIsLoading(false);
  };

  const startTakingPhotos = (end: number, interval: number) => {

    setSessionInProgress(true);

    setIsWebcamActive(true)
    const id = setInterval(async () => {
      const now = Date.now();
      const remainingTime = Math.max(0, end - now);
      setTimeLeft(Math.floor(remainingTime / 1000));

      if (now >= end) {
        clearInterval(id);
        setSessionInProgress(false);
        setTimeLeft(null);
        setIsWebcamActive(false)
        alert('تمت عملية التقاط الصور!');
        return;
      }
      setIsWebcamActive(true)

      const imageSrc = capture();
      if (imageSrc) {
        const newPhoto: Photo = { timestamp: Date.now(), imageData: imageSrc };
        const session = await getSessions();
        const updatedSession = session.find(s => s.name === sessionName);
        if (updatedSession) {
          updatedSession.photos.push(newPhoto);
          await saveSession(updatedSession);
        }
      }
   setIsWebcamActive(false);

   setTimeout(() => {
     setIsWebcamActive(true);
   }, 5000);
    }, interval * 1000 * 60 );

    setIntervalId(id);
  };

  const handleStop = async () => {
    if (intervalId) {
      setIntervalId(null);
    }

    setSessionInProgress(false);
    setTimeLeft(null);
    setIsWebcamActive(false);
    alert('تم انهاء الجلسة.');
  };

  const handleDeleteSession = async (sessionName: string) => {
    const confirmed = window.confirm(`هل أنت متأكد أنك تريد حذف الجلسة: ${sessionName}?`);
    if (confirmed) {
      await deleteSession(sessionName);
      const updatedSessions = await getSessions();
      setSessions(updatedSessions);
      setSelectedSession(null);
    }
  };

  useEffect(() => {
    const fetchSessions = async () => {
      const updatedSessions = await getSessions();
      setSessions(updatedSessions);
    };

    fetchSessions();
  }, []);

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
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="camera-mode">اختيار الكاميرا</Label>
                <select
                  id="camera-mode"
                  value={cameraMode}
                  onChange={(e) => setCameraMode(e.target.value as "user" | "environment")}
                  className="w-full"
                >
                  <option value="user">الكاميرا الأمامية (Front)</option>
                  <option value="environment">الكاميرا الخلفية (Back)</option>
                </select>
              </div>
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
              <Button type="submit" disabled={isLoading || sessionInProgress}>بدء التصوير</Button>
            </form>

            {sessionInProgress && (
              <div className="mt-4">
                <p className="text-lg font-semibold">
                  الجلسة بدأت! الوقت المتبقي: {timeLeft !== null ? `${Math.floor(timeLeft / 60)} دقيقة و ${timeLeft % 60} ثانية` : "جاري العد..."}
                </p>
                <Button onClick={handleStop} className="mt-2 text-red-600">إيقاف الجلسة</Button>
              </div>
            )}
            {isWebcamActive &&
            (<div id="video-container" className="m-2">
               <Webcam
              className="ml-auto mr-auto"
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                audio={false}
                ref={webcamRef}
                mirrored={true}
              />
            </div>)}
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

export default PhotoSessionManager;
