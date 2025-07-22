import { useState } from 'react';
import { MessageSquare, ChevronDown } from 'lucide-react';
import Select from 'react-select';

interface AgentModeProps {
  sidebarOpen: boolean;
}

interface SpaceOption {
  value: string;
  label: string;
}

interface PageOption {
  value: string;
  label: string;
}

const AgentMode: React.FC<AgentModeProps> = ({ sidebarOpen }) => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceOption | null>(null);
  const [selectedPages, setSelectedPages] = useState<PageOption[]>([]);
  const [prompt, setPrompt] = useState('');

  // Dummy data for demonstration
  const spaces: SpaceOption[] = [
    { value: 'space-1', label: 'Space 1' },
    { value: 'space-2', label: 'Space 2' },
    { value: 'space-3', label: 'Space 3' },
  ];

  const pages: PageOption[] = selectedSpace ? [
    { value: 'page-1-in-space-1', label: 'Page 1 (Space 1)' },
    { value: 'page-2-in-space-1', label: 'Page 2 (Space 1)' },
    { value: 'page-1-in-space-2', label: 'Page 1 (Space 2)' },
    { value: 'page-2-in-space-2', label: 'Page 2 (Space 2)' },
  ].filter(page => page.label.includes(selectedSpace.label)) : [];

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSendPrompt = () => {
    console.log('Sending prompt:', prompt);
    console.log('Selected Space:', selectedSpace);
    console.log('Selected Pages:', selectedPages);
    // Implement prompt sending logic here
  };

  return (
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
                        <textarea
                            className="w-full flex-grow p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-confluence-blue focus:border-confluence-blue bg-white/70 backdrop-blur-sm resize-none text-gray-800 leading-tight focus:outline-none mb-4"
                            rows={4} // Adjust rows as needed
                            placeholder="Enter your prompt here..."
                            value={prompt}
                            onChange={handlePromptChange}
                        ></textarea>
                        <button
                            className="w-full bg-confluence-blue text-white py-2 px-4 rounded-lg hover:bg-confluence-blue-dark transition duration-200"
                            onClick={handleSendPrompt}
                        >
                            Send Prompt
                        </button>
                    </div>
                </div>
            </div>
  );
};

export default AgentMode;