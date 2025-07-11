import React, { useState, useRef } from 'react';
import { Image, Download, Save, X, ChevronDown, Loader2, MessageSquare, BarChart3, Search, Video, Code, TrendingUp, TestTube, Eye, Zap } from 'lucide-react';
import { FeatureType } from '../App';

interface ImageInsightsProps {
  onClose: () => void;
  onFeatureSelect: (feature: FeatureType) => void;
}

interface ImageData {
  id: string;
  name: string;
  url: string;
  summary?: string;
  qa?: { question: string; answer: string }[];
}

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: any;
  title: string;
}

const ImageInsights: React.FC<ImageInsightsProps> = ({ onClose, onFeatureSelect }) => {
  const [spaceKey, setSpaceKey] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [exportFormat, setExportFormat] = useState('png');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [chartFileName, setChartFileName] = useState('');
  const [chartExportFormat, setChartExportFormat] = useState('png');
  
  const chartPreviewRef = useRef<HTMLDivElement>(null);

  const spaces = ['ENG', 'PROD', 'DESIGN', 'MKT', 'DOC'];
  const pages = ['Dashboard Analytics', 'User Flow Diagrams', 'Performance Charts', 'Architecture Diagrams', 'Process Flowcharts'];
  const chartTypes = [
    { value: 'bar' as const, label: 'Bar Chart' },
    { value: 'line' as const, label: 'Line Chart' },
    { value: 'pie' as const, label: 'Pie Chart' },
    { value: 'scatter' as const, label: 'Scatter Plot' }
  ];

  const features = [
    { id: 'search' as const, label: 'AI Powered Search', icon: Search },
    { id: 'video' as const, label: 'Video Summarizer', icon: Video },
    { id: 'code' as const, label: 'Code Assistant', icon: Code },
    { id: 'impact' as const, label: 'Impact Analyzer', icon: TrendingUp },
    { id: 'test' as const, label: 'Test Support Tool', icon: TestTube },
    { id: 'image' as const, label: 'Image Insights & Chart Builder', icon: Image },
  ];

  const sampleImages = [
    { id: '1', name: 'Sales Dashboard Q4', url: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { id: '2', name: 'User Journey Map', url: 'https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { id: '3', name: 'Performance Metrics', url: 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=400' }
  ];

  const loadImages = () => {
    if (!spaceKey || selectedPages.length === 0) return;
    setImages(sampleImages.map(img => ({ ...img, qa: [] })));
  };

  const analyzeImage = async (imageId: string) => {
    setIsAnalyzing(imageId);
    
    setTimeout(() => {
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              summary: `AI Analysis of ${img.name}: This image contains data visualization elements including charts, graphs, and key performance indicators. The visual elements suggest business metrics tracking with trend analysis and comparative data points. Key insights include performance trends, data correlations, and actionable business intelligence derived from the visual representation.`
            }
          : img
      ));
      setIsAnalyzing('');
    }, 2000);
  };

  const addQuestion = () => {
    if (!newQuestion.trim() || !selectedImage) return;
    
    const answer = `Based on the AI analysis of this image, here's the response to your question: "${newQuestion}"

The image analysis reveals specific data patterns and visual elements that directly relate to your inquiry. The AI has processed the visual content and extracted relevant insights to provide this contextual response.`;

    setImages(prev => prev.map(img => 
      img.id === selectedImage 
        ? { 
            ...img, 
            qa: [...(img.qa || []), { question: newQuestion, answer }]
          } 
        : img
    ));
    setNewQuestion('');
  };

  const createChart = (imageId: string) => {
    const sampleData = {
      bar: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue',
          data: [65, 78, 90, 81],
          backgroundColor: 'rgba(38, 132, 255, 0.8)'
        }]
      },
      line: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Growth',
          data: [12, 19, 15, 25, 22],
          borderColor: 'rgba(38, 132, 255, 1)',
          fill: false
        }]
      },
      pie: {
        labels: ['Desktop', 'Mobile', 'Tablet'],
        datasets: [{
          data: [55, 35, 10],
          backgroundColor: ['#0052CC', '#2684FF', '#B3D4FF']
        }]
      },
      scatter: {
        datasets: [{
          label: 'Performance',
          data: [{x: 10, y: 20}, {x: 15, y: 25}, {x: 20, y: 30}],
          backgroundColor: 'rgba(38, 132, 255, 0.8)'
        }]
      }
    };

    setChartData({
      type: selectedChartType,
      data: sampleData[selectedChartType],
      title: `Generated ${selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)} Chart`
    });

    // Scroll to chart preview after creation
    setTimeout(() => {
      chartPreviewRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const exportImage = (image: ImageData) => {
    const content = `# Image Analysis Report: ${image.name}

## AI Summary
${image.summary || 'No summary available'}

## Questions & Answers
${image.qa?.map(qa => `**Q:** ${qa.question}\n**A:** ${qa.answer}`).join('\n\n') || 'No questions asked'}

## Image Details
- **Name**: ${image.name}
- **Analysis Date**: ${new Date().toLocaleString()}
- **Export Format**: ${exportFormat}

---
*Generated by Confluence AI Assistant - Image Insights*`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || image.name.replace(/\s+/g, '_')}_analysis.${exportFormat}`;
    a.click();
  };

  const exportChart = () => {
    if (!chartData) return;
    
    const content = `# Chart Export: ${chartData.title}

## Chart Type
${chartData.type.charAt(0).toUpperCase() + chartData.type.slice(1)} Chart

## Data
${JSON.stringify(chartData.data, null, 2)}

## Export Details
- **File Name**: ${chartFileName}
- **Format**: ${chartExportFormat}
- **Generated**: ${new Date().toLocaleString()}

---
*Generated by Confluence AI Assistant - Chart Builder*`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartFileName || 'chart'}.${chartExportFormat}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-confluence-blue/90 to-confluence-light-blue/90 backdrop-blur-xl p-6 text-white border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Confluence AI Assistant</h2>
                <p className="text-blue-100/90">AI-powered tools for your Confluence workspace</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2 backdrop-blur-sm">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Feature Navigation with Custom Scrollbar */}
          <div className="mt-6 overflow-x-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50">
            <div className="flex gap-2 min-w-max pb-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                const isActive = feature.id === 'image';
                
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
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Column - Image Selection */}
            <div className="xl:col-span-1">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 space-y-6 border border-white/20 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Image Selection
                </h3>
                
                {/* Space Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confluence Space Key
                  </label>
                  <div className="relative">
                    <select
                      value={spaceKey}
                      onChange={(e) => setSpaceKey(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">Select space...</option>
                      {spaces.map(space => (
                        <option key={space} value={space}>{space}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Pages
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-white/30 rounded-lg p-2 bg-white/50 backdrop-blur-sm">
                    {pages.map(page => (
                      <label key={page} className="flex items-center space-x-2 p-2 hover:bg-white/30 rounded cursor-pointer backdrop-blur-sm">
                        <input
                          type="checkbox"
                          checked={selectedPages.includes(page)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPages([...selectedPages, page]);
                            } else {
                              setSelectedPages(selectedPages.filter(p => p !== page));
                            }
                          }}
                          className="rounded border-gray-300 text-confluence-blue focus:ring-confluence-blue"
                        />
                        <span className="text-sm text-gray-700">{page}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedPages.length} page(s) selected
                  </p>
                </div>

                {/* Load Images Button */}
                <button
                  onClick={loadImages}
                  disabled={!spaceKey || selectedPages.length === 0}
                  className="w-full bg-confluence-blue/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-confluence-blue disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors border border-white/10"
                >
                  <Image className="w-5 h-5" />
                  <span>Load Images</span>
                </button>
              </div>
            </div>

            {/* Middle Column - Images Grid */}
            <div className="xl:col-span-2 space-y-6">
              {images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {images.map(image => (
                    <div key={image.id} className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                      <div className="aspect-video bg-gray-200/50 backdrop-blur-sm rounded-lg mb-4 overflow-hidden border border-white/20">
                        <img 
                          src={image.url} 
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <h4 className="font-semibold text-gray-800 mb-2">{image.name}</h4>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => analyzeImage(image.id)}
                          disabled={isAnalyzing === image.id}
                          className="w-full bg-confluence-blue/90 backdrop-blur-sm text-white py-2 px-4 rounded-lg hover:bg-confluence-blue disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors border border-white/10"
                        >
                          {isAnalyzing === image.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Summarize</span>
                            </>
                          )}
                        </button>

                        {image.summary && (
                          <button
                            onClick={() => createChart(image.id)}
                            className="w-full bg-green-600/90 backdrop-blur-sm text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 border border-white/10"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span>Create Graph</span>
                          </button>
                        )}
                      </div>

                      {image.summary && (
                        <div className="mt-4 p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-white/20">
                          <p className="text-sm text-gray-700">{image.summary}</p>
                        </div>
                      )}

                      {image.qa && image.qa.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {image.qa.map((qa, index) => (
                            <div key={index} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-white/20">
                              <p className="font-medium text-gray-800 text-sm mb-1">Q: {qa.question}</p>
                              <p className="text-gray-700 text-xs">{qa.answer.substring(0, 100)}...</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Images Loaded</h3>
                  <p className="text-gray-500">Select a space and pages to load embedded images for analysis.</p>
                </div>
              )}

              {/* Chart Preview Section */}
              {chartData && (
                <div ref={chartPreviewRef} className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Chart Builder
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart Controls - Left Side */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <h4 className="font-semibold text-gray-800 mb-3">Chart Settings</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Chart Type
                            </label>
                            <div className="relative">
                              <select
                                value={selectedChartType}
                                onChange={(e) => {
                                  setSelectedChartType(e.target.value as any);
                                  // Update chart data when type changes
                                  const sampleData = {
                                    bar: {
                                      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                                      datasets: [{
                                        label: 'Revenue',
                                        data: [65, 78, 90, 81],
                                        backgroundColor: 'rgba(38, 132, 255, 0.8)'
                                      }]
                                    },
                                    line: {
                                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                                      datasets: [{
                                        label: 'Growth',
                                        data: [12, 19, 15, 25, 22],
                                        borderColor: 'rgba(38, 132, 255, 1)',
                                        fill: false
                                      }]
                                    },
                                    pie: {
                                      labels: ['Desktop', 'Mobile', 'Tablet'],
                                      datasets: [{
                                        data: [55, 35, 10],
                                        backgroundColor: ['#0052CC', '#2684FF', '#B3D4FF']
                                      }]
                                    },
                                    scatter: {
                                      datasets: [{
                                        label: 'Performance',
                                        data: [{x: 10, y: 20}, {x: 15, y: 25}, {x: 20, y: 30}],
                                        backgroundColor: 'rgba(38, 132, 255, 0.8)'
                                      }]
                                    }
                                  };
                                  setChartData({
                                    type: e.target.value as any,
                                    data: sampleData[e.target.value as keyof typeof sampleData],
                                    title: `Generated ${e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)} Chart`
                                  });
                                }}
                                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                              >
                                {chartTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Chart File Name
                            </label>
                            <input
                              type="text"
                              value={chartFileName}
                              onChange={(e) => setChartFileName(e.target.value)}
                              placeholder="my-chart"
                              className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue bg-white/70 backdrop-blur-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Export Format
                            </label>
                            <div className="relative">
                              <select
                                value={chartExportFormat}
                                onChange={(e) => setChartExportFormat(e.target.value)}
                                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                              >
                                <option value="png">PNG</option>
                                <option value="pdf">PDF</option>
                                <option value="docx">Word Document</option>
                                <option value="pptx">PowerPoint</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <button
                              onClick={exportChart}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700 transition-colors border border-white/10"
                            >
                              <Download className="w-4 h-4" />
                              <span>Export Chart</span>
                            </button>
                            <button
                              onClick={() => alert('Chart saved to Confluence!')}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded-lg hover:bg-confluence-blue transition-colors border border-white/10"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save to Confluence</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart Preview - Right Side */}
                    <div className="lg:col-span-2">
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <h4 className="font-semibold text-gray-800 mb-4">{chartData.title}</h4>
                        <div className="w-full h-80 bg-gradient-to-br from-confluence-blue/10 to-confluence-light-blue/10 rounded-lg flex items-center justify-center border border-white/20">
                          <div className="text-center">
                            <BarChart3 className="w-20 h-20 text-confluence-blue mx-auto mb-4" />
                            <p className="text-gray-600 font-medium text-lg">{chartData.title}</p>
                            <p className="text-gray-500 text-sm mt-2">Live {chartData.type} chart preview</p>
                            <div className="mt-4 text-xs text-gray-400 max-w-md mx-auto">
                              Chart updates automatically when you change the type in the controls panel
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Q&A and Export */}
            <div className="xl:col-span-1">
              <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 space-y-4 border border-white/20 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Image Q&A
                </h3>
                
                {/* Image Selection for Q&A */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Image for Questions
                  </label>
                  <div className="relative">
                    <select
                      value={selectedImage}
                      onChange={(e) => setSelectedImage(e.target.value)}
                      className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                    >
                      <option value="">Choose image...</option>
                      {images.filter(img => img.summary).map(image => (
                        <option key={image.id} value={image.id}>{image.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Add Question */}
                <div className="space-y-2">
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask about the selected image..."
                    className="w-full p-2 border border-white/30 rounded focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue resize-none bg-white/70 backdrop-blur-sm"
                    rows={3}
                  />
                  <button
                    onClick={addQuestion}
                    disabled={!newQuestion.trim() || !selectedImage}
                    className="w-full px-3 py-2 bg-confluence-blue/90 backdrop-blur-sm text-white rounded hover:bg-confluence-blue disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2 border border-white/10"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ask Question</span>
                  </button>
                </div>

                {/* Export Options */}
                <div className="pt-4 border-t border-white/20 space-y-3">
                  <h4 className="font-semibold text-gray-800">Export Image Analysis</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Name
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="image-analysis"
                      className="w-full p-2 border border-white/30 rounded focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue bg-white/70 backdrop-blur-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <div className="relative">
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full p-2 border border-white/30 rounded focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue appearance-none bg-white/70 backdrop-blur-sm"
                      >
                        <option value="png">PNG</option>
                        <option value="pdf">PDF</option>
                        <option value="docx">Word Document</option>
                        <option value="txt">Plain Text</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {images.filter(img => img.summary).map(image => (
                      <button
                        key={image.id}
                        onClick={() => exportImage(image)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700 transition-colors border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export {image.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageInsights;