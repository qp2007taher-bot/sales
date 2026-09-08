// Configuration - استبدل هذا الرابط برابط الـ Web App بعد نشر Code.gs
const SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL';

let currentUser = JSON.parse(localStorage.getItem('aurelUser')) || null;
let allVisits = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAuth();
});

function checkAuth() {
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');

    if (currentUser) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        document.getElementById('userDisplayName').innerText = `مرحباً، ${currentUser.username}`;
        document.getElementById('userRegion').innerText = currentUser.country;
        fetchDashboardData();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
}

async function handleLogin() {
    const user = document.getElementById('loginUsername').value;
    const pass = document.getElementById('loginPassword').value;

    if (!user || !pass) return alert('يرجى إدخال البيانات');

    showLoading(true);
    try {
        const response = await fetch(`${SCRIPT_URL}?action=login&user=${user}&pass=${pass}`);
        const result = await response.json();

        if (result.status === 'success') {
            currentUser = result.data;
            localStorage.setItem('aurelUser', JSON.stringify(currentUser));
            checkAuth();
        } else {
            alert('بيانات الدخول غير صحيحة');
        }
    } catch (e) {
        alert('حدث خطأ في الاتصال بالخادم');
    }
    showLoading(false);
}

async function handleRegister() {
    const country = document.getElementById('regCountry').value;
    const user = document.getElementById('regUsername').value;
    const pass = document.getElementById('regPassword').value;

    if (!user || !pass) return alert('أكمل الحقول');

    showLoading(true);
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'register', user, pass, country })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('تم التسجيل بنجاح! يمكنك الدخول الآن');
            toggleAuthForms('login');
        } else {
            alert(result.message);
        }
    } catch (e) {
        alert('خطأ في التسجيل');
    }
    showLoading(false);
}

async function fetchDashboardData() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getVisits&user=${currentUser.username}`);
        const result = await response.json();
        allVisits = result.data || [];
        renderDashboard();
    } catch (e) {
        console.error('Data fetch error', e);
    }
}

function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Stats
    const monthlyVisits = allVisits.filter(v => {
        const d = new Date(v.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    document.getElementById('monthlyCount').innerText = `${monthlyVisits.length} زيارة`;

    // Today's Checklist
    const todayList = allVisits.filter(v => v.nextVisitDate && v.nextVisitDate.startsWith(today));
    const listEl = document.getElementById('todayVisitsList');
    listEl.innerHTML = todayList.length ? '' : '<p class="text-center text-gray-400 py-4">لا توجد مهام مجدولة لليوم</p>';
    
    todayList.forEach(v => {
        listEl.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border-r-4 ${v.isDone ? 'border-green-500 opacity-60' : 'border-blue-500'} flex items-center gap-3">
                <input type="checkbox" ${v.isDone ? 'checked' : ''} onchange="toggleVisitStatus('${v.timestamp}')" class="w-6 h-6 rounded-md">
                <div class="flex-1">
                    <h5 class="font-bold text-sm">${v.clinicName} - د. ${v.drName}</h5>
                    <p class="text-[11px] text-gray-500">${v.address}</p>
                </div>
                <a href="${v.gpsLink}" target="_blank" class="text-blue-500"><i data-lucide="map"></i></a>
            </div>
        `;
    });

    // Upcoming
    const upcomingList = allVisits.filter(v => v.nextVisitDate && v.nextVisitDate > today).sort((a,b) => new Date(a.nextVisitDate) - new Date(b.nextVisitDate));
    const upcomingEl = document.getElementById('upcomingVisitsList');
    upcomingEl.innerHTML = '';
    upcomingList.forEach(v => {
        upcomingEl.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start">
                    <span class="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold">${v.nextVisitDate.replace('T', ' ')}</span>
                    <i data-lucide="phone" class="w-4 h-4 text-gray-400"></i>
                </div>
                <h5 class="font-bold mt-2">${v.drName}</h5>
                <p class="text-xs text-gray-500">${v.clinicName} | ${v.specialties}</p>
                <div class="mt-3 pt-3 border-t flex gap-2">
                    <a href="tel:${v.phone1}" class="flex-1 text-center bg-gray-50 py-2 rounded-lg text-xs font-bold">اتصال</a>
                    <a href="${v.gpsLink}" class="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold">الخريطة</a>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

async function submitVisit() {
    const specialties = Array.from(document.querySelectorAll('input[name="specialty"]:checked')).map(el => el.value).join(', ');
    const promos = Array.from(document.querySelectorAll('input[name="promo"]:checked')).map(el => el.value).join(', ');

    const data = {
        action: 'saveVisit',
        repName: currentUser.username,
        drName: document.getElementById('drName').value,
        clinicName: document.getElementById('clinicName').value,
        specialties: specialties,
        phone1: document.getElementById('phone1').value,
        phone2: document.getElementById('phone2').value,
        address: document.getElementById('address').value,
        gpsLink: document.getElementById('gpsLink').value,
        status: document.getElementById('visitStatus').value,
        nextVisitDate: document.getElementById('nextVisitDate').value,
        notes: document.getElementById('notes').value,
        promos: promos
    };

    if (!data.drName || !data.phone1) return alert('يرجى ملء الحقول الأساسية');

    showLoading(true);
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        await response.json();
        closeVisitModal();
        fetchDashboardData();
    } catch (e) {
        alert('حدث خطأ أثناء الحفظ');
    }
    showLoading(false);
}

// Helpers
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

function toggleAuthForms(form) {
    document.getElementById('loginForm').classList.toggle('hidden', form === 'register');
    document.getElementById('registerForm').classList.toggle('hidden', form === 'login');
}

function showForgotPassword() {
    window.location.href = "https://wa.me/201121795779?text=نسيت كلمة المرور الخاصة بي";
}

function openVisitModal() { document.getElementById('visitModal').classList.remove('hidden'); }
function closeVisitModal() { document.getElementById('visitModal').classList.add('hidden'); }

function toggleNextVisitDate() {
    const status = document.getElementById('visitStatus').value;
    document.getElementById('nextVisitContainer').classList.toggle('hidden', status !== 'تم تحديد موعد لمقابلة الطبيب');
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            document.getElementById('gpsLink').value = link;
        }, () => alert('يرجى تفعيل الـ GPS'));
    }
}

function handleLogout() {
    localStorage.removeItem('aurelUser');
    location.reload();
}

async function toggleVisitStatus(timestamp) {
    showLoading(true);
    await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'toggleStatus', timestamp: timestamp })
    });
    fetchDashboardData();
    showLoading(false);
}