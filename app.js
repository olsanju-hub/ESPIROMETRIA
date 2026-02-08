/* PARTE 2/2 · app.js
   Pega este contenido como archivo "app.js" en la misma carpeta del HTML.
*/

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
    // si hay ambos, quitamos el separador “secundario”
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

function isMobileView(){
  return window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
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

/* ---------- calidad ---------- */

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

function isGradeAcceptable(g){
  if (!g) return null;
  if (g === 'F') return false;
  return true;
}

function isRepOK(r){
  if (!r) return null;
  return r === 'si';
}

function computeInterpretability(){
  const manual = txt('manualQuality');
  if (manual === 'si') return true;
  if (manual === 'no') return false;

  const qFVC = isGradeAcceptable(txt('calidadFVC'));
  const qFEV1 = isGradeAcceptable(txt('calidadFEV1'));
  const rFVC = isRepOK(txt('repFVC'));
  const rFEV1 = isRepOK(txt('repFEV1'));

  if (qFVC === null || qFEV1 === null || rFVC === null || rFEV1 === null) return null;
  return (qFVC && qFEV1 && rFVC && rFEV1);
}

/* ---------- render ---------- */

function renderGradeDetail(targetId, data){
  const box = document.getElementById(targetId);
  if (!box) return;

  if (!data || !data.show){
    box.classList.remove('show');
    box.textContent = '';
    return;
  }

  const chip = `<span class="grade-chip">${data.chip}</span>`;
  box.innerHTML =
    `<span class="k">Detalle</span>${chip}\n` +
    `${data.mainLine}\n` +
    `${data.subLine ? data.subLine + '\n' : ''}` +
    `${data.note ? data.note : ''}`;

  box.classList.add('show');
}

function updateOutputs(){
  const outInter = document.getElementById('outInterpretable');
  const outObs = document.getElementById('outObstruccion');
  if (outInter) outInter.textContent = (current.interpretable === null) ? '—' : (current.interpretable ? 'SÍ' : 'NO');
  if (outObs) outObs.textContent = (current.obstruccion === null) ? '—' : (current.obstruccion ? 'SÍ' : 'NO');

  const r = num('ratioMF');
  const fvcRef = num('fvcRef');
  const fev1Ref = num('fev1Ref');
  const fefRef = num('fefRef');

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('outRatio', (r===null) ? '—' : (r.toFixed(2) + '%'));
  set('outFvcRef', (fvcRef===null) ? '—' : (fvcRef.toFixed(1) + '%'));
  set('outFev1Ref', (fev1Ref===null) ? '—' : (fev1Ref.toFixed(1) + '%'));
  set('outFefRef', (fefRef===null) ? '—' : (fefRef.toFixed(1) + '%'));

  const mSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  mSet('m_outInterpretable', (current.interpretable === null) ? '—' : (current.interpretable ? 'SÍ' : 'NO'));
  mSet('m_outObstruccion', (current.obstruccion === null) ? '—' : (current.obstruccion ? 'SÍ' : 'NO'));
  mSet('m_outRatio', (r===null) ? '—' : (r.toFixed(2) + '%'));
  mSet('m_outFvcRef', (fvcRef===null) ? '—' : (fvcRef.toFixed(1) + '%'));
  mSet('m_outFev1Ref', (fev1Ref===null) ? '—' : (fev1Ref.toFixed(1) + '%'));

  // PRE para PBD
  const pre = num('mejorFEV1');
  const bdPre = document.getElementById('bdFev1Pre');
  const mBdPre = document.getElementById('m_bdFev1Pre');
  if (bdPre) bdPre.value = (pre===null) ? '' : pre.toFixed(2);
  if (mBdPre) mBdPre.value = (pre===null) ? '' : pre.toFixed(2);

  // sincronizar POST si ya existe en desktop
  const bdPost = document.getElementById('bdFev1Post');
  const mBdPost = document.getElementById('m_bdFev1Post');
  if (bdPost && mBdPost && (mBdPost.value || '').trim() === '' && (bdPost.value || '').trim() !== ''){
    mBdPost.value = bdPost.value;
  }
}

function showResult(){
  const patronDiv = document.getElementById('patron');
  const sevDiv = document.getElementById('severidad');
  const mPatronDiv = document.getElementById('m_patron');
  const mSevDiv = document.getElementById('m_severidad');

  const p = current.patron || 'PENDIENTE';

  if (patronDiv){
    patronDiv.textContent = p;
    patronDiv.classList.toggle('no-interpretable', p === 'NO INTERPRETABLE');
  }
  if (mPatronDiv){
    mPatronDiv.textContent = p;
    mPatronDiv.classList.toggle('no-interpretable', p === 'NO INTERPRETABLE');
  }

  const s = current.severidad || '';
  if (sevDiv){
    sevDiv.textContent = s;
    sevDiv.className = 'severity ' + (current.severidadClass || '');
  }
  if (mSevDiv){
    mSevDiv.textContent = s;
    mSevDiv.className = 'severity ' + (current.severidadClass || '');
  }

  updateOutputs();
  syncLocking();
}

/* ---------- patrón + grado ---------- */

function getObstructionGradeFromRef(fev1Ref){
  if (fev1Ref === null || fev1Ref === undefined || Number.isNaN(fev1Ref)) return null;
  if (fev1Ref >= 80) return { label: 'Leve', cls: 'leve' };
  if (fev1Ref >= 50) return { label: 'Moderada', cls: 'moderado' };
  if (fev1Ref >= 30) return { label: 'Grave', cls: 'severo' };
  return { label: 'Muy grave', cls: 'muy-severo' };
}

function calcularPatronYGrado(){
  const limitsError = validateHumanLimits();
  if (limitsError){
    setFieldError(limitsError);
    current.interpretable = null;
    current.obstruccion = null;
    current.patron = 'PENDIENTE (revisar valores)';
    current.severidad = '';
    current.severidadClass = '';

    renderGradeDetail('gradoDetalle', {
      show:true, chip:'Valores',
      mainLine:'• Corrige el valor fuera de rango.',
      subLine: limitsError,
      note:''
    });
    renderGradeDetail('m_gradoDetalle', {
      show:true, chip:'Valores',
      mainLine:'• Corrige el valor fuera de rango.',
      subLine: limitsError,
      note:''
    });

    showResult();
    updatePlan();
    return;
  }
  setFieldError(null);

  current.interpretable = computeInterpretability();

  const warn = document.getElementById('qualityWarning');
  const mWarn = document.getElementById('m_qualityWarning');
  if (current.interpretable === false && hasEverCalculated){
    if (warn) warn.classList.add('show');
    if (mWarn) mWarn.classList.add('show');
  } else {
    if (warn) warn.classList.remove('show');
    if (mWarn) mWarn.classList.remove('show');
  }

  if (current.interpretable === null){
    current.patron = 'PENDIENTE (calidad no confirmada)';
    current.severidad = '';
    current.severidadClass = '';
    current.obstruccion = null;

    renderGradeDetail('gradoDetalle', {
      show:true, chip:'Calidad',
      mainLine:'• No se interpreta hasta confirmar calidad.',
      subLine:'• Marca "Calidad suficiente: Sí/No" o completa ATS/ERS (FVC+FEV1 + reproducibilidad).',
      note:''
    });
    renderGradeDetail('m_gradoDetalle', {
      show:true, chip:'Calidad',
      mainLine:'• No se interpreta hasta confirmar calidad.',
      subLine:'• Marca "Calidad suficiente: Sí/No" o completa ATS/ERS (FVC+FEV1 + reproducibilidad).',
      note:''
    });

    showResult();
    updatePlan();
    return;
  }

  if (current.interpretable === false){
    current.patron = 'NO INTERPRETABLE';
    current.severidad = 'Repetir (calidad/reproducibilidad insuficiente)';
    current.severidadClass = '';
    current.obstruccion = null;

    renderGradeDetail('gradoDetalle', { show:false });
    renderGradeDetail('m_gradoDetalle', { show:false });

    showResult();
    updatePlan();
    return;
  }

  // interpretable === true
  const ratio = num('ratioMF');
  const fvcRef = num('fvcRef');
  const fev1Ref = num('fev1Ref');

  if (ratio === null){
    current.obstruccion = null;
    current.patron = 'PENDIENTE (falta RATIO)';
    current.severidad = '';
    current.severidadClass = '';

    renderGradeDetail('gradoDetalle', {
      show:true, chip:'Faltan datos',
      mainLine:'• Para decidir obstrucción: introduce MFEV1/MFVC (%).',
      subLine:'',
      note:''
    });
    renderGradeDetail('m_gradoDetalle', {
      show:true, chip:'Faltan datos',
      mainLine:'• Para decidir obstrucción: introduce MFEV1/MFVC (%).',
      subLine:'',
      note:''
    });

    showResult();
    updatePlan();
    return;
  }

  current.obstruccion = (ratio < 70);

  const hasFvcRef = (fvcRef !== null);
  let patron = 'PENDIENTE';
  let sev = '';
  let sevClass = '';
  let detail = { show:false };

  if (current.obstruccion){
    if (hasFvcRef){
      patron = (fvcRef <= 80)
        ? 'OBSTRUCTIVO con FVC baja (atrapamiento vs mixto)'
        : 'OBSTRUCTIVO';
    } else {
      patron = 'OBSTRUCTIVO (falta FVC %REF para matizar)';
    }

    const g = getObstructionGradeFromRef(fev1Ref);
    if (g){
      sev = `${g.label} (FEV1 ${fev1Ref.toFixed(1)}%REF)`;
      sevClass = g.cls;

      detail = {
        show:true, chip:'Obstrucción · grado',
        mainLine:`• Obstrucción: ratio ${ratio.toFixed(2)}% < 70%.`,
        subLine:`• Grado por FEV1 %REF = ${fev1Ref.toFixed(1)}% → ${g.label.toUpperCase()}.`,
        note:(fvcRef !== null && fvcRef <= 80)
          ? '• FVC baja: atrapamiento (pseudorrestricción) vs mixto; si cambia conducta, confirmar con volúmenes (TLC).'
          : ''
      };
    } else {
      sev = 'Sin grado (falta FEV1 %REF)';
      detail = {
        show:true, chip:'Obstrucción',
        mainLine:`• Obstrucción: ratio ${ratio.toFixed(2)}% < 70%.`,
        subLine:`• Para grado, añade FEV1 %REF.`,
        note:''
      };
    }

  } else {
    if (!hasFvcRef){
      patron = 'NO OBSTRUCCIÓN (falta FVC %REF para normal vs restricción sugerida)';
      detail = {
        show:true, chip:'Faltan datos',
        mainLine:`• NO obstrucción: ratio ${ratio.toFixed(2)}% ≥ 70%.`,
        subLine:`• Para cerrar patrón, añade FVC %REF.`,
        note:''
      };
    } else {
      if (fvcRef <= 80){
        patron = 'RESTRICTIVO (sugerido)';
        sev = 'Confirmar con volúmenes/TLC si procede';
        detail = {
          show:true, chip:'Restricción sugerida',
          mainLine:`• NO obstrucción: ratio ${ratio.toFixed(2)}% ≥ 70%.`,
          subLine:`• FVC %REF ${fvcRef.toFixed(1)}% ≤80 → restricción sugerida.`,
          note:''
        };
      } else {
        patron = 'NORMAL';
        sev = 'Sin alteraciones (según cortes)';
        sevClass = 'normal';
        detail = {
          show:true, chip:'Normal',
          mainLine:`• NO obstrucción: ratio ${ratio.toFixed(2)}% ≥ 70%.`,
          subLine:`• FVC %REF ${fvcRef.toFixed(1)}% >80 → normal.`,
          note:`• Si hay síntomas, correlacionar (asma intercrisis puede ser normal).`
        };
      }
    }
  }

  current.patron = patron;
  current.severidad = sev;
  current.severidadClass = sevClass;

  renderGradeDetail('gradoDetalle', detail);
  renderGradeDetail('m_gradoDetalle', detail);

  showResult();
  updatePlan();
}

/* ---------- manejo (texto) ---------- */

function prettyContext(c){
  if (c === 'seguimiento') return 'Seguimiento';
  if (c === 'diagnostico') return 'Duda diagnóstica';
  return 'Atención Primaria';
}

function prettySospecha(s){
  if (s === 'epoc') return 'EPOC';
  if (s === 'asma') return 'Asma';
  if (s === 'otros') return 'Otros';
  return 'No especificada';
}

function add(lines, t){ if (t) lines.push(t); }
function bullet(lines, t){ if (t) lines.push('• ' + t); }
function dash(lines, t){ if (t) lines.push('- ' + t); }

function getBDLine(){
  if (!current.bd) return 'PBD: no realizada o no calculada.';
  return `PBD: ${current.bd.texto}  |  PRE=${current.bd.pre.toFixed(2)} L  POST=${current.bd.post.toFixed(2)} L`;
}

function buildGeneralPlan(){
  if (!hasEverCalculated) return 'Introduce valores, añade calidad y calcula.';

  if (current.interpretable === null){
    return `CALIDAD: PENDIENTE

La app NO interpreta ni propone manejo hasta confirmar calidad.
Siguiente paso:
- Marca "Calidad suficiente: Sí/No" o completa ATS/ERS (FVC+FEV1 + reproducibilidad).`;
  }

  if (current.interpretable === false){
    return `DX FUNCIONAL: NO INTERPRETABLE

No tomar decisiones basadas en esta prueba.
Siguiente paso:
- Repetir espirometría asegurando calidad y reproducibilidad.
- Revisar técnica, sellado, inicio explosivo, tos, finalización y reproducibilidad.`;
  }

  const patron = current.patron || '—';
  const sospecha = txt('sospecha');
  const contexto = txt('contexto');

  const ratio = num('ratioMF');
  const fvcRef = num('fvcRef');
  const fev1Ref = num('fev1Ref');

  const lines = [];
  add(lines, `DX FUNCIONAL: ${patron}`);
  if (current.severidad) add(lines, `Grado/nota: ${current.severidad}`);
  add(lines, getBDLine());
  add(lines, '');
  add(lines, `Contexto: ${prettyContext(contexto)}`);
  add(lines, `Sospecha clínica: ${prettySospecha(sospecha)}`);
  add(lines, '');
  add(lines, 'PASOS (orden práctico):');

  add(lines, '0) Antes de actuar');
  bullet(lines, 'Correlacionar con clínica: síntomas, tabaco/exposición, variabilidad, exacerbaciones, comorbilidades.');
  bullet(lines, 'Revisar técnica inhalatoria y adherencia si ya hay tratamiento.');
  bullet(lines, 'Registrar valores y fecha (para comparar en seguimiento).');
  add(lines, '');

  if (patron.includes('OBSTRUCTIVO')){
    add(lines, '1) Interpretación funcional (obstrucción)');
    bullet(lines, 'Confirmar que la obstrucción encaja con clínica y exposición.');
    bullet(lines, 'Si FVC baja: pensar en atrapamiento (pseudorrestricción) vs mixto; si cambia conducta, confirmar con volúmenes (TLC).');
    bullet(lines, 'Integrar PBD con clínica (variabilidad apoya asma/solapamiento).');
    add(lines, '');

    add(lines, '2) Orientación diagnóstica rápida');
    if (sospecha === 'asma'){
      bullet(lines, 'Si clínica compatible con asma: priorizar control de inflamación y variabilidad (evitar monoterapia broncodilatadora de larga duración).');
      bullet(lines, 'Definir control: síntomas diurnos/nocturnos, uso de rescate, limitación, crisis.');
    } else if (sospecha === 'epoc'){
      bullet(lines, 'Si clínica compatible con EPOC: priorizar broncodilatación de mantenimiento y reducción de riesgo (tabaco, vacunas, ejercicio/rehabilitación).');
      bullet(lines, 'Registrar exacerbaciones previas (frecuencia, gravedad, antibiótico/corticoide, ingresos).');
    } else {
      bullet(lines, 'Si no está claro (asma vs EPOC vs solapamiento): usar historia (variabilidad/atopia vs tabaco crónico) + respuesta a tratamiento + evolución.');
    }
    add(lines, '');

    add(lines, '3) Seguimiento (muy operativo)');
    bullet(lines, 'Revisar técnica inhalatoria en consulta (demostración + corrección).');
    bullet(lines, 'Plan de revisión en semanas: síntomas, uso de rescate, tolerancia, exacerbaciones.');
    bullet(lines, 'Repetir espirometría si: mala respuesta, duda diagnóstica, cambio clínico relevante o para documentar persistencia/variabilidad.');
    add(lines, '');

    add(lines, '4) Señales de “derivar / ampliar estudio”');
    bullet(lines, 'Obstrucción moderada-grave con síntomas relevantes, o síntomas desproporcionados.');
    bullet(lines, 'Exacerbaciones repetidas, o mala respuesta pese a buena técnica/adherencia.');
    bullet(lines, 'Duda entre atrapamiento vs patrón mixto que cambie decisiones (considerar volúmenes/TLC).');

  } else if (patron.includes('RESTRICTIVO')){
    add(lines, '1) Interpretación funcional (restricción sugerida)');
    bullet(lines, 'Esto es “sugerido” por FVC baja con ratio normal: no confirma restricción sin volúmenes (TLC).');
    bullet(lines, 'Si afecta decisiones, confirmar con volúmenes y orientar estudio según clínica.');
    add(lines, '');

    add(lines, '2) Orientación clínica inicial');
    bullet(lines, 'Revisar: obesidad, pared torácica, debilidad neuromuscular, secuelas pleurales, enfermedad intersticial, etc.');
    bullet(lines, 'Si disnea progresiva, crepitantes, desaturación o Rx alterada: priorizar evaluación ampliada/derivación.');
    add(lines, '');

    add(lines, '3) Seguimiento');
    bullet(lines, 'Si clínica leve/estable: control evolutivo + repetir función respiratoria si hay cambios.');
    bullet(lines, 'Si clínica significativa: no esperar; completar estudio.');

  } else if (patron.includes('NORMAL')){
    add(lines, '1) Interpretación funcional (normal según cortes)');
    bullet(lines, 'Una espirometría normal NO excluye asma intercrisis si la clínica sugiere variabilidad.');
    bullet(lines, 'Si sospecha alta: repetir en fase sintomática y/o completar evaluación de variabilidad.');
    add(lines, '');

    add(lines, '2) Si persisten síntomas');
    bullet(lines, 'Revisar diagnóstico diferencial: cardiaco, anemia, descondicionamiento, obesidad, rinitis/ERGE, ansiedad, etc.');
    bullet(lines, 'Si hay banderas rojas (disnea progresiva, desaturación, hemoptisis, pérdida de peso, dolor torácico): ampliar estudio/derivar.');

  } else {
    add(lines, '1) Completar datos para cerrar patrón');
    bullet(lines, 'Introduce RATIO (MFEV1/MFVC).');
    bullet(lines, 'Añade FVC %REF para diferenciar normal vs restricción sugerida.');
    bullet(lines, 'Si hay obstrucción, añade FEV1 %REF para graduar.');
  }

  add(lines, '');
  add(lines, 'DATOS CLAVE (registro):');
  if (ratio !== null) dash(lines, `RATIO = ${ratio.toFixed(2)}% (corte 70)`);
  if (fvcRef !== null) dash(lines, `FVC %REF = ${fvcRef.toFixed(1)}%`);
  if (fev1Ref !== null) dash(lines, `FEV1 %REF = ${fev1Ref.toFixed(1)}%`);

  return lines.join('\n');
}

function updatePlan(){
  const text = buildGeneralPlan();
  const plan = document.getElementById('planBox');
  const mPlan = document.getElementById('m_planBox');
  if (plan) plan.textContent = text;
  if (mPlan) mPlan.textContent = text;
  buildMobileFinalReport();
}

/* ---------- cálculo global ---------- */

function calcularTodo(){
  hasEverCalculated = true;
  autoFillRatioIfEmpty();
  current.fecha = new Date().toLocaleDateString('es-ES');
  calcularPatronYGrado();
  updatePlan();
  buildMobileFinalReport();
  syncDesktopToMobile();
}

/* ---------- PBD ---------- */

function calcularBD(){
  const pre = num('bdFev1Pre');
  const post = num('bdFev1Post');

  const bd = document.getElementById('bdresult');
  const mbd = document.getElementById('m_bdresult');

  const setRes = (t, ok, color) => {
    if (bd){ bd.textContent = t; bd.style.background = color || '#000'; }
    if (mbd){ mbd.textContent = t; mbd.style.background = color || '#000'; }
  };

  if (!pre || !post){
    setRes('No calculada', false, '#000');
    current.bd = null;
    updatePlan();
    syncDesktopToMobile();
    return;
  }

  if (!inRange(post, 0.20, 8.00)){
    setRes('POST fuera de rango', false, '#DC2626');
    current.bd = null;
    updatePlan();
    syncDesktopToMobile();
    return;
  }

  const cambioAbs = post - pre;
  const cambioPor = (cambioAbs / pre) * 100;

  const classicPos = (cambioAbs >= 0.2) && (cambioPor >= 12);

  const fev1Ref = num('fev1Ref');
  let pred = null;
  let altPos = null;
  let cambioPredPor = null;

  if (fev1Ref !== null && fev1Ref > 0){
    pred = pre / (fev1Ref / 100);
    cambioPredPor = (cambioAbs / pred) * 100;
    altPos = (cambioPredPor > 10);
  }

  const esPositiva = classicPos || (altPos === true);
  const absMl = Math.round(cambioAbs * 1000);
  const signo = (cambioPor >= 0) ? '+' : '';
  let extra = '';

  if (pred !== null && cambioPredPor !== null){
    const signo2 = (cambioPredPor >= 0) ? '+' : '';
    extra = ` | Δ%pred=${signo2}${cambioPredPor.toFixed(1)}%`;
  } else {
    extra = ' | Δ%pred=—';
  }

  const res = esPositiva
    ? `POSITIVA (${signo}${cambioPor.toFixed(1)}%, ${absMl} ml)${extra}`
    : `NEGATIVA (${signo}${cambioPor.toFixed(1)}%, ${absMl} ml)${extra}`;

  setRes(res, esPositiva, esPositiva ? '#059669' : '#DC2626');

  current.bd = {
    pre, post, cambioAbs, cambioPor, classicPos, altPos, pred, cambioPredPor,
    esPositiva, absMl, texto: res
  };

  updatePlan();
  buildMobileFinalReport();
  syncDesktopToMobile();
}

/* ---------- informe ---------- */

function buildFullReportLines(){
  const lines = [];
  lines.push('INFORME DE ESPIROMETRÍA (resumen)');
  lines.push(`Fecha: ${current.fecha}`);
  lines.push('');

  lines.push('DATOS INTRODUCIDOS (PRE):');
  lines.push(`- Mejor FVC (l): ${num('mejorFVC') === null ? '—' : num('mejorFVC').toFixed(2)}`);
  lines.push(`- Mejor FEV1 (l): ${num('mejorFEV1') === null ? '—' : num('mejorFEV1').toFixed(2)}`);
  lines.push(`- MFEV1/MFVC (%): ${num('ratioMF') === null ? '—' : num('ratioMF').toFixed(2)}`);
  lines.push(`- FVC %REF: ${num('fvcRef') === null ? '—' : num('fvcRef').toFixed(1)}`);
  lines.push(`- FEV1 %REF: ${num('fev1Ref') === null ? '—' : num('fev1Ref').toFixed(1)}`);
  lines.push(`- FEF25%-75% %REF (opcional): ${num('fefRef') === null ? '—' : num('fefRef').toFixed(1)}`);
  lines.push('');

  lines.push('CALIDAD:');
  lines.push(`- Calidad suficiente (manual): ${txt('manualQuality') ? (txt('manualQuality')==='si'?'Sí':'No') : '—'}`);
  lines.push(`- ATS/ERS (si usado): FVC ${txt('calidadFVC') || '—'} / FEV1 ${txt('calidadFEV1') || '—'} | Rep FVC ${txt('repFVC')||'—'} / Rep FEV1 ${txt('repFEV1')||'—'}`);
  lines.push('');

  const bdPre = num('bdFev1Pre');
  const bdPost = num('bdFev1Post');
  lines.push('PBD (si procede):');
  lines.push(`- Mejor FEV1 (l) PRE: ${bdPre === null ? '—' : bdPre.toFixed(2)}`);
  lines.push(`- Mejor FEV1 (l) POST: ${bdPost === null ? '—' : bdPost.toFixed(2)}`);
  lines.push('');

  lines.push('RESULTADOS:');
  lines.push(`- INTERPRETABLE: ${current.interpretable === null ? '— (pendiente)' : (current.interpretable ? 'SÍ' : 'NO')}`);
  lines.push(`- Obstrucción (ratio <70): ${current.obstruccion === null ? '—' : (current.obstruccion ? 'SÍ' : 'NO')}`);
  lines.push(`- Patrón: ${current.patron || '—'}`);
  lines.push(`- Grado/nota: ${current.severidad || '—'}`);
  lines.push(`- ${getBDLine()}`);
  lines.push('');
  lines.push('MANEJO / PRÓXIMOS PASOS:');
  lines.push(buildGeneralPlan());

  return lines;
}

function buildMobileFinalReport(){
  const box = document.getElementById('m_reportContent');
  if (!box) return;
  if (!hasEverCalculated){ box.textContent = ''; return; }
  box.textContent = buildFullReportLines().join('\n');
}

function generarInforme(){
  if (!hasEverCalculated){
    alert('Primero introduce valores y calcula.');
    return;
  }

  const text = buildFullReportLines().join('\n');

  if (isMobileView()){
    const box = document.getElementById('m_reportContent');
    if (box) box.textContent = text;
    goStep(6);
    return;
  }

  const reportContent = document.getElementById('reportContent');
  const modal = document.getElementById('reportModal');
  if (reportContent) reportContent.textContent = text;
  if (modal) modal.style.display = 'flex';
}

function copiarInforme(){
  const el = document.getElementById('reportContent');
  const texto = el ? el.textContent : '';
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => alert('Informe copiado'));
}

