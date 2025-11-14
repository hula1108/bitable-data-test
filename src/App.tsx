import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FeishuPlugin from "@/components/FeishuPlugin";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FeishuPlugin />} />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
