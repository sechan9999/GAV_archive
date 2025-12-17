
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldCheckIcon,
  PlayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  NewspaperIcon,
  SparklesIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownCircleIcon,
  MapPinIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  BeakerIcon,
  XMarkIcon,
  LinkIcon,
  CalendarIcon,
  MapIcon
} from '@heroicons/react/24/outline';
import { PYTHON_CODE, MOCK_DATA, GVA_10_YEAR_REVIEW } from './constants';
import { 
  generateEnhancedDataReport, 
  findLocalSafetyResources, 
  sendChatMessage,
  startProChat 
} from './services/gemini';
import WorkflowNode from './components/WorkflowNode';

enum Tab {
  RESEARCH = 'research',
  DATA_STATS = 'data_stats',
  INCIDENT_EXPLORER = 'incident_explorer',
  INTELLIGENCE = 'intelligence',
  DATA_REPORT = 'data_report',
  AI_EXPERT = 'ai_expert',
  SCRAPER = 'scraper'
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.RESEARCH);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [reportData, setReportData] = useState<{text: string, sources: any[]} | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Incident Selection
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // Intelligence States
  const [intelResponse, setIntelResponse] = useState<{text: string, sources: any[]} | null>(null);
  const [isIntelLoading, setIsIntelLoading] = useState(false);

  // Filtering States
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startProChat();
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === Tab.AI_EXPERT) scrollToBottom();
  }, [chatHistory, isTyping, activeTab]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const currentInput = userInput;
    setUserInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: currentInput }]);
    setIsTyping(true);

    const response = await sendChatMessage(currentInput);
    setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    setIsTyping(false);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const data = await generateEnhancedDataReport();
    setReportData(data);
    setIsGeneratingReport(false);
  };

  const handleMapsGrounding = async () => {
    setIsIntelLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const data = await findLocalSafetyResources(position.coords.latitude, position.coords.longitude);
        setIntelResponse(data);
        setIsIntelLoading(false);
      }, async () => {
        const data = await findLocalSafetyResources();
        setIntelResponse(data);
        setIsIntelLoading(false);
      });
    } else {
      const data = await findLocalSafetyResources();
      setIntelResponse(data);
      setIsIntelLoading(false);
    }
  };

  const downloadSummaryCSV = () => {
    const years = GVA_10_YEAR_REVIEW.years.join(',');
    let csvContent = `Category,${years}\n`;
    Object.entries(GVA_10_YEAR_REVIEW.categories).forEach(([cat, vals]) => {
      csvContent += `"${cat}",${vals.join(',')}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gva_10yr_summary.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredIncidents = useMemo(() => {
    return MOCK_DATA.filter(item => {
      const matchesState = item.state.toLowerCase().includes(stateFilter.toLowerCase());
      const matchesCity = item.city_county.toLowerCase().includes(cityFilter.toLowerCase());
      return matchesState && matchesCity;
    });
  }, [stateFilter, cityFilter]);

  const downloadFilteredIncidentsCSV = () => {
    if (filteredIncidents.length === 0) return;
    const headers = ['Date', 'State', 'City/County', 'Address', 'Killed', 'Injured'];
    const rows = filteredIncidents.map(inc => [inc.date, `"${inc.state}"`, `"${inc.city_county}"`, `"${inc.address}"`, inc.killed, inc.injured]);
    let csvContent = headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gva_filtered_incidents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const workflowSteps = [
    {
      id: 'driver',
      title: 'Environment Config',
      description: 'Headless Chrome setup with residential User-Agent spoofing to access GVA archive records.',
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      codeSnippet: 'options.add_argument("user-agent=...")'
    },
    {
      id: 'nav',
      title: 'Dynamic Targeting',
      description: 'Navigation to time-windowed reports with specific WebDriverWait for table integrity.',
      icon: <PlayIcon className="w-6 h-6" />,
      codeSnippet: 'WebDriverWait(driver, 15).until(...)'
    },
    {
      id: 'parse',
      title: 'Semantic Extraction',
      description: 'Deep parsing of HTML table rows into normalized incident objects.',
      icon: <TableCellsIcon className="w-6 h-6" />,
      codeSnippet: 'incident = { "date": cols[0].text, ... }'
    }
  ];

  const [activeWorkflowStep, setActiveWorkflowStep] = useState(workflowSteps[0].id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-600 p-2 rounded-lg">
              <TableCellsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">GVA Data Architect</h1>
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Gun Violence Intelligence Node</p>
            </div>
          </div>
          <nav className="hidden xl:flex space-x-1 bg-slate-800 p-1 rounded-lg">
            {(Object.values(Tab)).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wide ${
                  activeTab === tab ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 mb-4 uppercase flex items-center">
                <ChartBarIcon className="w-4 h-4 mr-2 text-rose-600" />
                Snapshot Analysis
              </h2>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 uppercase font-bold text-[9px]">10Y Peak (Total Deaths)</p>
                  <p className="text-xl font-black text-rose-600">21,383 <span className="text-[10px] text-slate-400 font-normal">(2021)</span></p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 uppercase font-bold text-[9px]">Youth Casualties (2024)</p>
                  <p className="text-xl font-black text-slate-800">1,421 <span className="text-[10px] text-slate-400 font-normal">Killed</span></p>
                </div>
              </div>
              <button 
                onClick={downloadSummaryCSV}
                className="w-full mt-6 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-[10px] font-bold uppercase transition-all"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span>Export 10Y Summary</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 mb-4 uppercase flex items-center">
                <GlobeAltIcon className="w-4 h-4 mr-2 text-indigo-600" />
                Intelligence Tools
              </h2>
              <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">Leverage Maps Grounding to locate crisis response and advocacy centers.</p>
              <button 
                onClick={handleMapsGrounding}
                disabled={isIntelLoading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-[10px] font-bold uppercase transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <MapPinIcon className="w-4 h-4" />
                <span>{isIntelLoading ? 'Scanning...' : 'Find Response Centers'}</span>
              </button>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center space-x-2 mb-3">
                <CpuChipIcon className="w-5 h-5 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest">AI Status</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Gemini 3 Pro Engine: <span className="text-emerald-400">Online</span><br/>
                Search Grounding: <span className="text-emerald-400">Ready</span><br/>
                Scraper Kernel: <span className="text-emerald-400">v2.0 Refactored</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-9">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px] relative">
              
              {activeTab === Tab.DATA_STATS && (
                <div className="flex-1 p-6 overflow-auto bg-white">
                   <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                     <TableCellsIcon className="w-5 h-5 mr-2 text-rose-600" />
                     Aggregate Historical Metrics
                   </h3>
                   <div className="rounded-xl border border-slate-200 overflow-hidden">
                     <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] font-bold">
                          <tr>
                            <th className="px-3 py-3 text-rose-500">Metric Category</th>
                            {GVA_10_YEAR_REVIEW.years.map(y => <th key={y} className="px-2 py-3 text-center">{y}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(GVA_10_YEAR_REVIEW.categories).map(([key, values], idx) => (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap border-r border-slate-100">{key}</td>
                              {values.map((v, i) => (
                                <td key={i} className="px-2 py-2.5 text-center tabular-nums text-slate-600">
                                  {v === null || v === "Pending" ? <span className="text-slate-300 italic">...</span> : v.toLocaleString()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                </div>
              )}

              {activeTab === Tab.INCIDENT_EXPLORER && (
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">State Filter</label>
                      <input 
                        type="text" 
                        value={stateFilter} 
                        onChange={e => setStateFilter(e.target.value)}
                        placeholder="Search State..." 
                        className="w-full border p-2 rounded text-xs focus:ring-2 focus:ring-rose-500 outline-none" 
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">City Filter</label>
                      <input 
                        type="text" 
                        value={cityFilter} 
                        onChange={e => setCityFilter(e.target.value)}
                        placeholder="Search City..." 
                        className="w-full border p-2 rounded text-xs focus:ring-2 focus:ring-rose-500 outline-none" 
                      />
                    </div>
                    <button 
                      onClick={downloadFilteredIncidentsCSV}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center space-x-2"
                    >
                      <ArrowDownCircleIcon className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-500 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-3 border-b">Date</th>
                          <th className="p-3 border-b">State</th>
                          <th className="p-3 border-b">City/County</th>
                          <th className="p-3 border-b">Casualties</th>
                          <th className="p-3 border-b">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncidents.map((inc, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                            <td className="p-3 whitespace-nowrap">{inc.date}</td>
                            <td className="p-3 font-bold text-slate-800">{inc.state}</td>
                            <td className="p-3">{inc.city_county}</td>
                            <td className="p-3">
                              <span className="text-rose-600 font-bold">{inc.killed}K</span> / <span className="text-orange-500 font-bold">{inc.injured}I</span>
                            </td>
                            <td className="p-3">
                              <button 
                                onClick={() => setSelectedIncident(inc)}
                                className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold uppercase transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === Tab.INTELLIGENCE && (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                  <div className="p-6 bg-white border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <BeakerIcon className="w-5 h-5 mr-2 text-indigo-600" />
                      Grounded Intelligence Hub
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8">
                    {intelResponse ? (
                      <div className="max-w-3xl mx-auto space-y-6">
                        <div className="prose prose-slate prose-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 whitespace-pre-wrap">
                          {intelResponse.text}
                        </div>
                        {intelResponse.sources.length > 0 && (
                          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">Verified Safety Nodes</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {intelResponse.sources.map((chunk: any, i: number) => (
                                chunk.maps && (
                                  <a key={i} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-indigo-200 hover:shadow-md transition-shadow">
                                    <MapPinIcon className="w-4 h-4 text-indigo-500" />
                                    <span className="text-[11px] font-bold text-indigo-900 truncate">{chunk.maps.title || "View Location"}</span>
                                  </a>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                        <GlobeAltIcon className="w-20 h-20 text-indigo-300 animate-pulse" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ready for Resource Mapping</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === Tab.DATA_REPORT && (
                <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Advanced Trend Analysis</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">AI Generated Report (Gemini 3 Flash)</p>
                    </div>
                    <button 
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md disabled:opacity-50"
                    >
                      {isGeneratingReport ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                      <span>{isGeneratingReport ? 'Analyzing Data...' : 'Generate New Analysis'}</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-12 bg-white">
                    {reportData ? (
                      <div className="max-w-4xl mx-auto">
                        <div className="prose prose-slate prose-headings:text-rose-600 prose-strong:text-slate-900 lg:prose-lg whitespace-pre-wrap mb-12">
                          {reportData.text}
                        </div>
                        {reportData.sources.length > 0 && (
                          <div className="border-t border-slate-100 pt-8">
                            <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Grounded Research Sources</h4>
                            <div className="space-y-2">
                              {reportData.sources.map((chunk: any, i: number) => (
                                chunk.web && (
                                  <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-rose-600 hover:underline">
                                    • {chunk.web.title || "External Research Node"}
                                  </a>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <NewspaperIcon className="w-24 h-24 text-slate-300" />
                        <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">Analysis Not Yet Compiled</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === Tab.AI_EXPERT && (
                <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                  <div className="p-6 bg-white border-b border-slate-200 flex items-center space-x-3">
                    <div className="bg-slate-900 p-2 rounded-lg"><ChatBubbleLeftRightIcon className="w-5 h-5 text-rose-500" /></div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Research Advisor</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Complex Reasoning Mode (Gemini 3 Pro)</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm">
                        Start a conversation about criminological trends or data scraping architecture.
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 rounded-tl-none prose prose-sm'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse ml-2">Advisor is generating complex analysis...</div>}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex space-x-2">
                    <input 
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Ask a complex research question..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                    <button type="submit" disabled={isTyping} className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-xl shadow-lg transition-transform active:scale-95">
                      <PlayIcon className="w-5 h-5 rotate-90" />
                    </button>
                  </form>
                </div>
              )}

              {activeTab === Tab.SCRAPER && (
                <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">gva_research_scraper_v2.py</span>
                    <span className="text-[9px] text-emerald-500 font-bold uppercase">Production Ready</span>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    <pre className="text-xs text-slate-400 code-font leading-relaxed">{PYTHON_CODE}</pre>
                  </div>
                </div>
              )}

              {activeTab === Tab.RESEARCH && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-1/2 p-6 bg-slate-50 border-r border-slate-200 overflow-y-auto">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">System Pipeline</h4>
                    <div className="space-y-3">
                      {workflowSteps.map(step => (
                        <WorkflowNode 
                          key={step.id}
                          title={step.title}
                          description={step.description}
                          isActive={activeWorkflowStep === step.id}
                          onClick={() => setActiveWorkflowStep(step.id)}
                          icon={step.icon}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="w-1/2 flex flex-col items-center justify-center p-8 text-center bg-white">
                     <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">{workflowSteps.find(s => s.id === activeWorkflowStep)?.icon}</div>
                     <h3 className="text-lg font-bold text-slate-900 mb-2">{workflowSteps.find(s => s.id === activeWorkflowStep)?.title}</h3>
                     <p className="text-xs text-slate-500 leading-relaxed mb-6">{workflowSteps.find(s => s.id === activeWorkflowStep)?.description}</p>
                     <div className="w-full bg-slate-900 rounded-lg p-4 text-left shadow-inner"><code className="text-rose-300 text-[10px] code-font">{workflowSteps.find(s => s.id === activeWorkflowStep)?.codeSnippet}</code></div>
                  </div>
                </div>
              )}

              {/* Detail Modal Overlay */}
              {selectedIncident && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-600 rounded-lg">
                          <TableCellsIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest">Incident Record</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Record Verified Archive</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedIncident(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                          <span className="text-[9px] font-black text-rose-600 uppercase block mb-1">Total Killed</span>
                          <span className="text-3xl font-black text-rose-900 leading-none">{selectedIncident.killed}</span>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                          <span className="text-[9px] font-black text-orange-600 uppercase block mb-1">Total Injured</span>
                          <span className="text-3xl font-black text-orange-900 leading-none">{selectedIncident.injured}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <CalendarIcon className="w-5 h-5 text-slate-400 mt-1" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Incident Date</span>
                            <p className="text-sm font-bold text-slate-900">{selectedIncident.date}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <MapIcon className="w-5 h-5 text-slate-400 mt-1" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Location Detail</span>
                            <p className="text-sm font-bold text-slate-900">{selectedIncident.city_county}, {selectedIncident.state}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedIncident.address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">External Evidence</h5>
                        <div className="space-y-3">
                          {selectedIncident.source_link ? (
                            <a 
                              href={selectedIncident.source_link.startsWith('http') ? selectedIncident.source_link : `https://www.gunviolencearchive.org${selectedIncident.source_link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                            >
                              <div className="flex items-center space-x-3">
                                <LinkIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">Original Archive Record</span>
                              </div>
                              <ArrowPathIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 animate-spin-slow" />
                            </a>
                          ) : (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-400 italic">
                              No external archive link provided for this record.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                      <button 
                        onClick={() => setSelectedIncident(null)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-all active:scale-95 shadow-lg"
                      >
                        Acknowledge & Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Public Safety Data Node • Academic Research Access v2.1</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
