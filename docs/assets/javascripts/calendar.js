/* =====================================================================
   Fictional calendar renderer for the System wiki.

   Mounts on  <div id="system-calendar" data-src="path/to/calendar.json">.
   Schema (calendar.json):
     calendarName : string
     weekdays     : string[]                       (any week length)
     months       : { name, days }[]               (any count / length)
     eras         : { name, abbr, startYear }[]
     events       : { era, year, month, day, title, type, link, desc }[]
                     month/day are 1-based.

   Weekday model: each month begins on weekdays[0] (a fixed calendar).
   ===================================================================== */
(function () {
  "use strict";

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }

  function eventsFor(data, eraAbbr, year, month, day) {
    return data.events.filter(function (e) {
      return e.era === eraAbbr && e.year === year &&
             e.month === month && e.day === day;
    });
  }

  function render(mount, data) {
    var weekLen = data.weekdays.length;
    var state = {
      eraIdx: data.eras.length - 1,
      year: data.eras[data.eras.length - 1].startYear,
      monthIdx: 0
    };

    function era() { return data.eras[state.eraIdx]; }
    function month() { return data.months[state.monthIdx]; }

    function draw() {
      mount.innerHTML = "";
      var panel = h("div", { class: "sys-cal" });

      /* ---- header / controls ---- */
      var title = h("div", { class: "sys-cal__title" }, [data.calendarName]);

      var label = h("div", { class: "sys-cal__label" }, [
        month().name + " — Year " + state.year + " " + era().abbr
      ]);

      var eraSel = h("select", { class: "sys-cal__era" });
      data.eras.forEach(function (er, i) {
        var opt = h("option", { value: String(i) }, [er.name + " (" + er.abbr + ")"]);
        if (i === state.eraIdx) opt.selected = true;
        eraSel.appendChild(opt);
      });
      eraSel.addEventListener("change", function () {
        state.eraIdx = parseInt(this.value, 10);
        state.year = era().startYear;
        state.monthIdx = 0;
        draw();
      });

      var prev = h("button", { class: "sys-cal__nav", title: "Previous month" }, ["◀"]);
      var next = h("button", { class: "sys-cal__nav", title: "Next month" }, ["▶"]);
      prev.addEventListener("click", function () { step(-1); });
      next.addEventListener("click", function () { step(1); });

      var controls = h("div", { class: "sys-cal__controls" }, [prev, label, next]);
      var bar = h("div", { class: "sys-cal__bar" }, [title, eraSel]);

      /* ---- weekday header ---- */
      var grid = h("div", { class: "sys-cal__grid" });
      grid.style.gridTemplateColumns = "repeat(" + weekLen + ", 1fr)";
      data.weekdays.forEach(function (w) {
        grid.appendChild(h("div", { class: "sys-cal__wd" }, [w]));
      });

      /* ---- day cells (day 1 starts at column 0) ---- */
      for (var d = 1; d <= month().days; d++) {
        var evs = eventsFor(data, era().abbr, state.year, state.monthIdx + 1, d);
        var cell = h("div", { class: "sys-cal__day" + (evs.length ? " is-event" : "") }, [
          h("span", { class: "sys-cal__num" }, [String(d)])
        ]);
        if (evs.length) {
          cell.appendChild(h("span", { class: "sys-cal__dot" }));
          cell.appendChild(buildPopover(evs));
          cell.tabIndex = 0;
        }
        grid.appendChild(cell);
      }

      panel.appendChild(bar);
      panel.appendChild(controls);
      panel.appendChild(grid);
      mount.appendChild(panel);
    }

    function buildPopover(evs) {
      var pop = h("div", { class: "sys-cal__pop" });
      evs.forEach(function (e) {
        var items = [
          h("div", { class: "sys-cal__pop-type" }, [e.type || "event"]),
          h("div", { class: "sys-cal__pop-title" }, [e.title || ""])
        ];
        if (e.desc) items.push(h("div", { class: "sys-cal__pop-desc" }, [e.desc]));
        if (e.link) items.push(h("a", { class: "sys-cal__pop-link", href: e.link }, ["Open record →"]));
        pop.appendChild(h("div", { class: "sys-cal__pop-row" }, items));
      });
      return pop;
    }

    function step(delta) {
      state.monthIdx += delta;
      if (state.monthIdx >= data.months.length) { state.monthIdx = 0; state.year++; }
      else if (state.monthIdx < 0) { state.monthIdx = data.months.length - 1; state.year--; }
      draw();
    }

    draw();
  }

  function init() {
    var mount = document.getElementById("system-calendar");
    if (!mount || mount.dataset.ready === "1") return;
    mount.dataset.ready = "1";
    fetch(mount.getAttribute("data-src"))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) { render(mount, data); })
      .catch(function (err) {
        mount.dataset.ready = "";
        mount.textContent = "Failed to load calendar: " + err.message;
      });
  }

  /* Re-init on Material instant navigation, with a plain fallback. */
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(init);
  } else if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
