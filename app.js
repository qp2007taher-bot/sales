/**
 * Aurel Tronics - Sales Pro Logic v2.0
 * Senior Full-Stack Architecture
 * Author: Expert Software Engineer
 */

// --- 1. الإعدادات العامة (Configuration) ---
// استبدل هذا الرابط برابط Web App الخاص بك بعد نشر Code.gs
const SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL';

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
    USER: 'aurel_user_session',
    VISITS: 'aurel_visits_data',
    QUEUE: 'aurel_offline_queue'
};

// خريطة مفاتيح الدول والقواعد الخاصة بها
const COUNTRY_RULES = {
    "مصر": { code: "20", length: 11 },
    "السعودية": { code: "966", length: 9 },
    "الإمارات": { code: "971", length: 9 },
    "الأردن": { code: "962", length: 9 }
};

// --- 2. متغيرات الحالة (State Management) ---
let currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || null;
let allVisits = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITS)) || [];
let offlineQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE)) || [];

// --- 3. التهيئة عند التشغيل (App Initialization) ---
document.addEventListener('DOMContentLoaded', () => {
    // تفعيل الأيقونات
    lucide.createIcons();
    
    // التحقق من الجلسة
    initAppSession();
    
    // تسجيل الـ Service Worker لـ PWA
    registerPWA();
    
    // مراقبة حالة الإنترنت
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    if (!navigator.onLine) handleOfflineStatus();
});

/**
 * دالة تهيئة الجلسة - تختار الشاشة المناسبة للمستخدم
 */
function initAppSession() {
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');

    if (currentUser) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        
        // تحديث بيانات الهيدر
        document.getElementById('userDisplayName').innerText = `مرحباً، ${currentUser.username}`;
        document.getElementById('userRegionInfo').innerText = `نطاق العمل: ${currentUser.country}`;
        document.getElementById('todayDateLabel').innerText = formatArabicDate(new Date());

        // رندر البيانات المحلية أولاً (تجربة مستخدم سريعة)
        renderDashboard();
        
        // جلب البيانات الأحدث من السيرفر في الخلفية
        syncDataFromServer();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
}

// --- 4. منطق الهوية والدخول (Auth Logic) ---

/**
 * التبديل بين نماذج الدخول والتسجيل
 */
