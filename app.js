/* app.js */

let current = {
  fecha: new Date().toLocaleDateString('es-ES'),
  patron: null,
  severidad: null,
  severidadClass: '',
  obstruccion: null,
  interpretable: null,
  bd: null
};

let hasEverCalculated = false;

/* ---------- helpers básicos ---------- */

function sanitizeDecimal(inputEl){
  if (!inputEl) return;
  let v = (inputEl.value || '');
  v = v.replace(/[^\d,.\-]/g, '');

  const firstComma = v.indexOf(',');
  const firstDot = v.indexOf('.');
  if (firstComma !== -1 && firstDot !== -1){
    if (firstComma < firstDot) v = v.replace(/\./g, '');
    else v = v.replace(/,/g, '');
  }
  inputEl.value = v;
}

function num(id){
  const el = document.getElementById(id);
  if (!el) return null;
  const raw = (el.value || '').trim().replace(',', '.');
  if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return null;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : null;
}

function txt(id){
  const el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}

function inRange(v, min, max){
  return v !== null && v >= min && v <= max;
}

/* ✅ móvil real: <= 820 (coherente con CSS) */
function isMobileView(){
  return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
}

/* ---------- errores de campo ---------- */

function setFieldError(msg){
  const box = document.getElementById('fieldError');
  const mbox = document.getElementById('m_fieldError');

  if (box){
    if (!msg){ box.textContent=''; box.classList.remove('show'); }
    else { box.textContent = msg; box.classList.add('show'); }
  }
  if (mbox){
    if (!msg){ mbox.textContent=''; mbox.classList.remove('show'); }
    else { mbox.textContent = msg; mbox.classList.add('show'); }
  }
}

function validateHumanLimits(){
  const fvc = num('mejorFVC');
  const fev1 = num('mejorFEV1');
  const ratio = num('ratioMF');
  const fvcRef = num('fvcRef');
  const fev1Ref = num('fev1Ref');
  const fefRef = num('fefRef');
  const post = num('bdFev1Post');

  if (fvc !== null && !inRange(fvc, 0.20, 8.00)) return 'Mejor FVC fuera de rango (0.20–8.00 L).';
  if (fev1 !== null && !inRange(fev1, 0.20, 8.00)) return 'Mejor FEV1 fuera de rango (0.20–8.00 L).';
  if (ratio !== null && !inRange(ratio, 5, 110)) return 'MFEV1/MFVC fuera de rango (5–110%).';
  if (fvcRef !== null && !inRange(fvcRef, 10, 250)) return 'FVC %REF fuera de rango (10–250%).';
  if (fev1Ref !== null && !inRange(fev1Ref, 10, 250)) return 'FEV1 %REF fuera de rango (10–250%).';
  if (fefRef !== null && !inRange(fefRef, 10, 250)) return 'FEF25–75 %REF fuera de rango (10–250%).';
  if (post !== null && !inRange(post, 0.20, 8.00)) return 'PBD POST (FEV1) fuera de rango (0.20–8.00 L).';
  return null;
}

/* ---------- ratio auto si vacío ---------- */

function autoFillRatioIfEmpty(){
  const fvc = num('mejorFVC');
  const fev1 = num('mejorFEV1');
  const ratioInput = document.getElementById('ratioMF');
  const mRatioInput = document.getElementById('m_ratioMF');
  if (!ratioInput) return;

  const raw = (ratioInput.value || '').trim();
  if (raw !== '') return;

  if (fvc && fev1 && fvc > 0){
    const v = ((fev1 / fvc) * 100).toFixed(2);
    ratioInput.value = v;
    if (mRatioInput && (mRatioInput.value || '').trim() === '') mRatioInput.value = v;
  }
}

/* ---------- calidad ---------- */

function isGradeAcceptable(g){
  if (!g)
