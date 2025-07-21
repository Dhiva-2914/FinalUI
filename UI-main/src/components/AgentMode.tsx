import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Zap, X, Send, Brain, Loader2, MessageSquare, FileText } from 'lucide-react';
import type { AppMode } from '../App';
import { apiService, analyzeGoal } from '../services/api';

interface AgentModeProps {
  onClose: () => void;
  onModeSelect: (mode: AppMode) => void;
}

interface PlanStep {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'completed';
  details?: string;
}

interface OutputTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  content: string;
  pageOutputs?: Record<string, string>;
}

const AgentMode: React.FC<AgentModeProps> = ({ onClose, onModeSelect }) => {
  const [goal, setGoal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [activeTab, setActiveTab] = useState('final-answer');
  const [outputTabs, setOutputTabs] = useState<OutputTab[]>([]);
  const [spaces, setSpaces] = useState<{ value: string, label: string }[]>([]);
  const [pages, setPages] = useState<{ value: string, label: string }[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<{ value: string, label: string } | null>(null);
  const [selectedPages, setSelectedPages] = useState<{ value: string, label: string }[]>([]);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedFinalPage, setSelectedFinalPage] = useState<string | null>(null);

  useEffect(() => {
    if (outputTabs.length > 0) setSidebarOpen(true);
  }, [outputTabs]);

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const spaceData = await apiService.getSpaces();
        setSpaces(spaceData.spaces.map(s => ({ value: s.key, label: s.name })));
      } catch (err) {
        setError('Failed to load spaces.');
      }
    };
    loadSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace) {
      const loadPages = async () => {
        try {
          const pageData = await apiService.getPages(selectedSpace.value);
          setPages(pageData.pages.map(p => ({ value: p, label: p })));
        } catch (err) {
          setError('Failed to load pages for the selected space.');
        }
      };
      loadPages();
    } else {
      setPages([]);
    }
  }, [selectedSpace]);

  // Helper: Split instructions by newlines or periods
  const splitInstructions = (input: string) => {
    return input
      .split(/\n|\.|\r/)
      .map(instr => instr.trim())
      .filter(instr => instr.length > 0);
  };

  // Main handler for chat and goal submit
  const handleGoalSubmit = async (goalOverride?: string) => {
    const usedGoal = goalOverride || goal;
    if (!usedGoal.trim() || !selectedSpace || selectedPages.length === 0) {
      setError('Please provide a goal, select a space, and at least one page.');
      return;
    }
    setIsProcessing(true);
    setError('');
    setPlanSteps([{ id: 1, title: 'Processing...', status: 'running' }]);
    setOutputTabs([]);
    try {
      const pageTitles = selectedPages.map(p => p.value);
      const instructions = splitInstructions(usedGoal);
      const analysis = await analyzeGoal(usedGoal, pageTitles);
      const orchestrationReasoning = analysis.reasoning || 'Analysis complete.';
      const pageOutputs: Record<string, string> = {};
      for (const pageTitle of pageTitles) {
        let outputParts: string[] = [];
        for (const instr of instructions) {
          try {
            const result = await apiService.search({
              space_key: selectedSpace.value,
              page_titles: [pageTitle],
              query: instr,
            });
            outputParts.push(`**Instruction:** ${instr}\n${result.response || 'No output.'}`);
          } catch (e: any) {
            outputParts.push(`**Instruction:** ${instr}\nFailed: ${e.message}`);
          }
        }
        pageOutputs[pageTitle] = outputParts.join('\n\n---\n\n');
      }
      setPlanSteps([{ id: 1, title: 'Completed', status: 'completed' }]);
      setOutputTabs([
        { id: 'final-answer', label: 'Final Answer', icon: FileText, content: '', pageOutputs },
        { id: 'reasoning', label: 'Reasoning', icon: Brain, content: orchestrationReasoning },
      ]);
      setActiveTab('final-answer');
      setSelectedFinalPage(pageTitles[0] || null);
    } catch (err: any) {
      setError(err.detail || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatContent = (content: string) => {
    if (!content) return <p>No content available.</p>;
    return content.split('\n').map((line, i) => <p key={i}>{line}</p>);
  };

  const renderInitialView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Select Space and Pages</h3>
        <div className="flex flex-col md:flex-row md:space-x-4 items-start">
          <div className="w-full md:w-1/2 mb-4 md:mb-0" style={{ position: 'relative', zIndex: 20 }}>
            <label className="block text-gray-700 mb-2 text-left">Space</label>
            <select
              value={selectedSpace ? selectedSpace.value : ''}
              onChange={e => {
                const found = spaces.find(s => s.value === e.target.value) || null;
                setSelectedSpace(found);
                setSelectedPages([]);
              }}
              className="w-full p-2 border rounded-xl"
            >
              <option value="">Select a space...</option>
              {spaces.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-full md:w-1/2" style={{ position: 'relative', zIndex: 20 }}>
            <label className="block text-gray-700 mb-2 text-left">Pages</label>
            <select
              multiple
              value={selectedPages.map(p => p.value)}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedPages(pages.filter(p => values.includes(p.value)));
              }}
              disabled={!selectedSpace}
              className="w-full p-2 border rounded-xl"
              size={5}
            >
              {pages.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">What do you want to achieve?</h3>
        <div className="relative">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., 'Summarize the content on the selected pages.'"
            className="w-full p-4 pr-16 border-2 border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
            rows={4}
          />
          <button
            onClick={() => handleGoalSubmit()}
            disabled={isProcessing || !goal.trim() || !selectedSpace || selectedPages.length === 0}
            className="absolute bottom-4 right-4 bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 disabled:bg-gray-400"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Send />}
          </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );

  const renderResultsView = () => (
    <div className="w-full">
      <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="border-b border-white/20 bg-white/40">
          <div className="flex overflow-x-auto">
            {outputTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'final-answer' ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.keys(outputTabs.find(t => t.id === 'final-answer')?.pageOutputs || {}).map(page => (
                  <button
                    key={page}
                    onClick={() => setSelectedFinalPage(page)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border ${selectedFinalPage === page ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-100'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <div className="whitespace-pre-wrap text-gray-700 max-h-[60vh] overflow-y-auto p-2">
                {formatContent(outputTabs.find(t => t.id === 'final-answer')?.pageOutputs?.[selectedFinalPage || ''] || 'Select a page to see its output.')}
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-gray-700 max-h-[60vh] overflow-y-auto p-2">
              {formatContent(outputTabs.find(t => t.id === activeTab)?.content || '')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500/90 to-orange-600/90 p-4 text-white border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap />
              <h2 className="text-xl font-bold">Agent Mode</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => onModeSelect('tool')} className="hover:text-white px-3 py-1 text-sm rounded-xl">Tool Mode</button>
              <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full"><X /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          {outputTabs.length > 0 && (
            <div className="w-full max-w-xs bg-white/90 border-r flex flex-col p-4 space-y-6">
               <div className="bg-white/60 rounded-xl p-4 border shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Refine Selection</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space</label>
                    <select
                      value={selectedSpace ? selectedSpace.value : ''}
                      onChange={e => {
                        const found = spaces.find(s => s.value === e.target.value) || null;
                        setSelectedSpace(found);
                        setSelectedPages([]);
                      }}
                      className="w-full p-2 border rounded-xl"
                    >
                      <option value="">Select a space...</option>
                      {spaces.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
                    <select
                      multiple
                      value={selectedPages.map(p => p.value)}
                      onChange={e => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedPages(pages.filter(p => values.includes(p.value)));
                      }}
                      disabled={!selectedSpace}
                      className="w-full p-2 border rounded-xl"
                      size={5}
                    >
                      {pages.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border shadow-lg flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><MessageSquare className="w-5 h-5 mr-2" /> Chat</h3>
                    <div className="flex-1 overflow-y-auto mb-2 border-t pt-2">
                      {/* Chat history would go here */}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Further instructions..."
                        className="flex-1 p-2 border rounded-xl focus:ring-2 focus:ring-orange-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleGoalSubmit(chatInput)}
                      />
                      <button onClick={() => handleGoalSubmit(chatInput)} disabled={!chatInput.trim()} className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-300">
                        <Send />
                      </button>
                    </div>
                </div>
            </div>
          )}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 overflow-y-auto flex-1">
              {outputTabs.length === 0 ? renderInitialView() : renderResultsView()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMode; 