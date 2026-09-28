// ===== إعدادات (تعدل من هنا) =====
const PLATFORM_FEE = 0.05; // مؤقتة للتجربة، لم تحدد بعد
const CATS = ["الكل","📱 إلكترونيات","💻 كمبيوتر","🏠 المنزل","👕 الملابس","🔧 الأدوات","📚 الكتب","🚗 السيارات","🏗️ مواد البناء","🌱 الزراعة"];
// قائمة الكلمات الممنوعة (مؤقتة، القائمة الحقيقية تحدد قبل الإطلاق)
const BANNED = ["ممنوع_تجربة"];

// ===== بيانات تجريبية =====
const sellers = {
  s1:{name:"متجر النور للإلكترونيات",badge:"🔵 بائع موثوق",rating:4.8,done:210,area:"الخرطوم"},
  s2:{name:"أزياء الخرطوم",badge:"🟢 بائع موثق",rating:4.5,done:64,area:"الخرطوم - أم درمان"},
  s3:{name:"مكتبة المعرفة",badge:"🟡 بائع جديد",rating:4.2,done:9,area:"بحري"}
};

const baseProducts = [
  {id:1,name:"هاتف Honor X8a",icon:"📱",price:500000,ship:20000,seller:"s1",cat:"📱 إلكترونيات",cond:"جديد",prep:"يوم واحد",desc:"هاتف جديد، ذاكرة 128GB، لون أسود.",stock:5,status:"published"},
  {id:2,name:"لابتوب 15 بوصة",icon:"💻",price:1200000,ship:30000,seller:"s1",cat:"💻 كمبيوتر",cond:"جديد",prep:"يومان",desc:"رام 8GB، تخزين 256GB.",stock:3,status:"published"},
  {id:3,name:"قميص رجالي قطن",icon:"👕",price:30000,ship:10000,seller:"s2",cat:"👕 الملابس",cond:"جديد",prep:"يوم واحد",desc:"مقاسات M, L, XL.",stock:20,status:"published"},
  {id:4,name:"عباية نسائية",icon:"👗",price:65000,ship:10000,seller:"s2",cat:"👕 الملابس",cond:"جديد",prep:"يوم واحد",desc:"قماش ممتاز، مقاس موحد.",stock:8,status:"published"},
  {id:5,name:"كتاب تعلم البرمجة",icon:"📚",price:15000,ship:5000,seller:"s3",cat:"📚 الكتب",cond:"جديد",prep:"يوم واحد",desc:"كتاب للمبتدئين بالعربي.",stock:10,status:"published"},
  {id:6,name:"طقم أدوات يدوية",icon:"🔧",price:45000,ship:15000,seller:"s3",cat:"🔧 الأدوات",cond:"جديد",prep:"يومان",desc:"طقم 40 قطعة.",stock:6,status:"published"}
];
