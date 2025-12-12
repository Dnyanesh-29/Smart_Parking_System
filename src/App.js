import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AdminPanel from "./components/AdminPanel";
import BuildingParking from "./components/BuildingParking";
import HomePage from "./components/HomePage";
import ParkingSlots from "./components/ParkingSlots";

function App() {
  return (
    <Router>
      <div>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/street-parking" element={<ParkingSlots />} />
          <Route path="/pay-and-park" element={<BuildingParking />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* <Route path="/new-parking" element={<NewParking />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
