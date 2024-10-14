"use client"
import PhotoSessionManager from "./_nightFlow/photoSessionManager";

export default function Home() {
  return (
    <>
<div dir="rtl" className="flex flex-col items-center justify-center min-h-screen m-auto">
  <div className="mb-4 text-center">
  <div className="text-base md:text-lg">
      {new Date().toLocaleString('ar-ma', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      })}
    </div>
    <p><strong>AM :</strong> قبل الظهر</p>
    <p><strong>PM :</strong> بعد الظهر</p>
  </div>

  <PhotoSessionManager />
</div>
    </>
  );
}
