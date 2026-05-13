function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function band(score){
  if(score >= 80) return "Operationally Mature";
  if(score >= 60) return "Moderate Friction";
  if(score >= 40) return "Significant Friction";
  return "Severe Operational Drag";
}

function scoreInbound(v){
  let s = 25;
  const missed = v.missedCalls;
  const hold = v.holdTime;
  const after = v.afterHours;
  const capture = v.missedCapture;

  if (missed === "6+") s -= 8;
  else if (missed === "4-5") s -= 6;
  else if (missed === "2-3") s -= 4;

  if (capture === "no") s -= 6;

  if (after === "high") s -= 5;
  else if (after === "med") s -= 3;
  else if (after === "low") s -= 1;

  if (hold === "5m+") s -= 4;
  else if (hold === "3-5m") s -= 3;
  else if (hold === "1-3m") s -= 1;

  return clamp(s, 0, 25);
}

function scoreScheduling(v){
  let s = 25;

  if (v.schedHours === "16+") s -= 8;
  else if (v.schedHours === "11-15") s -= 6;
  else if (v.schedHours === "6-10") s -= 3;

  if (v.reminders === "none") s -= 7;
  else if (v.reminders === "email") s -= 3;

  if (v.noShow === "16+") s -= 6;
  else if (v.noShow === "11-15") s -= 4;
  else if (v.noShow === "6-10") s -= 2;

  if (v.hygieneBacklog === "10w+") s -= 4;
  else if (v.hygieneBacklog === "7-10w") s -= 3;
  else if (v.hygieneBacklog === "3-6w") s -= 1;

  return clamp(s, 0, 25);
}

function scoreAdmin(v){
  let s = 25;

  if (v.systems === "5+") s -= 6;
  else if (v.systems === "3-4") s -= 3;

  if (v.recall === "manual") s -= 4;
  else if (v.recall === "some") s -= 2;

  if (v.unscheduledTx === "none") s -= 5;
  else if (v.unscheduledTx === "partial") s -= 2;

  if (v.frontDesk === "1" && (v.callsPerDay === "31-60" || v.callsPerDay === "60+")) s -= 4;
  if (v.frontDesk === "2" && v.callsPerDay === "60+") s -= 2;

  return clamp(s, 0, 25);
}

function scoreReadiness(v){
  let s = 25;

  if (v.budget === "under5") s -= 5;
  else if (v.budget === "5-10") s -= 2;

  if (v.reminders === "none") s -= 2;
  if (v.missedCapture === "no") s -= 2;

  return clamp(s, 0, 25);
}

function parseMissedCallsBucket(bucket){
  if (bucket === "0-1") return 1;
  if (bucket === "2-3") return 3;
  if (bucket === "4-5") return 5;
  if (bucket === "6+") return 7;
  return 0;
}

function parseAvgProd(prod){
  const n = Number(prod);
  return Number.isFinite(n) ? n : 250;
}

function productionExposure(v){
  const missed = parseMissedCallsBucket(v.missedCalls);
  const avgProd = parseAvgProd(v.avgProd);
  const exposure = missed * 0.30 * avgProd * 20;
  return Math.round(exposure);
}

function frictionsFromScores(si, ss, sa, sr){
  const items = [];
  if (si < 16) items.push("Inbound handling friction (missed calls / after-hours capture)");
  if (ss < 16) items.push("Scheduling friction (manual load / reminders / no-shows)");
  if (sa < 16) items.push("Administrative load (fragmentation / recall / unscheduled treatment follow-up)");
  if (sr < 18) items.push("Automation readiness gap (budget/tools alignment)");
  if (items.length === 0) items.push("No major friction flags detected (consider targeted optimization).");
  return items.slice(0,3);
}

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("assessmentForm").reset();
  document.getElementById("report").classList.add("hidden");
});

document.getElementById("assessmentForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());

  const sInbound = scoreInbound(data);
  const sSched = scoreScheduling(data);
  const sAdmin = scoreAdmin(data);
  const sReady = scoreReadiness(data);
  const total = sInbound + sSched + sAdmin + sReady;

  document.getElementById("sInbound").textContent = sInbound;
  document.getElementById("sSched").textContent = sSched;
  document.getElementById("sAdmin").textContent = sAdmin;
  document.getElementById("sReady").textContent = sReady;

  document.getElementById("totalScore").textContent = total;
  document.getElementById("band").textContent = band(total);

  const exposure = productionExposure(data);
  document.getElementById("exposure").textContent = `$${exposure.toLocaleString()}/mo`;

  const fr = frictionsFromScores(sInbound, sSched, sAdmin, sReady);
  const ol = document.getElementById("frictions");
  ol.innerHTML = "";
  fr.forEach(x => {
    const li = document.createElement("li");
    li.textContent = x;
    ol.appendChild(li);
  });

  document.getElementById("report").classList.remove("hidden");
  document.getElementById("report").scrollIntoView({behavior:"smooth"});
});
