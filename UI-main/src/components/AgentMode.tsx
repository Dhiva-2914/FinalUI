import React, { useState } from 'react';
import { Zap, X, Send, Download, RotateCcw, FileText, Brain, CheckCircle, Loader2, MessageSquare, Plus, ChevronDown, Search, Video, Code, TrendingUp, TestTube, Image } from 'lucide-react';
import type { AppMode } from '../App';
import { apiService, Space } from '../services/api';
import { useRef } from 'react';

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
  content: string;
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

  // State for chat
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'agent', text: string, tools?: OutputTab[]}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  React.useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const handleGoalSubmit = async () => {
    if (!goal.trim()) return;
    setIsPlanning(true);
    setPlanSteps([]);
    setOutputTabs([]);

    // Feature detection (simple keyword-based)
    const featuresToRun = [];
    const lowerGoal = goal.toLowerCase();
    if (/search|analyz|summariz|find|explor|context/.test(lowerGoal)) featuresToRun.push('search');
    if (/code|convert|refactor|translate|language/.test(lowerGoal)) featuresToRun.push('code');
    if (/video|summariz.*video|extract.*quote/.test(lowerGoal)) featuresToRun.push('video');
    if (/impact|compare|diff|change|version/.test(lowerGoal)) featuresToRun.push('impact');
    if (/test|strategy|cross-platform|sensitivity/.test(lowerGoal)) featuresToRun.push('test');
    if (/image|chart|graph|visualiz/.test(lowerGoal)) featuresToRun.push('image');
    if (featuresToRun.length === 0) featuresToRun.push('search'); // fallback

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
          if (feature === 'search') {
            label = 'AI Powered Search';
            icon = Search;
            const result = await apiService.search({
              space_key: selectedSpace,
              page_titles: selectedPages,
              query: goal
            });
            content = result.response || 'No response.';
          } else if (feature === 'code') {
            label = 'Code Assistant';
            icon = Code;
            // Only use the first selected page for code
            const page = selectedPages[0];
            const result = await apiService.codeAssistant({
              space_key: selectedSpace,
              page_title: page,
              instruction: goal
            });
            content = result.summary + '\n\n' + (result.modified_code || result.original_code || '');
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
            content = result.summary + '\n\n' + (result.quotes ? result.quotes.map(q => `- ${q}`).join('\n') : '');
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
            content = (result.impact_analysis || '') + '\n\n' + (result.diff || '');
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
            content = (result.test_strategy || '') + '\n\n' + (result.cross_platform_testing || '') + '\n\n' + (result.sensitivity_analysis || '');
          } else if (feature === 'image') {
            label = 'Image Insights';
            icon = Image;
            // Only use the first selected page for image
            const page = selectedPages[0];
            // For demo, just show a placeholder (real implementation would need image URL)
            content = 'Image analysis and chart generation would be shown here.';
          }
        } catch (err: any) {
          content = 'Error: ' + (err.message || err.toString());
        }
        results.push({ id: feature, label, icon, content });
      }
      setOutputTabs(results);
      setActiveTab(results[0]?.id || 'answer');
      setIsExecuting(false);
      setShowFollowUp(true);
    }, 1500);
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

  // Chat submit handler
  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = chatInput.trim();
    if (!input) return;
    setChatMessages(msgs => [...msgs, { role: 'user', text: input }]);
    setChatInput('');

    // Feature detection (same as before)
    const featuresToRun = [];
    const lowerGoal = input.toLowerCase();
    if (/search|analyz|summariz|find|explor|context/.test(lowerGoal)) featuresToRun.push('search');
    if (/code|convert|refactor|translate|language/.test(lowerGoal)) featuresToRun.push('code');
    if (/video|summariz.*video|extract.*quote/.test(lowerGoal)) featuresToRun.push('video');
    if (/impact|compare|diff|change|version/.test(lowerGoal)) featuresToRun.push('impact');
    if (/test|strategy|cross-platform|sensitivity/.test(lowerGoal)) featuresToRun.push('test');
    if (/image|chart|graph|visualiz/.test(lowerGoal)) featuresToRun.push('image');
    if (featuresToRun.length === 0) featuresToRun.push('search');

    // Run features and collect outputs
    const results: OutputTab[] = [];
    for (const feature of featuresToRun) {
      let content = '';
      let label = '';
      let icon: any = FileText;
      try {
        if (feature === 'search') {
          label = 'AI Powered Search';
          icon = Search;
          const result = await apiService.search({
            space_key: selectedSpace,
            page_titles: selectedPages,
            query: input
          });
          content = result.response || 'No response.';
        } else if (feature === 'code') {
          label = 'Code Assistant';
          icon = Code;
          const page = selectedPages[0];
          const result = await apiService.codeAssistant({
            space_key: selectedSpace,
            page_title: page,
            instruction: input
          });
          content = result.summary + '\n\n' + (result.modified_code || result.original_code || '');
        } else if (feature === 'video') {
          label = 'Video Summarizer';
          icon = Video;
          const page = selectedPages[0];
          const result = await apiService.videoSummarizer({
            space_key: selectedSpace,
            page_title: page,
            question: input
          });
          content = result.summary + '\n\n' + (result.quotes ? result.quotes.map(q => `- ${q}`).join('\n') : '');
        } else if (feature === 'impact') {
          label = 'Impact Analyzer';
          icon = TrendingUp;
          const oldPage = selectedPages[0];
          const newPage = selectedPages[1] || selectedPages[0];
          const result = await apiService.impactAnalyzer({
            space_key: selectedSpace,
            old_page_title: oldPage,
            new_page_title: newPage,
            question: input
          });
          content = (result.impact_analysis || '') + '\n\n' + (result.diff || '');
        } else if (feature === 'test') {
          label = 'Test Support Tool';
          icon = TestTube;
          const codePage = selectedPages[0];
          const result = await apiService.testSupport({
            space_key: selectedSpace,
            code_page_title: codePage,
            question: input
          });
          content = (result.test_strategy || '') + '\n\n' + (result.cross_platform_testing || '') + '\n\n' + (result.sensitivity_analysis || '');
        } else if (feature === 'image') {
          label = 'Image Insights';
          icon = Image;
          const page = selectedPages[0];
          content = 'Image analysis and chart generation would be shown here.';
        }
      } catch (err: any) {
        content = 'Error: ' + (err.message || err.toString());
      }
      results.push({ id: feature, label, icon, content });
    }
    setChatMessages(msgs => [...msgs, { role: 'agent', text: '', tools: results }]);
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

          {/* The rest of Agent Mode UI (goal input, planning, execution, etc.) should only show after space/page selection is complete */}
          {showSpacePageSelection && selectedSpace && selectedPages.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Agent Chat</h3>
                  <p className="text-gray-700 mb-4">Ask anything about the selected pages. The agent will use the right tools automatically.</p>
                  <div className="h-96 overflow-y-auto bg-white/80 rounded-lg border border-white/10 p-4 mb-4" style={{ minHeight: 300 }}>
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}> 
                        {msg.role === 'user' ? (
                          <div className="inline-block bg-orange-100 text-orange-900 px-4 py-2 rounded-lg max-w-xl">{msg.text}</div>
                        ) : (
                          <div>
                            {msg.tools && (
                              <div className="mb-2">
                                <div className="font-semibold text-gray-700 mb-1">Used Tools:</div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.tools.map(tool => (
                                    <button
                                      key={tool.id}
                                      onClick={() => setActiveTab(tool.id)}
                                      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border text-sm font-medium ${activeTab === tool.id ? 'bg-orange-500 text-white' : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                                    >
                                      <tool.icon className="w-4 h-4" />
                                      <span>{tool.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {msg.tools && msg.tools.length > 0 && (
                              <div className="mt-2 bg-white/90 border border-orange-100 rounded-lg p-4">
                                {msg.tools.find(t => t.id === activeTab)?.content.split('\n').map((line, i) => (
                                  <div key={i} className="text-gray-800 mb-1 whitespace-pre-line">{line}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Type your instruction..."
                      className="flex-1 p-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/70 backdrop-blur-sm"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold border border-white/10"
                      disabled={!chatInput.trim()}
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
          {planSteps.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Progress Timeline */}
              <div className="lg:col-span-1">
                <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                  <h3 className="font-semibold text-gray-800 mb-4">Live Progress Log</h3>
                  <div className="space-y-4">
                    {planSteps.map((step, index) => (
                      <div key={step.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : step.status === 'running' ? (
                            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{step.title}</div>
                          {step.details && (
                            <div className="text-sm text-gray-600 mt-1">{step.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(((currentStep + 1) / planSteps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${((currentStep + 1) / planSteps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Columns - Output Tabs */}
              <div className="lg:col-span-2">
                {outputTabs.length > 0 && (
                  <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
                    {/* Tab Headers */}
                    <div className="border-b border-white/20 bg-white/40 backdrop-blur-sm">
                      <div className="flex overflow-x-auto">
                        {outputTabs.map(tab => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                  ? 'border-orange-500 text-orange-600 bg-white/50'
                                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-white/30'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      {outputTabs.find(tab => tab.id === activeTab) && (
                        <div className="prose prose-sm max-w-none">
                          {activeTab === 'qa' ? (
                            <div>
                              <div className="whitespace-pre-wrap text-gray-700 mb-4">
                                {outputTabs.find(tab => tab.id === activeTab)?.content}
                              </div>
                              {showFollowUp && (
                                <div className="border-t border-white/20 pt-4">
                                  <div className="flex space-x-2">
                                    <input
                                      type="text"
                                      value={followUpQuestion}
                                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                                      placeholder="Ask a follow-up question..."
                                      className="flex-1 p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/70 backdrop-blur-sm"
                                      onKeyPress={(e) => e.key === 'Enter' && handleFollowUp()}
                                    />
                                    <button
                                      onClick={handleFollowUp}
                                      disabled={!followUpQuestion.trim()}
                                      className="px-4 py-3 bg-orange-500/90 backdrop-blur-sm text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 transition-colors flex items-center border border-white/10"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap text-gray-700">
                              {outputTabs.find(tab => tab.id === activeTab)?.content.split('\n').map((line, index) => {
                                if (line.startsWith('### ')) {
                                  return <h3 key={index} className="text-lg font-bold text-gray-800 mt-4 mb-2">{line.substring(4)}</h3>;
                                } else if (line.startsWith('## ')) {
                                  return <h2 key={index} className="text-xl font-bold text-gray-800 mt-6 mb-3">{line.substring(3)}</h2>;
                                } else if (line.startsWith('# ')) {
                                  return <h1 key={index} className="text-2xl font-bold text-gray-800 mt-8 mb-4">{line.substring(2)}</h1>;
                                } else if (line.startsWith('- **')) {
                                  const match = line.match(/- \*\*(.*?)\*\*: (.*)/);
                                  if (match) {
                                    return <p key={index} className="mb-2"><strong>{match[1]}:</strong> {match[2]}</p>;
                                  }
                                } else if (line.startsWith('- ')) {
                                  return <p key={index} className="mb-1 ml-4"> 2 {line.substring(2)}</p>;
                                } else if (line.trim()) {
                                  return <p key={index} className="mb-2 text-gray-700">{line}</p>;
                                }
                                return <br key={index} />;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {planSteps.length > 0 && !isPlanning && !isExecuting && (
            <div className="flex justify-end mt-8 space-x-4">
              <button
                onClick={exportPlan}
                className="px-6 py-3 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md border border-white/10"
              >
                <Download className="w-5 h-5 inline-block mr-2" />
                Export Plan
              </button>
              <button
                onClick={replaySteps}
                className="px-6 py-3 bg-white/80 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors font-semibold shadow-md border border-orange-200/50"
              >
                <RotateCcw className="w-5 h-5 inline-block mr-2" />
                Replay Steps
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentMode; 