/* Renders results and fixtures from data/matches.json.
   The static HTML in each page stays as the fallback if the file can't be loaded.
   Edit the data through the /results/ dashboard rather than by hand. */
(function () {
  "use strict";

  var US = "Three Stars";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var ARROW = '<i class="ic"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i>';
  var FALLBACK_IMG = "assets/img/ts-051.jpg";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var isNum = function (v) { return typeof v === "number" && isFinite(v); };

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function sortKey(m) { return m.date || (m.season + "-12-31"); }

  function classify(m) {
    if (isNum(m.us) && isNum(m.them)) {
      m.kind = "result";
      m.outcome = m.us > m.them ? "win" : m.us < m.them ? "loss" : "draw";
      return;
    }
    var d = parseDate(m.date);
    var upcoming = d ? d >= today() : String(m.season) >= String(today().getFullYear());
    m.kind = upcoming ? "fixture" : "noresult";
  }

  function homeAway(m) {
    var h = m.venue === "home";
    return {
      home: h ? US : m.opponent, away: h ? m.opponent : US,
      hs: h ? m.us : m.them, as: h ? m.them : m.us, usHome: h
    };
  }
  function scoreLine(m) {
    var t = homeAway(m);
    return t.home + " " + t.hs + "–" + t.as + " " + t.away;
  }
  function venueWord(m) { return m.venue === "home" ? "Home" : m.venue === "neutral" ? "Neutral" : "Away"; }
  function outcomeWord(m) { return m.outcome === "win" ? "Won" : m.outcome === "loss" ? "Lost" : "Drew"; }
  function shortGround(m) { return (m.ground || "").split(",")[0]; }
  function fmtDate(m) {
    var d = parseDate(m.date);
    return d ? d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() : String(m.season);
  }

  /* ---------- builders ---------- */
  function fxRow(m) {
    var t = homeAway(m);
    var d = parseDate(m.date);
    var date = d
      ? '<div class="fx__date"><b>' + d.getDate() + "</b><span>" + MONTHS[d.getMonth()] + " " + d.getFullYear() + "</span></div>"
      : '<div class="fx__date tbc"><b>' + esc(m.season) + "</b><span>Date tbc</span></div>";
    var tag = m.kind === "result"
      ? '<span class="tag' + (m.outcome === "win" ? " tag--win" : m.outcome === "draw" ? " tag--draw" : " tag--loss") + '">' + outcomeWord(m) + "</span>"
      : m.kind === "fixture" ? '<span class="tag tag--gold">Upcoming</span>' : '<span class="tag">Result not posted</span>';
    var res = m.kind === "result"
      ? '<span class="fx__res">' + t.hs + " – " + t.as + "</span>"
      : '<span class="fx__res vs">VS</span>';
    var info = [];
    if (m.kind === "result" && m.scorers) info.push("<span><strong>Goals</strong> " + esc(m.scorers) + "</span>");
    var where = [m.ground, m.ko].filter(Boolean).map(esc).join(" &middot; ");
    if (where) info.push("<span>" + where + "</span>");
    var cap = m.kind === "result" ? "Full time: " + scoreLine(m) : "Next match: " + t.home + " v " + t.away + (d ? ", " + fmtDate(m) : "");
    var poster = m.poster
      ? '<a class="fx__poster" href="' + esc(m.poster) + '" data-lightbox="posters" data-caption="' + esc(cap) + '"><img src="' + esc(m.poster) + '" alt="Match poster, ' + esc(t.home + " v " + t.away) + '" loading="lazy"></a>'
      : '<div class="fx__poster fx__poster--none" aria-hidden="true"><img src="assets/logo/3stars-icon_stars-only.svg" alt=""></div>';
    return '<li class="fx rv" data-yr="' + esc(m.season) + '">' + date +
      '<div><div class="fx__top"><span class="tag">' + esc(m.comp || "League") + " &middot; " + venueWord(m) + "</span>" + tag + "</div>" +
      '<div class="fx__teams"><span class="t' + (t.usHome ? " us" : "") + '">' + esc(t.home === US ? "Three Stars FC" : t.home) + "</span>" + res +
      '<span class="t' + (t.usHome ? "" : " us") + '">' + esc(t.away === US ? "Three Stars FC" : t.away) + "</span></div>" +
      (info.length ? '<div class="fx__info">' + info.join("") + "</div>" : "") +
      "</div>" + poster + "</li>";
  }

  function card(m, i) {
    var t = homeAway(m);
    var tagCls = m.outcome === "win" ? "tag--win" : m.outcome === "draw" ? "tag--draw" : "tag--loss";
    var label = venueWord(m) + " " + (m.outcome === "win" ? "win" : m.outcome === "draw" ? "draw" : "defeat");
    var team = function (name, score, us) {
      return '<div class="mc__team' + (us ? " us" : "") + '"><span>' + esc(name) + "</span><b>" + score + "</b></div>";
    };
    var meta = m.date ? fmtDate(m) + (shortGround(m) ? " &middot; " + esc(shortGround(m)) : "") : esc(m.season) + " &middot; " + esc(m.comp || "League") + " game";
    return '<article class="mc rv"' + (i ? ' style="--d:' + (i * 0.08).toFixed(2) + 's"' : "") + ">" +
      '<figure><img src="' + esc(m.poster || FALLBACK_IMG) + '" alt="' + (m.poster ? "Poster for the " + esc(m.opponent) + " game" : "") + '" loading="lazy"></figure>' +
      '<div class="mc__body"><div class="mc__meta"><span class="n">' + ("0" + (i + 1)).slice(-2) + '.</span><span class="tag ' + tagCls + '">' + label + "</span></div>" +
      team(t.home, t.hs, t.usHome) + team(t.away, t.as, !t.usHome) +
      '<p class="mc__sc">' + (m.scorers ? esc(m.scorers) + "<br>" : "") + '<span class="mc__date">' + meta + "</span></p>" +
      '<a class="pill pill--sm pill--sky" href="matches.html">Match details ' + ARROW + "</a></div></article>";
  }

  function nextStrip(m, dark) {
    var t = homeAway(m);
    var d = parseDate(m.date);
    var when = d ? DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] : "Date to be confirmed";
    var bits = [m.ko ? "Kick-off " + esc(m.ko) : "", esc(m.ground || ""), esc(m.comp || "League")].filter(Boolean).join(" &middot; ");
    return '<div class="nextm rv' + (dark ? "" : " nextm--light") + '">' +
      '<div class="nextm__when"><span class="tag tag--gold">Next match</span><b>' + when + "</b></div>" +
      '<div class="nextm__teams"><span class="' + (t.usHome ? "us" : "") + '">' + esc(t.home) + '</span><i>v</i><span class="' + (t.usHome ? "" : "us") + '">' + esc(t.away) + "</span></div>" +
      '<div class="nextm__info">' + bits + "</div>" +
      (m.poster ? '<a class="nextm__poster" href="' + esc(m.poster) + '" data-lightbox="next" data-caption="' + esc("Next match: " + t.home + " v " + t.away) + '"><img src="' + esc(m.poster) + '" alt="Poster for ' + esc(t.home + " v " + t.away) + '"></a>' : "") +
      "</div>";
  }

  function words(n) {
    return ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][n] || String(n);
  }

  /* ---------- render ---------- */
  function render(data) {
    var all = (data && data.matches || []).filter(function (m) { return m && m.opponent; });
    all.forEach(classify);
    all.sort(function (a, b) { return sortKey(b) < sortKey(a) ? -1 : sortKey(b) > sortKey(a) ? 1 : 0; });
    var results = all.filter(function (m) { return m.kind === "result"; });
    var fixtures = all.filter(function (m) { return m.kind === "fixture"; }).reverse();
    var w = 0, d = 0, l = 0, gf = 0, ga = 0;
    results.forEach(function (m) { gf += m.us; ga += m.them; if (m.outcome === "win") w++; else if (m.outcome === "draw") d++; else l++; });
    var p = results.length;
    var lead = (p === 1 ? "One result" : words(p) + " results") + " posted.";

    // header: last result
    var last = results[0];
    document.querySelectorAll(".hdr__last b").forEach(function (b) { if (last) b.textContent = scoreLine(last); });

    // homepage results panel
    var resH = $("#res-h");
    if (resH && p) {
      resH.innerHTML = esc(lead) + ' <span class="lo">' + (l === 0 ? "Not one of them a defeat." : w + " won, " + d + " drawn, " + l + " lost.") + "</span>";
      var st = resH.closest("section").querySelector(".stats");
      if (st) st.innerHTML =
        '<div><b data-count="' + p + '">' + p + "</b><span>Played</span></div>" +
        '<div class="g"><b data-count="' + w + '">' + w + "</b><span>Won</span></div>" +
        '<div class="s"><b data-count="' + gf + '">' + gf + "</b><span>Goals scored</span></div>" +
        '<div><b data-count="' + ga + '">' + ga + "</b><span>Goals conceded</span></div>";
      var grid = resH.closest("section").querySelector(".mgrid");
      if (grid) {
        grid.innerHTML = results.slice(0, 4).map(card).join("");
        if (fixtures[0]) grid.insertAdjacentHTML("beforebegin", nextStrip(fixtures[0], true));
      }
    }

    // matches page
    var recH = $("#rec-h");
    if (recH && p) {
      recH.innerHTML = esc(lead) + ' <span class="lo">' + (l === 0 ? (p === 1 ? "Unbeaten so far." : "Unbeaten in all of them.") : w + " won, " + d + " drawn, " + l + " lost.") + "</span>";
      var st2 = recH.closest("section").querySelector(".stats");
      if (st2) st2.innerHTML =
        '<div><b data-count="' + w + '">' + w + "</b><span>Won</span></div>" +
        '<div><b data-count="' + d + '">' + d + "</b><span>Drawn</span></div>" +
        '<div><b data-count="' + gf + '">' + gf + "</b><span>Goals scored</span></div>" +
        '<div><b data-count="' + ga + '">' + ga + "</b><span>Goals conceded</span></div>";
    }
    var list = $(".fx-list");
    if (list) {
      var past = all.filter(function (m) { return m.kind !== "fixture"; });
      list.innerHTML = past.map(fxRow).join("");
      if (fixtures.length) {
        var head = list.previousElementSibling;
        var up = document.createElement("div");
        up.className = "upcoming";
        up.innerHTML = '<div class="head" style="margin-bottom:24px"><h2 class="h-md">Upcoming</h2></div>' +
          '<ol class="fx-list">' + fixtures.map(fxRow).join("") + "</ol>";
        (head && head.classList.contains("head") ? head : list).insertAdjacentElement("beforebegin", up);
      }
      var tabs = $(".seg-light[role=tablist]");
      if (tabs) {
        var years = [];
        past.forEach(function (m) { if (years.indexOf(String(m.season)) < 0) years.push(String(m.season)); });
        tabs.innerHTML = ['<button type="button" role="tab" aria-selected="true" data-season="all">All</button>']
          .concat(years.map(function (y) { return '<button type="button" role="tab" aria-selected="false" data-season="' + esc(y) + '">' + esc(y) + "</button>"; }))
          .join("");
      }
    }
  }

  function load() {
    if (!window.fetch || location.protocol === "file:") return Promise.resolve();
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 2500); });
    return Promise.race([fetch("data/matches.json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }), timeout]).then(render).catch(function (e) {
      if (window.console) console.warn("Match data not loaded, showing built-in results.", e);
    });
  }

  window.tsfcReady = load();
})();
