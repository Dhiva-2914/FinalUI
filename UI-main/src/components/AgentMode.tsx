import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Zap, X, Send, Download, RotateCcw, FileText, Brain, CheckCircle, Loader2, MessageSquare, PanelLeftClose } from 'lucide-react';
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
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('final-answer');
  const [outputTabs, setOutputTabs] = useState<OutputTab[]>([]);
  const [spaces, setSpaces] = useState<{ name: string; key: string }[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedFinalPage, setSelectedFinalPage] = useState<string | null>(null);

  useEffect(() => {
    if (outputTabs.length > 0) {
      setSidebarOpen(true);
    }
  }, [outputTabs]);

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        setSpaces(await apiService.getSpaces().then(res => res.spaces));
      } catch (err: any) {
        setError('Failed to load spaces.');
      }
    };
    loadSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace) {
      const loadPages = async () => {
        try {
          setPages(await apiService.getPages(selectedSpace).then(res => res.pages));
        } catch (err: any) {
          setError('Failed to load pages.');
        }
      };
      loadPages();
    }
  }, [selectedSpace]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !selectedSpace || !selectedPages.length) {
      setError('Please enter an instruction, select a space, and at least one page.');
      return;
    }
    setGoal(chatInput);
    setChatInput('');
    await handleGoalSubmit(chatInput);
  };

  const handleGoalSubmit = async (goalOverride?: string) => {
    const usedGoal = goalOverride !== undefined ? goalOverride : goal;
    if (!usedGoal.trim() || !selectedSpace || selectedPages.length === 0) {
      setError('Please enter a goal, select a space, and at least one page.');
      return;
    }

    setIsPlanning(true);
    setError('');
    setOutputTabs([]);
    setPlanSteps([
      { id: 1, title: 'Analyzing Goal', status: 'running', details: 'Analyzing your instructions...' },
      { id: 2, title: 'Executing Plan', status: 'pending' },
    ]);
    setCurrentStep(0);
    setActiveTab('final-answer');

    try {
      const analysis = await analyzeGoal(usedGoal, selectedPages);
      const selectedPagesFromAI = analysis.pages || selectedPages;
      const orchestrationReasoning = analysis.reasoning || 'No reasoning provided.';
      
      setPlanSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: 'completed', details: 'Analysis complete.' } : s));
      setCurrentStep(1);
      setPlanSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'running', details: 'Processing selected pages...' } : s));

      const pageOutputs: Record<string, string> = {};

      const createConciseInstruction = (baseInstruction: string, type: 'code' | 'summary' | 'impact') => {
        const codeSuffix = " IMPORTANT: Your response must contain only the raw, complete code for the final result. Do not include any explanatory text, comments about the changes, analysis of the code, or markdown formatting like ```. Just the code.";
        const summarySuffix = " IMPORTANT: Provide a direct and concise summary. Do not include meta-analysis about the content's structure, introductions, or suggestions for other actions.";
        const impactSuffix = " IMPORTANT: Provide a direct and concise impact analysis. Do not ask for more information or explain what impact analysis is.";
        switch (type) {
          case 'code': return `${baseInstruction}.${codeSuffix}`;
          case 'summary': return `${baseInstruction}.${summarySuffix}`;
          case 'impact': return `${baseInstruction}.${impactSuffix}`;
          default: return baseInstruction;
        }
      };

      for (const page of selectedPagesFromAI) {
        const pageInstruction = usedGoal.toLowerCase();
        let pageOutputParts: string[] = [];
        let pageErrors: string[] = [];
        let actionTaken = false;

        const isCodeInstruction = pageInstruction.includes('code') || pageInstruction.includes('convert') || pageInstruction.includes('refactor') || pageInstruction.includes('dead code') || pageInstruction.includes('logging');
        const isVideoSummaryInstruction = pageInstruction.includes('summarize') && pageInstruction.includes('video');
        const isTextSummaryInstruction = pageInstruction.includes('summarize') && !pageInstruction.includes('video');
        const isGraphInstruction = pageInstruction.includes('create') && (pageInstruction.includes('graph') || pageInstruction.includes('chart'));
        const isImpactInstruction = pageInstruction.includes('impact');

        if (isVideoSummaryInstruction) {
          actionTaken = true;
          try {
            const videoResult = await apiService.videoSummarizer({ space_key: selectedSpace, page_title: page });
            if (videoResult?.summary) {
              let videoOutput = '### Video Summary\n';
              if (videoResult.quotes?.length > 0) videoOutput += '#### Key Quotes\n' + videoResult.quotes.map(q => `> ${q}`).join('\n\n');
              if (videoResult.timestamps?.length > 0) videoOutput += '\n\n#### Timestamps\n' + videoResult.timestamps.map(t => `- ${t}`).join('\n');
              pageOutputParts.push(videoOutput);
            }
          } catch (err: any) { /* Gracefully ignore */ }
        } else if (isCodeInstruction) {
          actionTaken = true;
          try {
            const conciseInstruction = createConciseInstruction(usedGoal, 'code');
            const codeResult = await apiService.codeAssistant({ space_key: selectedSpace, page_title: page, instruction: conciseInstruction });
            const codeContent = codeResult.response || codeResult.converted_code;
            if (codeContent) pageOutputParts.push(`### Code Result\n\`\`\`\n${codeContent}\n\`\`\``);
          } catch (err: any) { /* Gracefully ignore */ }
        } else if (isGraphInstruction) {
          actionTaken = true;
          try {
            const images = await apiService.getImages(selectedSpace, page);
            if (images?.images?.length > 0) {
              const chartResult = await apiService.createChart({ space_key: selectedSpace, page_title: page, image_url: images.images[0], chart_type: 'bar', filename: 'chart', format: 'png' });
              if (chartResult?.chart_data) pageOutputParts.push('### Generated Graph\nChart data generated successfully.');
            } else {
              pageOutputParts.push('### Generated Graph\nNo images found on the page to create a graph.');
            }
          } catch (err: any) { pageErrors.push(`Graph Creation Failed: ${err.message}`); }
        } else if (isImpactInstruction && selectedPagesFromAI.length >= 2) {
          actionTaken = true;
          try {
            const conciseQuestion = createConciseInstruction(usedGoal, 'impact');
            const impactResult = await apiService.impactAnalyzer({ space_key: selectedSpace, old_page_title: selectedPagesFromAI[0], new_page_title: selectedPagesFromAI[1], question: conciseQuestion });
            if (impactResult?.impact_analysis) pageOutputParts.push(`### Impact Analysis\n${impactResult.impact_analysis}`);
          } catch (err: any) { pageErrors.push(`Impact Analysis Failed: ${err.message}`); }
        } else if (isTextSummaryInstruction) {
          actionTaken = true;
          try {
            const conciseQuery = createConciseInstruction(usedGoal, 'summary');
            const res = await apiService.search({ space_key: selectedSpace, page_titles: [page], query: conciseQuery });
            if (res.response) pageOutputParts.push(`### Summary\n${res.response}`);
          } catch (err: any) { pageErrors.push(`Text Summary Failed: ${err.message}`); }
        }
        
        if (actionTaken) {
          if (pageOutputParts.length > 0) pageOutputs[page] = pageOutputParts.join('\n\n---\n\n');
          if (pageErrors.length > 0) pageOutputs[page] = (pageOutputs[page] || '') + '\n\n### Errors\n' + pageErrors.join('\n');
        } else {
          pageOutputs[page] = "No specific action was requested for this page.";
        }
      }
      
      setPlanSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'completed', details: 'Execution complete.' } : s));

      if (Object.keys(pageOutputs).length === 0) {
        pageOutputs['General Analysis'] = "No specific actions could be performed based on the instruction for the selected pages.";
      }

      setOutputTabs([
        { id: 'final-answer', label: 'Final Answer', icon: FileText, content: '', pageOutputs },
        { id: 'reasoning', label: 'Reasoning', icon: Brain, content: orchestrationReasoning },
      ]);
      setActiveTab('final-answer');
      setSelectedFinalPage(selectedPagesFromAI[0] || null);

    } catch (err: any) {
      setError(err.message || 'An error occurred during orchestration.');
      setPlanSteps([]);
    } finally {
      setIsPlanning(false);
    }
  };

  const progressPercent = isPlanning ? (currentStep / planSteps.length) * 100 + 10 : (planSteps[planSteps.length -1]?.status === 'completed' ? 100 : 0);

  const formatContent = (content: string) => {
    if (!content) return <p>No content available.</p>;
    if (content.includes('```')) {
      return (
        <div>
          {content.split('```').map((part, index) => {
            if (index % 2 === 0) return <div key={index} dangerouslySetInnerHTML={{ __html: part.replace(/\n/g, '<br/>') }} />;
            const code = part.split('\n').slice(1).join('\n');
            return (
              <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                <code>{code}</code>
              </pre>
            );
          })}
        </div>
      );
    }
    return <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />;
  };

  const renderInitialView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Select Space and Pages</h3>
        <div className="flex flex-col md:flex-row md:space-x-4 items-start justify-center">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <label className="block text-gray-700 mb-2 text-left">Space</label>
            <Select
              classNamePrefix="react-select"
              options={spaces.map(s => ({ value: s.key, label: s.name }))}
              onChange={opt => { setSelectedSpace(opt?.value || ''); setSelectedPages([]); }}
              placeholder="Select a space..."
              isClearable
            />
          </div>
          <div className="w-full md:w-1/2">
            <label className="block text-gray-700 mb-2 text-left">Pages</label>
            <Select
              classNamePrefix="react-select"
              isMulti isSearchable isDisabled={!selectedSpace}
              options={pages.map(p => ({ value: p, label: p }))}
              value={selectedPages.map(p => ({ value: p, label: p }))}
              onChange={opts => setSelectedPages(opts.map(o => o.value))}
              placeholder="Select pages..."
              closeMenuOnSelect={false}
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
            placeholder="e.g., 'Summarize the video on the 'Release Q3' page and convert the code on the 'Backend Logic' page to Python.'"
            className="w-full p-4 pr-16 border-2 border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none bg-white/70 backdrop-blur-sm text-lg"
            rows={4}
          />
          <button
            onClick={() => handleGoalSubmit()}
            disabled={!goal.trim() || !selectedSpace || !selectedPages.length}
            className="absolute bottom-4 right-4 bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );

  const renderResultsView = () => (
    <div className="w-full">
      <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="border-b border-white/20 bg-white/40 backdrop-blur-sm">
          <div className="flex overflow-x-auto">
            {outputTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {outputTabs.find(tab => tab.id === activeTab)?.id === 'final-answer' ? (
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
  
  const renderSidebar = () => (
    <div className="w-full max-w-xs bg-white/90 border-r border-white/20 flex flex-col p-4 space-y-6 relative h-full">
      <button onClick={() => setSidebarOpen(false)} title="Close sidebar" className="absolute top-4 right-4 text-gray-400 hover:text-orange-500">
        <PanelLeftClose className="w-6 h-6" />
      </button>
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Configuration</h3>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 text-left text-sm">Space</label>
          <Select
            classNamePrefix="react-select"
            options={spaces.map(s => ({ value: s.key, label: s.name }))}
            value={spaces.find(s => s.key === selectedSpace) ? { value: selectedSpace, label: spaces.find(s => s.key === selectedSpace)!.name } : null}
            onChange={opt => { setSelectedSpace(opt?.value || ''); setSelectedPages([]); }}
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-2 text-left text-sm">Pages</label>
          <Select
            classNamePrefix="react-select"
            isMulti isSearchable isDisabled={!selectedSpace}
            options={pages.map(p => ({ value: p, label: p }))}
            value={selectedPages.map(p => ({ value: p, label: p }))}
            onChange={opts => setSelectedPages(opts.map(o => o.value))}
          />
        </div>
      </div>
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-orange-500" /> Chat</h3>
        <div className="flex-1 overflow-y-auto mb-2">
          {/* A placeholder for future chat history */}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Refine results..."
            className="flex-1 p-2 border border-white/30 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
            onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
          />
          <button onClick={handleChatSubmit} disabled={!chatInput.trim()} className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-300">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500/90 to-orange-600/90 p-4 text-white border-b border-orange-300/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Agent Mode</h2>
                <p className="text-orange-100/90 text-sm">Goal-based AI assistance</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => onModeSelect('tool')} className="text-orange-100 hover:text-white px-3 py-1 text-sm rounded-xl">Tool Mode</button>
              <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-full"><X className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          {sidebarOpen && renderSidebar()}
          {!sidebarOpen && outputTabs.length > 0 && (
            <button onClick={() => setSidebarOpen(true)} title="Open sidebar" className="absolute left-0 top-1/2 -translate-y-1/2 bg-orange-500 text-white rounded-r-xl px-1 py-2 z-20 shadow-lg hover:bg-orange-600">
              <PanelLeftClose className="w-5 h-5" />
            </button>
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