function toggleAuthForms(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (type === 'register') {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    } else {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
}

/**
 * معالجة تسجيل الدخول
 */
async function handleLogin() {
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!user || !pass) {
        alert('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
    }

    setLoading(true);
    try {
        const response = await fetch(`${SCRIPT_URL}?action=login&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
        const result = await response.json();

        if (result.status === 'success') {
            currentUser = result.data;
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
            initAppSession();
        } else {
            alert('بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة ثانية');
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert('فشل الاتصال بالسيرفر. تأكد من جودة الإنترنت.');
    }
    setLoading(false);
}

/**
 * معالجة إنشاء حساب جديد
 */
async function handleRegister() {
    const country = document.getElementById('regCountry').value;
    const user = document.getElementById('regUsername').value.trim();
    const pass = document.getElementById('regPassword').value.trim();

    if (!user || pass.length < 4) {
        alert('يرجى إدخال اسم مستخدم وكلمة مرور (4 خانات فأكثر)');
        return;
    }

    setLoading(true);
    try {
        // نستخدم POST لإنشاء بيانات جديدة
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'register',
                user: user,
                pass: pass,
                country: country
            })
        });
        
        // ملاحظة: Google Apps Script قد يتطلب معالجة خاصة للـ CORS في حالة POST
        alert('تم إرسال طلب تسجيل الحساب بنجاح. يمكنك الآن تسجيل الدخول.');
        toggleAuthForms('login');
    } catch (error) {
        console.error("Register Error:", error);
        alert('حدث خطأ أثناء إرسال البيانات. حاول مرة أخرى.');
    }
    setLoading(false);
}

/**
 * تسجيل الخروج
 */
function handleLogout() {
    if (confirm('هل تود حقاً تسجيل الخروج من النظام؟')) {
        localStorage.clear();
        location.reload();
    }
}

/**
 * نسيان كلمة المرور
 */
function showForgotPassword() {
    const whatsappNumber = "+201121795779";
    const message = "مرحباً، أنا المندوب " + (currentUser ? currentUser.username : "") + " وأحتاج للمساعدة في استعادة كلمة المرور.";
    const url = `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    if (confirm("سيتم تحويلك الآن للدعم الفني عبر واتساب للمساعدة في استعادة الحساب.")) {
        window.open(url, '_blank');
    }
}

// --- 5. إدارة الزيارات (Visits Operations) ---

/**
 * معالجة إرسال نموذج زيارة جديدة
 */
async function handleVisitSubmit() {
    // جلب البيانات من النموذج
    const drName = document.getElementById('drName').value.trim();
    const clinicName = document.getElementById('clinicName').value.trim();
    const phone1Raw = document.getElementById('phone1').value.trim();
    const status = document.getElementById('visitStatus').value;
    const notes = document.getElementById('notes').value.trim();
    const nextVisitDate = document.getElementById('nextVisitDate').value;
    const gpsLink = document.getElementById('gpsLink').value.trim();

    // التحقق من الحقول الإجبارية
    if (!drName || !clinicName || !phone1Raw) {
        alert('يرجى ملء الحقول الأساسية: اسم الطبيب، العيادة، ورقم الهاتف.');
        return;
    }

    // جلب التخصصات المختارة
    const specialties = Array.from(document.querySelectorAll('input[name="specialty"]:checked'))
                             .map(el => el.value)
                             .join(' - ');

    // --- منطق isDone التكتيكي ---
    // يكون FALSE فقط في الحالات المحددة، و TRUE في غير ذلك
    const isDone = !(["غير مهتم", "تم تحديد موعد لمقابلة الطبيب"].includes(status));

    // بناء كائن الزيارة
    const visitData = {
        id: "VISIT_" + Date.now(),
        timestamp: new Date().toISOString(),
        repName: currentUser.username,
        drName: drName,
        clinicName: clinicName,
        specialties: specialties,
        phone1: formatPhoneNumber(phone1Raw, currentUser.country),
        phone2: document.getElementById('phone2').value ? formatPhoneNumber(document.getElementById('phone2').value, currentUser.country) : "",
        gpsLink: gpsLink,
        status: status,
        nextVisitDate: nextVisitDate,
        notes: notes,
        isDone: isDone
    };

    // [Optimistic UI Update] - الحفظ محلياً أولاً لإظهارها فوراً
    allVisits.unshift(visitData);
    saveVisitsLocally();
    renderDashboard();
    closeVisitModal();
    document.getElementById('visitForm').reset();

    // [Sync Logic]
    if (navigator.onLine) {
        uploadVisitToServer(visitData);
    } else {
        offlineQueue.push(visitData);
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(offlineQueue));
        alert('أنت الآن أوفلاين. تم حفظ الزيارة محلياً وسيتم رفعها للسيرفر بمجرد عودة الإنترنت.');
    }
}

/**
 * رفع الزيارة إلى Google Sheets
 */
async function uploadVisitToServer(data) {
    setLoading(true);
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'saveVisit', ...data })
        });
        // مزامنة البيانات مجدداً لضمان الترتيب الصحيح من السيرفر
        syncDataFromServer();
    } catch (e) {
        console.error("Server upload failed, item kept in queue");
        offlineQueue.push(data);
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(offlineQueue));
    }
    setLoading(false);
}

/**
 * جلب كافة الزيارات من السيرفر
 */
