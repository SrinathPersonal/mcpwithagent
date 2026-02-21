"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import {
  Search, Database, Code, LayoutGrid, BarChart3,
  ArrowRight, Loader2, AlertCircle, RefreshCw, Layers, Plus, X,
  ClipboardCheck
} from "lucide-react";

interface AskResponse {
  query: {
    dbName: string;
    collectionName: string;
    query: any;
    projection?: any;
    sort?: any;
    limit?: number;
    explanation: string;
    chartType: "bar" | "line" | "pie" | "area" | "table";
  };
  data: any[];
  count: number;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f", "#ffbb28", "#ff8042"];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "grid" | "query" | "catalog">("visual");
  const [connections, setConnections] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState("dataset-default");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConn, setNewConn] = useState({ name: '', type: 'excel', path: '', uri: '' });
  const [editingMetadata, setEditingMetadata] = useState<{ connId: string, collName: string, fieldName: string, description: string, tips: string } | null>(null);

  useEffect(() => {
    fetchConnections();
    fetchCatalog();
  }, []);

  const fetchConnections = () => {
    fetch("/api/proxy/connections")
      .then(res => res.json())
      .then(data => {
        setConnections(data);
        if (data.length > 0 && selectedConnection === "dataset-default") {
          setSelectedConnection(data[0].id);
        }
      });
  };

  const fetchCatalog = () => {
    fetch("/api/proxy/catalog").then(res => res.json()).then(setCatalog);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `conn-${Date.now()}`;
    const payload = {
      id,
      name: newConn.name,
      type: newConn.type,
      config: newConn.type === 'mongodb' ? { uri: newConn.uri } : { path: newConn.path }
    };
    await fetch("/api/mcp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    fetchConnections();
    setIsModalOpen(false);
    setSelectedConnection(id);
  };

  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/proxy/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, connectionId: selectedConnection }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to fetch data");
      }

      const data = await resp.json();
      setResult(data);
      if (data.query.chartType === "table") {
        setActiveTab("grid");
      } else {
        setActiveTab("visual");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetadata || !editingMetadata.fieldName) return;
    try {
      const resp = await fetch("/api/proxy/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMetadata),
      });
      if (resp.ok) {
        setEditingMetadata({ ...editingMetadata, fieldName: '' }); // Reset field selection but keep coll
        fetchCatalog();
      }
    } catch (err) {
      console.error("Failed to save metadata:", err);
    }
  };

  // Helper to extract keys for table headers
  const getHeaders = () => {
    if (!result || result.data.length === 0) return [];
    return Object.keys(result.data[0]);
  };

  // Prepare data for charts (numeric values)
  const getChartData = () => {
    if (!result || result.data.length === 0) return [];
    return result.data.slice(0, 20); // Limit to 20 for charts
  };

  const renderChart = () => {
    if (!result) return null;
    const chartData = getChartData();
    const type = result.query.chartType;

    // Find numeric fields for chart
    const headers = getHeaders();
    const numericFields = headers.filter(h => typeof result.data[0][h] === 'number');
    const labelField = headers.find(h => typeof result.data[0][h] === 'string') || headers[0];
    const dataField = numericFields[0] || headers[headers.length - 1];

    if (numericFields.length === 0 && type !== 'table') {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
          <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
          <p>No numeric data found to visualize. Switching to Grid view.</p>
        </div>
      );
    }

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis dataKey={labelField} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Bar dataKey={dataField} fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis dataKey={labelField} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey={dataField} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={dataField}
                nameKey={labelField}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis dataKey={labelField} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Area type="monotone" dataKey={dataField} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <Database className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            AgenticData
          </span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Main Menu</div>

          <button
            onClick={() => setActiveTab("visual")}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab !== 'catalog' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Search className="w-5 h-5" />
            Search & Ask
          </button>

          <button
            onClick={() => {
              setActiveTab("catalog");
              fetchCatalog();
            }}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'catalog' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Layers className="w-5 h-5" />
            Data Catalog
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Dataset</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header - Simplified */}
        <header className="sticky top-0 z-40 h-16 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex items-center px-8 justify-between">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            {activeTab === 'catalog' ? 'Catalog Explorer' : 'Query Engine'}
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Server Active
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-12">
            {activeTab !== "catalog" ? (
              <>
                {/* Hero & Search */}
                <section className="text-center mb-16 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    AI Prompt on Any Dataset
                  </div>
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    AI Prompt on <span className="text-indigo-600 italic">Dataset.</span>
                  </h1>
                  <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                    Query any dataset with natural language, instantly visualized with beautiful charts and data grids.
                  </p>

                  <form onSubmit={handleAsk} className="relative max-w-3xl mx-auto mt-8 group flex gap-3">
                    <div className="relative flex-[1] flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none ring-0 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <div className="pl-4 opacity-40">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Search your dataset..."
                        className="w-full bg-transparent border-none py-3 px-2 focus:outline-none focus:ring-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 focus:outline-none shadow-xl"
                      >
                        {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button
                        type="submit"
                        disabled={loading || !prompt}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-xl"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        <span>Ask</span>
                      </button>
                    </div>
                  </form>
                </section>
                {/* Error State */}
                {error && (
                  <div className="mb-12 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex gap-3 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Execution Error</p>
                      <p className="text-sm opacity-90">{error}</p>
                    </div>
                  </div>
                )}

                {/* Result Area */}
                {result && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Context Info */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          <LayoutGrid className="w-3 h-3" />
                          Dataset Table
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {result.query.dbName}.{result.query.collectionName}
                          <span className="ml-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-500">
                            {result.count} documents
                          </span>
                        </p>
                      </div>

                      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                          onClick={() => setActiveTab("visual")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'visual' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Visual
                        </button>
                        <button
                          onClick={() => setActiveTab("grid")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          Grid
                        </button>
                        <button
                          onClick={() => setActiveTab("query")}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'query' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          <Code className="w-4 h-4" />
                          Query
                        </button>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl italic text-slate-600 dark:text-slate-400 leading-relaxed">
                      &ldquo;{result.query.explanation}&rdquo;
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                      {activeTab === "visual" && (
                        <div className="p-8">
                          {renderChart()}
                        </div>
                      )}

                      {activeTab === "grid" && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50">
                                {getHeaders().map(h => (
                                  <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  {getHeaders().map(h => (
                                    <td key={h} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 truncate max-w-[200px]">
                                      {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeTab === "query" && (
                        <div className="p-6 font-mono text-sm">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase">Query Logic</span>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-500">JSON</span>
                          </div>
                          <pre className="p-6 bg-slate-950 text-indigo-300 rounded-xl overflow-x-auto">
                            {JSON.stringify(result.query.query, null, 2)}
                          </pre>

                          {result.query.projection && (
                            <>
                              <div className="mt-6 mb-4 text-xs font-bold text-slate-400 uppercase">Projection</div>
                              <pre className="p-6 bg-slate-950 text-emerald-300 rounded-xl overflow-x-auto">
                                {JSON.stringify(result.query.projection, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!result && !loading && !error && (
                  <div className="mt-12 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 py-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px]">
                    <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-xl font-medium">No results to display.</p>
                    <p className="text-sm">Try using the AI Prompt on your selected dataset.</p>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="mt-12 space-y-6">
                    <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                    <div className="h-[400px] bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Dataset Sidebar */}
                  <div className="col-span-1 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-500" />
                      Datasets
                    </h2>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {catalog.map(conn => (
                        <div key={conn.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-indigo-500/50 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{conn.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] uppercase font-bold text-slate-400">{conn.type}</span>
                          </div>
                          <div className="space-y-1">
                            {conn.schemas?.map((s: any) => (
                              <button
                                key={s.collectionName}
                                onClick={() => setEditingMetadata({ connId: conn.id, collName: s.collectionName, fieldName: '', description: '', tips: '' })}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${editingMetadata?.connId === conn.id && editingMetadata?.collName === s.collectionName ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              >
                                {s.collectionName}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schema Inspector */}
                  <div className="col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                    {editingMetadata?.collName ? (
                      <div className="flex-1 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingMetadata.collName}</h3>
                            <p className="text-xs text-slate-400">Schema Explorer & Metadata Manager</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {catalog.find(c => c.id === editingMetadata.connId)?.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-4 pl-2">Field Name</th>
                                <th className="pb-4">Types</th>
                                <th className="pb-4">Explanation</th>
                                <th className="pb-4 text-right pr-4">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                              {catalog.find(c => c.id === editingMetadata.connId)?.schemas?.find((s: any) => s.collectionName === editingMetadata.collName)?.fields && (
                                Object.entries(catalog.find(c => c.id === editingMetadata.connId)?.schemas?.find((s: any) => s.collectionName === editingMetadata.collName).fields).map(([fieldName, info]: [string, any]) => (
                                  <tr key={fieldName} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                                    <td className="py-4 pl-2 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{fieldName}</td>
                                    <td className="py-4">
                                      <div className="flex flex-wrap gap-1">
                                        {info.types.map((t: string) => (
                                          <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] text-slate-500">{t}</span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      {info.description ? (
                                        <div className="max-w-[300px]">
                                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">&ldquo;{info.description}&rdquo;</p>
                                          {info.tips && <p className="text-[10px] text-indigo-400 mt-1 font-medium">Tip: {info.tips}</p>}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-300 italic">No explanation added</span>
                                      )}
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                      <button
                                        onClick={() => setEditingMetadata({
                                          ...editingMetadata,
                                          fieldName,
                                          description: info.description || '',
                                          tips: info.tips || ''
                                        })}
                                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-slate-400 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-12 text-center">
                        <LayoutGrid className="w-16 h-16 mb-6 opacity-10" />
                        <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600">Select a Table</h3>
                        <p className="max-w-xs text-sm mt-2">Explore the structure of your dataset and manage field-level metadata.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm mt-auto">
          AI Prompt on Dataset
        </footer>
      </div>

      {/* Connect Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Connect Dataset</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Dataset Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sales Data"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  value={newConn.name}
                  onChange={e => setNewConn({ ...newConn, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Data Source Type</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none outline-none"
                  value={newConn.type}
                  onChange={e => setNewConn({ ...newConn, type: e.target.value })}
                >
                  <option value="mongodb">MongoDB</option>
                  <option value="excel">Excel / CSV</option>
                  <option value="sql">SQL / Oracle / SQLite</option>
                </select>
              </div>

              {newConn.type === 'mongodb' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">MongoDB URI</label>
                  <input
                    required
                    type="text"
                    placeholder="mongodb://..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-xs outline-none"
                    value={newConn.uri}
                    onChange={e => setNewConn({ ...newConn, uri: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">File Path / Connection URI</label>
                  <input
                    required
                    type="text"
                    placeholder={newConn.type === 'excel' ? 'sample_data.xlsx' : 'sqlite://data.db'}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-xs outline-none"
                    value={newConn.path}
                    onChange={e => setNewConn({ ...newConn, path: e.target.value })}
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
              >
                Connect &amp; Sync Schema
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Metadata Edit Modal */}
      {editingMetadata?.fieldName && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-8 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500" />
                  Edit Column Metadata
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {editingMetadata.collName}.{editingMetadata.fieldName}
                </p>
              </div>
              <button
                onClick={() => setEditingMetadata({ ...editingMetadata, fieldName: '' })}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Explanation / Description</label>
                <textarea
                  required
                  placeholder="Describe what this column contains and how it relates to other data..."
                  className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm resize-none"
                  value={editingMetadata.description}
                  onChange={e => setEditingMetadata({ ...editingMetadata, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Query Hook / Tip</label>
                <input
                  type="text"
                  placeholder="e.g. Use for distinct count, join on ID, etc."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm"
                  value={editingMetadata.tips}
                  onChange={e => setEditingMetadata({ ...editingMetadata, tips: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <ClipboardCheck className="w-5 h-5" />
                Save Column Metadata
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
