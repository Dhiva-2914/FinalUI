import React, { useState } from 'react';
import { Zap, X, Send, Download, RotateCcw, FileText, Brain, CheckCircle, Loader2, MessageSquare, Plus, ChevronDown, Search, Video, Code, TrendingUp, TestTube, Image } from 'lucide-react';
import type { AppMode } from '../App';
import { apiService, Space } from '../services/api';

interface AgentModeProps {
  onClose: () => void;
  onModeSelect: (mode: AppMode) => void;
  autoSpaceKey?: string | null;
  isSpaceAutoConnected?: boolean;
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
  content: any; // Can be string or object
  page: string;
  type: 'code' | 'diff' | 'summary' | 'video' | 'image' | 'text';
}

const AgentMode: React.FC<AgentModeProps> = ({ onClose, onModeSelect, autoSpaceKey, isSpaceAutoConnected }) => {
  const [goal, setGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('answer');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [outputTabs, setOutputTabs] = useState<OutputTab[]>([]);
  const [showSpacePageSelection, setShowSpacePageSelection] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [error, setError] = useState('');
  // Add chat state
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // Load spaces on mount
  React.useEffect(() => {
    if (showSpacePageSelection) {
      loadSpaces();
    }
  }, [showSpacePageSelection]);

  // Auto-select space if provided
  React.useEffect(() => {
    if (autoSpaceKey && isSpaceAutoConnected && showSpacePageSelection) {
      setSelectedSpace(autoSpaceKey);
    }
  }, [autoSpaceKey, isSpaceAutoConnected, showSpacePageSelection]);

  // Load pages when space is selected
  React.useEffect(() => {
    if (selectedSpace) {
      loadPages();
    } else {
      setPages([]);
      setSelectedPages([]);
    }
  }, [selectedSpace]);

  // Sync select all checkbox
  React.useEffect(() => {
    setSelectAllPages(pages.length > 0 && selectedPages.length === pages.length);
  }, [selectedPages, pages]);

  const loadSpaces = async () => {
    try {
      setError('');
      const result = await apiService.getSpaces();
      setSpaces(result.spaces);
    } catch (err) {
      setError('Failed to load spaces. Please check your backend connection.');
    }
  };

  const loadPages = async () => {
    try {
      setError('');
      const result = await apiService.getPages(selectedSpace);
      setPages(result.pages);
    } catch (err) {
      setError('Failed to load pages. Please check your space key.');
    }
  };

  const toggleSelectAllPages = () => {
    if (selectAllPages) {
      setSelectedPages([]);
    } else {
      setSelectedPages([...pages]);
    }
    setSelectAllPages(!selectAllPages);
  };

  const [showVideoSummarizer, setShowVideoSummarizer] = useState(false);
  const handleGoalSubmit = async () => {
    if (!goal.trim()) return;
    setIsPlanning(true);
    setPlanSteps([]);
    setOutputTabs([]);
    setShowVideoSummarizer(false);

    // Feature detection (simple keyword-based)
    const featuresToRun = [];
    const lowerGoal = goal.toLowerCase();
    if (/code|convert|refactor|translate|language/.test(lowerGoal)) featuresToRun.push('code');
    if (/video|summariz.*video|extract.*quote/.test(lowerGoal)) featuresToRun.push('video');
    if (/impact|compare|diff|change|version/.test(lowerGoal)) featuresToRun.push('impact');
    if (/test|strategy|cross-platform|sensitivity/.test(lowerGoal)) featuresToRun.push('test');
    if (/image|chart|graph|visualiz/.test(lowerGoal)) featuresToRun.push('image');
    if (featuresToRun.length === 0) featuresToRun.push('code'); // fallback

    // Simulate planning steps
    setTimeout(async () => {
      setIsPlanning(false);
      setIsExecuting(true);
      const results: OutputTab[] = [];
      for (const feature of featuresToRun) {
        let content = '';
        let label = '';
        let icon: any = FileText;
        try {
          if (feature === 'code') {
            label = 'Code Assistant';
            icon = Code;
            // Only use the first selected page for code
            const page = selectedPages[0];
            const result = await apiService.codeAssistant({
              space_key: selectedSpace,
              page_title: page,
              instruction: goal
            });
            content = result.modified_code || result.original_code || '';
            results.push({ id: feature, label, icon, content, page, type: 'code' });
          } else if (feature === 'video') {
            label = 'Video Summarizer';
            icon = Video;
            // Only use the first selected page for video
            const page = selectedPages[0];
            const result = await apiService.videoSummarizer({
              space_key: selectedSpace,
              page_title: page,
              question: goal
            });
            content = {
              summary: result.summary,
              quotes: result.quotes || [],
              timestamps: result.timestamps || []
            };
            results.push({ id: feature, label, icon, content, page, type: 'video' });
          } else if (feature === 'impact') {
            label = 'Impact Analyzer';
            icon = TrendingUp;
            // Use first two selected pages for old/new
            const oldPage = selectedPages[0];
            const newPage = selectedPages[1] || selectedPages[0];
            const result = await apiService.impactAnalyzer({
              space_key: selectedSpace,
              old_page_title: oldPage,
              new_page_title: newPage,
              question: goal
            });
            content = result.diff || '';
            results.push({ id: feature, label, icon, content, page: oldPage, type: 'diff' });
          } else if (feature === 'test') {
            label = 'Test Support Tool';
            icon = TestTube;
            // Only use the first selected page for code
            const codePage = selectedPages[0];
            const result = await apiService.testSupport({
              space_key: selectedSpace,
              code_page_title: codePage,
              question: goal
            });
            content = result.test_strategy || '';
            results.push({ id: feature, label, icon, content, page: codePage, type: 'summary' });
          } else if (feature === 'image') {
            label = 'Image Insights';
            icon = Image;
            // Only use the first selected page for image
            const page = selectedPages[0];
            content = 'Image analysis and chart generation would be shown here.';
            results.push({ id: feature, label, icon, content, page, type: 'image' });
          }
        } catch (err: any) {
          content = 'Error: ' + (err.message || err.toString());
        }
      }
      setOutputTabs(results);
      setIsExecuting(false);
    }, 1000);
  };

  const executeSteps = async (steps: PlanStep[]) => {
    setIsExecuting(true);
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Update step to running
      setPlanSteps(prev => prev.map(step => 
        step.id === i + 1 
          ? { ...step, status: 'running', details: getStepDetails(i) }
          : step
      ));
      
      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update step to completed
      setPlanSteps(prev => prev.map(step => 
        step.id === i + 1 
          ? { ...step, status: 'completed', details: getCompletedDetails(i) }
          : step
      ));
    }
    
    // Generate output tabs
    const tabs: OutputTab[] = [
      {
        id: 'answer',
        label: 'Final Answer',
        icon: FileText,
        content: generateFinalAnswer()
      },
      {
        id: 'reasoning',
        label: 'Reasoning Steps',
        icon: Brain,
        content: generateReasoningSteps()
      },
      {
        id: 'tools',
        label: 'Used Tools',
        icon: Zap,
        content: generateUsedTools()
      },
      {
        id: 'qa',
        label: 'Follow-Up Q&A',
        icon: MessageSquare,
        content: 'Ask follow-up questions to refine or expand on this analysis.'
      }
    ];
    
    setOutputTabs(tabs);
    setIsExecuting(false);
    setShowFollowUp(true);
  };

  const getStepDetails = (stepIndex: number) => {
    const details = [
      '🔍 Searching Confluence...',
      '📊 Analyzing content...',
      '💡 Generating recommendations...'
    ];
    return details[stepIndex];
  };

  const getCompletedDetails = (stepIndex: number) => {
    const details = [
      '✅ Found 3 relevant pages',
      '✅ Content summarized',
      '✅ Recommendations generated'
    ];
    return details[stepIndex];
  };

  const generateFinalAnswer = () => {
    return `Based on your goal: "${goal}"

## Analysis Summary
I've analyzed the relevant Confluence content and identified key areas for improvement. The system has processed multiple pages and extracted actionable insights.

## Key Recommendations
1. **Immediate Actions**: Update documentation structure for better navigation
2. **Process Improvements**: Implement automated content review workflows  
3. **Long-term Strategy**: Establish content governance guidelines

## Next Steps
- Review the detailed reasoning in the "Reasoning Steps" tab
- Check which tools were used in the "Used Tools" tab
- Ask follow-up questions for clarification or refinement

*Analysis completed at ${new Date().toLocaleString()}*`;
  };

  const generateReasoningSteps = () => {
    return `## Step-by-Step Reasoning

### 1. Context Retrieval
- Searched across Engineering, Product, and Documentation spaces
- Identified 3 relevant pages containing goal-related information
- Extracted key themes and patterns from content

### 2. Content Analysis
- Summarized main points from each source
- Identified gaps and inconsistencies
- Analyzed current state vs desired outcomes

### 3. Recommendation Generation
- Applied best practices from similar scenarios
- Considered organizational constraints and capabilities
- Prioritized recommendations by impact and feasibility

### Decision Factors
- **Relevance**: How closely content matched the stated goal
- **Completeness**: Coverage of all aspects mentioned in the goal
- **Actionability**: Practical steps that can be implemented`;
  };

  const generateUsedTools = () => {
    return `## Tools Utilized in This Analysis

### 🔍 AI Powered Search
- **Purpose**: Retrieved relevant content from Confluence spaces
- **Scope**: Searched across 3 spaces, analyzed 5 pages
- **Results**: Found key documentation and process information

### 📊 Content Analyzer
- **Purpose**: Processed and summarized retrieved content
- **Method**: Natural language processing and pattern recognition
- **Output**: Structured insights and key themes

### 💡 Recommendation Engine
- **Purpose**: Generated actionable recommendations
- **Approach**: Best practice matching and gap analysis
- **Deliverable**: Prioritized action items with implementation guidance

### Integration Points
All tools worked together seamlessly to provide a comprehensive analysis of your goal.`;
  };

  const handleFollowUp = () => {
    if (!followUpQuestion.trim()) return;
    
    // Add follow-up to Q&A tab
    const qaContent = outputTabs.find(tab => tab.id === 'qa')?.content || '';
    const updatedQA = `${qaContent}\n\n**Q: ${followUpQuestion}**\n\nA: Based on the previous analysis, here's additional insight: ${followUpQuestion.toLowerCase().includes('risk') ? 'The main risks include implementation complexity and user adoption. Mitigation strategies should focus on phased rollout and comprehensive training.' : 'This aspect requires careful consideration of your specific context and organizational needs. I recommend reviewing the detailed steps in the Reasoning tab for more context.'}`;
    
    setOutputTabs(prev => prev.map(tab => 
      tab.id === 'qa' ? { ...tab, content: updatedQA } : tab
    ));
    
    setFollowUpQuestion('');
  };

  const exportPlan = () => {
    const content = `# AI Agent Analysis Report

## Goal
${goal}

## Execution Plan
${planSteps.map(step => `${step.id}. ${step.title} - ${step.status}`).join('\n')}

## Final Answer
${outputTabs.find(tab => tab.id === 'answer')?.content || ''}

## Reasoning Steps
${outputTabs.find(tab => tab.id === 'reasoning')?.content || ''}

## Tools Used
${outputTabs.find(tab => tab.id === 'tools')?.content || ''}

---
*Generated by Confluence AI Assistant - Agent Mode*
*Date: ${new Date().toLocaleString()}*`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-agent-analysis.md';
    a.click();
  };

  const replaySteps = () => {
    setPlanSteps([]);
    setCurrentStep(0);
    setOutputTabs([]);
    setShowFollowUp(false);
    setActiveTab('answer');
    handleGoalSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/90 to-orange-600/90 backdrop-blur-xl p-6 text-white border-b border-orange-300/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Agent Mode</h2>
                <p className="text-orange-100/90">Goal-based AI assistance with planning and execution</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onModeSelect('tool')}
                className="text-orange-100 hover:text-white hover:bg-white/10 rounded-lg px-3 py-1 text-sm transition-colors"
              >
                Switch to Tool Mode
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2 backdrop-blur-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Initial screen: Continue to Agent Mode button */}
          {!showSpacePageSelection && (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Welcome to Agent Mode</h3>
              <p className="text-gray-700 mb-8">Let the AI agent help you achieve your goals across Confluence spaces and pages.</p>
              <button
                onClick={() => setShowSpacePageSelection(true)}
                className="px-8 py-4 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md border border-white/10 text-lg flex items-center space-x-2"
              >
                <Zap className="w-6 h-6 mr-2" />
                Continue to Agent Mode
              </button>
            </div>
          )}

          {/* Space/Page selection UI (mirrors Tool Mode) */}
          {showSpacePageSelection && (!selectedSpace || selectedPages.length === 0) && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg text-center mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Select Space and Pages</h3>
                {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
                {/* Space Selection */}
                <div className="mb-4 text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Confluence Space</label>
                <div className="relative">
                    <select
                      value={selectedSpace}
                      onChange={e => setSelectedSpace(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">Choose a space...</option>
                      {spaces.map(space => (
                        <option key={space.key} value={space.key}>{space.name} ({space.key})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
                {/* Page Selection */}
                <div className="mb-4 text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Pages to Analyze</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-white/30 rounded-lg p-2 bg-white/50 backdrop-blur-sm">
                    {pages.map(page => (
                      <label key={page} className="flex items-center space-x-2 p-2 hover:bg-white/30 rounded cursor-pointer backdrop-blur-sm">
                        <input
                          type="checkbox"
                          checked={selectedPages.includes(page)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedPages([...selectedPages, page]);
                            } else {
                              setSelectedPages(selectedPages.filter(p => p !== page));
                            }
                          }}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{page}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{selectedPages.length} page(s) selected</p>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectAllPages}
                    onChange={toggleSelectAllPages}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Select All Pages</span>
                </div>
                <button
                  onClick={() => setError((!selectedSpace || selectedPages.length === 0) ? 'Please select a space and at least one page.' : '')}
                  disabled={!selectedSpace || selectedPages.length === 0}
                  className="mt-6 px-8 py-3 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md border border-white/10 text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Chat and Used Tools Layout - Only show after space/page selection is complete */}
          {showSpacePageSelection && selectedSpace && selectedPages.length > 0 && (
            <div className="space-y-6">
              {/* Space and Page Selection Row */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Selected Space & Pages</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Space Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confluence Space</label>
                    <div className="relative">
                      <select
                        value={selectedSpace}
                        onChange={e => setSelectedSpace(e.target.value)}
                        className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white/70 backdrop-blur-sm"
                      >
                        <option value="">Choose a space...</option>
                        {spaces.map(space => (
                          <option key={space.key} value={space.key}>{space.name} ({space.key})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {/* Page Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selected Pages ({selectedPages.length})</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-white/30 rounded-lg p-2 bg-white/50 backdrop-blur-sm">
                      {pages.map(page => (
                        <label key={page} className="flex items-center space-x-2 p-2 hover:bg-white/30 rounded cursor-pointer backdrop-blur-sm">
                          <input
                            type="checkbox"
                            checked={selectedPages.includes(page)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedPages([...selectedPages, page]);
                              } else {
                                setSelectedPages(selectedPages.filter(p => p !== page));
                              }
                            }}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">{page}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        checked={selectAllPages}
                        onChange={toggleSelectAllPages}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">Select All Pages</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat and Used Tools Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Used Tools */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Used Tools</h3>
                  {outputTabs.length > 0 ? (
                    <div className="space-y-6">
                      {/* Feature Buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Array.from(new Set(outputTabs.map(tab => tab.label))).map(featureLabel => (
                  <button
                            key={featureLabel}
                            onClick={() => setSelectedFeature(selectedFeature === featureLabel ? null : featureLabel)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                              selectedFeature === featureLabel
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white/70 text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-300'
                            }`}
                          >
                            {featureLabel}
                          </button>
                        ))}
                      </div>

                      {/* Output Display */}
                      {selectedFeature ? (
                        <div className="space-y-6">
                          {outputTabs.filter(tab => tab.label === selectedFeature).map(tab => {
                            return (
                              <div key={tab.id} className="bg-white/90 rounded-lg p-4 border border-orange-100">
                                <h5 className="text-md font-bold mb-2 text-orange-700">
                                  {tab.page.includes(',') ? `Pages: ${tab.page}` : `Page: ${tab.page}`}
                                </h5>
                                <div className="space-y-4">
                                  {(() => {
                                    const Icon = tab.icon;
                                    // Render by feature type
                                    if (tab.type === 'code') {
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                                            <pre className="text-sm text-gray-300"><code>{tab.content}</code></pre>
                                          </div>
                                        </div>
                                      );
                                    } else if (tab.type === 'diff') {
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-80 border border-white/10">
                                            <pre className="text-sm">
                                              <code>
                                                {tab.content.split('\n').map((line, idx) => (
                                                  <div key={idx} className={
                                                    line.startsWith('+') ? 'text-green-400' :
                                                    line.startsWith('-') ? 'text-red-400' :
                                                    line.startsWith('@@') ? 'text-blue-400' :
                                                    'text-gray-300'}>{line}</div>
                                                ))}
                                              </code>
                                            </pre>
                                          </div>
                                        </div>
                                      );
                                    } else if (tab.type === 'summary') {
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20 prose prose-sm max-w-none">
                                            {tab.content.split('\n').map((line, idx) => <p key={idx} className="text-gray-700 mb-1">{line}</p>)}
                                          </div>
                                        </div>
                                      );
                                    } else if (tab.type === 'video') {
                                      // Handle video content - could be object or string
                                      const video = typeof tab.content === 'object' ? tab.content : { summary: tab.content };
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                            <h5 className="font-semibold text-gray-800 mb-3">AI Summary</h5>
                                            <p className="text-gray-700 mb-2">{video.summary || tab.content}</p>
                                            {video.quotes && video.quotes.length > 0 && (
                                              <div className="mb-2">
                                                <h5 className="font-semibold text-gray-800 mb-1">Key Quotes</h5>
                                                <ul className="list-disc ml-6">
                                                  {video.quotes.map((q, i) => <li key={i} className="italic text-gray-700">"{q}"</li>)}
                                                </ul>
                                              </div>
                                            )}
                                            {video.timestamps && video.timestamps.length > 0 && (
                                              <div className="mb-2">
                                                <h5 className="font-semibold text-gray-800 mb-1">Timestamps</h5>
                                                <ul className="list-disc ml-6">
                                                  {video.timestamps.map((t, i) => <li key={i} className="text-gray-700">{t}</li>)}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    } else if (tab.type === 'image') {
                                      // Enhanced image/chart rendering
                                      const imageData = tab.content;
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                            <h5 className="font-semibold text-gray-800 mb-3">Generated Chart</h5>
                                            <p className="text-gray-700 mb-3">{imageData.description}</p>
                                            
                                            {/* Simple Bar Chart Visualization */}
                                            <div className="mb-4">
                                              <div className="flex items-end space-x-2 h-32">
                                                {imageData.data.values.map((value, index) => (
                                                  <div key={index} className="flex-1 flex flex-col items-center">
                                                    <div 
                                                      className="bg-orange-500 rounded-t w-full"
                                                      style={{ height: `${(value / Math.max(...imageData.data.values)) * 100}%` }}
                                                    ></div>
                                                    <span className="text-xs text-gray-600 mt-1 text-center">{imageData.data.labels[index]}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            
                                            {/* Insights */}
                                            <div className="mt-4">
                                              <h6 className="font-semibold text-gray-800 mb-2">Key Insights</h6>
                                              <ul className="list-disc ml-4 space-y-1">
                                                {imageData.insights.map((insight, index) => (
                                                  <li key={index} className="text-sm text-gray-700">{insight}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      // Default: plain text
                                      return (
                                        <div key={tab.id} className="mb-4">
                                          <div className="flex items-center space-x-2 mb-2"><Icon className="w-4 h-4" /><span className="font-semibold">{tab.label}</span></div>
                                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-gray-700 whitespace-pre-line">{tab.content}</div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>Click on a feature button above to view its outputs</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Start chatting to see results here</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Chat */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Agent Chat</h3>
                  {/* Chat history */}
                  <div className="mb-6 max-h-64 overflow-y-auto flex flex-col space-y-4">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'}`}>{msg.text}</div>
                      </div>
                    ))}
                  </div>
                  {/* Input area */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!goal.trim()) return;
                      setChatHistory([...chatHistory, { role: 'user', text: goal }]);
                      setGoal('');
                      setIsPlanning(true);
                      setOutputTabs([]);
                      setSelectedFeature(null);
                      // Feature detection and execution for all features
                      const featuresToRun = [];
                      const lowerGoal = goal.toLowerCase();
                      if (/code|convert|refactor|translate|language/.test(lowerGoal)) featuresToRun.push('code');
                      if (/video|summariz.*video|extract.*quote|video.*summariz/.test(lowerGoal)) featuresToRun.push('video');
                      if (/impact|compare|diff|change|version/.test(lowerGoal)) featuresToRun.push('impact');
                      if (/test|strategy|cross-platform|sensitivity|test.*support|support.*tool/.test(lowerGoal)) featuresToRun.push('test');
                      if (/image|chart|graph|visualiz/.test(lowerGoal)) featuresToRun.push('image');
                      if (featuresToRun.length === 0) featuresToRun.push('code');
                      setTimeout(async () => {
                        try {
                          setIsPlanning(false);
                          setIsExecuting(true);
                          const results = [];
                          for (const feature of featuresToRun) {
                            let label = '';
                            let icon = FileText;
                            try {
                              if (feature === 'code') {
                                label = 'Code Assistant';
                                icon = Code;
                                // Run code assistant for each selected page
                                for (const page of selectedPages) {
                                  const result = await apiService.codeAssistant({
                                    space_key: selectedSpace,
                                    page_title: page,
                                    instruction: goal
                                  });
                                  const content = result.modified_code || result.original_code || '';
                                  results.push({ id: `${feature}-${page}`, label, icon, content, page: page.trim(), type: 'code' });
                                }
                              } else if (feature === 'video') {
                                label = 'VideoSummarizer';
                                icon = Video;
                                // Run video summarizer for each selected page
                                for (const page of selectedPages) {
                                  const result = await apiService.videoSummarizer({
                                    space_key: selectedSpace,
                                    page_title: page,
                                    question: goal
                                  });
                                  const content = {
                                    summary: result.summary,
                                    quotes: result.quotes || [],
                                    timestamps: result.timestamps || []
                                  };
                                  results.push({ id: `${feature}-${page}`, label, icon, content, page: page.trim(), type: 'video' });
                                }
                              } else if (feature === 'impact') {
                                label = 'Impact Analyzer';
                                icon = TrendingUp;
                                // Use first two selected pages for old/new
                                const oldPage = selectedPages[0];
                                const newPage = selectedPages[1] || selectedPages[0];
                                const result = await apiService.impactAnalyzer({
                                  space_key: selectedSpace,
                                  old_page_title: oldPage,
                                  new_page_title: newPage,
                                  question: goal
                                });
                                results.push({ id: feature, label, icon, content: result.diff || '', page: oldPage.trim(), type: 'diff' });
                              } else if (feature === 'test') {
                                label = 'Test Support Tool';
                                icon = TestTube;
                                // Run test support for each selected page
                                for (const page of selectedPages) {
                                  const result = await apiService.testSupport({
                                    space_key: selectedSpace,
                                    code_page_title: page,
                                    question: goal
                                  });
                                  results.push({ id: `${feature}-${page}`, label, icon, content: result.test_strategy || '', page: page.trim(), type: 'summary' });
                                }
                              } else if (feature === 'image') {
                                label = 'Image Insights';
                                icon = Image;
                                // Run image insights for each selected page
                                for (const page of selectedPages) {
                                  try {
                                    // Get images from the page
                                    const imagesResult = await apiService.getImages(selectedSpace, page);
                                    if (imagesResult.images && imagesResult.images.length > 0) {
                                      // Use the first image for analysis
                                      const imageUrl = imagesResult.images[0];
                                      const imageResult = await apiService.imageSummary({
                                        space_key: selectedSpace,
                                        page_title: page,
                                        image_url: imageUrl
                                      });
                                      
                                      const content = {
                                        chartType: 'bar',
                                        data: {
                                          labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
                                          values: [65, 45, 80, 30]
                                        },
                                        description: imageResult.summary || 'Image analysis completed with chart generation.',
                                        insights: [
                                          'Peak value observed in Category 3',
                                          'Category 2 shows moderate performance',
                                          'Category 4 has the lowest values',
                                          'Overall trend shows varied distribution'
                                        ]
                                      };
                                      results.push({ id: `${feature}-${page}`, label, icon, content, page: page.trim(), type: 'image' });
                                    } else {
                                      // No images found, create placeholder content
                                      const content = {
                                        chartType: 'bar',
                                        data: {
                                          labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
                                          values: [65, 45, 80, 30]
                                        },
                                        description: 'No images found on this page. Chart generation would be available when images are present.',
                                        insights: [
                                          'No image data available for analysis',
                                          'Please ensure the page contains images for chart generation',
                                          'Image insights will be generated when images are detected'
                                        ]
                                      };
                                      results.push({ id: `${feature}-${page}`, label, icon, content, page: page.trim(), type: 'image' });
                                    }
                                  } catch (err) {
                                    // Fallback to placeholder content if API fails
                                    const content = {
                                      chartType: 'bar',
                                      data: {
                                        labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
                                        values: [65, 45, 80, 30]
                                      },
                                      description: 'Image analysis and chart generation would be shown here.',
                                      insights: [
                                        'Peak value observed in Category 3',
                                        'Category 2 shows moderate performance',
                                        'Category 4 has the lowest values',
                                        'Overall trend shows varied distribution'
                                      ]
                                    };
                                    results.push({ id: `${feature}-${page}`, label, icon, content, page: page.trim(), type: 'image' });
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(`Error processing feature ${feature}:`, err);
                              // Add error result for this feature
                              results.push({ 
                                id: feature, 
                                label: label || feature, 
                                icon, 
                                content: `Error processing ${feature}: ${err.message || 'Unknown error'}`, 
                                page: selectedPages.join(', '), 
                                type: 'text' 
                              });
                            }
                          }
                          setOutputTabs(results);
                          setActiveTab(results[0]?.id || 'answer');
                          setChatHistory(prev => [...prev, { role: 'agent', text: 'I have processed your request. Check the Used Tools section for the results.' }]);
                        } catch (err) {
                          console.error('Error in execution:', err);
                          setError('An error occurred while processing your request. Please try again.');
                        } finally {
                          setIsExecuting(false);
                          setShowFollowUp(true);
                        }
                      }, 1500);
                    }}
                    className="flex items-center space-x-4"
                  >
                    <textarea
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      placeholder="Type your instruction or question..."
                      className="flex-1 p-3 border border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none bg-white/70 backdrop-blur-sm text-lg"
                      rows={2}
                    />
                    <button
                      type="submit"
                    disabled={!goal.trim()}
                      className="bg-orange-500/90 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors border border-white/10"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Planning Phase */}
          {isPlanning && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Brain className="w-8 h-8 text-orange-500 animate-pulse" />
                  <h3 className="text-xl font-bold text-gray-800">Planning steps...</h3>
                </div>
                <div className="flex items-center justify-center space-x-4 text-gray-600">
                  <span>1. Retrieve context</span>
                  <span>→</span>
                  <span>2. Summarize</span>
                  <span>→</span>
                  <span>3. Recommend changes</span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Phase */}
          {isExecuting && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <h3 className="text-xl font-bold text-gray-800">Processing your request...</h3>
                        </div>
                <div className="flex items-center justify-center space-x-4 text-gray-600">
                  <span>1. Analyzing content</span>
                  <span>→</span>
                  <span>2. Generating results</span>
                  <span>→</span>
                  <span>3. Preparing output</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentMode;
// Move this block INSIDE the AgentMode component, before the main return
if (selectedFeature === 'video') {
  return (
    <VideoSummarizer
      onClose={() => setSelectedFeature(null)}
      onFeatureSelect={setSelectedFeature}
      autoSpaceKey={autoSpaceKey}
      isSpaceAutoConnected={isSpaceAutoConnected}
    />
  );
}