async function syncDataFromServer() {
    if (!navigator.onLine || !currentUser) return;
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getVisits&user=${encodeURIComponent(currentUser.username)}`);
        const result = await res.json();
        
        if (result.status === 'success') {
            allVisits = result.data;
            saveVisitsLocally();
            renderDashboard();
        }
    } catch (e) {
        console.log("Background sync interrupted");
    }
}

// --- 6. رندر الواجهات (UI Rendering) ---

/**
 * بناء الشاشة الرئيسية (إحصائيات، مهام اليوم، المواعيد)
 */
function renderDashboard() {
    const todayISO = new Date().toISOString().split('T')[0];
    
    // إحصائيات الشهر
    const now = new Date();
    const monthVisits = allVisits.filter(v => {
        const d = new Date(v.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    document.getElementById('monthlyCountLabel').innerText = monthVisits.length;

    // مهام اليوم
    const todayTasks = allVisits.filter(v => v.nextVisitDate && v.nextVisitDate.startsWith(todayISO));
    const todayCont = document.getElementById('todayVisitsList');
    todayCont.innerHTML = todayTasks.length ? "" : '<div class="bg-white p-10 rounded-3xl text-center text-slate-400 font-bold border-2 border-dashed border-slate-100">لا يوجد مهام اليوم</div>';
    
    todayTasks.forEach(task => {
        todayCont.innerHTML += `
            <div class="bg-white p-5 rounded-[2rem] shadow-sm border-r-8 ${task.isDone ? 'border-green-500' : 'border-blue-500'} flex items-center gap-4">
                <div class="flex-1">
                    <h5 class="font-black text-slate-800 text-sm leading-tight">${task.drName}</h5>
                    <p class="text-[10px] text-slate-400 font-black mt-1 uppercase">${task.clinicName} • ${formatArabicDate(task.nextVisitDate, true)}</p>
                </div>
                <div class="flex gap-2">
                    <a href="tel:${task.phone1}" class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:bg-blue-600 active:text-white transition-all"><i data-lucide="phone" class="w-4 h-4"></i></a>
                    <a href="${task.gpsLink}" target="_blank" class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><i data-lucide="map-pin" class="w-4 h-4"></i></a>
                </div>
            </div>
        `;
    });

    // المواعيد القادمة
    const upcoming = allVisits.filter(v => v.nextVisitDate && v.nextVisitDate > todayISO)
                              .sort((a,b) => new Date(a.nextVisitDate) - new Date(b.nextVisitDate));
    const upcomingCont = document.getElementById('upcomingVisitsList');
    upcomingCont.innerHTML = upcoming.length ? "" : '<p class="text-center text-slate-400 font-bold py-4">لا توجد مواعيد مستقبلية</p>';
    
    upcoming.slice(0, 15).forEach(v => {
        upcomingCont.innerHTML += `
            <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex justify-between items-center group">
                <div class="flex-1">
                    <h6 class="font-black text-slate-700 text-xs">${v.drName}</h6>
                    <p class="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">${v.clinicName}</p>
                </div>
                <div class="text-left">
                    <span class="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full shadow-inner">${formatArabicDate(v.nextVisitDate)}</span>
                </div>
            </div>
        `;
    });

    // تحديث الأيقونات في الأجزاء المولدة حديثاً
    lucide.createIcons();
}

/**
 * نافذة إحصائيات الشهر التفصيلية
 */
function showMonthlyStats() {
    const now = new Date();
    const currentMonthVisits = allVisits.filter(v => {
        const d = new Date(v.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const container = document.getElementById('monthlyStatsList');
    container.innerHTML = "";

    if (currentMonthVisits.length === 0) {
        container.innerHTML = '<p class="text-center py-10 font-bold text-slate-300">لم يتم تسجيل أي زيارات لهذا الشهر حتى الآن.</p>';
    } else {
        currentMonthVisits.forEach(v => {
            container.innerHTML += `
                <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-white">
                    <div>
                        <p class="font-black text-slate-800 text-[11px]">${v.drName}</p>
                        <p class="text-[9px] text-slate-400 font-bold">${v.clinicName}</p>
                    </div>
                    <span class="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg">${formatArabicDate(v.timestamp)}</span>
                </div>
            `;
        });
    }
    document.getElementById('statsModal').classList.remove('hidden');
}

/**
 * البحث في جميع الزيارات
 */
function filterVisits() {
    const query = document.getElementById('visitSearchInput').value.toLowerCase();
    const container = document.getElementById('allVisitsListContainer');
    
    const filtered = allVisits.filter(v => 
        v.drName.toLowerCase().includes(query) || 
        v.clinicName.toLowerCase().includes(query) || 
        v.phone1.includes(query)
    );

    container.innerHTML = filtered.map(v => `
        <div class="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group active:scale-95 transition-transform">
            <div class="absolute right-0 top-0 bottom-0 w-1.5 ${v.isDone ? 'bg-green-500' : 'bg-red-500'}"></div>
            <div class="flex justify-between items-start mb-2">
                <h6 class="font-black text-slate-800">${v.drName}</h6>
                <span class="text-[9px] font-black text-slate-300 uppercase">${formatArabicDate(v.timestamp)}</span>
            </div>
            <p class="text-[11px] font-bold text-slate-500 mb-2">${v.clinicName} • <span class="${v.isDone ? 'text-green-600' : 'text-orange-500'} font-black">${v.status}</span></p>
            <div class="flex gap-4 pt-3 border-t border-slate-50">
                <a href="tel:${v.phone1}" class="text-[10px] font-black text-blue-600 flex items-center gap-1"><i data-lucide="phone-call" class="w-3 h-3"></i> اتصال</a>
                <a href="${v.gpsLink}" target="_blank" class="text-[10px] font-black text-slate-400 flex items-center gap-1"><i data-lucide="map" class="w-3 h-3"></i> الموقع</a>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// --- 7. الأدوات المساعدة (Utilities) ---

/**
 * تنسيق أرقام الهواتف بشكل ذكي
 */
function formatPhoneNumber(phone, countryName) {
    // تنظيف الرقم من أي رموز غير رقمية
    let clean = phone.replace(/\D/g, ''); 
    const country = COUNTRY_RULES[countryName];
    
    if (!country) return phone;

    // إذا كان المندوب أدخل الرقم بمفتاح الدولة مسبقاً (مثلاً 2010...)
    if (clean.startsWith(country.code)) {
        return '+' + clean;
    }

    // إذا بدأ بـ 0 (مثل 010 في مصر)، نحذف الصفر
    if (clean.startsWith('0')) {
        clean = clean.substring(1);
    }

    // ندمج مفتاح الدولة مع الرقم النظيف
    return `+${country.code}${clean}`;
}

/**
 * تنسيق التاريخ باللغة العربية (12 ساعة)
 */
function formatArabicDate(dateStr, showTime = false) {
    if (!dateStr) return "";
    const options = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: showTime ? '2-digit' : undefined,
        minute: showTime ? '2-digit' : undefined,
        hour12: true
    };
    const date = new Date(dateStr);
    try {
        return new Intl.DateTimeFormat('ar-EG', options).format(date).replace(',', ' -');
    } catch (e) {
        return dateStr;
    }
}

