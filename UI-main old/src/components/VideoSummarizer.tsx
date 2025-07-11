import React, { useState } from 'react';
import { Video, Download, Save, X, ChevronDown, ChevronRight, Loader2, Search, Code, TrendingUp, TestTube, MessageSquare, Image } from 'lucide-react';
import { FeatureType } from '../App';

interface VideoSummarizerProps {
  onClose: () => void;
  onFeatureSelect: (feature: FeatureType) => void;
}

interface VideoContent {
  id: string;
  name: string;
  summary?: string;
  quotes?: string[];
  qa?: { question: string; answer: string }[];
}

const VideoSummarizer: React.FC<VideoSummarizerProps> = ({ onClose, onFeatureSelect }) => {
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');

  const spaces = ['Engineering', 'Product', 'Design', 'Marketing', 'Documentation'];
  const pages = ['Team Meeting Recording', 'Product Demo Video', 'Training Session', 'Client Presentation', 'Technical Review'];

  const features = [
    { id: 'search' as const, label: 'AI Powered Search', icon: Search },
    { id: 'video' as const, label: 'Video Summarizer', icon: Video },
    { id: 'code' as const, label: 'Code Assistant', icon: Code },
    { id: 'impact' as const, label: 'Impact Analyzer', icon: TrendingUp },
    { id: 'test' as const, label: 'Test Support Tool', icon: TestTube },
    { id: 'image' as const, label: 'Image Insights & Chart Builder', icon: Image },
  ];

  const processVideo = async () => {
    if (!selectedSpace || !selectedPage) return;
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      const newVideo: VideoContent = {
        id: Date.now().toString(),
        name: selectedPage,
        summary: `This video from ${selectedSpace} space covers key topics and discussions. The AI has analyzed the content and extracted important insights, decisions, and action items from the recording.`,
        quotes: [
          'We need to prioritize the user authentication feature for the next sprint.',
          'The technical debt in the payment system is becoming a blocker for new features.',
          'Let\'s schedule a deep-dive session on the architecture changes next week.'
        ],
        qa: []
      };
      setVideos(prev => [...prev, newVideo]);
      setIsProcessing(false);
    }, 3000);
  };

  const addQuestion = () => {
    if (!newQuestion.trim() || !selectedVideo) return;
    
    setVideos(prev => prev.map(v => 
      v.id === selectedVideo 
        ? { 
            ...v, 
            qa: [...(v.qa || []), { question: newQuestion, answer: 'AI-generated answer based on the video content analysis...' }]
          } 
        : v
    ));
    setNewQuestion('');
  };

  const exportSummary = (video: VideoContent, format: string) => {
    const content = `# Video Summary: ${video.name}

## Summary
${video.summary}

## Key Quotes
${video.quotes?.map(quote => `- "${quote}"`).join('\n')}

## Q&A
${video.qa?.map(qa => `**Q:** ${qa.question}\n**A:** ${qa.answer}`).join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.name.replace(/\s+/g, '_')}_summary.${format}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-confluence-blue/90 to-confluence-light-blue/90 backdrop-blur-xl p-6 text-white border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Video className="w-8 h-8" />
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
          <div className="mt-6 flex gap-2 overflow-x-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === 'video';
              
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
          {/* Video Selection Section */}
          <div className="mb-6 bg-white/60 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Select Video Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Space Selection */}
              <div>
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
                      <option key={space} value={space}>{space}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Page Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video Page
                </label>
                <div className="relative">
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(e.target.value)}
                    className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                  >
                    <option value="">Choose a page...</option>
                    {pages.map(page => (
                      <option key={page} value={page}>{page}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            <button
              onClick={processVideo}
              disabled={!selectedSpace || !selectedPage || isProcessing}
              className="mt-4 w-full bg-confluence-blue/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-confluence-blue disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors border border-white/10"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Video...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span>Process Video</span>
                </>
              )}
            </button>
          </div>

          {/* Videos List */}
          <div className="space-y-4">
            {videos.map(video => (
              <div key={video.id} className="border border-white/30 rounded-xl overflow-hidden bg-white/60 backdrop-blur-xl shadow-lg">
                <div 
                  className="p-4 bg-white/50 backdrop-blur-sm cursor-pointer hover:bg-white/70 transition-colors"
                  onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-confluence-light-blue/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                        <Video className="w-6 h-6 text-confluence-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{video.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Processed</span>
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100/80 backdrop-blur-sm text-green-800 border border-white/20">
                            Completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); exportSummary(video, exportFormat); }}
                          className="px-3 py-1 bg-confluence-blue/90 backdrop-blur-sm text-white rounded text-sm hover:bg-confluence-blue transition-colors border border-white/10"
                        >
                          Export
                        </button>
                      </div>
                      {expandedVideo === video.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {expandedVideo === video.id && (
                  <div className="border-t border-white/20 bg-white/40 backdrop-blur-xl">
                    <div className="p-6 space-y-6">
                      {/* Summary */}
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">AI Summary</h5>
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <p className="text-gray-700">{video.summary}</p>
                        </div>
                      </div>

                      {/* Key Quotes */}
                      {video.quotes && video.quotes.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-3">Key Quotes</h5>
                          <div className="space-y-2">
                            {video.quotes.map((quote, index) => (
                              <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border-l-4 border-confluence-blue border border-white/20">
                                <p className="text-gray-700 italic">"{quote}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q&A Section */}
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Questions & Answers</h5>
                        <div className="space-y-4">
                          {video.qa && video.qa.length > 0 && (
                            <div className="space-y-3">
                              {video.qa.map((qa, index) => (
                                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                  <p className="font-medium text-gray-800 mb-2">Q: {qa.question}</p>
                                  <p className="text-gray-700">A: {qa.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Add New Question */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Ask a question about this video..."
                                className="flex-1 p-2 border border-white/30 rounded focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue bg-white/70 backdrop-blur-sm"
                                onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                              />
                              <button
                                onClick={() => {
                                  setSelectedVideo(video.id);
                                  addQuestion();
                                }}
                                className="px-4 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded hover:bg-confluence-blue transition-colors flex items-center border border-white/10"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Ask
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Export Options */}
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
                        
                        <div className="flex space-x-2 pt-4 border-t border-white/20">
                          <button
                            onClick={() => exportSummary(video, exportFormat)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700 transition-colors border border-white/10"
                          >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                          </button>
                          <button
                            onClick={() => alert('Saved to Confluence!')}
                            className="flex items-center space-x-2 px-4 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded-lg hover:bg-confluence-blue transition-colors border border-white/10"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save to Confluence</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {videos.length === 0 && !isProcessing && (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Videos Processed</h3>
              <p className="text-gray-500">Select a space and page with video content to start generating AI summaries.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoSummarizer;