import "./App.css";
import Navbar from "./components/navbar";
import BinPlacement from "./pages/BinMapPlacement";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HowItWorks from "./pages/HowItWorks";
import CitizenReport from "./pages/CitizenReport";
import AlertListener from "./components/AlertListener"; // ADD
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AlertListener />
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<BinPlacement />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/report" element={<CitizenReport />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