/**
 * جلب الموقع الجغرافي الحالي
 */
function getCurrentLocation() {
    if ("geolocation" in navigator) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition((pos) => {
            const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            document.getElementById('gpsLink').value = url;
            setLoading(false);
        }, (err) => {
            alert("فشل جلب الموقع. تأكد من تفعيل خدمة الـ GPS.");
            setLoading(false);
        }, { enableHighAccuracy: true });
    } else {
        alert("متصفحك لا يدعم خاصية جلب الموقع.");
    }
}

/**
 * التحكم في شريط التحميل العلوي
 */
function setLoading(show) {
    document.getElementById('loaderBar').style.display = show ? 'block' : 'none';
}

/**
 * الحفظ في التخزين المحلي
 */
function saveVisitsLocally() {
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(allVisits));
}

// --- 8. التحكم في النوافذ (Modals Logic) ---

function openVisitModal() { 
    document.getElementById('visitModal').classList.remove('hidden'); 
    document.body.style.overflow = 'hidden'; 
}
function closeVisitModal() { 
    document.getElementById('visitModal').classList.add('hidden'); 
    document.body.style.overflow = 'auto'; 
}
function openAllVisitsModal() { 
    document.getElementById('allVisitsModal').classList.remove('hidden'); 
    filterVisits(); 
}
function closeAllVisitsModal() { 
    document.getElementById('allVisitsModal').classList.add('hidden'); 
}
function closeStatsModal() { 
    document.getElementById('statsModal').classList.add('hidden'); 
}
function toggleNextVisitField() {
    const status = document.getElementById('visitStatus').value;
    const wrapper = document.getElementById('nextVisitWrapper');
    if (status === 'تم تحديد موعد لمقابلة الطبيب') {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
    }
}

// --- 9. العمليات الخلفية و PWA (Offline & Sync) ---

function handleOnlineStatus() {
    document.body.classList.remove('is-offline');
    processOfflineQueue();
}

function handleOfflineStatus() {
    document.body.classList.add('is-offline');
}

/**
 * مزامنة الزيارات التي تمت أثناء انقطاع الإنترنت
 */
async function processOfflineQueue() {
    if (offlineQueue.length === 0) return;
    
    console.log("Syncing offline queue...");
    const itemsToProcess = [...offlineQueue];
    
    for (const item of itemsToProcess) {
        try {
            await fetch(SCRIPT_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'saveVisit', ...item }) 
            });
            // إذا نجح الرفع، نحذفه من الطابور
            offlineQueue = offlineQueue.filter(q => q.id !== item.id);
            localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(offlineQueue));
        } catch (e) {
            console.error("Sync failed for item:", item.id);
            break; // توقف للمحاولة لاحقاً
        }
    }
    
    syncDataFromServer();
}

/**
 * تسجيل Service Worker
 */
function registerPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("PWA Service Worker Active"))
            .catch(err => console.error("SW Registration Failed", err));
    }
}
