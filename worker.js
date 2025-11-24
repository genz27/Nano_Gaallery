/**
 * Gemini Nano/Pro Image Generator - Cloudflare Worker Version
 * 
 * 部署说明:
 * 1. 在 Cloudflare Workers 创建一个新 Worker。
 * 2. 将此代码粘贴到 worker.js。
 * 3. 在 Settings -> Variables and Secrets 中添加变量:
 *    - GEMINI_API_KEY: 您的 Google Gemini API Key
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
  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: '服务端未配置 GEMINI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { model, prompt, imageBase64, mimeType, aspectRatio, imageSize } = await request.json();

    // 构建 Google API URL
    // 使用 v1beta 版本以支持最新的模型特性
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    // 构建请求体 (Payload)
    const parts = [];
    
    // 1. 放入图片 (如果有)
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64
        }
      });
    }

    // 2. 放入文本提示词
    if (prompt) {
      parts.push({ text: prompt });
    }

    // 3. 构建配置参数
    // 注意：REST API 的结构与 SDK 略有不同，需要根据文档构建 generationConfig
    const generationConfig = {
      // 这里的 imageConfig 结构参考了 Gemini API 对 Imagen/Nano 的定义
      // 某些模型可能需要特定的参数位置，这里使用了通用的 generationConfig 嵌套
    };

    // 构建特定的 Image Config
    // 对于 gemini-3-pro-image-preview 和 gemini-2.5-flash-image
    // imageConfig 通常作为 generationConfig 的一部分
    const imageConfig = {
      aspectRatio: aspectRatio || '1:1'
    };

    if (model === 'gemini-3-pro-image-preview' && imageSize) {
      // 只有 Pro 模型支持 imageSize
      // 注意：API 期望的可能是 "1024x1024" 这种格式，或者枚举 "1K", "2K"
      // 根据最新的 REST API spec，对于 Gemini 3 Pro Image，参数通常是：
      // config: { imageConfig: { imageSize: '1K' } }
      imageConfig.imageSize = imageSize; 
    }

    // 将 imageConfig 加入 generationConfig
    // 注意：如果是 SDK，是 config.imageConfig。REST API 中是 generationConfig
    // 但对于某些特定的新模型，可能直接在顶层或 generationConfig 内部有所不同。
    // 这里采用最通用的做法：放入 generationConfig
    // 如果模型不识别，通常会忽略或报错
    // 对于 Nano/Pro Image 模型，REST API body 结构通常如下：
    /*
      {
        "contents": [...],
        "generationConfig": {
           "imageConfig": { ... }
        }
      }
    */
    generationConfig.imageConfig = imageConfig;

    const payload = {
      contents: [{ parts }],
      generationConfig: generationConfig
    };

    // 发起请求
    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      throw new Error(`Google API Error (${googleResponse.status}): ${errorText}`);
    }

    const data = await googleResponse.json();

    // 解析返回结果，提取图片
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
        // 尝试查找文本错误信息（例如安全拦截）
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
 * 包含了 React, Tailwind, Lucide Icons 和应用逻辑
 * 使用 Babel Standalone 在浏览器端编译 JSX (为了保持单文件部署的便捷性)
 */
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini 极简绘图 (Worker)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/svg+xml" href="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
      body { font-family: 'Noto Sans SC', sans-serif; background-color: #fafafa; color: #18181b; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
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
        const { useState, useEffect } = React;

        // Model Definitions
        const MODELS = {
            NANO: 'gemini-2.5-flash-image',
            NANO_PRO: 'gemini-3-pro-image-preview'
        };

        // Icons (Lucide implementation for React via SVG directly to avoid heavy library import issues in standalone)
        const Icons = {
            Aperture: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" x2="20.05" y1="8" y2="17.94"/><line x1="9.69" x2="21.17" y1="8" y2="8"/><line x1="7.38" x2="14.69" y1="12" y2="2.06"/><line x1="9.69" x2="3.95" y1="16" y2="6.06"/><line x1="14.31" x2="2.83" y1="16" y2="16"/><line x1="16.62" x2="9.31" y1="12" y2="21.94"/></svg>,
            Wand2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>,
            Image: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
            Trash2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
            Sparkles: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 7h4"/><path d="M3 5h4"/></svg>,
            Loader2: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
            Upload: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
            Maximize: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>,
            AlertCircle: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        };

        // File helper
        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                   const result = reader.result;
                   // remove data:image/xxx;base64, prefix
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
            const [referenceImage, setReferenceImage] = useState(null);
            const [loading, setLoading] = useState(false);
            const [history, setHistory] = useState([]);
            const [error, setError] = useState(null);

            const handleImageUpload = (e) => {
                if (e.target.files && e.target.files[0]) {
                    setReferenceImage(e.target.files[0]);
                }
            };

            const clearReferenceImage = () => {
                setReferenceImage(null);
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';
            };

            const handleGenerate = async () => {
                if (!prompt.trim() && !referenceImage) {
                    setError("请输入提示词或上传参考图片");
                    return;
                }

                setLoading(true);
                setError(null);

                try {
                    let imageBase64 = null;
                    if (referenceImage) {
                        imageBase64 = await fileToBase64(referenceImage);
                    }

                    // Call the Worker API (Server-side)
                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            prompt: prompt || (referenceImage ? "Describe this image and modify it" : ""),
                            imageBase64,
                            mimeType: referenceImage?.type,
                            aspectRatio,
                            imageSize
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Request failed');
                    }

                    const urls = data.images;
                    const newImages = urls.map(url => ({
                        id: crypto.randomUUID(),
                        url,
                        prompt,
                        model: model === MODELS.NANO_PRO ? 'Nano Pro' : 'Nano',
                        timestamp: Date.now()
                    }));

                    setHistory(prev => [...newImages, ...prev]);

                } catch (err) {
                    console.error(err);
                    setError(err.message || "生成过程中发生错误");
                } finally {
                    setLoading(false);
                }
            };

            const downloadImage = (url, id) => {
                const link = document.createElement('a');
                link.href = url;
                link.download = \`gemini-\${id}.png\`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            return (
                <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
                    {/* Header */}
                    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b-2 border-black z-40 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-none">
                                <Icons.Aperture className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-black tracking-tighter uppercase">Gemini 绘图</h1>
                        </div>
                        <div className="hidden md:block text-[10px] font-mono border border-black px-2 py-1 rounded-full font-bold uppercase">
                            Worker Mode
                        </div>
                    </header>

                    <main className="pt-24 pb-12 px-4 md:px-6 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-12">
                        {/* Controls */}
                        <div className="w-full lg:w-[420px] flex-shrink-0 space-y-8">
                            <div className="space-y-8">
                                {/* Model Selection */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex items-center gap-2">
                                        <Icons.Sparkles className="w-3 h-3" /> 模型选择
                                    </label>
                                    <div className="grid grid-cols-2 gap-0 border-2 border-black bg-white">
                                        <button
                                            onClick={() => setModel(MODELS.NANO)}
                                            className={\`py-4 px-4 text-left transition-colors relative border-r-2 border-black \${
                                                model === MODELS.NANO ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                                            }\`}
                                        >
                                            <div className="text-sm font-bold">Nano (Flash)</div>
                                            <div className={\`text-[10px] mt-1 font-medium \${model === MODELS.NANO ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                                                极速 / 基础画质
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setModel(MODELS.NANO_PRO)}
                                            className={\`py-4 px-4 text-left transition-colors relative \${
                                                model === MODELS.NANO_PRO ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                                            }\`}
                                        >
                                            <div className="text-sm font-bold">Nano Pro</div>
                                            <div className={\`text-[10px] mt-1 font-medium \${model === MODELS.NANO_PRO ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                                                Pro / 4K / 高细节
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Resolution Settings (Pro Only) */}
                                <div className={\`transition-all duration-300 \${model !== MODELS.NANO_PRO ? 'opacity-30 pointer-events-none grayscale' : ''}\`}>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex items-center gap-2">
                                     <Icons.Maximize className="w-3 h-3" /> 分辨率 (仅 Pro 模型)
                                   </label>
                                   <div className="flex border-2 border-black divide-x-2 divide-black">
                                     {['1K', '2K', '4K'].map((size) => (
                                       <button
                                         key={size}
                                         onClick={() => setImageSize(size)}
                                         className={\`flex-1 py-3 text-sm font-bold transition-colors \${
                                           imageSize === size && model === MODELS.NANO_PRO
                                           ? 'bg-black text-white'
                                           : 'bg-white text-black hover:bg-zinc-100'
                                         }\`}
                                       >
                                         {size}
                                       </button>
                                     ))}
                                   </div>
                                </div>

                                {/* Aspect Ratio */}
                                <div>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-3 block">画面比例</label>
                                   <div className="grid grid-cols-5 gap-2">
                                     {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                                       <button
                                         key={ratio}
                                         onClick={() => setAspectRatio(ratio)}
                                         className={\`py-2 text-xs font-bold border-2 transition-all \${
                                           aspectRatio === ratio
                                           ? 'bg-black text-white border-black'
                                           : 'bg-white text-black border-zinc-200 hover:border-black'
                                         }\`}
                                       >
                                         {ratio}
                                       </button>
                                     ))}
                                   </div>
                                </div>

                                {/* Reference Image Upload */}
                                <div>
                                   <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex justify-between items-center">
                                     <span>参考图 (垫图/改图)</span>
                                     {referenceImage && (
                                       <button onClick={clearReferenceImage} className="text-black underline text-xs hover:no-underline flex items-center gap-1 font-bold">
                                         <Icons.Trash2 className="w-3 h-3" /> 清除图片
                                       </button>
                                     )}
                                   </label>
                                   <div className="relative group">
                                     <input 
                                       id="file-upload"
                                       type="file" 
                                       accept="image/*" 
                                       onChange={handleImageUpload}
                                       className="hidden"
                                     />
                                     <label 
                                       htmlFor="file-upload"
                                       className={\`w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed cursor-pointer transition-all \${
                                         referenceImage 
                                         ? 'border-black bg-zinc-50' 
                                         : 'border-zinc-300 hover:border-black hover:bg-zinc-50'
                                       }\`}
                                     >
                                       {referenceImage ? (
                                          <div className="text-center px-4">
                                            <Icons.Image className="w-6 h-6 mx-auto mb-2" />
                                            <span className="block truncate max-w-[200px] text-xs font-bold">{referenceImage.name}</span>
                                          </div>
                                       ) : (
                                          <>
                                            <Icons.Upload className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
                                            <span className="text-xs font-bold text-zinc-500 group-hover:text-black transition-colors">点击上传参考图片</span>
                                          </>
                                       )}
                                     </label>
                                   </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t-2 border-black">
                                <div className="relative">
                                  <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="在此输入提示词... (支持中文)"
                                    className="w-full h-32 p-4 bg-white border-2 border-black focus:ring-4 focus:ring-zinc-100 focus:outline-none transition-all text-sm font-medium placeholder:text-zinc-400 resize-none block"
                                  />
                                </div>
                                
                                {error && (
                                  <div className="p-3 bg-white border-2 border-black flex items-start gap-2">
                                    <Icons.AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs font-bold">{error}</p>
                                  </div>
                                )}

                                <button
                                  onClick={handleGenerate}
                                  disabled={loading}
                                  className={\`w-full py-4 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none \${
                                    loading ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none border-zinc-200 translate-x-[2px] translate-y-[2px]' : 'bg-black text-white hover:bg-zinc-800'
                                  }\`}
                                >
                                  {loading ? (
                                    <>
                                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                                      正在创作中...
                                    </>
                                  ) : (
                                    <>
                                      <Icons.Wand2 className="w-4 h-4" />
                                      开始生成
                                    </>
                                  )}
                                </button>
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-8 pb-4 border-b-2 border-black flex items-end justify-between">
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Gallery</h2>
                            <span className="text-xs font-mono font-bold border border-black px-2 py-1">
                              {history.length.toString().padStart(2, '0')} IMAGES
                            </span>
                          </div>

                          {history.length === 0 ? (
                            <div className="h-[600px] flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-200 bg-zinc-50/30">
                              <Icons.Sparkles className="w-16 h-16 mb-4 opacity-20 text-black" />
                              <p className="font-bold text-zinc-400">在此处展示您的创作</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
                              {history.map((item) => (
                                <div key={item.id} className="group relative bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
                                  <div className="aspect-square w-full overflow-hidden bg-zinc-100 relative border-b-2 border-black">
                                    <img 
                                      src={item.url} 
                                      alt={item.prompt} 
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                       <button 
                                         onClick={() => downloadImage(item.url, item.id)}
                                         className="bg-black text-white px-8 py-4 font-black uppercase tracking-wider text-sm hover:scale-105 transition-transform border-2 border-black flex items-center gap-2"
                                       >
                                         <Icons.Maximize className="w-4 h-4" />
                                         下载原图
                                       </button>
                                    </div>
                                  </div>
                                  <div className="p-5">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                      <p className="text-xs font-bold text-zinc-900 line-clamp-2 leading-relaxed">
                                        {item.prompt || '无提示词 (仅基于垫图生成)'}
                                      </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t-2 border-zinc-100">
                                      <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider bg-black text-white px-2 py-0.5">
                                          {item.model}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                                        {new Date(item.timestamp).toLocaleTimeString()}
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
`;
