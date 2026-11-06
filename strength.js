/* Strength levels for the muscle map.
   Level 1..5 = Начальный, Новичок, Средний, Продвинутый, Элита: red, orange, green, pink, purple.
   Anchor standards come from the Strength Level (strengthlevel.com) data of male lifters (about 48 million logged lifts),
   read at a body weight of about 82 kg (180 lb) as a ratio of estimated one-rep max to body weight.
   Other exercises are scaled from those anchors, so for them the levels are an estimate. */

var SL_NAMES = ["Начальный", "Новичок", "Средний", "Продвинутый", "Элита"];
var SL_COLORS = ["#e5484d", "#f08a24", "#30a46c", "#e93d82", "#8e4ec6"];

function slScale(a, k) { return a.map(function (x) { return Math.round(x * k * 1000) / 1000; }); }

// anchors: ratio of 1RM to body weight for Beginner, Novice, Intermediate, Advanced, Elite
var SL_A = {
  bench:   [0.71, 0.94, 1.22, 1.54, 1.88],   // barbell bench press
  lat:     [0.59, 0.79, 1.05, 1.34, 1.64],   // lat pulldown
  row:     [0.59, 0.81, 1.08, 1.39, 1.73],   // seated cable row
  shp:     [0.43, 0.59, 0.79, 1.02, 1.26],   // barbell shoulder press (from the community ratio to bench)
  dbb:     [0.25, 0.36, 0.49, 0.65, 0.81],   // dumbbell bench press, per dumbbell
  dbc:     [0.11, 0.18, 0.27, 0.37, 0.49],   // dumbbell curl, per dumbbell
  push:    [0.23, 0.41, 0.66, 0.97, 1.31],   // triceps pushdown
  press:   [0.81, 1.35, 2.06, 2.92, 3.87],   // horizontal leg press
  thrust:  [0.56, 1.04, 1.72, 2.56, 3.51],   // hip thrust
  dl:      [0.98, 1.38, 1.89, 2.47, 3.10]    // deadlift
};
// added weight (kg) at the 1RM for bodyweight moves: pull-ups, dips, push-ups
var SL_BW = {
  pullup:  [-2.7, 13.2, 31.3, 51.7, 73.5],
  dip:     [2.7, 23.6, 49, 78, 109],
  pushup:  [7.7, 46.3, 95.3, 153.8, 218.2]
};

