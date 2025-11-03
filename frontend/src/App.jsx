import { useEffect, useState } from "react";
import "./index.css";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/checklists/hello/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Failed to load message"));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <h1 className="text-4xl font-bold text-indigo-600 mb-4">{message}</h1>
      <p className="text-gray-500">Connected: Vite + React + Django + Tailwind v4 🚀</p>
    </div>
  );
}

export default App;