function copiarInformeMovil(){
  const el = document.getElementById('m_reportContent');
  const texto = el ? el.textContent : '';
  if (!texto){ alert('No hay informe aún.'); return; }
  navigator.clipboard.writeText(texto).then(() => alert('Informe copiado'));
}

/* ---------- modales ---------- */

function openInfoModal(){
  const modal = document.getElementById('infoModal');
  if (modal) modal.style.display = 'flex';
}

function closeModal(id){
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

window.onclick = function(event){
  if (event.target && event.target.classList && event.target.classList.contains('modal-overlay')){
    event.target.style.display = 'none';
  }
};

/* ---------- locking ---------- */

function syncLocking(){
  const lock = (current.interpretable === false || current.interpretable === null);

  const deskInterp = document.getElementById('deskInterp');
  const deskBD = document.getElementById('deskBD');
  if (deskInterp) deskInterp.classList.toggle('locked', lock);
  if (deskBD) deskBD.classList.toggle('locked', lock);

  const mWarn = document.getElementById('m_qualityWarning');
  if (mWarn){
    if (current.interpretable === false && hasEverCalculated) mWarn.classList.add('show');
    else mWarn.classList.remove('show');
  }
}

/* ---------- navegación móvil ---------- */

function goStep(n){
  const screens = {
    1: 'screen1',
    2: 'screen2',
    3: 'screen3',
    4: 'screen4',
    5: 'screen5',
    6: 'screen6'
  };

  Object.values(screens).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const id = screens[n];
  const target = id ? document.getElementById(id) : null;
  if (target) target.classList.add('active');

  if (n === 6) buildMobileFinalReport();
}

function goNextFromQuality(){
  hasEverCalculated = true;
  calcularTodo();

  if (current.interpretable === null){
    alert('Calidad pendiente. Marca "Calidad suficiente: Sí/No" o completa ATS/ERS + reproducibilidad.');
    goStep(1);
    return;
  }
  if (current.interpretable === false){
    alert('NO interpretable. No se puede continuar: repetir espirometría con calidad/reproducibilidad.');
    goStep(1);
    return;
  }
  goStep(2);
}

function goNextFromParams(){
  hasEverCalculated = true;
  calcularTodo();

  if (current.interpretable !== true){
    alert('Primero confirma calidad (interpretable).');
    goStep(1);
    return;
  }
  if (num('ratioMF') === null){
    alert('Falta el RATIO (MFEV1/MFVC %). No se puede interpretar sin él.');
    goStep(2);
    return;
  }
  goStep(3);
}

function goNextToBD(){
  hasEverCalculated = true;
  calcularTodo();

  if (current.interpretable !== true){
    alert('No interpretable o pendiente. No se puede continuar.');
    goStep(1);
    return;
  }
  if (num('ratioMF') === null){
    alert('Falta el RATIO (MFEV1/MFVC %).');
    goStep(2);
    return;
  }
  goStep(4);
}

function goNextToPlan(){
  hasEverCalculated = true;
  calcularTodo();

  if (current.interpretable !== true){
    alert('No interpretable o pendiente. No se puede acceder a manejo.');
    goStep(1);
    return;
  }
  goStep(5);
}

/* ---------- sync desktop <-> mobile ---------- */

function syncMobileToDesktop(id, value){
  const desk = document.getElementById(id);
  if (desk) desk.value = value;
  if (id === 'sospecha' || id === 'contexto') updatePlan();
  syncDesktopToMobile();
}

function syncDesktopToMobile(){
  const map = [
    ['manualQuality','m_manualQuality'],
    ['calidadFVC','m_calidadFVC'],
    ['calidadFEV1','m_calidadFEV1'],
    ['repFVC','m_repFVC'],
    ['repFEV1','m_repFEV1'],
    ['mejorFVC','m_mejorFVC'],
    ['mejorFEV1','m_mejorFEV1'],
    ['ratioMF','m_ratioMF'],
    ['fvcRef','m_fvcRef'],
    ['fev1Ref','m_fev1Ref'],
    ['fefRef','m_fefRef'],
    ['bdFev1Post','m_bdFev1Post'],
    ['sospecha','m_sospecha'],
    ['contexto','m_contexto'],
  ];

  map.forEach(([d,m]) => {
    const de = document.getElementById(d);
    const me = document.getElementById(m);
    if (de && me) me.value = de.value;
  });
}

/* ---------- limpiar ---------- */

function clearAll(){
  [
    'mejorFVC','mejorFEV1','ratioMF','fvcRef','fev1Ref','fefRef','bdFev1Post'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['manualQuality','calidadFVC','calidadFEV1','repFVC','repFEV1','sospecha','contexto'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id==='sospecha') el.value = 'no';
    else if (id==='contexto') el.value = 'ap';
    else el.value = '';
  });

  [
    'm_mejorFVC','m_mejorFEV1','m_ratioMF','m_fvcRef','m_fev1Ref','m_fefRef','m_bdFev1Post'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['m_manualQuality','m_calidadFVC','m_calidadFEV1','m_repFVC','m_repFEV1','m_sospecha','m_contexto'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id==='m_sospecha') el.value = 'no';
    else if (id==='m_contexto') el.value = 'ap';
    else el.value = '';
  });

  setFieldError(null);

  const warn = document.getElementById('qualityWarning');
  const mWarn = document.getElementById('m_qualityWarning');
  if (warn) warn.classList.remove('show');
  if (mWarn) mWarn.classList.remove('show');

  const bd = document.getElementById('bdresult');
  const mbd = document.getElementById('m_bdresult');
  if (bd){ bd.textContent = 'No calculada'; bd.style.background = '#000'; }
  if (mbd){ mbd.textContent = 'No calculada'; mbd.style.background = '#000'; }

  current = {
    fecha: new Date().toLocaleDateString('es-ES'),
    patron: null,
    severidad: null,
    severidadClass: '',
    obstruccion: null,
    interpretable: null,
    bd: null
  };
  hasEverCalculated = false;

  renderGradeDetail('gradoDetalle', {show:false});
  renderGradeDetail('m_gradoDetalle', {show:false});

  const p = document.getElementById('patron');
  const mp = document.getElementById('m_patron');
  if (p){ p.textContent = 'PENDIENTE'; p.classList.remove('no-interpretable'); }
  if (mp){ mp.textContent = 'PENDIENTE'; mp.classList.remove('no-interpretable'); }

  const s = document.getElementById('severidad');
  const ms = document.getElementById('m_severidad');
  if (s){ s.textContent = ''; s.className = 'severity'; }
  if (ms){ ms.textContent = ''; ms.className = 'severity'; }

  updatePlan();
  updateOutputs();
  goStep(1);
  syncLocking();
  syncDesktopToMobile();
}

/* ---------- init ---------- */

window.addEventListener('load', () => {
  updateOutputs();
  updatePlan();
  syncDesktopToMobile();
  syncLocking();
  goStep(1);
});
