/**
 * Aurel Tronics - Service Worker v2.0
 * كود إدارة الذاكرة المخبأة والعمل بدون اتصال
 */

const CACHE_NAME = 'aurel-tronics-cache-v2';

// القائمة البيضاء للملفات التي سيتم تخزينها للعمل أوفلاين
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap'
];

// 1. حدث التثبيت (Installation): يتم فيه تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing version: ' + CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // تفعيل الـ Service Worker فوراً دون انتظار إغلاق التبويبات المفتوحة
    self.skipWaiting();
});

// 2. حدث التفعيل (Activation): يتم فيه تنظيف ذاكرة التخزين القديمة
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // السيطرة على كافة الصفحات المفتوحة فوراً
    return self.clients.claim();
});

// 3. حدث جلب البيانات (Fetch): يحدد كيف يستجيب التطبيق لطلبات الملفات
self.addEventListener('fetch', (event) => {
    // عدم التدخل في طلبات الـ POST (التي تُستخدم لإرسال البيانات للسيرفر)
    // لأن الـ POST لا يمكن تخزينه في الـ Cache ويتم معالجته عبر الطابور في app.js
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // إذا كان الملف موجوداً في الذاكرة المخبأة، نرجعه فوراً (سرعة عالية)
            if (cachedResponse) {
                return cachedResponse;
            }

            // إذا لم يكن موجوداً، نقوم بطلبه من الشبكة
            return fetch(event.request).then((networkResponse) => {
                // التحقق من صحة الاستجابة قبل تخزينها
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // تخزين نسخة من الملف الجديد في الذاكرة لاستخدامه لاحقاً
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // في حالة فشل الشبكة تماماً وعدم وجود الملف في الـ Cache
                // يمكن هنا إرجاع صفحة أوفلاين مخصصة إذا أردت
                console.log('[Service Worker] Fetch failed; returning offline fallback.');
            });
        })
    );
});

// 4. حدث المزامنة الخلفية (Background Sync) - اختياري لتحسين الموثوقية
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-new-visits') {
        console.log('[Service Worker] Syncing new visits...');
        // المزامنة الفعلية تتم داخل app.js، لكن يمكن استدعاؤها من هنا أيضاً
    }
});
