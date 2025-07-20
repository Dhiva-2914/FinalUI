import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Zap, X, Send, Download, RotateCcw, FileText, Brain, CheckCircle, Loader2, MessageSquare, Plus, PanelLeftClose } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('answer');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [outputTabs, setOutputTabs] = useState<OutputTab[]>([]);

  // Add new state for space/page selection and API results
  const [spaces, setSpaces] = useState<{ name: string; key: string }[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat input for instructions at any time
  const [chatInput, setChatInput] = useState('');

  // Add state for selected page in final answer
  const [selectedFinalPage, setSelectedFinalPage] = useState<string | null>(null);

  // Open sidebar when results are displayed
  useEffect(() => {
    if (planSteps.length > 0) setSidebarOpen(true);
  }, [planSteps.length]);

  // Load spaces on mount
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const result = await apiService.getSpaces();
        setSpaces(result.spaces);
      } catch (err: any) {
        setError('Failed to load spaces.');
      }
    };
    loadSpaces();
  }, []);

  // Load pages when space is selected
  useEffect(() => {
    if (selectedSpace) {
      const loadPages = async () => {
        try {
          const result = await apiService.getPages(selectedSpace);
          setPages(result.pages);
        } catch (err: any) {
          setError('Failed to load pages.');
        }
      };
      loadPages();
    }
  }, [selectedSpace]);

  // Unified handler for chat input (before and after results)
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !selectedSpace || !selectedPages.length) {
      setError('Please enter an instruction, select a space, and at least one page.');
      return;
    }
    setGoal(chatInput); // Set as goal for consistency
    setChatInput('');
    await handleGoalSubmit(chatInput); // Pass chatInput as goal
  };

  // Modified handleGoalSubmit to accept optional goal override
  const handleGoalSubmit = async (goalOverride?: string) => {
    const usedGoal = goalOverride !== undefined ? goalOverride : goal;
    if (!usedGoal.trim() || !selectedSpace || selectedPages.length === 0) {
      setError('Please enter a goal, select a space, and at least one page.');
      return;
    }
    setIsPlanning(true);
    setError('');
    setPlanSteps([
      { id: 1, title: 'Analyzing Goal', status: 'pending' },
      { id: 2, title: 'Executing', status: 'pending' },
    ]);
    setOutputTabs([]);
    setCurrentStep(0);
    setActiveTab('final-answer');
    let toolsToUse: string[] = [];
    let orchestrationReasoning = '';
    try {
      setPlanSteps((steps) => steps.map((s) => s.id === 1 ? { ...s, status: 'running' } : s));
      setCurrentStep(0);
      let analysis;
      try {
        analysis = await analyzeGoal(usedGoal, selectedPages);
      } catch (err: any) {
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
          setError('Could not connect to the backend service. Please check your network connection or try again later.');
        } else if (err.message && err.message.includes('Failed to analyze goal')) {
          setError('The backend could not process your goal. Please try rephrasing your request or try again later.');
        } else {
          setError(err.message || 'An unknown error occurred while analyzing the goal.');
        }
        setIsPlanning(false);
        return;
      }
      toolsToUse = analysis.tools || [];
      let selectedPagesFromAI = analysis.pages || [];
      selectedPagesFromAI = selectedPagesFromAI.filter((p: string) => selectedPages.includes(p));
      orchestrationReasoning = analysis.reasoning || '';
      setPlanSteps((steps) => steps.map((s) => s.id === 1 ? { ...s, status: 'completed' } : s));
      setCurrentStep(1);
      setPlanSteps((steps) => steps.map((s) => s.id === 2 ? { ...s, status: 'running' } : s));
      const toolResults: Record<string, any> = {};
      // Run each tool, but catch errors individually and add warnings instead of aborting the whole process
      if (toolsToUse.includes('ai_powered_search')) {
        try {
        const res = await apiService.search({
          space_key: selectedSpace,
          page_titles: selectedPagesFromAI,
            query: usedGoal,
        });
        toolResults['AI Powered Search'] = res;
        } catch (err: any) {
          toolResults['AI Powered Search'] = { summary: '⚠️ Failed to run AI Powered Search: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('impact_analyzer') && selectedPagesFromAI.length >= 2) {
        try {
        const res = await apiService.impactAnalyzer({
          space_key: selectedSpace,
          old_page_title: selectedPagesFromAI[0],
          new_page_title: selectedPagesFromAI[1],
            question: usedGoal,
        });
        toolResults['Impact Analyzer'] = res;
        } catch (err: any) {
          toolResults['Impact Analyzer'] = { summary: '⚠️ Failed to run Impact Analyzer: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('code_assistant') && selectedPagesFromAI.length > 0) {
        try {
        const res = await apiService.codeAssistant({
          space_key: selectedSpace,
          page_title: selectedPagesFromAI[0],
            instruction: usedGoal,
        });
        toolResults['Code Assistant'] = res;
        } catch (err: any) {
          toolResults['Code Assistant'] = { summary: '⚠️ Failed to run Code Assistant: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('video_summarizer') && selectedPagesFromAI.length > 0) {
        try {
          const res: any = await apiService.videoSummarizer({
          space_key: selectedSpace,
          page_title: selectedPagesFromAI[0],
        });
        toolResults['Video Summarizer'] = res;
        } catch (err: any) {
          toolResults['Video Summarizer'] = { summary: '⚠️ Failed to run Video Summarizer: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('test_support') && selectedPagesFromAI.length > 0) {
        try {
        const res = await apiService.testSupport({
          space_key: selectedSpace,
          code_page_title: selectedPagesFromAI[0],
        });
        toolResults['Test Support'] = res;
        } catch (err: any) {
          toolResults['Test Support'] = { summary: '⚠️ Failed to run Test Support: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('image_insights') && selectedPagesFromAI.length > 0) {
        try {
        const images = await apiService.getImages(selectedSpace, selectedPagesFromAI[0]);
        if (images && images.images && images.images.length > 0) {
          const summaries = await Promise.all(images.images.map((imgUrl: string) => apiService.imageSummary({
            space_key: selectedSpace,
            page_title: selectedPagesFromAI[0],
            image_url: imgUrl,
          })));
          toolResults['Image Insights'] = summaries;
        }
        } catch (err: any) {
          toolResults['Image Insights'] = { summary: '⚠️ Failed to run Image Insights: ' + (err.message || 'Unknown error') };
      }
      }
      if (toolsToUse.includes('chart_builder') && selectedPagesFromAI.length > 0) {
        try {
        const images = await apiService.getImages(selectedSpace, selectedPagesFromAI[0]);
        if (images && images.images && images.images.length > 0) {
          const charts = await Promise.all(images.images.map((imgUrl: string) => apiService.createChart({
            space_key: selectedSpace,
            page_title: selectedPagesFromAI[0],
            image_url: imgUrl,
            chart_type: 'bar',
            filename: 'chart',
            format: 'png',
          })));
          toolResults['Chart Builder'] = charts;
          }
        } catch (err: any) {
          toolResults['Chart Builder'] = { summary: '⚠️ Failed to run Chart Builder: ' + (err.message || 'Unknown error') };
        }
      }
      setPlanSteps((steps) => steps.map((s) => s.id === 2 ? { ...s, status: 'completed' } : s));
      setCurrentStep(planSteps.length - 1);
      const getRelevantOutput = (result: any) => {
        if (!result) return '';
        if (typeof result === 'string') return result;
        if (result.summary) return result.summary;
        if (result.impact_analysis) return result.impact_analysis;
        if (result.modified_code) return result.modified_code;
        if (result.converted_code) return result.converted_code;
        if (result.original_code) return result.original_code;
        if (result.response) return result.response;
        if (result.test_strategy) return result.test_strategy;
        if (result.chart_data) return '[Chart Image]';
        if (Array.isArray(result) && result.length > 0) return getRelevantOutput(result[0]);
        return '';
      };
      const usedToolsContent = Object.entries(toolResults).map(([tool, result]) => {
        const output = getRelevantOutput(result);
        return `## ${tool}\n${output}`;
      }).join('\n\n');
      const finalAnswer = Object.values(toolResults).map(getRelevantOutput).filter(Boolean).join('\n\n');
      // Prepare output tabs
      const pageOutputs: Record<string, string> = {};
      
      // Create individual outputs for each selected page
      for (const page of selectedPagesFromAI) {
        let pageOutput = '';
        let aiSearchOutput = '';
        let videoSummaryOutput = '';
        let graphOutput = '';
        let codeAssistantOutput = '';
        let imageInsightsOutput = '';
        let impactAnalyzerOutput = '';
        let testSupportOutput = '';
        let pageErrors: string[] = [];
        
        // Always try to get comprehensive analysis for each page regardless of instruction
        try {
          // 1. AI Search for general content analysis
          const pageSpecificResult = await apiService.search({
            space_key: selectedSpace,
            page_titles: [page],
            query: usedGoal,
          });
          if (pageSpecificResult && pageSpecificResult.response) {
            aiSearchOutput = `### AI Search Analysis\n${pageSpecificResult.response}`;
          }
        } catch (err: any) {
          pageErrors.push(`Search failed: ${err.message || 'Unknown error'}`);
          console.error(`Search failed for page ${page}:`, err);
        }
        
        // 2. Video Analysis - always try to process videos if available
        try {
          const videoResult = await apiService.videoSummarizer({
            space_key: selectedSpace,
            page_title: page,
          });
          if (videoResult && videoResult.summary) {
            videoSummaryOutput = `### Video Analysis\n${videoResult.summary}`;
          }
        } catch (err: any) {
          // Only log as error if it's not a "no video found" type error
          if (!err.message?.includes('no video') && !err.message?.includes('not found')) {
            pageErrors.push(`Video analysis failed: ${err.message || 'Unknown error'}`);
            console.error(`Video analysis failed for page ${page}:`, err);
          }
        }
        
        // 3. Image Analysis and Graph Creation - always try to process images
        try {
          const images = await apiService.getImages(selectedSpace, page);
          if (images && images.images && images.images.length > 0) {
            // Process each image for insights
            const imagePromises = images.images.map(async (imgUrl: string, index: number) => {
              try {
                // Get image insights
                const imageInsight = await apiService.imageSummary({
                  space_key: selectedSpace,
                  page_title: page,
                  image_url: imgUrl,
                });
                
                // Try to create charts for each image
                let chartResult = null;
                try {
                  chartResult = await apiService.createChart({
                    space_key: selectedSpace,
                    page_title: page,
                    image_url: imgUrl,
                    chart_type: 'bar', // Default chart type
                    filename: `chart_${page.replace(/\s+/g, '_')}_${index + 1}`,
                    format: 'png',
                  });
                } catch (chartErr) {
                  console.log(`Chart creation failed for image ${index + 1}:`, chartErr);
                }
                
                return {
                  insight: imageInsight,
                  chart: chartResult,
                  imageUrl: imgUrl,
                  index: index + 1
                };
              } catch (err: any) {
                console.error(`Failed to process image ${index + 1} for page ${page}:`, err);
                return null;
              }
            });
            
            const imageResults = await Promise.all(imagePromises);
            const successfulResults = imageResults.filter(result => result !== null);
            
            if (successfulResults.length > 0) {
              imageInsightsOutput = `### Image Analysis\n\n**Page:** ${page}\n**Images Found:** ${successfulResults.length}/${images.images.length}\n\n`;
              
              successfulResults.forEach((result) => {
                imageInsightsOutput += `#### Image ${result.index}\n`;
                imageInsightsOutput += `**Analysis:** ${result.insight?.summary || 'Analysis not available'}\n\n`;
                
                if (result.chart) {
                  imageInsightsOutput += `**Generated Chart:** Chart data available\n\n`;
                  if (result.chart.chart_data) {
                    imageInsightsOutput += `**Chart Data:**\n\`\`\`json\n${JSON.stringify(result.chart.chart_data, null, 2)}\n\`\`\`\n\n`;
                  }
                }
                imageInsightsOutput += `---\n\n`;
              });
            }
          }
        } catch (err: any) {
          pageErrors.push(`Image analysis failed: ${err.message || 'Unknown error'}`);
          console.error(`Failed to process images for page ${page}:`, err);
        }
        
        // 4. Code Analysis - always try to analyze code content
        try {
          const codeResult = await apiService.codeAssistant({
            space_key: selectedSpace,
            page_title: page,
            instruction: usedGoal,
          });
          if (codeResult && codeResult.summary) {
            codeAssistantOutput = `### Code Analysis\n${codeResult.summary}`;
          }
        } catch (err: any) {
          // Only log as error if it's not a "no code found" type error
          if (!err.message?.includes('no code') && !err.message?.includes('not found')) {
            pageErrors.push(`Code analysis failed: ${err.message || 'Unknown error'}`);
            console.error(`Code analysis failed for page ${page}:`, err);
          }
        }
        
        // 5. Impact Analysis - always try to analyze impact
        try {
          const impactResult = await apiService.impactAnalyzer({
            space_key: selectedSpace,
            old_page_title: page,
            new_page_title: page,
            question: usedGoal,
          });
          if (impactResult && impactResult.impact_analysis) {
            impactAnalyzerOutput = `### Impact Analysis\n${impactResult.impact_analysis}`;
          }
        } catch (err: any) {
          pageErrors.push(`Impact analysis failed: ${err.message || 'Unknown error'}`);
          console.error(`Impact analysis failed for page ${page}:`, err);
        }
        
        // 6. Test Support Analysis - always try to analyze test-related content
        try {
          const testResult = await apiService.testSupport({
            space_key: selectedSpace,
            code_page_title: page,
            question: usedGoal,
          });
          if (testResult && testResult.test_strategy) {
            testSupportOutput = `### Test Support Analysis\n${testResult.test_strategy}`;
          }
        } catch (err: any) {
          pageErrors.push(`Test support analysis failed: ${err.message || 'Unknown error'}`);
          console.error(`Test support analysis failed for page ${page}:`, err);
        }
        
        // Combine all outputs
        const outputs = [
          aiSearchOutput, 
          videoSummaryOutput, 
          imageInsightsOutput, 
          codeAssistantOutput, 
          impactAnalyzerOutput, 
          testSupportOutput
        ].filter(Boolean);
        
        if (outputs.length > 0) {
          pageOutput = outputs.join('\n\n');
        } else {
          pageOutput = `### Analysis for "${page}"\n\n**Status:** No content found or all analysis attempts failed.\n\n`;
        }
        
        // Add error summary if there were any errors
        if (pageErrors.length > 0) {
          pageOutput += `\n### Errors Encountered\n\n${pageErrors.map(error => `- ${error}`).join('\n')}\n\n`;
        }
        
        pageOutputs[page] = pageOutput;
      }
      // If no pages were processed, create a general output
      if (Object.keys(pageOutputs).length === 0) {
        pageOutputs['General Analysis'] = finalAnswer;
      }
      const tabs = [
        {
          id: 'final-answer',
          label: 'Final Answer',
          icon: FileText,
          content: '', // We'll render this in JSX below
          pageOutputs,
        },
        {
          id: 'reasoning',
          label: 'Reasoning',
          icon: Brain,
          content: orchestrationReasoning,
        },
        {
          id: 'selected-pages',
          label: 'Selected Pages',
          icon: FileText,
          content: selectedPagesFromAI.join(', '),
        },
        {
          id: 'used-tools',
          label: 'Used Tools',
          icon: Zap,
          content: usedToolsContent,
        },
      ];
      setOutputTabs(tabs);
      setActiveTab('final-answer');
      setSelectedFinalPage(selectedPagesFromAI[0] || null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during orchestration.');
    } finally {
      setIsPlanning(false);
    }
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

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || !selectedSpace || selectedPages.length === 0) return;
    try {
      const searchResult = await apiService.search({
        space_key: selectedSpace,
        page_titles: selectedPages,
        query: followUpQuestion,
      });
      const qaContent = outputTabs.find(tab => tab.id === 'qa')?.content || '';
      const updatedQA = `${qaContent}\n\n**Q: ${followUpQuestion}**\n\nA: ${searchResult.response}`;
      setOutputTabs(prev => prev.map(tab =>
        tab.id === 'qa' ? { ...tab, content: updatedQA } : tab
      ));
      setFollowUpQuestion('');
    } catch (err) {
      setError('Failed to get follow-up answer.');
    }
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
${outputTabs.find(tab => tab.id === 'used-tools')?.content || ''}

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

  // Calculate progress percentage based on current step
  const progressPercent = planSteps.length === 0 ? 0 :
    currentStep === 0 ? 0 :
    currentStep === 1 ? 50 : 100;

  // Function to format content based on type
  const formatContent = (content: string) => {
    if (!content) return <p>No content available.</p>;
    
    // Check for code blocks
    if (content.includes('```')) {
      const parts = content.split('```');
      return (
        <div>
          {parts.map((part, index) => {
            if (index % 2 === 0) {
              // Regular text
              return formatMarkdown(part);
            } else {
              // Code block
              const lines = part.split('\n');
              const language = lines[0].trim();
              const code = lines.slice(1).join('\n').trim();
              
              if (language === 'json') {
                try {
                  const parsed = JSON.parse(code);
                  return (
                    <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                      <code className="language-json">
                        {JSON.stringify(parsed, null, 2)}
                      </code>
                    </pre>
                  );
                } catch (e) {
                  return (
                    <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                      <code>{code}</code>
                    </pre>
                  );
                }
              } else {
                return (
                  <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                    <code className={`language-${language}`}>
                      {code}
                    </code>
                  </pre>
                );
              }
            }
          })}
        </div>
      );
    }
    
    // Check if content looks like JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
            <code className="language-json">
              {JSON.stringify(parsed, null, 2)}
            </code>
          </pre>
        );
      } catch (e) {
        // Not valid JSON, treat as regular content
      }
    }
    
    // Format as markdown
    return formatMarkdown(content);
  };
  
  // Function to format markdown content
  const formatMarkdown = (content: string) => {
    return content.split('\n').map((line, index) => {
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
        return <p key={index} className="mb-1 ml-4">• {line.substring(2)}</p>;
      } else if (line.startsWith('* ')) {
        return <p key={index} className="mb-1 ml-4">• {line.substring(2)}</p>;
      } else if (line.trim()) {
        return <p key={index} className="mb-2 text-gray-700">{line}</p>;
      }
      return <br key={index} />;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
                className="text-orange-100 hover:text-white hover:bg-white/10 rounded-xl px-3 py-1 text-sm transition-colors"
              >
                Switch to Tool Mode
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2 backdrop-blur-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-full max-w-xs bg-white/90 border-r border-white/20 flex flex-col p-4 space-y-6 relative z-10 h-full">
              <button
                className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-500 bg-white rounded-r-xl px-2 py-1 shadow-lg"
                onClick={() => setSidebarOpen(false)}
                title="Close sidebar"
                style={{ zIndex: 20 }}
              >
                <PanelLeftClose className="w-6 h-6" />
              </button>
              {/* Space and Page Selectors */}
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Select Space and Pages</h3>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2 text-left">Space</label>
                    <Select
                      classNamePrefix="react-select"
                      options={spaces.map(space => ({ value: space.key, label: `${space.name} (${space.key})` }))}
                      value={spaces.find(s => s.key === selectedSpace) ? { value: selectedSpace, label: `${spaces.find(s => s.key === selectedSpace)?.name} (${selectedSpace})` } : null}
                      onChange={option => {
                        setSelectedSpace(option ? option.value : '');
                        setSelectedPages([]);
                      }}
                      placeholder="Select a space..."
                      isClearable
                    />
                  </div>
                <div>
                    <label className="block text-gray-700 mb-2 text-left">Pages</label>
                    <Select
                      classNamePrefix="react-select"
                      isMulti
                      isSearchable
                      isDisabled={!selectedSpace}
                      options={pages.map(page => ({ value: page, label: page }))}
                      value={selectedPages.map(page => ({ value: page, label: page }))}
                      onChange={options => setSelectedPages(options ? options.map(opt => opt.value) : [])}
                      placeholder={selectedSpace ? "Type or select pages..." : "Select a space first"}
                      closeMenuOnSelect={false}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-left">Type to search and select multiple pages.</div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
              {/* Chat Section - always present */}
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-orange-500" /> Chat</h3>
                <div className="mb-2 flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your instruction..."
                    className="flex-1 p-2 border border-white/30 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/70 backdrop-blur-sm mb-0"
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || !selectedSpace || !selectedPages.length}
                    className="px-2 py-1 bg-orange-500/90 backdrop-blur-sm text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-300 transition-colors flex items-center justify-center border border-white/10 text-xs"
                    style={{ minWidth: 0 }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                  {outputTabs.find(tab => tab.id === 'qa')?.content || 'Ask a follow-up question to start the chat.'}
                </div>
              </div>
            </div>
          )}
          {/* Sidebar closed, show open button if results are present */}
          {!sidebarOpen && (
            <button
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-orange-500 text-white rounded-r-xl px-2 py-1 z-20 shadow-lg hover:bg-orange-600"
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] flex-1">
              {/* Before results: selectors and goal input as before */}
              {planSteps.length === 0 && !isPlanning && (
                <div className="max-w-4xl mx-auto mb-6 sticky top-0 z-30">
                  <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Select Space and Pages</h3>
                    <div className="flex flex-col md:flex-row md:space-x-4 items-center justify-center mb-4">
                      <div className="mb-4 md:mb-0 w-full md:w-1/2">
                    <label className="block text-gray-700 mb-2 text-left">Space</label>
                    <Select
                      classNamePrefix="react-select"
                      options={spaces.map(space => ({ value: space.key, label: `${space.name} (${space.key})` }))}
                      value={spaces.find(s => s.key === selectedSpace) ? { value: selectedSpace, label: `${spaces.find(s => s.key === selectedSpace)?.name} (${selectedSpace})` } : null}
                      onChange={option => {
                        setSelectedSpace(option ? option.value : '');
                        setSelectedPages([]);
                      }}
                      placeholder="Select a space..."
                      isClearable
                    />
                  </div>
                      <div className="w-full md:w-1/2">
                    <label className="block text-gray-700 mb-2 text-left">Pages</label>
                    <Select
                      classNamePrefix="react-select"
                      isMulti
                      isSearchable
                      isDisabled={!selectedSpace}
                      options={pages.map(page => ({ value: page, label: page }))}
                      value={selectedPages.map(page => ({ value: page, label: page }))}
                      onChange={options => setSelectedPages(options ? options.map(opt => opt.value) : [])}
                      placeholder={selectedSpace ? "Type or select pages..." : "Select a space first"}
                      closeMenuOnSelect={false}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-left">Type to search and select multiple pages.</div>
                      </div>
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                  </div>
              )}
              {/* Goal Input Section */}
              {!planSteps.length && !isPlanning && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white/60 backdrop-blur-xl rounded-xl p-8 border border-white/20 shadow-lg text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">What do you want the assistant to help you achieve?</h3>
                    <div className="relative">
                      <textarea
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="Describe your goal in detail... (e.g., 'Help me analyze our documentation structure and recommend improvements for better user experience')"
                        className="w-full p-4 border-2 border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none bg-white/70 backdrop-blur-sm text-lg"
                        rows={4}
                        />
                        <button
                        onClick={() => handleGoalSubmit()}
                        disabled={!goal.trim() || !selectedSpace || !selectedPages.length}
                        className="absolute bottom-4 right-4 bg-orange-500/90 backdrop-blur-sm text-white p-3 rounded-xl hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors border border-white/10"
                        >
                        <Send className="w-5 h-5" />
                        </button>
                      </div>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    </div>
                </div>
              )}
              {/* Planning Phase - removed planning box */}
              {isPlanning && null}
              {/* Live Progress Log - in place of final answer, disappears when output is shown */}
              {planSteps.length > 0 && outputTabs.length === 0 && (
                <div className="w-full">
                  <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
                    <div className="p-6">
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
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
                  </div>
                </div>
              )}
              {/* Results Area */}
              {planSteps.length > 0 && outputTabs.length > 0 && (
                <div className="w-full">
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
                          {/* Final Answer tab with per-page buttons */}
                          {activeTab === 'final-answer' && outputTabs.find(tab => tab.id === 'final-answer')?.pageOutputs ? (
                            <div>
                              <div className="mb-4 flex flex-wrap gap-2">
                                {Object.keys(outputTabs.find(tab => tab.id === 'final-answer')?.pageOutputs || {}).map(page => (
                                    <button
                                    key={page}
                                    className={`px-3 py-1 rounded-xl text-xs font-semibold border ${selectedFinalPage === page ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-100'} transition-colors`}
                                    onClick={() => setSelectedFinalPage(page)}
                                  >
                                    {page}
                                    </button>
                                ))}
                                  </div>
                              <div className="whitespace-pre-wrap text-gray-700">
                                {(() => {
                                  const pageOutputs = outputTabs.find(tab => tab.id === 'final-answer')?.pageOutputs || {};
                                  const content = pageOutputs[selectedFinalPage || Object.keys(pageOutputs)[0]] || 'No output for this page.';
                                  // Format content based on type
                                  return formatContent(content);
                                })()}
                                </div>
                            </div>
                          ) : (
                            // Other tabs or fallback
                            <div className="whitespace-pre-wrap text-gray-700">
                              {formatContent(outputTabs.find(tab => tab.id === activeTab)?.content || '')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
              </div>
            </div>
          )}
          {/* Actions */}
          {planSteps.length > 0 && !isPlanning && !isExecuting && (
            <div className="flex justify-end mt-8 space-x-4">
              <button
                onClick={exportPlan}
                    className="px-6 py-3 bg-orange-500/90 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold shadow-md border border-white/10"
              >
                <Download className="w-5 h-5 inline-block mr-2" />
                Export Plan
              </button>
              <button
                onClick={replaySteps}
                    className="px-6 py-3 bg-white/80 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors font-semibold shadow-md border border-orange-200/50"
              >
                <RotateCcw className="w-5 h-5 inline-block mr-2" />
                Replay Steps
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMode; 