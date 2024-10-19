"use client"
import Clock from 'react-live-clock';
import PhotoSessionManager from "./_nightFlow/photoSessionManager";
export default function Home() {

  return (
    <>
<div dir="rtl" className="flex flex-col items-center justify-center min-h-screen m-auto">
  {/* <WebcamImage/> */}
  <div className="mb-4 text-center">
  <div className="text-base md:text-lg">
  {/* {currentDate} */}
  <Clock
          format={'h:mm:ssa'}
          style={{fontSize: '1.5em'}}
          ticking={true} />
    </div>
    <p><strong>AM :</strong> قبل الظهر</p>
    <p><strong>PM :</strong> بعد الظهر</p>
  </div>

  <PhotoSessionManager />
</div>
    </>
  );
}
