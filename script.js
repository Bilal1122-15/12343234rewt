// زر البداية
document.getElementById("startButton").addEventListener("click", function () {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("main-content").style.display = "block";
});

// اظهار خانة الكثافة اذا اختار مخصص
document.getElementById("oilType").addEventListener("change", function() {
  document.getElementById("customDensityContainer").style.display = this.value === "custom" ? "block" : "none";
});

// اظهار خيار عدد نقاط العمق (مخصص)
document.getElementById("depthOption").addEventListener("change", function() {
  let value = this.value;
  if (value === "custom") {
    document.getElementById("customDepthValue").style.display = "block";
  } else {
    document.getElementById("customDepthValue").style.display = "none";
  }
});

// إظهار الكانفس إذا اختار تحديد يدوي
document.getElementById("detectionMethod").addEventListener("change", function () {
  if (this.value === "manual") {
    document.getElementById("manualDrawingSection").style.display = "block";
  } else {
    document.getElementById("manualDrawingSection").style.display = "none";
  }
});

// قراءة ملف Excel للأعماق
document.getElementById("excelUpload").addEventListener("change", function(e) {
  let file = e.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function(event) {
      let data = new Uint8Array(event.target.result);
      let workbook = XLSX.read(data, { type: "array" });
      let sheet = workbook.Sheets[workbook.SheetNames[0]];
      let range = XLSX.utils.decode_range(sheet['!ref']);
      let depths = [];

      for (let row = range.s.r; row <= range.e.r; row++) {
        let cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
        if (cell && !isNaN(cell.v)) {
          depths.push(parseFloat(cell.v));
        }
      }

      // ترتيب القيم تصاعدياً (من الأصغر إلى الأكبر)
      depths.sort((a, b) => a - b);

      let selectedOption = document.getElementById("depthOption").value;
      let expectedCount = selectedOption === "custom" ? parseInt(document.getElementById("customDepthValue").value) : parseInt(selectedOption);

      if (depths.length !== expectedCount) {
        alert("❌ عدد قيم السمك غير متوافق! الملف يحتوي على " + depths.length + " قيم.");
        document.getElementById("depths").value = "";
        document.getElementById("excelFileName").innerText = "";
      } else {
        document.getElementById("depths").value = depths.join(", ");
        document.getElementById("excelFileName").innerText = "✅ تم رفع الملف بنجاح!";
      }
    };
    reader.readAsArrayBuffer(file);
  }
});

// اعداد الكانفس للرسم الحر
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let points = [];
let image = null;
let areaInPixels = 0;

document.getElementById('imageUpload').addEventListener('change', function(e) {
  let file = e.target.files[0];
  if (!file) return;
  let img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    image = img;
  }
});

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
  drawing = true;
  points = [];
  ctx.beginPath();
  ctx.moveTo(getX(e), getY(e));
  points.push([getX(e), getY(e)]);
}

function draw(e) {
  if (!drawing) return;
  ctx.lineTo(getX(e), getY(e));
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.stroke();
  points.push([getX(e), getY(e)]);
}

function stopDrawing(e) {
  drawing = false;
  ctx.closePath();
  
  // تعبئة التحديد باللون الأحمر الشفاف
  ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function getX(e) {
  if (e.touches) return e.touches[0].clientX - canvas.getBoundingClientRect().left;
  return e.clientX - canvas.getBoundingClientRect().left;
}

function getY(e) {
  if (e.touches) return e.touches[0].clientY - canvas.getBoundingClientRect().top;
  return e.clientY - canvas.getBoundingClientRect().top;
}

document.getElementById('finishDrawing').addEventListener('click', function() {
  if (points.length < 3) {
    alert("⚠️ يجب تحديد شكل مغلق أولاً!");
    return;
  }
  areaInPixels = polygonArea(points);
  alert(`✅ تم تحديد البقعة بنجاح!`);
});

function polygonArea(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    let j = (i + 1) % pts.length;
    area += (pts[i][0] * pts[j][1]) - (pts[j][0] * pts[i][1]);
  }
  return Math.abs(area) / 2;
}

// حساب النتائج
function calculateOilMass() {
  let depthsInput = document.getElementById("depths").value;
  let droneHeight = parseFloat(document.getElementById("droneHeight").value);
  let cameraFov = parseFloat(document.getElementById("cameraFov").value);
  let oilType = document.getElementById("oilType").value;
  let oilDensity = oilType !== "custom" ? parseFloat(oilType) : parseFloat(document.getElementById("customDensity").value);

  if (!depthsInput || isNaN(droneHeight) || isNaN(cameraFov) || isNaN(oilDensity)) {
    alert("❌ الرجاء إدخال جميع البيانات المطلوبة بشكل صحيح!");
    return;
  }

  let depthsArray = depthsInput.split(",").map(num => parseFloat(num.trim())).filter(num => !isNaN(num));
  if (depthsArray.length === 0) {
    alert("⚠️ لا يوجد قيم صحيحة للأعماق!");
    return;
  }

  let averageDepth = depthsArray.reduce((sum, value) => sum + value, 0) / depthsArray.length;
  let fovInRadians = cameraFov * (Math.PI / 180);
  let sceneWidth = 2 * droneHeight * Math.tan(fovInRadians / 2);
  let pixelSize = sceneWidth / canvas.width;
  
  let detectionMethod = document.getElementById("detectionMethod").value;
  let estimatedArea = 0;

  if (detectionMethod === "manual") {
    if (areaInPixels === 0) {
      alert("⚠️ الرجاء تحديد البقعة أولاً!");
      return;
    }
    estimatedArea = areaInPixels * (pixelSize ** 2);
  } else {
    estimatedArea = sceneWidth * sceneWidth * (3/4); // تحليل تلقائي باستخدام FOV والارتفاع
  }

  let volume = (estimatedArea * averageDepth).toFixed(2);
  let mass = (volume * oilDensity).toFixed(2);

  document.getElementById("output").innerHTML = `
    📏 <strong>المساحة المقدرة:</strong> ${estimatedArea.toFixed(2)} م² <br>
    📊 <strong>متوسط العمق:</strong> ${averageDepth.toFixed(2)} م <br>
    📦 <strong>الحجم:</strong> ${volume} م³ <br>
    ⚖️ <strong>الكتلة:</strong> ${mass} كجم
  `;
}