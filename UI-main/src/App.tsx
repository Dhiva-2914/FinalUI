import React, { useState, useEffect } from 'react';
import ModeSelector from './components/ModeSelector';
import AgentMode from './components/AgentMode';
import AIPoweredSearch from './components/AIPoweredSearch';
import VideoSummarizer from './components/VideoSummarizer';
import CodeAssistant from './components/CodeAssistant';
import ImpactAnalyzer from './components/ImpactAnalyzer';
import TestSupportTool from './components/TestSupportTool';
import ImageInsights from './components/ImageInsights';
import CircularLauncher from './components/CircularLauncher';

export type FeatureType = 'search' | 'video' | 'code' | 'impact' | 'test' | 'image' | null;
export type AppMode = 'agent' | 'tool' | null;

function App() {
  const [activeFeature, setActiveFeature] = useState<FeatureType>(null);
  const [isAppOpen, setIsAppOpen] = useState(false);
  const [autoSpaceKey, setAutoSpaceKey] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>(null);

  // Extract space key from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spaceKey = urlParams.get('space');
    if (spaceKey) {
      setAutoSpaceKey(spaceKey);
    }
  }, []);

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'search':
        return <AIPoweredSearch onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      case 'video':
        return <VideoSummarizer onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      case 'code':
        return <CodeAssistant onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      case 'impact':
        return <ImpactAnalyzer onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      case 'test':
        return <TestSupportTool onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      case 'image':
        return <ImageInsights onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
      default:
        return <AIPoweredSearch onClose={() => setActiveFeature(null)} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />;
    }
  };

  const handleLauncherClick = () => {
    setIsAppOpen(true);
    // Don't set a default feature, let user choose mode first
  };

  const handleAppClose = () => {
    setIsAppOpen(false);
    setActiveFeature(null);
    setAppMode(null);
  };

  const handleModeSelect = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'tool') {
      setActiveFeature('search'); // Default to search for tool mode
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      {!isAppOpen && (
        <CircularLauncher onClick={handleLauncherClick} />
      )}
      
      {isAppOpen && (
        <div>
          {!appMode ? (
            <ModeSelector onModeSelect={handleModeSelect} onClose={handleAppClose} />
          ) : appMode === 'agent' ? (
            <AgentMode onClose={handleAppClose} onModeSelect={setAppMode} />
          ) : appMode === 'tool' && activeFeature ? (
            renderActiveFeature()
          ) : appMode === 'tool' ? (
            <AIPoweredSearch onClose={handleAppClose} onFeatureSelect={setActiveFeature} autoSpaceKey={autoSpaceKey} isSpaceAutoConnected={!!autoSpaceKey} />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default App;