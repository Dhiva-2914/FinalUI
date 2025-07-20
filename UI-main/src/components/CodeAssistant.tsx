import React, { useState, useEffect } from 'react';
import { Code, FileText, Download, Save, X, ChevronDown, Loader2, Zap, Search, Video, TrendingUp, TestTube, Image, Send } from 'lucide-react';
import { FeatureType } from '../App';
import { apiService, Space } from '../services/api';
import { getConfluenceSpaceAndPageFromUrl } from '../utils/urlUtils';

interface CodeAssistantProps {
  onClose: () => void;
  onFeatureSelect: (feature: FeatureType) => void;
  autoSpaceKey?: string | null;
  isSpaceAutoConnected?: boolean;
}

const CodeAssistant: React.FC<CodeAssistantProps> = ({ onClose, onFeatureSelect, autoSpaceKey, isSpaceAutoConnected }) => {
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [detectedCode, setDetectedCode] = useState('');
  const [instruction, setInstruction] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [aiAction, setAiAction] = useState('Select action...');
  const [aiActionOutput, setAiActionOutput] = useState('');
  const [isProcessingAiAction, setIsProcessingAiAction] = useState(false);
  const [fileName, setFileName] = useState('');
  const [processedCode, setProcessedCode] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const features = [
    { id: 'search' as const, label: 'AI Powered Search', icon: Search },
    { id: 'video' as const, label: 'Video Summarizer', icon: Video },
    { id: 'code' as const, label: 'Code Assistant', icon: Code },
    { id: 'impact' as const, label: 'Impact Analyzer', icon: TrendingUp },
    { id: 'test' as const, label: 'Test Support Tool', icon: TestTube },
    { id: 'image' as const, label: 'Image Insights & Chart Builder', icon: Image },
  ];

  const outputFormats = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php'
  ];

  // Enhanced target language options
  const targetLanguageOptions = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'scala', label: 'Scala' },
    { value: 'dart', label: 'Dart' },
    { value: 'r', label: 'R' },
    { value: 'matlab', label: 'MATLAB' },
    { value: 'perl', label: 'Perl' },
    { value: 'bash', label: 'Bash' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'xml', label: 'XML' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'yang', label: 'YANG' },
    { value: 'assembly', label: 'Assembly' },
    { value: 'fortran', label: 'Fortran' },
    { value: 'cobol', label: 'COBOL' },
    { value: 'pascal', label: 'Pascal' },
    { value: 'lisp', label: 'Lisp' },
    { value: 'prolog', label: 'Prolog' },
    { value: 'haskell', label: 'Haskell' },
    { value: 'erlang', label: 'Erlang' },
    { value: 'elixir', label: 'Elixir' },
    { value: 'clojure', label: 'Clojure' },
    { value: 'fsharp', label: 'F#' },
    { value: 'ocaml', label: 'OCaml' },
    { value: 'nim', label: 'Nim' },
    { value: 'crystal', label: 'Crystal' },
    { value: 'zig', label: 'Zig' },
    { value: 'v', label: 'V' },
    { value: 'julia', label: 'Julia' },
    { value: 'nim', label: 'Nim' },
    { value: 'odin', label: 'Odin' },
    { value: 'carbon', label: 'Carbon' },
    { value: 'mojo', label: 'Mojo' },
  ];

  // AI Actions options
  const aiActionOptions = [
    { value: 'Select action...', label: 'Select action...' },
    { value: 'Summarize Code', label: 'Summarize Code' },
    { value: 'Optimize Performance', label: 'Optimize Performance' },
    { value: 'Convert Language', label: 'Convert Language' },
    { value: 'Generate Documentation', label: 'Generate Documentation' },
    { value: 'Refactor Structure', label: 'Refactor Structure' },
    { value: 'Security Analysis', label: 'Security Analysis' },
    { value: 'Code Review', label: 'Code Review' },
    { value: 'Debug Assistance', label: 'Debug Assistance' },
    { value: 'Test Generation', label: 'Test Generation' },
    { value: 'Complexity Analysis', label: 'Complexity Analysis' },
    { value: 'Best Practices Check', label: 'Best Practices Check' },
  ];

  // Check if Process Code button should be shown
  const shouldShowProcessButton = () => {
    return (
      (aiAction && aiAction !== 'Select action...') ||
      (targetLanguage && targetLanguage !== '') ||
      (instruction && instruction.trim() !== '')
    );
  };

  // Handle AI Action execution
  const handleAiAction = async () => {
    if (!aiAction || aiAction === 'Select action...' || !detectedCode.trim()) {
      setError('Please select an AI action and provide code.');
      return;
    }

    setIsProcessingAiAction(true);
    setError('');

    try {
      const actionPromptMap: Record<string, string> = {
        "Summarize Code": `Summarize the following code in clear and concise language:\n\n${detectedCode}`,
        "Optimize Performance": `Optimize the following code for performance without changing its functionality:\n\n${detectedCode}`,
        "Convert Language": `Convert the following code to another programming language. Suggest a language too:\n\n${detectedCode}`,
        "Generate Documentation": `Generate inline documentation and function-level comments for the following code:\n\n${detectedCode}`,
        "Refactor Structure": `Refactor the following code to improve structure, readability, and modularity:\n\n${detectedCode}`,
        "Security Analysis": `Analyze the following code for security vulnerabilities and suggest improvements:\n\n${detectedCode}`,
        "Code Review": `Perform a comprehensive code review of the following code:\n\n${detectedCode}`,
        "Debug Assistance": `Analyze the following code for potential bugs and debugging issues:\n\n${detectedCode}`,
        "Test Generation": `Generate unit tests for the following code:\n\n${detectedCode}`,
        "Complexity Analysis": `Analyze the time and space complexity of the following code:\n\n${detectedCode}`,
        "Best Practices Check": `Check the following code against best practices and suggest improvements:\n\n${detectedCode}`,
      };

      const prompt = actionPromptMap[aiAction];
      if (!prompt) {
        setError('Invalid AI action selected.');
        return;
      }

      // Use the existing API service to process the AI action
      const result = await apiService.codeAssistant({
        space_key: selectedSpace,
        page_title: 'AI Action Processing',
        instruction: prompt,
        target_language: targetLanguage || undefined,
      });

      setAiActionOutput(result.summary || result.original_code || 'No output generated.');
    } catch (err: any) {
      setError(`Failed to run AI action: ${err.message || 'Unknown error'}`);
      console.error('AI Action error:', err);
    } finally {
      setIsProcessingAiAction(false);
    }
  };

  // Load spaces on component mount
  useEffect(() => {
    loadSpaces();
  }, []);

  // Auto-select space if provided via URL
  useEffect(() => {
    if (autoSpaceKey && isSpaceAutoConnected) {
      setSelectedSpace(autoSpaceKey);
    }
  }, [autoSpaceKey, isSpaceAutoConnected]);

  // Load pages when space is selected
  useEffect(() => {
    if (selectedSpace) {
      loadPages();
    }
  }, [selectedSpace]);

  const loadSpaces = async () => {
    try {
      setError('');
      const result = await apiService.getSpaces();
      setSpaces(result.spaces);
    } catch (err) {
      setError('Failed to load spaces. Please check your backend connection.');
      console.error('Error loading spaces:', err);
    }
  };

  const loadPages = async () => {
    try {
      setError('');
      const result = await apiService.getPages(selectedSpace);
      setPages(result.pages);
    } catch (err) {
      setError('Failed to load pages. Please check your space key.');
      console.error('Error loading pages:', err);
    }
  };

  const handlePageSelect = async (pageTitle: string) => {
    setSelectedPage(pageTitle);
    setIsProcessing(true);
    setError('');

    try {
      const result = await apiService.codeAssistant({
        space_key: selectedSpace,
        page_title: pageTitle,
        instruction: ''
      });

      setDetectedCode(result.original_code);
      setSummary(result.summary);
      setProcessedCode('');
    } catch (err) {
      setError('Failed to load page content. Please try again.');
      console.error('Error loading page:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processCode = async () => {
    if (!selectedSpace || !selectedPage || !instruction.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await apiService.codeAssistant({
        space_key: selectedSpace,
        page_title: selectedPage,
        instruction: instruction,
        target_language: targetLanguage || undefined
      });

      // Prioritize converted code if target language is selected, otherwise use modified code
      if (targetLanguage && result.converted_code) {
        setProcessedCode(result.converted_code);
      } else if (result.modified_code) {
        setProcessedCode(result.modified_code);
      } else {
        setProcessedCode(result.original_code || '');
      }
    } catch (err) {
      setError('Failed to process code. Please try again.');
      console.error('Error processing code:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCode = async (format: string) => {
    const content = processedCode || detectedCode;
    if (!content) return;

    try {
      const blob = await apiService.exportContent({
        content: content,
        format: format,
        filename: fileName || 'code'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'code'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export file. Please try again.');
      console.error('Error exporting:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-confluence-blue/90 to-confluence-light-blue/90 backdrop-blur-xl p-6 text-white border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Code className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Confluence AI Assistant</h2>
                <p className="text-blue-100/90">AI-powered tools for your Confluence workspace</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2 backdrop-blur-sm">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Feature Navigation */}
          <div className="mt-6 flex gap-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === 'code';
              
              return (
                <button
                  key={feature.id}
                  onClick={() => onFeatureSelect(feature.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm border transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-white/90 text-confluence-blue shadow-lg border-white/30'
                      : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{feature.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Configuration
                </h3>
                
                {/* Space Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Confluence Space
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSpace}
                      onChange={(e) => setSelectedSpace(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">Choose a space...</option>
                      {spaces.map(space => (
                        <option key={space.key} value={space.key}>{space.name} ({space.key})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Code Page
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPage}
                      onChange={(e) => handlePageSelect(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                      disabled={!selectedSpace}
                    >
                      <option value="">Choose a page...</option>
                      {pages.map(page => (
                        <option key={page} value={page}>{page}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Instruction Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modification Instruction
                  </label>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Describe the changes you want to make to the code..."
                    className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue resize-none bg-white/70 backdrop-blur-sm"
                    rows={3}
                  />
                </div>

                {/* Target Language */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Language (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">Keep original language</option>
                      {targetLanguageOptions.map(lang => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* AI Action Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Action
                  </label>
                  <div className="relative">
                    <select
                      value={aiAction}
                      onChange={(e) => setAiAction(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      {aiActionOptions.map(action => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* File Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="my-component"
                    className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue bg-white/70 backdrop-blur-sm"
                  />
                </div>

                {/* Process Button */}
                <button
                  onClick={aiAction !== 'Select action...' ? handleAiAction : processCode}
                  disabled={!selectedSpace || !selectedPage || (!instruction.trim() && aiAction === 'Select action...') || isProcessing || isProcessingAiAction}
                  className="w-full bg-confluence-blue/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-confluence-blue disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors border border-white/10"
                >
                  {isProcessingAiAction ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing AI Action...</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : aiAction !== 'Select action...' ? (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Run AI Action</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Process Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Action Output */}
            {aiActionOutput && (
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-confluence-blue" />
                  AI Action Output: {aiAction}
                </h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    <code>{aiActionOutput}</code>
                  </pre>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => {
                      setInstruction(aiActionOutput);
                      setAiActionOutput('');
                    }}
                    className="px-4 py-2 bg-confluence-blue/90 text-white rounded-lg hover:bg-confluence-blue transition-colors text-sm"
                  >
                    Use as Instruction
                  </button>
                  <button
                    onClick={() => setAiActionOutput('')}
                    className="px-4 py-2 bg-gray-500/90 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Clear Output
                  </button>
                </div>
              </div>
            )}

            {/* Middle Column - Original Code */}
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Original Code</h3>
                {detectedCode ? (
                  <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                    <pre className="text-sm text-gray-300">
                      <code>{detectedCode}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Code className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Select a code page to view content</p>
                  </div>
                )}
              </div>

              {summary && (
                <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                  <h3 className="font-semibold text-gray-800 mb-4">Page Summary</h3>
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="text-sm text-gray-700">{summary}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Processed Code */}
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">AI Result</h3>
                  {processedCode && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => exportCode('js')}
                        className="px-3 py-1 bg-confluence-blue/90 backdrop-blur-sm text-white rounded text-sm hover:bg-confluence-blue transition-colors border border-white/10"
                      >
                        Export
                      </button>
                      <button
                        onClick={async () => {
                          const { space, page } = getConfluenceSpaceAndPageFromUrl();
                          if (!space || !page) {
                            alert('Confluence space or page not specified in macro src URL.');
                            return;
                          }
                          try {
                            await apiService.saveToConfluence({
                              space_key: space,
                              page_title: page,
                              content: processedCode || '',
                            });
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          } catch (err: any) {
                            alert('Failed to save to Confluence: ' + (err.message || err));
                          }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded-lg hover:bg-confluence-blue transition-colors border border-white/10"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save to Confluence</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {processedCode ? (
                  <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                    <pre className="text-sm text-gray-300">
                      <code>{processedCode}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Process code to see AI results</p>
                  </div>
                )}
              </div>

              {/* Export Options */}
              {processedCode && (
                <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Export Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Export Format:</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="px-3 py-1 border border-white/30 rounded text-sm focus:ring-2 focus:ring-confluence-blue bg-white/70 backdrop-blur-sm"
                      >
                        <option value="markdown">Markdown</option>
                        <option value="pdf">PDF</option>
                        <option value="docx">Word Document</option>
                        <option value="txt">Plain Text</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => exportCode(exportFormat)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700 transition-colors border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                      </button>
                      <button
                        onClick={async () => {
                          const { space, page } = getConfluenceSpaceAndPageFromUrl();
                          if (!space || !page) {
                            alert('Confluence space or page not specified in macro src URL.');
                            return;
                          }
                          try {
                            await apiService.saveToConfluence({
                              space_key: space,
                              page_title: page,
                              content: processedCode || '',
                            });
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          } catch (err: any) {
                            alert('Failed to save to Confluence: ' + (err.message || err));
                          }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded-lg hover:bg-confluence-blue transition-colors border border-white/10"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save to Confluence</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showToast && (
        <div style={{position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: '#2684ff', color: 'white', padding: '16px 32px', borderRadius: 8, zIndex: 9999, fontWeight: 600, fontSize: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.15)'}}>
          Saved to Confluence! Please refresh this Confluence page to see your changes.
        </div>
      )}
    </div>
  );
};

export default CodeAssistant;