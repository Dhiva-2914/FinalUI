import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Zap, X, Send, Brain, Loader2, MessageSquare, FileText, PanelLeftClose } from 'lucide-react';
import type { AppMode } from '../App';
import { apiService, analyzeGoal, videoSummarizer, createChart } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  const [showResults, setShowResults] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [orchestrationReasoning, setOrchestrationReasoning] = useState('');
  const [usedTools, setUsedTools] = useState<string[]>([]);
  const [pageOutputs, setPageOutputs] = useState<Record<string, string>>({});

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

  const handleGoalSubmit = async (goalOverride?: string) => {
    const usedGoal = goalOverride || goal;
        if (!usedGoal.trim() || !selectedSpace || selectedPages.length === 0) {
      setError('Please provide a goal, select a space, and at least one page.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setOutputTabs([]);
    setPageOutputs({});
    setPlanSteps([]);
    setOrchestrationReasoning('');
    setUsedTools([]);
    setProgressPercentage(0);

    try {
        const pageTitles = selectedPages.map(p => p.value);
        const analysis = await analyzeGoal(usedGoal, pageTitles);

        setOrchestrationReasoning(analysis.reasoning || 'Analysis complete.');
        const toolsInPlan = Array.from(new Set(analysis.plan.map(step => step.tool)));
        setUsedTools(toolsInPlan);
        setProgressPercentage(50);

        const newPageOutputs: Record<string, string> = {};

        for (const page of selectedPages) {
            let pageOutputContent = '';
            // Simplified logic: In a real scenario, you'd iterate through analysis.plan
            // and call the specific tool for the page.
            if (usedGoal.toLowerCase().includes('summarize a video')) {
                const videoResponse = await videoSummarizer({ space_key: selectedSpace.value, page_title: page.value, file_name: '' });
                pageOutputContent = videoResponse.summary;
            } else if (usedGoal.toLowerCase().includes('create a graph')) {
                const chartResponse = await createChart({ space_key: selectedSpace.value, page_title: page.value, file_name: '' });
                pageOutputContent = `![Chart](data:image/png;base64,${chartResponse.chart})`
            } else {
                const searchResponse = await apiService.search({ space_key: selectedSpace.value, page_titles: [page.value], query: usedGoal });
                pageOutputContent = searchResponse.response;
            }
            newPageOutputs[page.value] = pageOutputContent;
        }

        setPageOutputs(newPageOutputs);
        setOutputTabs(selectedPages.map(p => ({ id: p.value, label: p.label, icon: FileText, content: newPageOutputs[p.value] || '' })));
        setActiveTab(selectedPages[0]?.value || '');
        setProgressPercentage(100);

    } catch (err: any) {
        console.error('AgentMode error:', err);
        setError((err.detail || err.message) || 'An unexpected error occurred during processing.');
    } finally {
        setIsProcessing(false);
    }
};

  const formatContent = (content: string) => {
    if (!content) return <p className="text-gray-500">No output for this page.</p>;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown key={`md-${lastIndex}`} children={content.substring(lastIndex, match.index)} />
        );
      }
      const language = match[1] || 'bash';
      const code = match[2];
      parts.push(
        <div key={`code-${lastIndex}`} className="my-2 rounded-lg overflow-hidden bg-gray-800 text-sm">
          <div className="bg-gray-700 text-white px-4 py-1 flex justify-between items-center">
            <span>{language}</span>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="text-xs hover:bg-gray-600 p-1 rounded"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter language={language} style={materialDark}>
            {code}
          </SyntaxHighlighter>
        </div>
      );
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(
        <ReactMarkdown key={`md-${lastIndex}`} children={content.substring(lastIndex)} />
      );
    }

    return parts;
  };
  
  const renderInitialView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Select Space and Pages</h3>
        <div className="flex flex-col md:flex-row md:space-x-4 items-start">
          <div className="w-full md:w-1/2 mb-4 md:mb-0" style={{ zIndex: 30 }}>
            <label className="block text-gray-700 mb-2 text-left">Space</label>
            <Select
              value={selectedSpace}
              onChange={(option) => {
                setSelectedSpace(option);
                setSelectedPages([]);
              }}
              options={spaces}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select a space..."
              isClearable
            />
          </div>
          <div className="w-full md:w-1/2" style={{ zIndex: 20 }}>
            <label className="block text-gray-700 mb-2 text-left">Pages</label>
            <Select
              isMulti
              value={selectedPages}
              onChange={(options) => setSelectedPages(options as any)}
              options={pages}
              isDisabled={!selectedSpace}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select pages..."
            />
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className={`flex-1 overflow-y-auto p-6 bg-white rounded-lg shadow-lg transition-opacity duration-500`}
      >
        {isProcessing ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="relative w-40 h-40 mx-auto">
                <Loader2 className="animate-spin-slow text-orange-500 w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-2 border-orange-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-600">{progressPercentage}%</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-700">Hold tight, our AI agent is on the job!</p>
              <p className="text-gray-500">Analyzing your goal and executing the plan...</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Final Answer</h2>
            <div className="flex items-start space-x-4 mb-4 pb-2 border-b text-sm text-gray-600">
                <div className="flex-1">
                    {orchestrationReasoning && (
                        <div className="flex items-center mb-2">
                            <Brain size={16} className="mr-2 text-orange-500 flex-shrink-0" />
                            <strong>Reasoning:</strong>
                            <span className="ml-2 bg-orange-100 text-orange-800 px-2 py-1 rounded">{orchestrationReasoning}</span>
                        </div>
                    )}
                    {usedTools.length > 0 && (
                        <div className="flex items-center">
                            <Zap size={16} className="mr-2 text-yellow-500 flex-shrink-0" />
                            <strong>Used Tools:</strong>
                            <div className="ml-2 flex flex-wrap gap-1">
                            {usedTools.map((tool, index) => (
                                <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                                {tool}
                                </span>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex-shrink-0">
                    <div className="flex items-center">
                        <FileText size={16} className="mr-2 text-blue-500" />
                        <strong>Selected Pages:</strong>
                    </div>
                    <div className="ml-2 mt-1 flex flex-col items-start gap-1">
                      {selectedPages.map((page) => (
                        <span key={page.value} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {page.label}
                        </span>
                      ))}
                    </div>
                </div>
            </div>
            <div className="flex space-x-2 border-b mb-4">
              {outputTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 border-b-2 text-sm ${activeTab === tab.id ? 'border-orange-500 text-orange-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="whitespace-pre-wrap text-gray-800 max-h-[55vh] overflow-y-auto p-2 pretty-scrollbar">
              {formatContent(outputTabs.find(t => t.id === activeTab)?.content || '')}
            </div>
          </div>
        )}
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
          <div className={`transition-all duration-300 ${sidebarOpen ? 'w-full max-w-xs' : 'w-0'} overflow-hidden`}>
            <div className="bg-white/90 border-r flex flex-col p-4 space-y-6 h-full">
               <div className="bg-white/60 rounded-xl p-4 border shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Refine Selection</h3>
                  <div className="mb-4" style={{ zIndex: 15 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space</label>
                    <Select
                      value={selectedSpace}
                      onChange={(option) => {
                        setSelectedSpace(option);
                        setSelectedPages([]);
                      }}
                      options={spaces}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select a space..."
                      isClearable
                    />
                  </div>
                  <div style={{ zIndex: 10 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
                     <Select
                        isMulti
                        value={selectedPages}
                        onChange={(options) => setSelectedPages(options as any)}
                        options={pages}
                        isDisabled={!selectedSpace}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Select pages..."
                      />
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
          </div>
          <div className="flex-1 flex flex-col min-h-0">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute top-2 left-2 z-20 bg-white/50 p-2 rounded-full hover:bg-white/80 transition-all">
                <PanelLeftClose className="w-5 h-5 text-gray-700" />
            </button>
            <div className="p-6 overflow-y-auto flex-1">
              {isProcessing || outputTabs.length > 0 ? renderResultsView() : renderInitialView()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMode; 