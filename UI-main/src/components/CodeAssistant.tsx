import React, { useState, useEffect } from 'react';
import { Code, FileText, Download, Save, X, ChevronDown, Loader2, Zap, Search, Video, TrendingUp, TestTube, Image } from 'lucide-react';
import { FeatureType } from '../App';
import { apiService, Space } from '../services/api';
import { getConfluenceSpaceAndPageFromUrl } from '../utils/urlUtils';

interface CodeAssistantProps {
  onClose: () => void;
  onFeatureSelect: (feature: FeatureType) => void;
  autoSpaceKey?: string | null;
  isSpaceAutoConnected?: boolean;
  onModeSelect?: (mode: 'agent' | 'tool') => void;
}

const CodeAssistant: React.FC<CodeAssistantProps> = ({ onClose, onFeatureSelect, autoSpaceKey, isSpaceAutoConnected, onModeSelect }) => {
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [detectedCode, setDetectedCode] = useState('');
  const [instruction, setInstruction] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [fileName, setFileName] = useState('');
  const [processedCode, setProcessedCode] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [aiAction, setAiAction] = useState('');
  const [aiActionOutput, setAiActionOutput] = useState('');
  // State for displaying all outputs in AI Result
  const [modificationOutput, setModificationOutput] = useState('');
  const [conversionOutput, setConversionOutput] = useState('');

  const features = [
    { id: 'search' as const, label: 'AI Powered Search', icon: Search },
    { id: 'video' as const, label: 'Video Summarizer', icon: Video },
    { id: 'code' as const, label: 'Code Assistant', icon: Code },
    { id: 'impact' as const, label: 'Impact Analyzer', icon: TrendingUp },
    { id: 'test' as const, label: 'Test Support Tool', icon: TestTube },
    { id: 'image' as const, label: 'Image Insights & Chart Builder', icon: Image },
  ];

  const outputFormats = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php', 'yang', 'cpp', 'c', 'swift', 'kotlin', 'scala', 'ruby', 'perl', 'bash', 'powershell', 'sql', 'html', 'css', 'xml', 'json', 'yaml', 'toml'
  ];

  const aiActions = [
    'Select action...',
    'Optimize Performance', 
    'Generate Documentation',
    'Refactor Structure',
    'Identify dead code'
  ];

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
    if (!selectedSpace || !selectedPage) {
      setError('Please select a space and page.');
      return;
    }

    // Clear previous outputs before running a new process
    setAiActionOutput('');
    setConversionOutput('');
    setModificationOutput('');

    // Check if any option is selected
    const hasModificationInstruction = instruction.trim() !== '';
    const hasTargetLanguage = targetLanguage !== '';
    const hasAiAction = aiAction !== '' && aiAction !== 'Select action...';

    if (!hasModificationInstruction && !hasTargetLanguage && !hasAiAction) {
      setError('Please provide a modification instruction, select a target language, or choose an AI action.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // If AI action is selected, process it first
      if (hasAiAction) {
        await runAiAction();
      }

      // If modification instruction or target language is selected, process with API
      if (hasModificationInstruction || hasTargetLanguage) {
        const result = await apiService.codeAssistant({
          space_key: selectedSpace,
          page_title: selectedPage,
          instruction: instruction,
          target_language: targetLanguage || undefined
        });

        // Show converted code if target language is selected
        if (hasTargetLanguage && result.converted_code) {
          setConversionOutput(result.converted_code);
        } else {
          setConversionOutput('');
        }
        // Show modified code if modification instruction is used
        if (hasModificationInstruction && result.modified_code) {
          setModificationOutput(result.modified_code);
        } else {
          setModificationOutput('');
        }
      }
    } catch (err) {
      setError('Failed to process code. Please try again.');
      console.error('Error processing code:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const runAiAction = async () => {
    if (!aiAction || aiAction === 'Select action...' || !detectedCode) {
      return;
    }

    const actionPromptMap: Record<string, string> = {
      "Summarize Code": `Summarize the following code in clear and concise language:\n\n${detectedCode}`,
      "Optimize Performance": `Optimize the following code for performance without changing its functionality, return only the updated code:\n\n${detectedCode}`,
      "Generate Documentation": `Generate inline documentation and function-level comments for the following code, return only the updated code by commenting the each line of the code.:\n\n${detectedCode}`,
      "Refactor Structure": `Refactor the following code to improve structure, readability, and modularity, return only the updated code:\n\n${detectedCode}`,
      "Security Analysis": `Analyze the following code for security vulnerabilities and suggest improvements, return only the updated code:\n\n${detectedCode}`,
      "Identify dead code": `Analyze the following code for any unsued code or dead code, return only the updated code by removing the dead code:\n\n${detectedCode}`,
    };

    try {
      const prompt = actionPromptMap[aiAction];
      if (!prompt) return;

      // For now, we'll use the same API service but with a special instruction
      const result = await apiService.codeAssistant({
        space_key: selectedSpace,
        page_title: selectedPage,
        instruction: prompt
      });

      setAiActionOutput(result.modified_code || result.converted_code || result.original_code || 'AI action completed successfully.');
    } catch (err) {
      setError(`Failed to run AI action: ${err}`);
      console.error('Error running AI action:', err);
    }
  };

  // Helper function to check if Process Code button should be enabled
  const canProcessCode = () => {
    const hasSpaceAndPage = selectedSpace && selectedPage;
    const hasModificationInstruction = instruction.trim() !== '';
    const hasTargetLanguage = targetLanguage !== '';
    const hasAiAction = aiAction !== '' && aiAction !== 'Select action...';
    
    return hasSpaceAndPage && (hasModificationInstruction || hasTargetLanguage || hasAiAction);
  };

  const exportCode = async (format: string) => {
    const content = processedCode || aiActionOutput || detectedCode;
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

  // Use a default file name if fileName is empty
  const effectiveFileName = fileName || 'ai-result';

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
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onModeSelect && onModeSelect('agent')}
                className="text-blue-100 hover:text-white hover:bg-white/10 rounded-xl px-3 py-1 text-sm transition-colors"
              >
                Switch to Agent Mode
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2 backdrop-blur-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
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

                {/* AI Actions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Actions
                  </label>
                  <div className="relative">
                    <select
                      value={aiAction}
                      onChange={(e) => setAiAction(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      {aiActions.map(action => (
                        <option key={action} value={action}>{action}</option>
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
                      {outputFormats.map(format => (
                        <option key={format} value={format}>
                          {format.charAt(0).toUpperCase() + format.slice(1)}
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
                  onClick={processCode}
                  disabled={!canProcessCode() || isProcessing}
                  className="w-full bg-confluence-blue/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-confluence-blue disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors border border-white/10"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Process Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

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
                </div>
                
                {aiActionOutput && (
                  <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                    <div className="mb-2 text-sm text-gray-400">
                      <strong>AI Action:</strong> {aiAction}
                    </div>
                    <pre className="text-sm text-gray-300">
                      <code>{aiActionOutput}</code>
                    </pre>
                  </div>
                )}
                {conversionOutput && (
                  <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                    <div className="mb-2 text-sm text-gray-400">
                      <strong>Target Language Conversion:</strong> {targetLanguage}
                    </div>
                    <pre className="text-sm text-gray-300">
                      <code>{conversionOutput}</code>
                    </pre>
                  </div>
                )}
                {modificationOutput && (
                  <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-auto max-h-96 border border-white/10">
                    <div className="mb-2 text-sm text-gray-400">
                      <strong>Modification Instruction:</strong> {instruction}
                    </div>
                    <pre className="text-sm text-gray-300">
                      <code>{modificationOutput}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Export Options */}
              {processedCode || aiActionOutput || conversionOutput || modificationOutput ? (
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
                              content: processedCode || aiActionOutput || conversionOutput || modificationOutput || '',
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
              ) : null}
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