import { Routes, Route } from 'react-router-dom';
import FeishuPlugin from "@/components/FeishuPlugin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FeishuPlugin />} />
      <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
    </Routes>
  );
}
