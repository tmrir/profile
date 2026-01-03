import React, { useState, useRef, useEffect, useCallback } from 'react';
import { INITIAL_DATA } from './constants';
import { ProfileData } from './types';
import { EditableField } from './components/EditableField';
import { ImageEditable } from './components/ImageEditable';
import { Download, RefreshCw, Printer, Loader2, CheckCircle2, Undo, Plus, Trash2, Lightbulb, Rocket, Zap, Target, Star, Award, Building2 } from 'lucide-react';

const App: React.FC = () => {
  const STORAGE_KEY = 'tivro_profile_production_v3';
  const [data, setData] = useState<ProfileData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_DATA,
          ...parsed,
          about: { ...INITIAL_DATA.about, ...parsed.about },
          visionMission: { ...INITIAL_DATA.visionMission, ...parsed.visionMission },
          hero: { ...INITIAL_DATA.hero, ...parsed.hero },
          services: { ...INITIAL_DATA.services, ...parsed.services },
          ceoMessage: { ...INITIAL_DATA.ceoMessage, ...parsed.ceoMessage },
          values: { ...INITIAL_DATA.values, ...parsed.values },
          contact: { ...INITIAL_DATA.contact, ...parsed.contact },
          workProcess: { ...INITIAL_DATA.workProcess, ...parsed.workProcess }
        };
      } catch (e) {
        console.error('Failed to parse saved data, falling back to initial data:', e);
      }
    }
    return INITIAL_DATA;
  });

  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isViewFile = window.location.pathname.includes('tivro-profile-view.html');
    setIsViewMode(params.get('mode') === 'view' || isViewFile);
  }, []);

  const [history, setHistory] = useState<ProfileData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setData(newData);
        } catch (err) {
          console.error('Failed to sync data:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const syncToStorage = useCallback((newData: ProfileData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    // Trigger a custom event for the same window storage updates (if needed, though React usually handles local state)
    // Dispatching toggle to ensure immediate UI feedback if strictly relying on event in some architectures, 
    // but here setData does the job for the *current* window.
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  }, []);

  const addToHistory = useCallback((currentState: ProfileData) => {
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(currentState))]);
  }, []);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setData(previous);
    syncToStorage(previous);
  };

  const updateData = useCallback((path: string[], value: any) => {
    setData(prev => {
      addToHistory(prev); // حفظ النسخة السابقة
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      syncToStorage(newData);
      return newData;
    });
  }, [syncToStorage, addToHistory]);

  // إدارة الخدمات
  const addService = () => {
    setData(prev => {
      addToHistory(prev);
      const newData = { ...prev };
      newData.services.items.push({
        id: `s${Date.now()}`,
        title: "خدمة جديدة",
        points: ["نقطة توضيحية 1"]
      });
      syncToStorage(newData);
      return newData;
    });
  };

  const deleteService = (index: number) => {
    setData(prev => {
      addToHistory(prev);
      const newData = { ...prev };
      newData.services.items.splice(index, 1);
      syncToStorage(newData);
      return newData;
    });
  };

  const addPoint = (serviceIndex: number) => {
    setData(prev => {
      addToHistory(prev);
      const newData = { ...prev };
      newData.services.items[serviceIndex].points.push("نقطة جديدة");
      syncToStorage(newData);
      return newData;
    });
  };

  const deletePoint = (serviceIndex: number, pointIndex: number) => {
    setData(prev => {
      addToHistory(prev);
      const newData = { ...prev };
      newData.services.items[serviceIndex].points.splice(pointIndex, 1);
      syncToStorage(newData);
      return newData;
    });
  };

  const handleDownloadPDF = async () => {
    if (!profileRef.current) return;
    setIsGenerating(true);
    (document.activeElement as HTMLElement)?.blur();
    await new Promise(r => setTimeout(r, 600));

    const element = profileRef.current;

    // A4 dimensions in mm: 210 x 297
    // Convert to pixels at 96 DPI: 794 x 1123
    const opt = {
      margin: 0,
      filename: `Tivro_Full_Profile_2025.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // تقليل الـ scale قليلاً لتجنب مشاكل الذاكرة والحجم الكبير جداً
        useCORS: true,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        height: 1123 * 5, // الارتفاع الكلي المتوقع (5 صفحات)
        windowHeight: 1123 * 5,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-section', // فقط قبل كل قسم لضمان بداية صفحة جديدة
        // تمت إزالة after لتجنب الصفحات الفارغة المزدوجة
      }
    };

    try {
      await (window as any).html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  // مكون فرعي للجانب البصري التجريدي (النمط المطلوب)
  const AbstractVisual = ({ title }: { title: string }) => (
    <div className="hidden lg:flex w-full lg:w-1/2 bg-[#0F2133] relative items-center justify-center p-8 overflow-hidden">
      <div className="abstract-vision"></div>
      <div className="light-beam" style={{ left: '15%' }}></div>
      <div className="light-beam" style={{ left: '45%', transform: 'rotate(25deg)', opacity: 0.1 }}></div>
      <div className="light-beam" style={{ left: '75%', transform: 'rotate(65deg)', opacity: 0.2 }}></div>
      <div className="glowing-circle w-[300px] h-[300px]"></div>
      <div className="glowing-circle w-[450px] h-[450px]" style={{ animationDelay: '1s' }}></div>
      <div className="relative z-10 flex flex-col items-center">
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="48" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="4 4" />
          <path d="M50 20V40M50 60V80M20 50H40M60 50H80" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="50" r="10" fill="#06B6D4" className="animate-pulse" />
        </svg>
        <span className="text-[0.5rem] md:text-[0.6rem] text-slate-500 tracking-[0.3em] md:tracking-[0.4em] uppercase mt-6 md:mt-8">{title}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 selection:bg-cyan-500/30">
      {/* شريط الأدوات العائم - يظهر فقط في وضع التحرير */}
      {!isViewMode && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/10 backdrop-blur-2xl shadow-2xl rounded-full px-6 py-3 border border-white/20 flex items-center gap-4 no-print w-[95%] max-w-2xl justify-between">
          <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex items-center gap-2 bg-cyan-500 text-white px-6 py-2 rounded-full hover:bg-cyan-400 transition-all font-black shadow-lg shadow-cyan-500/20">
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span className="text-sm">{isGenerating ? 'جاري المعالجة...' : 'تنزيل بروفايل PDF'}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={undo} disabled={history.length === 0} className={`p-2 transition-colors ${history.length === 0 ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:text-white'}`} title="تراجع"><Undo size={20} /></button>
            <button onClick={() => window.print()} className="p-2 text-white/70 hover:text-white" title="طباعة"><Printer size={20} /></button>
            <button onClick={() => { if (confirm('إعادة ضبط؟')) setData(INITIAL_DATA); }} className="p-2 text-red-400" title="إعادة تعيين"><RefreshCw size={20} /></button>
          </div>
          {showSaveSuccess && <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] px-3 py-0.5 rounded-full">تم الحفظ تلقائياً</div>}
        </div>
      )}

      {/* حماية وضع العرض: منع التحديد والتفاعل */}
      {isViewMode && (
        <style>{`
          body { 
            user-select: none; 
            -webkit-user-select: none; 
            cursor: default; 
          }
          img { 
            pointer-events: none; 
            -webkit-user-drag: none; 
          }
          /* تعطيل التفاعل مع الأزرار والروابط العامة، ولكن السماح للروابط المخصصة */
          .page-section button {
            pointer-events: none;
            cursor: default;
          }
          .page-section a:not(.clickable-link) {
            pointer-events: none;
            cursor: default;
          }
          .clickable-link {
            cursor: pointer !important;
            pointer-events: auto !important;
          }
        `}</style>
      )}

      {/* الحاوية المركزية - متجاوبة مع الحفاظ على نسبة A4 */}
      <div ref={profileRef} className="w-full max-w-[794px] mx-auto bg-white shadow-2xl overflow-hidden print:overflow-visible print:w-full print:shadow-none">
        {/* تم تثبيت العرض لـ 794px ليتناسب تماماً مع A4 PDF */}

        {/* الصفحة 1: الغلاف - النمط الكامل */}
        <section className="page-section bg-[#0F2133] text-white flex flex-col items-center justify-center text-center px-4 py-8 min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto overflow-hidden relative">
          <div className="glowing-circle w-[300px] h-[300px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-cyan-500/5 -top-20 md:-top-40 -right-20 md:-right-40"></div>
          <div className="z-10 w-full max-w-3xl">
            <ImageEditable readOnly={isViewMode} value={data.hero.logo} onSave={(v) => updateData(['hero', 'logo'], v)} className="w-24 h-24 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto mb-8 md:mb-12 lg:mb-16 rounded-2xl md:rounded-[3rem] border-2 md:border-4 border-white/10 shadow-2xl" />

            <EditableField readOnly={isViewMode} tagName="h2" value={data.hero.brandName} onSave={(v) => updateData(['hero', 'brandName'], v)} className="text-sm md:text-xl lg:text-2xl font-light mb-8 md:mb-12 lg:mb-16 text-cyan-400 tracking-[0.3em] md:tracking-[0.4em] uppercase" />

            <div className="mb-8 md:mb-14 lg:mb-20 space-y-2 md:space-y-4">
              <EditableField readOnly={isViewMode} tagName="h1" value={data.hero.mainTitle} onSave={(v) => updateData(['hero', 'mainTitle'], v)} className="text-3xl md:text-5xl lg:text-7xl font-black leading-tight tracking-wide" />
              <EditableField readOnly={isViewMode} tagName="h1" value={data.hero.highlight} onSave={(v) => updateData(['hero', 'highlight'], v)} className="text-3xl md:text-5xl lg:text-7xl font-black leading-tight text-cyan-400 tracking-wide" />
            </div>

            <div className="w-20 md:w-32 lg:w-48 h-1.5 md:h-2 lg:h-2.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mb-8 md:mb-12 lg:mb-16 rounded-full opacity-80"></div>

            <EditableField readOnly={isViewMode} tagName="p" value={data.hero.subtitle} onSave={(v) => updateData(['hero', 'subtitle'], v)} className="text-lg md:text-2xl lg:text-3xl font-bold opacity-90 tracking-wider leading-relaxed" />
          </div>
          <div className="absolute bottom-4 md:bottom-8 lg:bottom-10 opacity-30 text-[10px] md:text-sm lg:text-base"><EditableField readOnly={isViewMode} value={data.hero.footerText} onSave={(v) => updateData(['hero', 'footerText'], v)} /></div>
        </section>

        {/* الصفحة 2: من نحن - تصميم عصري فاخر وشبابي */}
        <section className="page-section relative bg-white overflow-hidden flex flex-col justify-center min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto">

          {/* خلفية ديناميكية */}
          <div className="absolute inset-0">
            {/* نصف خلفية رمادي فاتح مائل */}
            <div className="absolute top-0 right-0 w-3/4 h-full bg-slate-50 skew-x-12 origin-top-right transform translate-x-1/4"></div>
            {/* شبكة هندسية خفيفة */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#06B6D4 1px, transparent 1px), linear-gradient(to right, #06B6D4 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          </div>

          {/* عناصر بصرية عائمة */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl" style={{ animationDelay: '1s' }}></div>
          <div className="light-beam" style={{ left: '80%', opacity: 0.1, transform: 'rotate(-45deg)' }}></div>

          <div className="container mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">

            {/* المحتوى النصي (الجانب اليمين في RTL) */}
            <div className="w-full md:w-3/5 text-right">
              {/* شارة صغيرة */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-xs font-bold text-cyan-700 tracking-wider">من نحن</span>
              </div>

              {/* العنوان الرئيسي */}
              <div className="relative mb-8">
                <EditableField readOnly={isViewMode} tagName="h2" value={data.about.sectionTitle} onSave={(v) => updateData(['about', 'sectionTitle'], v)} className="text-4xl md:text-5xl font-black text-[#0F2133] leading-[1.2]" />
                <div className="absolute -bottom-3 right-0 w-24 h-1.5 bg-gradient-to-r from-cyan-500 to-transparent rounded-full"></div>
              </div>

              {/* النص الوصفي */}
              <div className="relative p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg border-r-4 border-r-cyan-500 max-w-4xl mx-auto">
                <EditableField readOnly={isViewMode} tagName="p" multiline value={data.about.description} onSave={(v) => updateData(['about', 'description'], v)} className="text-base md:text-lg text-slate-700 leading-[1.8] font-normal text-right max-w-full word-spacing-normal letter-spacing-normal" />
              </div>

              {/* إحصائيات سريعة أو كلمات مفتاحية (Decoration) */}
              <div className="mt-8 flex gap-4">
                <div className="px-4 py-2 bg-[#0F2133] text-white rounded-lg text-sm font-bold shadow-md">ابتكار</div>
                <div className="px-4 py-2 bg-white border border-slate-200 text-[#0F2133] rounded-lg text-sm font-bold shadow-sm">تميز</div>
                <div className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-bold shadow-md">جودة</div>
              </div>
            </div>

            {/* الجانب البصري (الجانب اليسار) */}
            <div className="w-full md:w-2/5 relative h-[400px] flex items-center justify-center">
              {/* دائرة رئيسية */}
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                {/* حلقات دوارة */}
                <div className="absolute inset-0 border-2 border-dashed border-cyan-200 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-4 border border-slate-100 rounded-full"></div>

                {/* الشكل المركزي (قابل للتعديل) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 bg-gradient-to-br from-[#0F2133] to-slate-800 rounded-3xl transform rotate-12 shadow-2xl flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

                    {/* ImageEditable للأيقونة الرئيسية */}
                    {/* ImageEditable للأيقونة الرئيسية */}
                    <div className="w-full h-full flex items-center justify-center relative">
                      {data.about.mainIcon ? (
                        <ImageEditable
                          readOnly={isViewMode}
                          value={data.about.mainIcon}
                          onSave={(v) => updateData(['about', 'mainIcon'], v)}
                          className="w-full h-full object-cover transform -rotate-12 group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center relative ${!isViewMode ? 'cursor-pointer' : ''}`} title={!isViewMode ? "انقر لرفع شعار أو أيقونة" : ""}>
                          {!isViewMode && (
                            <div className="absolute inset-0 z-10 opacity-0">
                              <ImageEditable
                                value=""
                                onSave={(v) => updateData(['about', 'mainIcon'], v)}
                                className="w-full h-full"
                              />
                            </div>
                          )}
                          {/* Visible Default Icon */}
                          <Building2 className="w-20 h-20 text-cyan-400 transform -rotate-12 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* بطاقات عائمة (Floating Icons - Editable) */}
                {/* بطاقات عائمة (Floating Icons - Editable) */}
                <div
                  className={`absolute -top-4 right-0 bg-white p-3 rounded-xl shadow-lg animate-bounce z-20 ${!isViewMode ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
                  style={{ animationDuration: '3s' }}
                  onClick={() => {
                    if (isViewMode) return;
                    const icons = ['lightbulb', 'zap', 'star'];
                    const current = data.about.floatingIcon1 || 'lightbulb';
                    const next = icons[(icons.indexOf(current) + 1) % icons.length];
                    updateData(['about', 'floatingIcon1'], next);
                  }}
                  title={!isViewMode ? "انقر لتغيير الأيقونة" : ""}
                >
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                    {(!data.about.floatingIcon1 || data.about.floatingIcon1 === 'lightbulb') && <Lightbulb size={20} />}
                    {data.about.floatingIcon1 === 'zap' && <Zap size={20} />}
                    {data.about.floatingIcon1 === 'star' && <Star size={20} />}
                  </div>
                </div>

                <div
                  className={`absolute -bottom-8 left-4 bg-white p-3 rounded-xl shadow-lg animate-bounce z-20 ${!isViewMode ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
                  style={{ animationDuration: '4s', animationDelay: '1s' }}
                  onClick={() => {
                    if (isViewMode) return;
                    const icons = ['rocket', 'target', 'award'];
                    const current = data.about.floatingIcon2 || 'rocket';
                    const next = icons[(icons.indexOf(current) + 1) % icons.length];
                    updateData(['about', 'floatingIcon2'], next);
                  }}
                  title={!isViewMode ? "انقر لتغيير الأيقونة" : ""}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {(!data.about.floatingIcon2 || data.about.floatingIcon2 === 'rocket') && <Rocket size={20} />}
                    {data.about.floatingIcon2 === 'target' && <Target size={20} />}
                    {data.about.floatingIcon2 === 'award' && <Award size={20} />}
                  </div>
                </div>

                {/* خلفية مشعة */}
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl -z-10 rounded-full"></div>
              </div>
            </div>

          </div>
        </section>

        {/* الصفحة 3: كلمة الرئيس التنفيذي - تصميم فاخر ورسمي */}
        <section className="page-section relative bg-white overflow-hidden flex flex-col justify-center min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto">
          {/* خلفية مائية شعار */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <div className="w-[800px] h-[800px] bg-cyan-900 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-full bg-slate-50/50 skew-x-12 origin-bottom-right"></div>

          <div className="container mx-auto px-12 md:px-16 relative z-10">
            {/* رأس الصفحة */}
            <div className="mb-12 border-r-4 border-cyan-500 pr-6">
              <EditableField readOnly={isViewMode} tagName="h2" value={data.ceoMessage.title} onSave={(v) => updateData(['ceoMessage', 'title'], v)} className="text-3xl md:text-4xl font-black text-[#0F2133] mb-2" />
              <div className="w-20 h-1 bg-gradient-to-l from-cyan-500 to-transparent"></div>
            </div>

            {/* محتوى الرسالة */}
            <div className="relative">
              <div className="absolute -top-10 -right-10 text-9xl text-slate-100 font-serif opacity-50 select-none">“</div>
              <div className="relative bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-100 shadow-sm">
                <EditableField
                  readOnly={isViewMode}
                  tagName="div"
                  multiline
                  value={data.ceoMessage.text}
                  onSave={(v) => updateData(['ceoMessage', 'text'], v)}
                  className="text-base md:text-lg text-slate-700 leading-[2.2] text-justify whitespace-pre-line"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 text-9xl text-slate-100 font-serif opacity-50 select-none rotate-180">“</div>
            </div>

            {/* التوقيع */}
            <div className="mt-16 flex flex-col items-end">
              <div className="text-center">
                <EditableField readOnly={isViewMode} tagName="h3" value={data.ceoMessage.name} onSave={(v) => updateData(['ceoMessage', 'name'], v)} className="text-xl font-bold text-[#0F2133] mb-1" />
                <EditableField readOnly={isViewMode} tagName="p" value={data.ceoMessage.role} onSave={(v) => updateData(['ceoMessage', 'role'], v)} className="text-sm text-cyan-600 font-medium mb-1" />
                <EditableField readOnly={isViewMode} tagName="p" value={data.ceoMessage.company} onSave={(v) => updateData(['ceoMessage', 'company'], v)} className="text-xs text-slate-400 tracking-wide" />
              </div>
            </div>
          </div>
        </section>

        {/* الصفحة 4: الرؤية والرسالة - تصميم عصري ومنقسم */}
        <section className="page-section flex-col lg:flex-row min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto overflow-hidden bg-white">
          <div className="w-full lg:w-1/2 p-10 md:p-16 flex flex-col justify-center relative">
            {/* زخرفة خلفية بسيطة */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black text-[#0F2133] mb-12 flex items-center gap-4 text-right word-spacing-normal letter-spacing-normal whitespace-nowrap">
                <div className="w-2 h-10 bg-cyan-500 rounded-full flex-shrink-0"></div>
                <span>تيفرو | Tivro</span>
              </h1>

              <div className="space-y-12">
                {/* الرؤية */}
                <div className="group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <Rocket size={20} />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-cyan-600 uppercase tracking-widest">الرؤية</h2>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    <EditableField readOnly={isViewMode} tagName="p" multiline value={data.visionMission.visionText} onSave={(v) => updateData(['visionMission', 'visionText'], v)} className="text-lg md:text-xl text-slate-700 leading-[1.8] text-right max-w-full pr-2 word-spacing-normal letter-spacing-normal" />
                  </div>
                </div>

                <div className="w-16 h-1 bg-slate-100 rounded-full"></div>

                {/* الرسالة */}
                <div className="group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Target size={20} />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-blue-600 uppercase tracking-widest">الرسالة</h2>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    <EditableField readOnly={isViewMode} tagName="p" multiline value={data.visionMission.missionText} onSave={(v) => updateData(['visionMission', 'missionText'], v)} className="text-lg md:text-xl text-slate-700 leading-[1.8] text-right max-w-full pr-2 word-spacing-normal letter-spacing-normal" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <AbstractVisual title="Vision & Mission | TIVRO" />
        </section>

        {/* الصفحة 5: القيم المؤسسية - تصميم عصري وجذاب */}
        <section className="page-section bg-[#F5F7FA] relative overflow-hidden flex flex-col justify-center min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto">
          {/* خلفية زخرفية */}
          <div className="absolute top-0 right-0 w-full h-1/3 bg-[#0F2133] skew-y-6 origin-top-left translate-y-[-50%]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-8 md:px-12 relative z-10">

            {/* عنوان الصفحة */}
            <div className="text-center mb-16 md:mb-20">
              <div className="inline-block relative">
                <EditableField readOnly={isViewMode} tagName="h2" value={data.values.sectionTitle} onSave={(v) => updateData(['values', 'sectionTitle'], v)} className="text-4xl md:text-5xl font-black text-[#0F2133] relative z-10" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-cyan-500 rounded-full"></div>
              </div>
            </div>

            {/* بطاقات القيم */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {data.values.items.map((item, idx) => (
                <div key={idx} className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100 overflow-hidden">
                  {/* شريط علوي ملون */}
                  <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${idx === 0 ? 'from-cyan-400 to-blue-500' : idx === 1 ? 'from-blue-500 to-indigo-600' : 'from-indigo-600 to-purple-600'}`}></div>

                  {/* أيقونة تجريدية خلفية */}
                  <div className="absolute -bottom-4 -left-4 text-[8rem] opacity-5 select-none font-black text-slate-900 pointer-events-none">
                    {idx + 1}
                  </div>

                  <div className="relative z-10 flex flex-col items-center text-center h-full">
                    {/* الأيقونة الرمزية */}
                    <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${idx === 0 ? 'from-cyan-400 to-blue-500' : idx === 1 ? 'from-blue-500 to-indigo-600' : 'from-indigo-600 to-purple-600'} group-hover:scale-110 transition-transform duration-300`}>
                      {idx === 0 && <Lightbulb size={32} />}
                      {idx === 1 && <Target size={32} />}
                      {idx === 2 && <Zap size={32} />}
                    </div>

                    {/* العنوان */}
                    <EditableField
                      readOnly={isViewMode}
                      tagName="h3"
                      value={item.title}
                      onSave={(v) => {
                        const newItems = [...data.values.items];
                        newItems[idx].title = v;
                        updateData(['values', 'items'], newItems);
                      }}
                      className="text-2xl font-bold text-[#0F2133] mb-4"
                    />

                    {/* الوصف */}
                    <div className="max-w-2xl mx-auto">
                      <EditableField
                        readOnly={isViewMode}
                        tagName="p"
                        multiline
                        value={item.description}
                        onSave={(v) => {
                          const newItems = [...data.values.items];
                          newItems[idx].description = v;
                          updateData(['values', 'items'], newItems);
                        }}
                        className="text-base text-slate-600 leading-[1.8] font-medium text-right w-full word-spacing-normal letter-spacing-normal"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* الصفحة 6: الخدمات - رحلة الأثر المتصلة (Zeigarnik Style) */}
        <section className="page-section bg-gradient-to-b from-slate-50 via-white to-cyan-50/20 relative p-6 md:p-8 overflow-hidden flex flex-col min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto">
          {/* خلفية جمالية هادئة */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            {/* خط المسار المتصل (خلفية) */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M10,10 Q50,50 90,10 T90,90" fill="none" stroke="#0F2133" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* المحتوى الرئيسي */}
          <div className="relative z-10 flex flex-col h-full">

            {/* رأس الصفحة مع التركيز على "البداية" */}
            <div className="text-center mb-6 md:mb-8 shrink-0">
              <div className="inline-block relative">
                <EditableField readOnly={isViewMode} tagName="h2" value={data.services.sectionTitle} onSave={(v) => updateData(['services', 'sectionTitle'], v)} className="text-4xl md:text-5xl font-black text-[#0F2133] relative z-10" />
                <div className="absolute -bottom-2 right-0 w-1/3 h-2 bg-cyan-400/30 -skew-x-12"></div>
              </div>
              <div className="mt-3 max-w-2xl mx-auto">
                <EditableField readOnly={isViewMode} tagName="p" value={data.services.sectionSubtitle} onSave={(v) => updateData(['services', 'sectionSubtitle'], v)} className="text-base md:text-lg text-slate-500 font-serif italic tracking-wide" />
              </div>
            </div>

            {/* شبكة الخدمات (Bento Grid Style) */}
            <div className="grid grid-cols-12 gap-4 flex-grow content-start">
              {data.services.items.map((service, idx) => {
                // With 3 services, use 3 columns on desktop
                const colSpan = 'col-span-12 md:col-span-4';
                const isWide = false;

                // فصل الوصف (النقطة الأولى) عن باقي النقاط
                const description = service.points[0];
                const subPoints = service.points.slice(1);

                return (
                  <div key={idx} className={`${colSpan} group relative flex flex-col`} style={{ animationDelay: `${idx * 0.1}s` }}>

                    {/* أزرار التحكم (تظهر عند التحويم فقط وفقط في وضع التعديل) */}
                    {!isViewMode && (
                      <button onClick={() => deleteService(idx)} className="absolute -top-2 -left-2 z-30 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 no-print shadow-sm">
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* البطاقة */}
                    <div className="relative flex flex-col h-full bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                      {/* خلفية مرقمة هادئة */}
                      <div className="absolute -right-4 -bottom-4 text-[10rem] font-black text-slate-50 opacity-80 select-none pointer-events-none group-hover:text-cyan-50/50 transition-colors">
                        0{idx + 1}
                      </div>

                      <div className="relative z-10 flex flex-col h-full">
                        {/* أيقونة الخدمة والمؤشر العلوي */}
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${idx === 0 ? 'from-[#0F2133] to-[#1a2942]' : idx === 1 ? 'from-cyan-500 to-blue-500' : 'from-blue-600 to-indigo-700'}`}>
                            {idx === 0 && <Building2 size={28} />}
                            {idx === 1 && <Zap size={28} />}
                            {idx === 2 && <CheckCircle2 size={28} />}
                          </div>
                          <div className="w-10 h-1 rounded-full bg-slate-100 group-hover:bg-cyan-100 transition-colors"></div>
                        </div>

                        {/* عنوان الخدمة */}
                        <div className="mb-6">
                          <EditableField
                            readOnly={isViewMode}
                            tagName="h3"
                            value={service.title}
                            onSave={(v) => {
                              const items = [...data.services.items];
                              items[idx].title = v;
                              updateData(['services', 'items'], items);
                            }}
                            className="text-xl md:text-2xl font-black text-[#0F2133] leading-tight"
                          />
                        </div>

                        {/* المحتوى (النقاط) */}
                        <div className="space-y-4 flex-grow">
                          {service.points.map((point, pIdx) => (
                            <div key={pIdx} className={pIdx === 0 ? "mb-6" : "flex items-start gap-3 group/point"}>
                              <div className="relative flex flex-col w-full">
                                {pIdx > 0 && (
                                  <div className="absolute top-2.5 -right-5 w-2 h-2 rounded-full border-2 border-cyan-500 bg-white z-10 group-hover/point:scale-125 transition-transform"></div>
                                )}
                                <EditableField
                                  readOnly={isViewMode}
                                  tagName="p"
                                  multiline
                                  value={point}
                                  onSave={(v) => {
                                    const items = [...data.services.items];
                                    items[idx].points[pIdx] = v;
                                    updateData(['services', 'items'], items);
                                  }}
                                  className={`text-sm md:text-base leading-[1.8] text-right ${pIdx === 0 ? "text-slate-800 font-bold border-r-4 border-cyan-500 pr-4 pl-0" : "text-slate-600 pr-2"} word-spacing-normal letter-spacing-normal`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* أزرار التحكم في النقاط (فقط للتعديل) */}
                        {!isViewMode && (
                          <div className="mt-4 flex gap-2 no-print opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => addPoint(idx)} className="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-1 rounded-lg hover:bg-cyan-100 flex items-center gap-1">
                              <Plus size={10} /> إضافة نقطة
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* البطاقة الأخيرة: دعوة للعمل / الإضافة */}
              {!isViewMode && (
                <div className="col-span-12 md:col-span-4 flex items-center justify-center min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl md:rounded-[2rem] hover:border-cyan-400 hover:bg-cyan-50/10 transition-all cursor-pointer group no-print" onClick={addService}>
                  <div className="text-center text-slate-400 group-hover:text-cyan-500">
                    <Plus size={32} className="mx-auto mb-2" />
                    <span className="text-sm font-bold">إضافة خدمة جديدة...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 bg-white/50 inline-block px-4 py-2 rounded-full border border-slate-200">
                يتم تحديد نطاق كل خدمة بدقة قبل البدء لضمان وضوح المخرجات والزمن والمسؤوليات.
              </p>
            </div>
          </div>
        </section>

        {/* الصفحة 7: آلية التنفيذ والعمل - تصميم مسار مهني */}
        <section
          className="page-section bg-white relative isolate z-0 p-8 md:p-12 overflow-hidden flex flex-col min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
          {/* خلفية هندسية ناعمة */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0F2133 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            {/* ... */}
            {/* رأس الصفحة */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#0F2133] rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <RefreshCw size={24} />
                </div>
                <EditableField
                  readOnly={isViewMode}
                  tagName="h2"
                  value={data.workProcess.sectionTitle}
                  onSave={(v) => updateData(['workProcess', 'sectionTitle'], v)}
                  className="text-4xl md:text-5xl font-black text-[#0F2133]"
                />
              </div>
              <div className="max-w-3xl border-r-4 border-cyan-500 pr-6">
                <EditableField
                  readOnly={isViewMode}
                  tagName="p"
                  value={data.workProcess.sectionSubtitle}
                  onSave={(v) => updateData(['workProcess', 'sectionSubtitle'], v)}
                  className="text-lg text-slate-600 font-medium"
                />
              </div>
            </div>

            {/* شبكة المراحل */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
              {data.workProcess.items.map((item, idx) => (
                <div key={idx} className="group relative bg-slate-50 rounded-[2rem] p-6 md:p-8 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  {/* رقم المرحلة */}
                  <div className="absolute top-6 left-6 text-5xl font-black text-slate-200 group-hover:text-cyan-100 transition-colors">
                    0{idx + 1}
                  </div>

                  <div className="relative z-10">
                    <EditableField
                      readOnly={isViewMode}
                      tagName="h3"
                      value={item.title}
                      onSave={(v) => {
                        const newItems = JSON.parse(JSON.stringify(data.workProcess.items));
                        newItems[idx].title = v;
                        updateData(['workProcess', 'items'], newItems);
                      }}
                      className="text-xl md:text-2xl font-black text-[#0F2133] mb-6"
                    />

                    <div className="space-y-3">
                      {item.points.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-3 group/point">
                          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></div>
                          <EditableField
                            readOnly={isViewMode}
                            tagName="p"
                            multiline
                            value={point}
                            onSave={(v) => {
                              const newItems = JSON.parse(JSON.stringify(data.workProcess.items));
                              newItems[idx].points[pIdx] = v;
                              updateData(['workProcess', 'items'], newItems);
                            }}
                            className="text-sm md:text-base text-slate-600 leading-relaxed font-medium"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* تذييل الصفحة الجمالي */}
            <div className="mt-8 flex justify-between items-center opacity-50">
              <div className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">Executive Methodology | TIVRO</div>
              <div className="w-24 h-[1px] bg-slate-200"></div>
            </div>
          </div>
        </section>


        {/* الصفحة 8: التواصل - تصميم فاخر احترافي مودرن */}
        <section
          className="page-section bg-gradient-to-br from-[#0A1628] via-[#0F2133] to-[#1a2942] relative isolate z-0 flex items-center justify-center p-4 md:p-6 lg:p-10 overflow-hidden min-h-screen lg:h-[1122px] lg:max-h-[1122px] h-auto"
          style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
        >
          {/* طبقة تأثيرات الخلفية المتقدمة */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.1),transparent_50%)]"></div>

          {/* شبكة نقطية خفيفة */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #06B6D4 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}></div>

          {/* عناصر ضوئية متحركة */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

          {/* خطوط ضوئية */}
          <div className="light-beam" style={{ left: '15%', opacity: 0.1 }}></div>
          <div className="light-beam" style={{ left: '50%', transform: 'rotate(25deg)', opacity: 0.08 }}></div>
          <div className="light-beam" style={{ left: '85%', transform: 'rotate(-20deg)', opacity: 0.12 }}></div>

          {/* دوائر متوهجة */}
          <div className="glowing-circle w-[600px] h-[600px] -top-48 -right-48 opacity-30"></div>
          <div className="glowing-circle w-[500px] h-[500px] -bottom-40 -left-40 opacity-25" style={{ animationDelay: '2s' }}></div>

          {/* المحتوى */}
          <div className="relative z-10 w-full max-w-5xl mx-auto px-4">
            {/* رأس الصفحة الفاخر */}
            <div className="text-center mb-6 md:mb-10">
              {/* أيقونة مميزة مع glassmorphism */}
              <div className="inline-flex items-center justify-center mb-4 md:mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 md:p-6 shadow-2xl">
                    <svg className="w-14 h-14 md:w-20 md:h-20 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6">
                <EditableField readOnly={isViewMode} tagName="span" value={data.contact.sectionTitle} onSave={(v) => updateData(['contact', 'sectionTitle'], v)} className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent" />
              </div>

              <div className="flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 md:w-20 h-[2px] bg-gradient-to-r from-transparent to-cyan-400 rounded-full"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-16 md:w-24 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 rounded-full"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-12 md:w-20 h-[2px] bg-gradient-to-l from-transparent to-purple-400 rounded-full"></div>
              </div>

              <EditableField
                readOnly={isViewMode}
                tagName="p"
                value={data.contact.footerText || "نحن هنا للإجابة على استفساراتك ومساعدتك في تحقيق أهدافك"}
                onSave={(v) => updateData(['contact', 'footerText'], v)}
                className="text-sm md:text-lg text-cyan-200/70 font-light tracking-wide max-w-2xl mx-auto"
              />
            </div>

            {/* بطاقات التواصل - تصميم أفقي فاخر واحترافي */}
            <div className="space-y-4 max-w-4xl mx-auto mb-10 w-full">
              {/* بطاقات التواصل الرئيسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: 'البريد الإلكتروني',
                    val: data.contact.email,
                    key: 'email',
                    gradient: 'from-cyan-500 to-blue-600',
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                    getHref: (val: string) => `mailto:${val}`
                  },
                  {
                    label: 'رقم الهاتف (واتساب)',
                    val: data.contact.phone,
                    key: 'phone',
                    gradient: 'from-blue-500 to-indigo-600',
                    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
                    getHref: (val: string) => `https://wa.me/${val.replace(/[^0-9]/g, '')}`
                  },
                  {
                    label: 'الموقع الإلكتروني',
                    val: data.contact.website,
                    key: 'website',
                    gradient: 'from-purple-500 to-pink-600',
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
                    getHref: (val: string) => val.startsWith('http') ? val : `https://${val}`
                  },
                  {
                    label: 'الموقع',
                    val: data.contact.location,
                    key: 'location',
                    gradient: 'from-emerald-500 to-cyan-600',
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  },
                  {
                    label: 'السجل التجاري',
                    val: data.contact.commercialRegistration,
                    key: 'commercialRegistration',
                    gradient: 'from-amber-500 to-orange-600',
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z" /></svg>
                  }
                ].map((item, idx) => {
                  const isClickableInViewMode = isViewMode && typeof (item as any).getHref === 'function';
                  const Wrapper = isClickableInViewMode ? 'a' : 'div';
                  const hrefProps = isClickableInViewMode ? {
                    href: (item as any).getHref(item.val),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "clickable-link block group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  } : {
                    className: "group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  };

                  return (
                    // @ts-ignore
                    <Wrapper key={item.key} {...hrefProps} style={{ animationDelay: `${idx * 0.15}s` }}>
                      {/* خلفية زجاجية داكنة */}
                      <div className="absolute inset-0 bg-[#162a45]/80 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-colors"></div>

                      {/* تأثيرات الإضاءة عند التحويم */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                      <div className="relative p-4 md:p-5 flex items-center gap-5 md:gap-6">
                        {/* الأيقونة */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
                            {item.icon}
                          </div>
                        </div>

                        {/* النصوص */}
                        <div className="flex-grow min-w-0 flex flex-col items-start text-right">
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</span>
                          <EditableField
                            readOnly={isViewMode}
                            value={item.val}
                            onSave={(v) => updateData(['contact', item.key], v)}
                            className={`w-full font-bold text-base md:text-lg lg:text-xl text-white group-hover:text-cyan-200 transition-colors bg-transparent border-none p-0 focus:ring-0 text-right ${item.key === 'email' ? 'break-all' : ''}`}
                          />
                        </div>

                        {/* سهم زخرفي */}
                        <div className="text-white/20 group-hover:text-white/60 transition-colors">
                          <svg className="w-5 h-5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>

              {/* قنوات التواصل الاجتماعي - بطاقات صغيرة متجاورة */}
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  {
                    label: 'تيك توك',
                    val: data.contact.tiktok,
                    key: 'tiktok',
                    gradient: 'from-fuchsia-500 to-purple-600',
                    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 7.5a6.5 6.5 0 01-3.6-1.1V15a6.8 6.8 0 11-6.9-6.8c.4 0 .8 0 1.2.1v3.7a3.2 3.2 0 10 2.3 3V2h3.4c.2 1.3.9 2.6 2 3.5.9.7 2 1.1 3.1 1.2v2.8z" /></svg>,
                    getHref: (val: string) => {
                      const v = (val || '').trim();
                      if (!v) return 'https://www.tiktok.com/';
                      if (v.startsWith('http')) return v;
                      const username = v.replace(/^@/, '');
                      return `https://www.tiktok.com/@${username}`;
                    }
                  },
                  {
                    label: 'سناب شات',
                    val: data.contact.snapchat,
                    key: 'snapchat',
                    gradient: 'from-fuchsia-500 to-purple-600',
                    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c2.8 0 5 2.2 5 5v2c0 .8.4 1.6 1.1 2.1.8.6 1.9 1 1.9 1.9 0 .7-.7 1.2-1.5 1.5-.9.3-1.4 1-1.4 1.8 0 1.1-.9 2-2 2-.8 0-1.2-.3-1.6-.6-.4-.3-.7-.5-1.5-.5s-1.1.2-1.5.5c-.4.3-.8.6-1.6.6-1.1 0-2-.9-2-2 0-.8-.5-1.5-1.4-1.8C4.7 14.7 4 14.2 4 13.5c0-.9 1.1-1.3 1.9-1.9C6.6 11.6 7 10.8 7 10V7c0-2.8 2.2-5 5-5z" /></svg>,
                    getHref: (val: string) => {
                      const v = (val || '').trim();
                      if (!v) return 'https://www.snapchat.com/';
                      if (v.startsWith('http')) return v;
                      const username = v.replace(/^@/, '');
                      return `https://www.snapchat.com/add/${username}`;
                    }
                  },
                  {
                    label: 'انستقرام',
                    val: data.contact.instagram,
                    key: 'instagram',
                    gradient: 'from-fuchsia-500 to-purple-600',
                    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4A5.8 5.8 0 0116.2 22H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm8.4 2H7.8A3.8 3.8 0 004 7.8v8.4A3.8 3.8 0 007.8 20h8.4a3.8 3.8 0 003.8-3.8V7.8A3.8 3.8 0 0016.2 4zm-4.2 3.2a4.8 4.8 0 110 9.6 4.8 4.8 0 010-9.6zm0 2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zM17.8 6.1a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z" /></svg>,
                    getHref: (val: string) => {
                      const v = (val || '').trim();
                      if (!v) return 'https://www.instagram.com/';
                      if (v.startsWith('http')) return v;
                      const username = v.replace(/^@/, '');
                      return `https://www.instagram.com/${username}`;
                    }
                  }
                ].map((item, idx) => {
                  const isClickableInViewMode = isViewMode && typeof (item as any).getHref === 'function';
                  const Wrapper = isClickableInViewMode ? 'a' : 'div';
                  const hrefProps = isClickableInViewMode ? {
                    href: (item as any).getHref(item.val),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 flex-shrink-0"
                  } : {
                    className: "group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 flex-shrink-0"
                  };

                  return (
                    // @ts-ignore
                    <Wrapper key={item.key} {...hrefProps} style={{ animationDelay: `${idx * 0.1}s` }}>
                      {/* خلفية زجاجية داكنة */}
                      <div className="absolute inset-0 bg-[#162a45]/80 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-colors"></div>

                      {/* تأثيرات الإضاءة عند التحويم */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>

                      <div className="relative p-3 flex items-center gap-3 min-w-0">
                        {/* الأيقونة */}
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
                            {item.icon}
                          </div>
                        </div>

                        {/* النص */}
                        <div className="min-w-0 flex-1">
                          <EditableField
                            readOnly={isViewMode}
                            value={item.val}
                            onSave={(v) => updateData(['contact', item.key], v)}
                            className="w-full font-bold text-sm text-white group-hover:text-cyan-200 transition-colors bg-transparent border-none p-0 focus:ring-0 text-right truncate"
                          />
                        </div>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>
            </div>


            {/* قسم الحقوق الفاخر */}
            {/* قسم الحقوق الفاخر مع الشعار */}
            {(data.contact.showFooter ?? true) ? (
              <div className="text-center relative group/footer">
                <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-6 md:px-10 py-3 md:py-4 rounded-full shadow-2xl hover:bg-white/10 transition-all duration-300">
                  {/* الشعار */}
                  <div className="relative w-6 h-6 md:w-8 md:h-8 flex-shrink-0">
                    {data.contact.footerLogo ? (
                      <ImageEditable
                        readOnly={isViewMode}
                        value={data.contact.footerLogo}
                        onSave={(v) => updateData(['contact', 'footerLogo'], v)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-cyan-400 ${!isViewMode ? 'cursor-pointer' : ''}`} onClick={() => !isViewMode && updateData(['contact', 'footerLogo'], 'placeholder')}>
                        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <EditableField readOnly={isViewMode} value={data.contact.footerCopyright} onSave={(v) => updateData(['contact', 'footerCopyright'], v)} className="text-[10px] md:text-sm text-white/70 font-medium tracking-wide hover:text-white/90 transition-colors duration-300" />

                  {/* زر حذف الفوتر */}
                  {!isViewMode && (
                    <button
                      onClick={() => {
                        updateData(['contact', 'showFooter'], 'false'); // Note: updateData mostly expects strings, but we should handle boolean or parse string 'false' 
                        // Since updateData strictly types value as string, we might need to adjust or pass 'false' and rely on loose comparison or fix updateData logic for booleans. 
                        // Better approach: Direct set state or cast.
                        // Let's assume we fix updateData logic or cast in rendering.
                        // Wait, updateData takes string. I need a way to set boolean. 
                        // I will use a direct setData call here to be safe.
                        setData(prev => {
                          addToHistory(prev);
                          return { ...prev, contact: { ...prev.contact, showFooter: false } };
                        });
                      }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/footer:opacity-100 transition-opacity hover:bg-red-600 no-print"
                      title="إزالة الفوتر"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center no-print opacity-50 hover:opacity-100 transition-opacity">
                {!isViewMode && (
                  <button onClick={() => setData(prev => ({ ...prev, contact: { ...prev.contact, showFooter: true } }))} className="text-xs text-white/50 border border-white/20 px-3 py-1 rounded-full hover:bg-white/10 flex items-center gap-2 mx-auto">
                    <Plus size={12} /> إظهار الفوتر
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* شاشة التحميل */}
      {isGenerating && (
        <div className="fixed inset-0 bg-[#0F2133]/98 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center text-white p-10 text-center">
          <Loader2 size={80} className="animate-spin text-cyan-500 mb-8" />
          <h1 className="text-4xl md:text-6xl font-black mb-4">جاري تثبيت المحاذاة</h1>
          <p className="text-slate-400 text-lg md:text-2xl max-w-2xl">نقوم الآن بضبط العناصر وفق مقاسات A4 العالمية لضمان عدم وجود أي هوامش بيضاء في الملف النهائي.</p>
        </div>
      )}
    </div>
  );
};

export default App;
