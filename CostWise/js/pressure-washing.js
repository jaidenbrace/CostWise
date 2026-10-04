/**
 * CostWise Pressure Washing Cost Calculator
 * Estimates are informational ranges based on typical U.S. residential rates.
 * Not a formal quote.
 */
(function () {
  "use strict";

  // Base rates ($/sq ft) — low / high from market research 2025–2026
  const RATES = {
    house: { low: 0.15, high: 0.45, minJob: 200 },
    driveway: { low: 0.12, high: 0.35, minJob: 100 },
    patio: { low: 0.15, high: 0.40, minJob: 80 },
    sidewalk: { low: 0.10, high: 0.25, minJob: 50 },
    additional: { low: 0.12, high: 0.30, minJob: 0 }
  };

  // Condition multipliers
  const CONDITION = {
    excellent: 0.85,
    good: 1.0,
    fair: 1.2,
    poor: 1.4
  };

  // Optional region adjustment (coarse)
  const REGION = {
    "": 1.0,
    low: 0.85,
    average: 1.0,
    high: 1.25
  };

  const DEFAULT_SQFT = {
    house: 1800,
    driveway: 500,
    patio: 300,
    sidewalk: 150,
    additional: 0
  };

  const form = document.getElementById("pw-form");
  const resultsEl = document.getElementById("pw-results");
  if (!form || !resultsEl) return;

  const services = ["house", "driveway", "patio", "sidewalk", "additional"];

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function getSqft(service) {
    const input = document.getElementById("sqft-" + service);
    if (!input) return 0;
    const v = parseFloat(input.value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function isChecked(service) {
    const cb = document.getElementById("svc-" + service);
    return cb && cb.checked;
  }

  function toggleSqftVisibility() {
    services.forEach(function (s) {
      const field = document.getElementById("field-" + s);
      if (!field) return;
      if (isChecked(s)) {
        field.classList.remove("hidden");
        const input = document.getElementById("sqft-" + s);
        if (input && (!input.value || input.value === "0") && DEFAULT_SQFT[s]) {
          input.value = DEFAULT_SQFT[s];
        }
      } else {
        field.classList.add("hidden");
      }
    });
  }

  function calculate() {
    const condition = document.getElementById("condition").value || "good";
    const region = document.getElementById("region").value || "";
    const condMul = CONDITION[condition] || 1;
    const regMul = REGION[region] || 1;
    const mul = condMul * regMul;

    let lowTotal = 0;
    let highTotal = 0;
    const lines = [];
    let any = false;

    services.forEach(function (s) {
      if (!isChecked(s)) return;
      const sqft = getSqft(s);
      if (sqft <= 0 && s !== "additional") return;
      if (sqft <= 0) return;
      any = true;

      const rate = RATES[s];
      let low = sqft * rate.low * mul;
      let high = sqft * rate.high * mul;

      // Apply per-service soft minimum when that service is selected alone-ish
      low = Math.max(low, rate.minJob * (mul < 1 ? mul : 1) * 0.7);
      high = Math.max(high, rate.minJob * mul);

      lowTotal += low;
      highTotal += high;

      const labels = {
        house: "House exterior",
        driveway: "Driveway",
        patio: "Patio / deck area",
        sidewalk: "Sidewalk / walkway",
        additional: "Additional area"
      };
      lines.push({
        label: labels[s] + " (" + Math.round(sqft).toLocaleString() + " sq ft)",
        low: low,
        high: high
      });
    });

    // Overall job minimum
    if (any) {
      const jobMinLow = 125 * Math.min(mul, 1.1);
      const jobMinHigh = 150 * mul;
      if (lowTotal < jobMinLow) lowTotal = jobMinLow;
      if (highTotal < jobMinHigh) highTotal = jobMinHigh;
      if (highTotal < lowTotal * 1.15) highTotal = lowTotal * 1.35;
    }

    render(any, lowTotal, highTotal, lines, condition, region);
  }

  function render(any, low, high, lines, condition, region) {
    if (!any) {
      resultsEl.innerHTML =
        '<div class="empty-state">' +
        "<p>Select at least one surface and enter square footage to see an estimated price range.</p>" +
        "</div>";
      return;
    }

    const mid = (low + high) / 2;
    const condLabels = {
      excellent: "Excellent (recently cleaned)",
      good: "Good (normal dirt)",
      fair: "Fair (noticeable buildup)",
      poor: "Poor (heavy stains / years of neglect)"
    };
    const regionLabels = {
      "": "Not specified",
      low: "Lower-cost area",
      average: "Average U.S. market",
      high: "Higher-cost metro"
    };

    let html =
      '<div class="price-range">' +
      '<p class="price-label">Estimated range</p>' +
      '<p class="price-main">' + money(low) + " – " + money(high) + "</p>" +
      '<p class="price-mid">Midpoint ≈ ' + money(mid) + "</p>" +
      "</div>";

    html += '<ul class="price-breakdown" aria-label="Breakdown by surface">';
    lines.forEach(function (line) {
      html +=
        "<li><span>" +
        line.label +
        '</span><span>' +
        money(line.low) +
        " – " +
        money(line.high) +
        "</span></li>";
    });
    html += "</ul>";

    html +=
      '<div class="factors">' +
      "<h3>What affects this estimate</h3>" +
      "<ul>" +
      "<li>Condition applied: " +
      (condLabels[condition] || condition) +
      "</li>" +
      "<li>Location factor: " +
      (regionLabels[region] || "Not specified") +
      "</li>" +
      "<li>Surface type, accessibility, and height (multi-story homes often cost more)</li>" +
      "<li>Oil, rust, mold, or oxidation may add 25–50%</li>" +
      "<li>Many contractors use a minimum trip charge (~$100–$150)</li>" +
      "</ul>" +
      "</div>";

    html +=
      '<p class="disclaimer-note">This is an informational estimate only—not a quote. Actual prices vary by contractor, local market, property access, materials, and scope. Always compare multiple local quotes.</p>';

    resultsEl.innerHTML = html;
  }

  // Events
  form.addEventListener("change", function () {
    toggleSqftVisibility();
    calculate();
  });
  form.addEventListener("input", function () {
    calculate();
  });

  // Init defaults: house checked
  const houseCb = document.getElementById("svc-house");
  if (houseCb) houseCb.checked = true;
  toggleSqftVisibility();
  calculate();
})();
