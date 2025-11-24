import React, { useState } from 'react';
import { 
  Wand2, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles,
  Loader2,
  Upload,
  Aperture,
  Maximize,
  AlertCircle
} from 'lucide-react';
import { ModelId, AspectRatio, ImageSize, GeneratedImage } from './types';
import { generateImageContent } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState<string>('');
  const [model, setModel] = useState<ModelId>(ModelId.NANO);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
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
      const urls = await generateImageContent({
        model,
        prompt: prompt || (referenceImage ? "Describe this image and modify it" : ""),
        imageFile: referenceImage,
        aspectRatio,
        imageSize
      });

      const newImages: GeneratedImage[] = urls.map(url => ({
        id: crypto.randomUUID(),
        url,
        prompt,
        model: model === ModelId.NANO_PRO ? 'Nano Pro' : 'Nano',
        timestamp: Date.now()
      }));

      setHistory(prev => [...newImages, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-${id}.png`;
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
            <Aperture className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Gemini 绘图</h1>
        </div>
        <div className="hidden md:block text-[10px] font-mono border border-black px-2 py-1 rounded-full font-bold uppercase">
          Cloudflare Deploy
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-6 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-[420px] flex-shrink-0 space-y-8">
          
          <div className="space-y-8">
            
            {/* Model Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> 模型选择
              </label>
              <div className="grid grid-cols-2 gap-0 border-2 border-black bg-white">
                <button
                  onClick={() => setModel(ModelId.NANO)}
                  className={`py-4 px-4 text-left transition-colors relative border-r-2 border-black last:border-r-0 ${
                    model === ModelId.NANO 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <div className="text-sm font-bold">Nano (Flash)</div>
                  <div className={`text-[10px] mt-1 font-medium ${model === ModelId.NANO ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    极速 / 基础画质
                  </div>
                </button>
                <button
                  onClick={() => setModel(ModelId.NANO_PRO)}
                  className={`py-4 px-4 text-left transition-colors relative ${
                    model === ModelId.NANO_PRO 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <div className="text-sm font-bold">Nano Pro</div>
                  <div className={`text-[10px] mt-1 font-medium ${model === ModelId.NANO_PRO ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Pro / 4K / 高细节
                  </div>
                </button>
              </div>
            </div>

            {/* Resolution Settings (Pro Only) */}
            <div className={`transition-all duration-300 ${model !== ModelId.NANO_PRO ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
               <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex items-center gap-2">
                 <Maximize className="w-3 h-3" /> 分辨率 (仅 Pro 模型)
               </label>
               <div className="flex border-2 border-black divide-x-2 divide-black">
                 {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                   <button
                     key={size}
                     onClick={() => setImageSize(size)}
                     className={`flex-1 py-3 text-sm font-bold transition-colors ${
                       imageSize === size && model === ModelId.NANO_PRO
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
               <label className="text-xs font-bold uppercase tracking-widest mb-3 block">画面比例</label>
               <div className="grid grid-cols-5 gap-2">
                 {(['1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map((ratio) => (
                   <button
                     key={ratio}
                     onClick={() => setAspectRatio(ratio)}
                     className={`py-2 text-xs font-bold border-2 transition-all ${
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

            {/* Reference Image Upload */}
             <div>
               <label className="text-xs font-bold uppercase tracking-widest mb-3 block flex justify-between items-center">
                 <span>参考图 (垫图/改图)</span>
                 {referenceImage && (
                   <button onClick={clearReferenceImage} className="text-black underline text-xs hover:no-underline flex items-center gap-1 font-bold">
                     <Trash2 className="w-3 h-3" /> 清除图片
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
                   className={`w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed cursor-pointer transition-all ${
                     referenceImage 
                     ? 'border-black bg-zinc-50' 
                     : 'border-zinc-300 hover:border-black hover:bg-zinc-50'
                   }`}
                 >
                   {referenceImage ? (
                      <div className="text-center px-4">
                        <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                        <span className="block truncate max-w-[200px] text-xs font-bold">{referenceImage.name}</span>
                      </div>
                   ) : (
                      <>
                        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
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
              <div className="absolute bottom-3 right-3 text-[10px] font-bold text-zinc-300 pointer-events-none uppercase">
                Input Prompt
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-white border-2 border-black flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-4 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                loading ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none border-zinc-200 translate-x-[2px] translate-y-[2px]' : 'bg-black text-white hover:bg-zinc-800'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在创作中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  开始生成
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Gallery */}
        <div className="flex-1 min-w-0">
          <div className="mb-8 pb-4 border-b-2 border-black flex items-end justify-between">
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Gallery</h2>
            <span className="text-xs font-mono font-bold border border-black px-2 py-1">
              {history.length.toString().padStart(2, '0')} IMAGES
            </span>
          </div>

          {history.length === 0 ? (
            <div className="h-[600px] flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-200 bg-zinc-50/30">
              <Sparkles className="w-16 h-16 mb-4 opacity-20 text-black" />
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
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                       <button 
                         onClick={() => downloadImage(item.url, item.id)}
                         className="bg-black text-white px-8 py-4 font-black uppercase tracking-wider text-sm hover:scale-105 transition-transform border-2 border-black flex items-center gap-2"
                       >
                         <Maximize className="w-4 h-4" />
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
};

export default App;