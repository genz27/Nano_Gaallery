/**
 * Gz'nano (Gemini Nano Gallery) - Cloudflare Worker Version
 * 
 * 部署说明:
 * 1. 在 Cloudflare Workers 创建一个新 Worker。
 * 2. 将此代码粘贴到 worker.js。
 * 3. 在 Settings -> Variables and Secrets 中添加变量:
 *    - GEMINI_API_KEY: (必填) 您的 Google Gemini API Key
 *    - ACCESS_CODE: (可选) 设置访问密码，设置后用户必须输入密码才能生图
 *    - GEMINI_BASE_URL: (可选) 自定义 API Base URL，例如 https://my-proxy.com (末尾不要带 slash)，默认为 https://generativelanguage.googleapis.com
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 处理 API 请求 (后端逻辑)
    if (request.method === 'POST' && url.pathname === '/api/generate') {
      return await handleGenerateRequest(request, env);
    }

    // 2. 处理前端页面请求 (返回内嵌的 HTML)
    return new Response(HTML_CONTENT, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  },
};

/**
 * 处理生成请求，调用 Google Gemini API
 */
async function handleGenerateRequest(request, env) {
  // 1. 检查 API Key
  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: '服务端未配置 GEMINI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. 检查访问密码 (如果设置了)
  if (env.ACCESS_CODE) {
    const authHeader = request.headers.get('x-access-code');
    // 简单的比对验证
    if (!authHeader || authHeader !== env.ACCESS_CODE) {
      return new Response(JSON.stringify({ error: '访问密码错误或未授权', code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const { model, prompt, images, aspectRatio, imageSize } = await request.json();

    // 3. 构建 API URL (支持自定义 Base URL)
    const baseUrl = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
    // 移除可能存在的末尾斜杠
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = `${cleanBaseUrl}/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const parts = [];
    
    // 放入参考图
    if (images && Array.isArray(images)) {
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data 
          }
        });
      });
    }

    // 放入提示词
    if (prompt) {
      parts.push({ text: prompt });
    }

    const generationConfig = {
      imageConfig: {
        aspectRatio: aspectRatio || '1:1'
      }
    };

    if (model === 'gemini-3-pro-image-preview' && imageSize) {
      generationConfig.imageConfig.imageSize = imageSize; 
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: generationConfig
    };

    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      try {
        const errJson = JSON.parse(errorText);
        throw new Error(errJson.error?.message || errorText);
      } catch (e) {
        throw new Error(`Google API Error (${googleResponse.status}): ${errorText}`);
      }
    }

    const data = await googleResponse.json();
    const generatedImages = [];
    
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImages.push(`data:${mime};base64,${part.inlineData.data}`);
        }
      }
    }

    if (generatedImages.length === 0) {
        const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
        if (textPart) {
            throw new Error(`生成失败: ${textPart.text}`);
        }
        throw new Error('API 返回成功但未包含图片数据');
    }

    return new Response(JSON.stringify({ images: generatedImages }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 前端 HTML 代码
 */
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gz'nano</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/svg+xml" href="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
      body { font-family: 'Noto Sans SC', sans-serif; background-color: #fafafa; color: #18181b; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    </style>
    <!-- React & Babel -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;

        // --- IndexedDB Manager ---
        const DB_NAME = 'GeminiGalleryDB';
        const DB_VERSION = 1;
        const STORE_NAME = 'images';

        const dbHelper = {
          open: () => {
            return new Promise((resolve, reject) => {
              const request = indexedDB.open(DB_NAME, DB_VERSION);
              request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                  db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
              };
              request.onsuccess = (event) => resolve(event.target.result);
              request.onerror = (event) => reject(event.target.error);
            });
          },
          add: async (image) => {
            const db = await dbHelper.open();
            return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.add(image);
              req.onsuccess = () => resolve(true);
              req.onerror = () => reject(req.error);
            });
          },
          getAll: async () => {
            const db = await dbHelper.open();
            return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readonly');
              const store = tx.objectStore(STORE_NAME);
              const req = store.getAll();
              req.onsuccess = () => resolve(req.result.reverse());
              req.onerror = () => reject(req.error);
            });
          },
          clear: async () => {
             const db = await dbHelper.open();
             return new Promise((resolve, reject) => {
               const tx = db.transaction(STORE_NAME, 'readwrite');
               const store = tx.objectStore(STORE_NAME);
               const req = store.clear();
               req.onsuccess = () => resolve(true);
               req.onerror = () => reject(req.error);
             });
          }
        };

        // --- Constants & Icons ---
        const MODELS = {
            NANO: 'gemini-2.5-flash-image',
            NANO_PRO: 'gemini-3-pro-image-preview'
        };

        const Icons = {
            Aperture: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" x2="20.05" y1="8" y2="17.94"/><line x1="9.69" x2="21.17" y1="8" y2="8"/><line x1="7.38" x2="14.69" y1="12" y2="2.06"/><line x1="9.69" x2="3.95" y1="16" y2="6.06"/><line x1="14.31" x2="2.83" y1="16" y2="16"/><line x1="16.62" x2="9.31" y1="12" y2="21.94"/></svg>,
            Wand2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>,
            Trash2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
            Sparkles: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 7h4"/><path d="M3 5h4"/></svg>,
            Loader2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
            Upload: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
            Maximize: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>,
            AlertCircle: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
            X: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>,
            Github: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>,
            Download: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
            Lock: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        };

        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                   const result = reader.result;
                   const base64 = result.split(',')[1];
                   resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        function App() {
            const [prompt, setPrompt] = useState('');
            const [model, setModel] = useState(MODELS.NANO);
            const [aspectRatio, setAspectRatio] = useState('1:1');
            const [imageSize, setImageSize] = useState('1K');
            const [referenceImages, setReferenceImages] = useState([]);
            const [history, setHistory] = useState([]);
            const [error, setError] = useState(null);
            
            // Pending Requests Queue
            const [pendingRequests, setPendingRequests] = useState([]);
            
            // UI States
            const [selectedImage, setSelectedImage] = useState(null);
            const [showPasswordModal, setShowPasswordModal] = useState(false);
            const [accessCodeInput, setAccessCodeInput] = useState('');

            useEffect(() => {
                dbHelper.getAll().then(setHistory).catch(console.error);
            }, []);

            const handleImageUpload = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    setReferenceImages(prev => [...prev, ...Array.from(e.target.files)]);
                }
                e.target.value = '';
            };

            const checkAndGenerate = () => {
                // 检查本地是否有密码缓存
                const savedCode = localStorage.getItem('gz_access_code');
                if (savedCode) {
                    doGenerate(savedCode);
                } else {
                    // 没有密码，弹出输入框
                    setShowPasswordModal(true);
                }
            };

            const handlePasswordSubmit = () => {
                if (accessCodeInput.trim()) {
                    localStorage.setItem('gz_access_code', accessCodeInput.trim());
                    setShowPasswordModal(false);
                    doGenerate(accessCodeInput.trim());
                }
            };

            const doGenerate = async (code) => {
                if (!prompt.trim() && referenceImages.length === 0) {
                    setError("请输入提示词或上传参考图片");
                    return;
                }
                setError(null);

                // Create a pending request item
                const tempId = crypto.randomUUID();
                const newPending = {
                    id: tempId,
                    prompt: prompt,
                    timestamp: Date.now(),
                    model: model === MODELS.NANO_PRO ? 'Nano Pro' : 'Nano'
                };

                // Add to pending queue immediately
                setPendingRequests(prev => [newPending, ...prev]);

                try {
                    const imagesPayload = await Promise.all(referenceImages.map(async (file) => ({
                        data: await fileToBase64(file),
                        mimeType: file.type
                    })));

                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-access-code': code || '' 
                        },
                        body: JSON.stringify({
                            model,
                            prompt: prompt || (referenceImages.length > 0 ? "Describe these images and modify them" : ""),
                            images: imagesPayload,
                            aspectRatio,
                            imageSize
                        })
                    });

                    const data = await response.json();

                    if (response.status === 401) {
                        // Unauthorized
                        localStorage.removeItem('gz_access_code');
                        setShowPasswordModal(true);
                        setAccessCodeInput('');
                        setError("访问密码错误，请重新输入");
                        setPendingRequests(prev => prev.filter(p => p.id !== tempId));
                        return;
                    }

                    if (!response.ok) {
                        throw new Error(data.error || 'Request failed');
                    }

                    const urls = data.images;
                    const newImages = urls.map(url => ({
                        id: crypto.randomUUID(),
                        url,
                        prompt: newPending.prompt,
                        model: newPending.model,
                        timestamp: Date.now()
                    }));

                    for (const img of newImages) {
                        await dbHelper.add(img);
                    }
                    
                    setHistory(prev => [...newImages, ...prev]);

                } catch (err) {
                    console.error(err);
                    setError(err.message || "生成过程中发生错误");
                } finally {
                    // Remove from pending queue
                    setPendingRequests(prev => prev.filter(p => p.id !== tempId));
                }
            };

            const downloadImage = (url, id) => {
                const link = document.createElement('a');
                link.href = url;
                link.download = `gz-nano-${id}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            return (
                <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
                    {/* Password Modal */}
                    {showPasswordModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="bg-white p-8 w-full max-w-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
                                <div className="flex flex-col items-center gap-4 mb-6">
                                    <div className="p-3 bg-black text-white rounded-full">
                                        <Icons.Lock className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase">需要访问密码</h3>
                                    <p className="text-xs text-center text-zinc-500 font-bold">此 Worker 已设置访问保护<br/>请输入密码继续</p>
                                </div>
                                <input
                                    type="password"
                                    value={accessCodeInput}
                                    onChange={(e) => setAccessCodeInput(e.target.value)}
                                    placeholder="Enter Access Code"
                                    className="w-full p-3 border-2 border-black mb-4 font-bold text-center focus:outline-none focus:bg-zinc-50"
                                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                                />
                                <button 
                                    onClick={handlePasswordSubmit}
                                    className="w-full bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                                >
                                    确认
                                </button>
                                <button 
                                    onClick={() => setShowPasswordModal(false)}
                                    className="w-full mt-2 py-2 text-xs font-bold text-zinc-500 hover:text-black uppercase"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Lightbox */}
                    {selectedImage && (
                        <div 
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8 animate-fadeIn"
                            onClick={() => setSelectedImage(null)}
                        >
                            <button 
                                className="absolute top-4 right-4 text-white hover:text-zinc-300 z-10 bg-white/10 rounded-full p-2 transition-colors"
                                onClick={() => setSelectedImage(null)}
                            >
                                <Icons.X className="w-8 h-8" />
                            </button>
                            <img 
                                src={selectedImage.url} 
                                className="max-w-full max-h-full object-contain shadow-2xl" 
                                onClick={(e) => e.stopPropagation()} 
                            />
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={() => downloadImage(selectedImage.url, selectedImage.id)} 
                                    className="bg-white text-black px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-zinc-200 hover:scale-105 transition-all rounded-full flex items-center gap-2 shadow-lg border-2 border-white"
                                >
                                    <Icons.Download className="w-4 h-4" />
                                    保存原图
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b-2 border-black z-40 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-none">
                                <Icons.Aperture className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-black tracking-tighter uppercase">Gz'nano</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="https://github.com/genz27/Nano_Gaallery" target="_blank" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                                <Icons.Github className="w-5 h-5" />
                                <span className="hidden md:inline text-xs font-bold uppercase">GitHub</span>
                            </a>
                            <div className="hidden md:block text-[10px] font-mono border border-black px-2 py-1 rounded-full font-bold uppercase">
                                Worker Mode
                            </div>
                        </div>
                    </header>

                    <main className="pt-24 pb-12 px-4 md:px-6 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8">
                        {/* Controls */}
                        <div className="w-full lg:w-[380px] flex-shrink-0 space-y-6">
                            <div className="space-y-6">
                                {/* Model Selection */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <Icons.Sparkles className="w-3 h-3" /> 模型选择
                                    </label>
                                    <div className="grid grid-cols-2 gap-0 border-2 border-black bg-white">
                                        <button
                                            onClick={() => setModel(MODELS.NANO)}
                                            className={`py-3 px-3 text-left transition-colors relative border-r-2 border-black ${
                                                model === MODELS.NANO ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                                            }`}
                                        >
                                            <div className="text-sm font-bold">Nano</div>
                                            <div className={`text-[10px] mt-1 font-medium ${model === MODELS.NANO ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                Flash / 极速
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setModel(MODELS.NANO_PRO)}
                                            className={`py-3 px-3 text-left transition-colors relative ${
                                                model === MODELS.NANO_PRO ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                                            }`}
                                        >
                                            <div className="text-sm font-bold">Nano Pro</div>
                                            <div className={`text-[10px] mt-1 font-medium ${model === MODELS.NANO_PRO ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                Pro / 4K
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Resolution Settings (Pro Only) */}
                                <div className={`transition-all duration-300 ${model !== MODELS.NANO_PRO ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-2 block flex items-center gap-2">
                                     <Icons.Maximize className="w-3 h-3" /> 分辨率
                                   </label>
                                   <div className="flex border-2 border-black divide-x-2 divide-black">
                                     {['1K', '2K', '4K'].map((size) => (
                                       <button
                                         key={size}
                                         onClick={() => setImageSize(size)}
                                         className={`flex-1 py-2 text-xs font-bold transition-colors ${
                                           imageSize === size && model === MODELS.NANO_PRO
                                           ? 'bg-black text-white'
                                           : 'bg-white text-black hover:bg-zinc-100'
                                         }`}
                                       >
                                         {size}
                                       </button>
                                     ))}
                                   </div>
                                </div>

                                {/* Aspect Ratio */}
                                <div>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-2 block">画面比例</label>
                                   <div className="grid grid-cols-5 gap-1">
                                     {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                                       <button
                                         key={ratio}
                                         onClick={() => setAspectRatio(ratio)}
                                         className={`py-2 text-[10px] font-bold border-2 transition-all ${
                                           aspectRatio === ratio
                                           ? 'bg-black text-white border-black'
                                           : 'bg-white text-black border-zinc-200 hover:border-black'
                                         }`}
                                       >
                                         {ratio}
                                       </button>
                                     ))}
                                   </div>
                                </div>

                                {/* Reference Images */}
                                <div>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-2 block flex justify-between items-center">
                                     <span>参考图</span>
                                     {referenceImages.length > 0 && (
                                       <button onClick={() => setReferenceImages([])} className="text-black underline text-xs hover:no-underline flex items-center gap-1 font-bold">
                                         <Icons.Trash2 className="w-3 h-3" /> 清除
                                       </button>
                                     )}
                                   </label>
                                   
                                   <div className="space-y-2">
                                       <div className="relative group">
                                         <input 
                                           id="file-upload"
                                           type="file" 
                                           multiple
                                           accept="image/*" 
                                           onChange={handleImageUpload}
                                           className="hidden"
                                         />
                                         <label 
                                           htmlFor="file-upload"
                                           className="w-full h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed cursor-pointer transition-all border-zinc-300 hover:border-black hover:bg-zinc-50"
                                         >
                                            <Icons.Upload className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
                                            <span className="text-[10px] font-bold text-zinc-500 group-hover:text-black transition-colors">添加图片 (支持多选)</span>
                                         </label>
                                       </div>

                                       {referenceImages.length > 0 && (
                                         <div className="grid grid-cols-4 gap-2">
                                           {referenceImages.map((file, idx) => (
                                             <div key={idx} className="relative aspect-square border-2 border-black bg-zinc-100 group">
                                               <img 
                                                 src={URL.createObjectURL(file)} 
                                                 className="w-full h-full object-cover" 
                                                 onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                               />
                                               <button 
                                                 onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                                                 className="absolute top-0 right-0 bg-black text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                               >
                                                 <Icons.X className="w-3 h-3" />
                                               </button>
                                             </div>
                                           ))}
                                         </div>
                                       )}
                                   </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t-2 border-black">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="输入提示词..."
                                    className="w-full h-28 p-3 bg-white border-2 border-black focus:ring-4 focus:ring-zinc-100 focus:outline-none transition-all text-sm font-medium placeholder:text-zinc-400 resize-none block"
                                />
                                
                                {error && (
                                  <div className="p-2 bg-white border-2 border-black flex items-start gap-2">
                                    <Icons.AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs font-bold">{error}</p>
                                  </div>
                                )}

                                <button
                                  onClick={checkAndGenerate}
                                  className="w-full py-4 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-black text-white hover:bg-zinc-800"
                                >
                                  <Icons.Wand2 className="w-4 h-4" />
                                  开始生成
                                </button>
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-6 pb-2 border-b-2 border-black flex items-end justify-between">
                            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Gallery</h2>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => { if(confirm('清空历史?')) dbHelper.clear().then(() => setHistory([])); }} className="text-[10px] font-bold uppercase hover:underline text-zinc-500 mr-2">
                                    清空
                                </button>
                                <span className="text-xs font-mono font-bold border border-black px-2 py-1">
                                  {(history.length + pendingRequests.length).toString().padStart(2, '0')}
                                </span>
                            </div>
                          </div>

                          {(history.length === 0 && pendingRequests.length === 0) ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-200 bg-zinc-50/30">
                              <Icons.Sparkles className="w-12 h-12 mb-2 opacity-20 text-black" />
                              <p className="font-bold text-zinc-400 text-sm">暂无作品</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                              
                              {/* Pending Requests Cards */}
                              {pendingRequests.map((req) => (
                                <div key={req.id} className="group relative bg-white border-2 border-black animate-pulse">
                                  <div className="aspect-square w-full bg-zinc-50 border-b-2 border-black flex flex-col items-center justify-center gap-2">
                                      <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Processing...</p>
                                  </div>
                                  <div className="p-3 opacity-50">
                                    <p className="text-[10px] font-bold truncate">{req.prompt}</p>
                                  </div>
                                </div>
                              ))}

                              {/* History Cards */}
                              {history.map((item) => (
                                <div key={item.id} className="group relative bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-pointer" onClick={() => setSelectedImage(item)}>
                                  <div className="aspect-square w-full overflow-hidden bg-zinc-100 relative border-b-2 border-black">
                                    <img 
                                      src={item.url} 
                                      alt={item.prompt} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-[10px] font-bold text-zinc-900 line-clamp-1 mb-2" title={item.prompt}>
                                      {item.prompt || 'Image to Image'}
                                    </p>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] uppercase font-bold tracking-wider bg-zinc-100 border border-zinc-200 px-1.5 py-0.5">
                                        {item.model}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    </main>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
