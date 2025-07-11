import React, { useState, useRef, useEffect } from 'react';
import { Settings, Key, RotateCcw, Check } from 'lucide-react';

interface CircularLauncherProps {
  onClick: () => void;
  isAgentMode?: boolean;
}

interface ApiKeyOption {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
}
const CircularLauncher: React.FC<CircularLauncherProps> = ({ onClick, isAgentMode = false }) => {
  // Initialize position at top right
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showApiKeySwap, setShowApiKeySwap] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('gemini-pro');
  const [isRestarting, setIsRestarting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const apiKeyOptions: ApiKeyOption[] = [
    { id: 'gemini-pro', name: 'Gemini Pro', status: 'active' },
    { id: 'gemini-flash', name: 'Gemini Flash', status: 'inactive' },
    { id: 'openai-gpt4', name: 'OpenAI GPT-4', status: 'inactive' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', status: 'inactive' },
    { id: 'azure-openai', name: 'Azure OpenAI', status: 'inactive' }
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep button within viewport bounds
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && !showApiKeySwap) {
      onClick();
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Update position on window resize to keep it in bounds
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleApiKeySwap = async (newApiKey: string) => {
    setIsRestarting(true);
    setCurrentApiKey(newApiKey);
    
    // Simulate API key swap and restart
    setTimeout(() => {
      setShowApiKeySwap(false);
      setIsRestarting(false);
      // Force a page reload to restart the launcher with new API key
      window.location.reload();
    }, 1500);
  };

  const toggleApiKeySwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowApiKeySwap(!showApiKeySwap);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'inactive': return 'text-gray-400 bg-gray-400/20';
      case 'error': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (isRestarting) {
    return (
      <div
        className="fixed w-20 h-20 bg-gradient-to-br from-confluence-blue to-confluence-light-blue text-white rounded-full shadow-2xl z-50 flex items-center justify-center font-bold text-sm backdrop-blur-xl border-2 border-white/30 animate-pulse"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          boxShadow: `
            0 0 30px rgba(38, 132, 255, 0.6),
            0 0 60px rgba(38, 132, 255, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `,
        }}
      >
        <RotateCcw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Main Launcher Button */}
      <div className="fixed z-50" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
        <div className="relative">
          <button
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            className={`w-20 h-20 text-white rounded-full shadow-2xl cursor-move flex items-center justify-center font-bold text-sm backdrop-blur-xl border-2 transition-all duration-300 ${
              isAgentMode 
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-300/30 hover:shadow-orange-500/50 animate-pulse' 
                : 'bg-gradient-to-br from-confluence-blue to-confluence-light-blue border-white/30 hover:shadow-confluence-blue/50'
            } hover:shadow-2xl`}
            style={{
              boxShadow: `
                0 0 30px ${isAgentMode ? 'rgba(249, 115, 22, 0.4)' : 'rgba(38, 132, 255, 0.4)'},
                0 0 60px ${isAgentMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(38, 132, 255, 0.2)'},
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `,
              background: `
                linear-gradient(135deg, 
                  ${isAgentMode ? 'rgba(249, 115, 22, 0.9)' : 'rgba(38, 132, 255, 0.9)'} 0%, 
                  ${isAgentMode ? 'rgba(234, 88, 12, 0.9)' : 'rgba(0, 82, 204, 0.9)'} 100%
                ),
                radial-gradient(circle at 30% 30%, 
                  rgba(255, 255, 255, 0.3) 0%, 
                  transparent 50%
                )
              `,
            }}
          >
            <span className="text-white font-extrabold tracking-tight">C.AIA</span>
          </button>

          {/* API Key Settings Button */}
          <button
            onClick={toggleApiKeySwap}
            className={`absolute -bottom-2 -right-2 w-8 h-8 bg-white/90 backdrop-blur-xl rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border border-white/30 ${
              isAgentMode ? 'text-orange-500' : 'text-confluence-blue'
            }`}
            style={{
              boxShadow: `
                0 0 15px ${isAgentMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(38, 132, 255, 0.3)'},
                0 4px 16px rgba(0, 0, 0, 0.2)
              `,
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Swap Panel */}
      {showApiKeySwap && (
        <div 
          className="fixed z-40"
          style={{ 
            left: `${Math.min(position.x + 100, window.innerWidth - 320)}px`, 
            top: `${position.y}px` 
          }}
        >
          <div className="bg-white/90 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl w-80 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-confluence-blue/90 to-confluence-light-blue/90 backdrop-blur-xl p-4 text-white border-b border-white/10">
              <div className="flex items-center space-x-3">
                <Key className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">API Key Manager</h3>
                  <p className="text-blue-100/90 text-sm">Switch between available API keys</p>
                </div>
              </div>
            </div>

            {/* API Key Options */}
            <div className="p-4 space-y-3">
              {apiKeyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleApiKeySwap(option.id)}
                  disabled={option.id === currentApiKey}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                    option.id === currentApiKey
                      ? 'bg-confluence-blue/20 border-confluence-blue/30 text-confluence-blue'
                      : 'bg-white/60 border-white/30 hover:bg-white/80 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(option.status)}`} />
                    <div className="text-left">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-xs opacity-70 capitalize">{option.status}</div>
                    </div>
                  </div>
                  {option.id === currentApiKey && (
                    <Check className="w-5 h-5 text-confluence-blue" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-white/20">
              <p className="text-xs text-gray-600 text-center">
                Switching API key will restart the launcher
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CircularLauncher;