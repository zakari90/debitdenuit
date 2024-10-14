"use client"
import PhotoSessionManager from "./photoSessionManager";

const PeriodicTask = () => {
//   useEffect(() => {
//     // Function to be run every 10 minutes
//     const runTask = () => {
//       console.log("Running periodic task...");
//       // Add the logic you want to run periodically here, e.g., saving data, updating state, etc.
//     };

//     // Set the interval to run every 10 minutes (600,000 milliseconds)
//     const intervalId = setInterval(runTask, 600000); // 600,000 ms = 10 minutes

//     // Cleanup interval on component unmount
//     return () => {
//       clearInterval(intervalId);
//     };
//   }, []);

  return (
    <>

    <div dir="rtl" className="m-auto">
      <h1>الصبيب الليلي</h1>
      {new Date().getTime()}
        AM : قبل الظهر
        PM : بعد الظهر
      <PhotoSessionManager/>
    </div>
    </>
  )

};

export default PeriodicTask;