// t: "w" weight x reps (ratio to body weight), "bw" bodyweight move, "rep" reps or seconds
// hand: weight of one dumbbell. sec: the number is seconds. assist: weight is the help of the machine.
var SL_EX = {
  "db-bench":        { t: "w", s: SL_A.dbb, hand: 1 },
  "db-incline":      { t: "w", s: slScale(SL_A.dbb, 0.88), hand: 1 },
  "machine-chest":   { t: "w", s: slScale(SL_A.bench, 0.9) },
  "incline-machine": { t: "w", s: slScale(SL_A.bench, 0.75) },
  "pec-deck":        { t: "w", s: slScale(SL_A.bench, 0.55) },
  "cable-fly-high":  { t: "w", s: slScale(SL_A.bench, 0.25) },
  "cable-fly-low":   { t: "w", s: slScale(SL_A.bench, 0.22) },
  "pushup":          { t: "bw", s: SL_BW.pushup, frac: 0.64 },
  "dip-chest":       { t: "bw", s: SL_BW.dip, frac: 0.95 },
  "db-fly":          { t: "w", s: slScale(SL_A.dbb, 0.5), hand: 1 },
  "pullover":        { t: "w", s: slScale(SL_A.dbb, 1.2) },

  "db-ohp":          { t: "w", s: slScale(SL_A.shp, 0.4), hand: 1 },
  "machine-shoulder":{ t: "w", s: slScale(SL_A.shp, 0.9) },
  "lateral-raise":   { t: "w", s: slScale(SL_A.dbc, 0.5), hand: 1 },
  "cable-lateral":   { t: "w", s: slScale(SL_A.dbc, 0.4) },
  "rear-delt-machine": { t: "w", s: slScale(SL_A.bench, 0.35) },
  "rear-delt-db":    { t: "w", s: slScale(SL_A.dbc, 0.45), hand: 1 },
  "face-pull":       { t: "w", s: slScale(SL_A.push, 0.8) },
  "front-raise":     { t: "w", s: slScale(SL_A.dbc, 0.5), hand: 1 },
  "arnold":          { t: "w", s: slScale(SL_A.shp, 0.38), hand: 1 },

  "assisted-pullup": { t: "bw", s: SL_BW.pullup, frac: 1, assist: 1 },
  "pullup":          { t: "bw", s: SL_BW.pullup, frac: 1 },
  "lat-wide":        { t: "w", s: SL_A.lat },
  "lat-close":       { t: "w", s: SL_A.lat },
  "tbar-row":        { t: "w", s: slScale(SL_A.row, 0.95) },
  "cable-row":       { t: "w", s: SL_A.row },
  "db-row":          { t: "w", s: slScale(SL_A.row, 0.5), hand: 1 },
  "straight-arm-pd": { t: "w", s: slScale(SL_A.push, 0.9) },

  "db-shrug":        { t: "w", s: [0.25, 0.38, 0.55, 0.75, 0.97], hand: 1 },

  "back-ext":        { t: "rep", s: [8, 12, 18, 25, 35] },
  "rdl":             { t: "w", s: slScale(SL_A.dl, 0.375), hand: 1 },
  "superman":        { t: "rep", s: [8, 12, 18, 25, 35] },

  "db-curl":         { t: "w", s: SL_A.dbc, hand: 1 },
  "hammer":          { t: "w", s: slScale(SL_A.dbc, 1.1), hand: 1 },
  "cable-curl":      { t: "w", s: slScale(SL_A.push, 0.9) },
  "incline-curl":    { t: "w", s: slScale(SL_A.dbc, 0.85), hand: 1 },
  "preacher-machine":{ t: "w", s: slScale(SL_A.push, 0.9) },

  "pushdown":        { t: "w", s: SL_A.push },
  "overhead-ext":    { t: "w", s: slScale(SL_A.dbc, 1.5) },
  "cable-overhead":  { t: "w", s: slScale(SL_A.push, 0.75) },
  "dip-tri":         { t: "bw", s: SL_BW.dip, frac: 0.95 },
  "kickback":        { t: "w", s: slScale(SL_A.dbc, 0.4), hand: 1 },
  "close-pushup":    { t: "bw", s: SL_BW.pushup, frac: 0.64 },
  "machine-triceps": { t: "w", s: slScale(SL_A.push, 1.1) },

  "wrist-curl":      { t: "w", s: slScale(SL_A.dbc, 0.7), hand: 1 },
  "wrist-ext":       { t: "w", s: slScale(SL_A.dbc, 0.45), hand: 1 },
  "dead-hang":       { t: "rep", s: [10, 25, 45, 70, 100], sec: 1 },

  "crunch-machine":  { t: "w", s: [0.25, 0.4, 0.6, 0.85, 1.15] },
  "cable-crunch":    { t: "w", s: [0.35, 0.55, 0.8, 1.1, 1.45] },
  "hanging-knee-raise": { t: "rep", s: [4, 10, 16, 24, 32] },
  "plank":           { t: "rep", s: [20, 45, 75, 120, 180], sec: 1 },
  "side-plank":      { t: "rep", s: [15, 30, 50, 75, 110], sec: 1 },
  "pallof":          { t: "w", s: [0.1, 0.18, 0.28, 0.4, 0.55] },
  "dead-bug":        { t: "rep", s: [6, 10, 15, 22, 30] },

  "hip-thrust":      { t: "w", s: SL_A.thrust },
  "bulgarian":       { t: "w", s: [0.15, 0.25, 0.37, 0.5, 0.65], hand: 1 },
  "lunge":           { t: "w", s: [0.15, 0.25, 0.37, 0.5, 0.65], hand: 1 },
  "cable-kickback":  { t: "w", s: slScale(SL_A.push, 0.5) },
  "abductor":        { t: "w", s: [0.24, 0.4, 0.6, 0.85, 1.15] },
  "step-up":         { t: "w", s: [0.12, 0.2, 0.3, 0.42, 0.55], hand: 1 },

  "leg-press":       { t: "w", s: SL_A.press },
  "goblet":          { t: "w", s: [0.2, 0.32, 0.46, 0.62, 0.8] },
  "db-squat":        { t: "w", s: [0.15, 0.25, 0.37, 0.5, 0.65], hand: 1 },
  "leg-ext":         { t: "w", s: [0.3, 0.5, 0.75, 1.05, 1.4] },

  "leg-curl-lying":  { t: "w", s: [0.35, 0.55, 0.8, 1.1, 1.45] },
  "leg-curl-seated": { t: "w", s: [0.35, 0.55, 0.8, 1.1, 1.45] },

  "standing-calf":   { t: "w", s: [0.6, 1.0, 1.5, 2.1, 2.8] },
  "seated-calf":     { t: "w", s: [0.4, 0.7, 1.0, 1.4, 1.8] },
  "press-calf":      { t: "w", s: slScale(SL_A.press, 0.7) }
};

