# 📱 تطبيق أورل ترونكس (Aurel Tronics) للمناديب

تطبيق ويب متطور لإدارة الزيارات الميدانية باستخدام Google Sheets كقاعدة بيانات.

## 🛠️ الإعداد (Setup)

### الخطوة 1: جوجل شيت (Google Sheets)
1. أنشئ ملف Google Sheets جديد باسم "Aurel Tronics DB".
2. قم بتغيير أسماء أوراق العمل (Sheets) إلى:
   - **Users**: الأعمدة `[اسم المستخدم, كلمة المرور, البلد, تاريخ التسجيل]`
   - **Visits**: الأعمدة في الصف الأول (هام جداً بنفس الترتيب):
     `timestamp, repName, drName, clinicName, specialties, phone1, phone2, address, gpsLink, status, nextVisitDate, notes, promos, isDone`

### الخطوة 2: كود السكربت (Apps Script)
1. من داخل الجدول، اختر **Extensions > Apps Script**.
2. انسخ الكود من ملف `Code.gs` والصقه هناك.
3. اضغط على **Deploy > New Deployment**.
4. اختر النوع **Web App**.
5. اجعل "Who has access" هو **Anyone**.
6. انسخ رابط الـ **Web App URL** الناتج.

### الخطوة 3: ربط الواجهة
1. افتح ملف `app.js`.
2. استبدل `YOUR_GOOGLE_SCRIPT_WEB_APP_URL` بالرابط الذي نسخته في الخطوة السابقة.

### الخطوة 4: الرفع على GitHub Pages
1. ارفع ملفات `index.html` و `app.js` على مستودع (Repository) في GitHub.
2. اذهب إلى Settings > Pages وفعل الاستضافة.

---
**ملاحظة تقنية:** التطبيق مصمم للعمل كـ Mobile Web App. للحصول على أفضل تجربة، افتح الرابط من المتصفح على الهاتف وقم بعمل "Add to Home Screen".