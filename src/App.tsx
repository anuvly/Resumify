import { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Star, 
  Target, 
  Layout, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisResult {
  score: number;
  summary: string;
  skills: string[];
  missingSkills: string[];
  suggestions: string;
  formatting: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF file.');
    }
  };

  const analyzeResume = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // 1. Upload to backend to extract text
      const formData = new FormData();
      formData.append('resume', file);

      const uploadResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to extract text from resume.');
      }

      const { text } = await uploadResponse.json();

      // 2. Call Gemini for analysis
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Using flash for speed
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert HR recruiter and resume optimizer. Analyze the following resume text and provide a detailed evaluation in JSON format.
                
                Resume Text:
                ${text}
                
                The JSON should follow this schema:
                {
                  "score": number (0-100),
                  "summary": "A brief 2-3 sentence overview of the candidate's profile",
                  "skills": ["List of top 5-8 technical and soft skills detected"],
                  "missingSkills": ["List of 3-5 relevant skills or keywords that could strengthen the resume"],
                  "suggestions": "Markdown formatted list of actionable improvements",
                  "formatting": "Brief feedback on resume layout and readability"
                }`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.STRING },
              formatting: { type: Type.STRING }
            },
            required: ["score", "summary", "skills", "missingSkills", "suggestions", "formatting"]
          }
        }
      });

      const analysis = JSON.parse(response.text || '{}');
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-2 bg-zinc-900 rounded-2xl mb-4"
          >
            <Zap className="w-6 h-6 text-emerald-400" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-zinc-900 tracking-tight sm:text-5xl"
          >
            AI Resume Analyzer
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto"
          >
            Upload your resume to get instant feedback, score your profile, and discover how to stand out to recruiters.
          </motion.p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {!result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
            >
              <div 
                className={cn(
                  "p-12 text-center border-2 border-dashed transition-colors cursor-pointer",
                  file ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 hover:border-zinc-300"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile && droppedFile.type === 'application/pdf') {
                    setFile(droppedFile);
                    setError(null);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform",
                    file ? "bg-emerald-100 text-emerald-600 scale-110" : "bg-zinc-100 text-zinc-400"
                  )}>
                    {file ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                  </div>
                  
                  {file ? (
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">{file.name}</p>
                      <p className="text-sm text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">Click to upload or drag and drop</p>
                      <p className="text-sm text-zinc-500 mt-1">PDF files only (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-zinc-500">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Your data is processed securely
                </div>
                <button
                  disabled={!file || isAnalyzing}
                  onClick={analyzeResume}
                  className={cn(
                    "inline-flex items-center px-6 py-3 rounded-xl font-semibold transition-all shadow-sm",
                    !file || isAnalyzing 
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" 
                      : "bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-md active:scale-95"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Resume
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-zinc-900 rounded-3xl p-8 text-white flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star className="w-24 h-24" />
                  </div>
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-zinc-800"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * result.score) / 100}
                        className="text-emerald-400 transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold">{result.score}%</span>
                    </div>
                  </div>
                  <p className="mt-4 font-medium text-zinc-400 uppercase tracking-widest text-xs">Resume Score</p>
                </div>

                <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Executive Summary</h3>
                  <p className="text-zinc-600 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Detected Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium border border-zinc-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg mr-3">
                      <Target className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Missing Keywords</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Suggestions */}
              <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Actionable Suggestions</h3>
                </div>
                <div className="markdown-body prose prose-zinc max-w-none">
                  <ReactMarkdown>{result.suggestions}</ReactMarkdown>
                </div>
              </div>

              {/* Formatting Feedback */}
              <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-zinc-100 rounded-lg mr-3">
                    <Layout className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Formatting & Layout</h3>
                </div>
                <p className="text-zinc-600">{result.formatting}</p>
              </div>

              {/* Reset Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={reset}
                  className="inline-flex items-center px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Analyze Another Resume
                </button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start text-red-700"
            >
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-zinc-400 text-sm">
          <p>© 2026 AI Resume Analyzer • Powered by Gemini AI</p>
        </footer>
      </div>
    </div>
  );
}
