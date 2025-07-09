import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Interests from './pages/Interests';
import Weather from './pages/Weather';
import Location from './pages/Location';

const App: React.FC = () => (
  <BrowserRouter>
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/interests">Interests</Link></li>
        <li><Link to="/weather">Weather</Link></li>
      </ul>
    </nav>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/interests" element={<Interests />} />
      <Route path="/weather" element={<Weather />} />
      <Route path="/location" element={<Location />} />
    </Routes>
  </BrowserRouter>
);

export default App;
