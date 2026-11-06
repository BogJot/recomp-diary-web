/* Sync between devices through the user's own Google Drive (hidden app folder).
   Pure helpers only: merging two copies of the diary and talking to the Drive REST API.
   Getting the access token and wiring into the page are done in index.html. */

var SYNC_FILE = "recomp-diary.json";
var SYNC_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
var SYNC_LOCAL_ONLY = ["reminders", "setupHidden"]; // settings that belong to one device
var TOMBSTONE_MS = 90 * 24 * 3600 * 1000;

function syncJson(x) { return JSON.stringify(x == null ? null : x); }

function syncUnionById(a, b) {
  var out = [], seen = {};
  (a || []).concat(b || []).forEach(function (x) {
    var k = x && x.id != null ? String(x.id) : syncJson(x);
    if (!seen[k]) { seen[k] = 1; out.push(x); }
  });
  return out;
}

// Two copies of one day. Foods and workouts are joined by id when both sides were edited since the last sync.
function syncMergeDay(l, r, lt, rt, lastSync) {
  var win = lt >= rt ? l : r, lose = win === l ? r : l;
  var out = JSON.parse(JSON.stringify(win));
  var concurrent = lt > lastSync && rt > lastSync;
  if (concurrent) {
    out.foods = syncUnionById(l.foods, r.foods);
    out.workouts = syncUnionById(l.workouts, r.workouts);
    out.steps = Math.max(l.steps || 0, r.steps || 0);
    out.water = Math.max(l.water || 0, r.water || 0);
  } else if (!out.steps && lose.steps) {
    out.steps = lose.steps; // steps come from one phone, never lose them to a copy without steps
  }
  return { doc: out, concurrent: concurrent };
}

function syncStripSettings(s) {
  if (!s) return s;
  var o = {};
  Object.keys(s).forEach(function (k) { if (SYNC_LOCAL_ONLY.indexOf(k) < 0) o[k] = s[k]; });
  return o;
}

// local, remote: { docs: {id: data}, mt: {id: millis} }. Returns the merged copy and what has to be written where.
function syncMerge(local, remote, lastSync, now) {
  now = now || Date.now();
  lastSync = lastSync || 0;
  var ld = local.docs || {}, rd = remote.docs || {}, lm = local.mt || {}, rm = remote.mt || {};
  var ids = {};
  [ld, rd, lm, rm].forEach(function (o) { Object.keys(o).forEach(function (k) { if (k !== "_mt") ids[k] = 1; }); });
  var docs = {}, mt = {}, changedLocal = false, changedRemote = false;
  Object.keys(ids).forEach(function (id) {
    var a = ld[id] == null ? null : ld[id], b = rd[id] == null ? null : rd[id];
    var lt = lm[id] || (a ? 1 : 0), rt = rm[id] || (b ? 1 : 0);
    var res, ts;
    if (id === "settings" && a && b) {
      var win = lt >= rt ? a : b;
      res = JSON.parse(JSON.stringify(syncStripSettings(win)));
      SYNC_LOCAL_ONLY.forEach(function (k) { if (a[k] !== undefined) res[k] = a[k]; });
      ts = Math.max(lt, rt);
      if (syncJson(syncStripSettings(a)) !== syncJson(syncStripSettings(b))) ts = lt === rt ? now : ts;
    } else if (syncJson(a) === syncJson(b)) {
      res = a; ts = Math.max(lt, rt);
    } else if (/^d-/.test(id) && a && b) {
      var m = syncMergeDay(a, b, lt, rt, lastSync);
      res = m.doc; ts = m.concurrent || lt === rt ? now : Math.max(lt, rt);
    } else if (lt > rt) { res = a; ts = lt; }
    else if (rt > lt) { res = b; ts = rt; }
    else { res = a != null ? a : b; ts = now; } // a tie with different content: keep the existing copy
    if (res == null) {
      if (now - ts > TOMBSTONE_MS) return; // forget old deletions
      mt[id] = ts; docs[id] = null;
    } else { docs[id] = res; mt[id] = ts; }
    if (syncJson(docs[id]) !== syncJson(a)) changedLocal = true;
    var forRemote = id === "settings" && docs[id] ? syncStripSettings(docs[id]) : docs[id];
    var remoteNow = id === "settings" && b ? syncStripSettings(b) : b;
    if (syncJson(forRemote) !== syncJson(remoteNow)) changedRemote = true;
  });
  return { docs: docs, mt: mt, changedLocal: changedLocal, changedRemote: changedRemote };
}

// What goes into the Drive file.
function syncPack(docs, mt) {
  var out = {};
  Object.keys(docs).forEach(function (id) {
    out[id] = id === "settings" && docs[id] ? syncStripSettings(docs[id]) : docs[id];
  });
  return JSON.stringify({ v: 1, updated: Date.now(), docs: out, mt: mt });
}

/* ---------- Google Drive REST (fetch with a bearer token) ---------- */
function driveErr(status, text) {
  var e = new Error("drive " + status); e.status = status; e.text = text || ""; return e;
}
function driveCall(token, url, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ Authorization: "Bearer " + token }, opts.headers || {});
  return fetch(url, opts).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { throw driveErr(r.status, t); });
    return r;
  });
}
function driveFind(token) {
  var q = encodeURIComponent("name='" + SYNC_FILE + "' and trashed=false");
  return driveCall(token, "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + q + "&fields=files(id,modifiedTime)&pageSize=1")
    .then(function (r) { return r.json(); })
    .then(function (j) { return j.files && j.files[0] ? j.files[0].id : null; });
}
function driveRead(token) {
  return driveFind(token).then(function (id) {
    if (!id) return { id: null, data: null };
    return driveCall(token, "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media")
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var d = null;
        try { d = JSON.parse(t); } catch (e) { d = null; }
        if (d && typeof d === "object" && d.docs) return { id: id, data: d };
        return { id: id, data: null };
      });
  });
}
function driveWrite(token, id, json) {
  if (id) {
    return driveCall(token, "https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: json
    }).then(function () { return id; });
  }
  var boundary = "recomp" + Date.now();
  var meta = JSON.stringify({ name: SYNC_FILE, parents: ["appDataFolder"], mimeType: "application/json" });
  var body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + meta +
    "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + json + "\r\n--" + boundary + "--";
  return driveCall(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + boundary }, body: body
  }).then(function (r) { return r.json(); }).then(function (j) { return j.id; });
}
function driveEmail(token) {
  return driveCall(token, "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)")
    .then(function (r) { return r.json(); })
    .then(function (j) { return (j.user && j.user.emailAddress) || ""; })
    .catch(function () { return ""; });
}