function slE1rm(w, r) { return r <= 1 ? w : w * (1 + Math.min(r, 15) / 30); }

// One set of an exercise -> { level 1..5, score (level + progress to the next one), value, unit, next }
function slSet(exId, w, r, bw) {
  var d = SL_EX[exId]; w = +w || 0; r = +r || 0; bw = +bw || 80;
  if (!d || r < 1) return null;
  var val, need;
  if (d.t === "w") {
    if (w <= 0) return null;
    val = slE1rm(w, r) / bw;
  } else if (d.t === "bw") {
    var base = d.frac * bw;
    var load = d.assist ? Math.max(0.05 * bw, base - w) : base + w;
    val = slE1rm(load, r) - base;
  } else {
    val = r;
  }
  var level = 0;
  d.s.forEach(function (x) { if (val >= x) level++; });
  var lvl = Math.max(1, level);
  var frac = 0;
  if (level >= 1 && level < 5) frac = Math.max(0, Math.min(1, (val - d.s[level - 1]) / (d.s[level] - d.s[level - 1])));
  else if (level === 0) frac = Math.max(0, Math.min(1, val / d.s[0]));
  if (level === 0) frac = frac * 0.99; // below the first mark: still level 1, but lowest score
  return { level: lvl, score: lvl + frac, val: val, next: level < 5 ? d.s[level] : null, type: d.t, d: d };
}

// What it takes to reach the next level, as a short phrase
function slNextText(exId, set, bw) {
  if (!set || set.next == null) return "";
  var d = set.d;
  if (d.t === "w") {
    var kg = set.next * bw / (1 + 8 / 30);
    var n = Math.ceil(kg / 2.5) * 2.5;
    return "около " + (Math.round(n * 10) / 10).toString().replace(".", ",") + " кг на 8 повторов";
  }
  if (d.t === "bw") {
    var add = set.next;
    return add <= 0 ? "ещё чуть-чуть до первой отметки" : "с доп. весом около " + Math.round(add / (1 + 5 / 30)) + " кг на 5 повторов";
  }
  return Math.ceil(set.next) + (d.sec ? " с" : " повторов");
}

// workouts: [{date, sets:[{ex, s:[{w,r}]}]}], returns { muscle: { level, ex, w, r, score } }
function slMuscleLevels(workouts, bw, exercises, sinceDate) {
  var out = {};
  workouts.forEach(function (wk) {
    if (sinceDate && wk.date < sinceDate) return;
    (wk.sets || []).forEach(function (blk) {
      var ex = exercises[blk.ex]; if (!ex) return;
      (blk.s || []).forEach(function (st) {
        var res = slSet(blk.ex, st.w, st.r, bw); if (!res) return;
        ex.main.forEach(function (m) {
          var cur = out[m];
          if (!cur || res.score > cur.score) out[m] = { level: res.level, score: res.score, ex: blk.ex, w: +st.w || 0, r: +st.r || 0, next: slNextText(blk.ex, res, bw), date: wk.date };
        });
      });
    });
  });
  return out;
}
