"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import {
  Search, Database, Code, LayoutGrid, BarChart3,
  ArrowRight, Loader2, AlertCircle, RefreshCw, Layers
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
  const [activeTab, setActiveTab] = useState<"visual" | "grid" | "query">("visual");

  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/proxy/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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
                {chartData.map((entry, index) => (
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              MongoMCP Insights
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className="w-5 h-5 opacity-60" />
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 border-2 border-white dark:border-slate-800 shadow-sm" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero & Search */}
        <section className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            Model Context Protocol + MongoDB
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Ask your data <span className="text-indigo-600 italic">anything.</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Natural language to MongoDB queries, instantly visualized with beautiful charts and data grids.
          </p>

          <form onSubmit={handleAsk} className="relative max-w-2xl mx-auto mt-8 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none ring-0 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <div className="pl-4 opacity-40">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Show me the top 5 most expensive products..."
                className="w-full bg-transparent border-none py-3 px-2 focus:outline-none focus:ring-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !prompt}
                className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
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
                  <Database className="w-3 h-3" />
                  Source Location
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
                    <span className="text-xs font-bold text-slate-400">FIND QUERY</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-500">MQL</span>
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
            <Database className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium">No query executed yet.</p>
            <p className="text-sm">Try searching for something like &quot;list all users in New York&quot;</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-12 space-y-6">
            <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-[400px] bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
        Built with Model Context Protocol &amp; Vercel AI SDK
      </footer>
    </div>
  );
}
