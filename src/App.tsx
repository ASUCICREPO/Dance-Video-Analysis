import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VideoProvider } from "./context/VideoContext";
import { UploadPage } from "./pages/UploadPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CompletePage } from "./pages/CompletePage";
import { ResultsPage } from "./pages/ResultsPage";
import { VideoDetailsPage } from "./pages/VideoDetailsPage";

function App() {
  return (
    <VideoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/complete" element={<CompletePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/details/:localId" element={<VideoDetailsPage />} />
        </Routes>
      </BrowserRouter>
    </VideoProvider>
  );
}

export default App;
