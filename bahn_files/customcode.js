// last updated at: 2024-09-16 11:30
// last updated by: Viktor Gareski

window.unifiedSDK.registerCustomCode(async ({ loader }) => {
  const [visitor, rulesEngine] = await loader.requireModules(["visitor", "rulesEngine"]);
  var filterZurücksetzenButtonClicked = false;
  var mehrErgebnisseAnzeigenClickCount = 0;
  var searchTerm = null;
  registerClickEventsHilfePage();

  // ############### Custom Properties Area #############################
  visitor.defineProperty("Cookie Hinweis", getCookieModalStatus, { changePage: true });
  visitor.defineProperty("Design", getDesign, { changePage: true });
  visitor.defineProperty("Bestpreis mobil", getBestPriceMobile, { changePage: true });
  visitor.defineProperty("Produkt", getShownProducts, { multiple: true, changePage: true });
  visitor.defineProperty("Flyout", getNavFlyoutValue, { changePage: true });
  visitor.defineProperty("BahnCard", getShownBahnCards, { multiple: true, changePage: true });
  visitor.defineProperty("Filter 1", () => getFilter(1), { changePage: true, multiple: true });
  visitor.defineProperty("Filter 2", () => getFilter(2), { changePage: true, multiple: true });
  visitor.defineProperty("Filter 3", () => getFilter(3), { changePage: true, multiple: true });
  visitor.defineProperty("Filter 4", () => getFilter(4), { changePage: true, multiple: true });
  visitor.defineProperty("Typ Reisende", getReisendeTyp, { changePage: true, multiple: true });
  visitor.defineProperty("Suchbegriff", getSuchbegriff, { changePage: true });
  visitor.defineProperty("Filter zurücksetzen", getFilterZurücksetzen, { changePage: true });
  visitor.defineProperty("Filter ausgewählt", getFilterAusgewählt, { changePage: true, multiple: true });
  visitor.defineProperty("Weitere Ergebnisse laden", getWeitereErgebnisseladen, { changePage: true, dataType: "int" });
  visitor.defineProperty("Häufigste Fragen", getHäufigsteFragen, { changePage: true, multiple: true });
  visitor.defineProperty("Andere Anliegen", getAndereAnliegen, { changePage: true, multiple: true });
  visitor.defineProperty("Anzahl Treffer Suchfilter", getAnzahlTreffer, { changePage: true, dataType: "int" });
  visitor.defineProperty("Anzahl Treffer Suchergebnisse", getAnzahlTrefferSuchergebnisse, { changePage: true, dataType: "int" });
  visitor.defineProperty("Anzahl Treffer FAQ", getAnzahlTrefferFAQ, { changePage: true, dataType: "int" });
  visitor.defineProperty("bahnbusiness", getBahnBusiness, { changePage: true });
  // ############### End Custom Properties Area #############################

  setInterval(() => {
    if (window?.s?.pageName !== visitor.getCurrentPagename()) {
      visitor.getPageManager().checkForPageChange();
    }
  }, 500);

  rulesEngine.registerStep("custom_pagename_rate", () => {
    const pagename = visitor.getCurrentPagename();
    const rates = rateMap[pagename];
    if (!rates) return null;

    const deviceType = visitor.getDeviceType();
    const rate = rates[deviceType];
    if (!rate) return null;

    return visitor.checkRate(rate) || null;
  });

  rulesEngine.registerStep("checkBlocklist", () => {

    const userAgent = window.navigator.userAgent;
    const blockList = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0'
    ];

    if(blockList.includes(userAgent)) {
      return false;
    }

    return true;

  });

  // ############### Property functions area #############################
  function getCookieModalStatus() {
    const modalDiv = document.querySelector("body > div:first-child");
    if (modalDiv?.shadowRoot?.querySelector("#consent-layer")) {
      return "Ja";
    }

    return "Nein";
  }

  function getDesign() {
    if (window.innerWidth <= 600) {
      return 1;
    }

    if (window.innerWidth < 960) {
      return 2;
    }

    return 3;
  }

  function getBestPriceMobile() {
    const allowedPagename = ["bahn-de_Reiseloesungen", "bahn-de_ReiseloesungenRueck"].includes(
      visitor.getCurrentPagename()
    );
    const correctDesign = getDesign() <= 2; // property should only be active on small designs
    if (!allowedPagename || !correctDesign) {
      return null;
    }

    const switchButton = document.querySelector("#tagesbestpreis-switch--db-web-switch");
    if (switchButton && !switchButton.checked) {
      return "Ja"; // switch is visible but not checked
    } else if (!switchButton) {
      return "Nein"; // no switch button at all
    }

    // get number for each opened accordion
    const openAccordions = Array.from(document.querySelectorAll(".tagesbestpreis-intervall-list__item")).reduce(
      (result, current, index) => {
        if (current.querySelector(".db-web-accordion-classic__toggle-button-icon--expanded")) {
          result.push(index + 1);
        }
        return result;
      },
      []
    );

    return openAccordions.join(", ") || "0";
  }

  function getShownProducts() {
    if (visitor.getCurrentPagename() !== "bahn-de_Angebote") {
      return [];
    }

    const productNames = Array.from(document.querySelectorAll(".angebote-view .angebot-container__name")).map(
      (element) => element.innerText.trim()
    );

    return productNames;
  }

  function getNavFlyoutValue() {
    if (visitor.evaluateSingleCondition({ type: "selector", comparator: "notVisible", selector: ".nav__main" })) {
      return null;
    }

    const flyoutAriaElem = document.querySelector(".nav__main > .nav__item > .nav__link[aria-expanded='true'] > span");
    if (flyoutAriaElem?.innerText) {
      return flyoutAriaElem?.innerText;
    }

    const navVisible = visitor.evaluateSingleCondition({
      type: "selector",
      comparator: "visible",
      selector: ".nav__main .nav__list"
    });
    if (navVisible) {
      const flyoutHoverElement = document.querySelector(".nav__main .nav__list:hover");
      const flyoutHoverText = flyoutHoverElement?.parentElement?.querySelector(".nav__link > span")?.innerText;
      return flyoutHoverText || null;
    }

    return "geschlossen";
  }

  function getShownBahnCards() {
    if (visitor.getCurrentPagename() !== "bahn-de_BahnCardService") {
      return [];
    }

    const bahnCardItems = [];
    let bahnCard100Count = 0;
    document.querySelectorAll(".bahncard__content").forEach((bahnCardContent) => {
      if (
        bahnCardContent
          .querySelector(".bahncard__details > div > .bahncard__value")
          ?.innerText?.includes("BahnCard 100")
      ) {
        bahnCard100Count++;
      }
    });

    let bahnCardNochNichtGultigCount = 0;
    if (document.querySelectorAll(".bahncard__inactive-label").length > 0) {
      bahnCardNochNichtGultigCount++;
    }

    if (bahnCardNochNichtGultigCount > 0) {
      bahnCardItems.push("noch nicht gueltig");
    }

    if (bahnCard100Count > 0) {
      bahnCardItems.push("BahnCard 100");
    }

    if (bahnCard100Count + bahnCardNochNichtGultigCount < visitor.getPropertyValue("Anzahl BahnCard")) {
      bahnCardItems.push("divers");
    }

    return bahnCardItems;
  }

  function getFilter(filterNumber) {
    if (visitor.getCurrentPagename() !== "bahn-de_angebot_regio_verbuende") {
      return [];
    }

    const filterRow = Array.from(document.querySelectorAll(".filter-accordion__row"))[filterNumber - 1];
    if (!filterRow) {
      return [];
    }

    const selectedFilters = Array.from(filterRow.querySelectorAll(`.filter-accordion__chip--active`)).map((element) => {
      const match = element.textContent.match("Filter aufheben für (.*)");
      if (match[1]) {
        return match[1].trim();
      }

      return "";
    });

    if (selectedFilters.length === 0) {
      return ["Nein"];
    }

    return selectedFilters;
  }

  function getReisendeTyp() {
    if (
      !["bahn-de_Reiseloesungen", "bahn-de_ReiseloesungenRueck", "bahn-de_startseite"].includes(
        visitor.getCurrentPagename()
      )
    ) {
      return [];
    }

    const selectedItems = document.querySelectorAll("[id^='reisendeTyp-'] ._value-text");
    if (selectedItems !== null) {
      const selectedTypes = Array.from(selectedItems).map((e) => e.textContent);

      window.uwsTypReisendeProperty = selectedTypes.join(","); // workaround to use configurator conditions;
      return selectedTypes;
    }
    return [];
  }

  // eslint-disable-next-line
  function getABTest(pageName) {
    if (!window.digitalData) {
      return null;
    }

    //TODO for next AB-Test: use flagkey AND pagename, not only pagename to find ab test variant
    const abtEvent = window.digitalData.find(
      (data) => data.event === "abt.click" && data.click?.abt?.pageName === pageName
    );

    if (!abtEvent) {
      return null;
    }

    const variant = abtEvent?.click?.abt?.decision?.variationKey;
    return variant || null;
  }

  function getFilterZurücksetzen() {
    if (!["bahn-de_hilfe", "bahn-de_bahnbusiness_hilfe", "bahn-de_faq-results", "bahn-de_search-result"].includes(visitor.getCurrentPagename())) {
      return "";
    }
    if (filterZurücksetzenButtonClicked) {
      return "ja";
    } else {
      return "nein";
    }
  }

  function getFilterAusgewählt() {
    if (!["bahn-de_hilfe", "bahn-de_bahnbusiness_hilfe", "bahn-de_faq-results", "bahn-de_search-result"].includes(visitor.getCurrentPagename())) {
      return [];
    }

    const selectedFilters = Array.from(document.querySelectorAll(`.faq-search-filter.faq-search-filter--active`)).map(
      (element) => {
        const match = element.textContent.match("Filter aufheben für (.*)");
        if (match[1]) {
          return match[1].trim();
        }
        return "";
      }
    );

    if (selectedFilters.length === 0) {
      return ["keiner"];
    }

    return selectedFilters;
  }

  function registerClickEventsHilfePage() {
    
    if (!document.querySelector(".faq-search") || !document.querySelector(".suche")) {
      return;
    }

    document.querySelector(".faq-search").addEventListener("click", function (e) {
      if (e.target.className === "faq__show-more-btn flex") {
        mehrErgebnisseAnzeigenClickCount++;
      }
      if (e.target.className === "faq-search-filter-wrapper__reset-button") {
        filterZurücksetzenButtonClicked = true;
      }
    });

    document.querySelector(".suche").addEventListener("click", function (e) {
      if (e.target.className === "suche__show-more-btn") {
        mehrErgebnisseAnzeigenClickCount++;
      }
    });

    if (document.querySelector("button.suche-field__form-btn")) {
      document.querySelector("button.suche-field__form-btn").addEventListener("click", function () {
        searchTerm = document.querySelector('[id^="db-suche"]')?.value;
        visitor.setProperty("Suchbegriff", () => searchTerm, { changePage: true });

        filterZurücksetzenButtonClicked = false;
        mehrErgebnisseAnzeigenClickCount = 0;
      });
    }
  }

  function getWeitereErgebnisseladen() {
    if (!["bahn-de_hilfe", "bahn-de_bahnbusiness_hilfe", "bahn-de_search-result", "bahn-de_faq-results"].includes(visitor.getCurrentPagename())) {
      return 0;
    }

    return mehrErgebnisseAnzeigenClickCount;
  }

  function getHäufigsteFragen() {
    if (visitor.getCurrentPagename() === "bahn-de_hilfe") {
      const selectedItems = [];
      for (let i = 0; i < 5; i++) {
        if (document.querySelector(`.js-accordion-element.active #btn-4_${i}`)) {
          selectedItems.push(i + 1);
        }
      }
      return selectedItems.length > 0 ? selectedItems.sort() : [0];
    }

    if (visitor.getCurrentPagename() === "bahn-de_bahnbusiness_hilfe") {
      const selectedItems = [];
      for (let i = 0; i < 5; i++) {
        if (document.querySelector(`.js-accordion-element.active #btn-3_${i}`)) {
          selectedItems.push(i + 1);
        }
      }
      return selectedItems.length > 0 ? selectedItems.sort() : [0];
    }

    return [0];
  }

  function getAndereAnliegen() {
    if (visitor.getCurrentPagename() == "bahn-de_hilfe_telefon") {
      const selectedItems = [];
      if (document.querySelector(".js-accordion-element.active #btn-content_02_accordions_0")) {
        selectedItems.push(1);
      }
      for (let i = 0; i < 9; i++) {
        if (document.querySelector(`.js-accordion-element.active #btn-content_02_accordions_0${i}`)) {
          selectedItems.push(i + 2);
        }
      }
      return selectedItems.length > 0 ? selectedItems.sort((a, b) => a - b) : [0];
    }
    return [0];
  }

  function getSuchbegriff() {
    if (!["bahn-de_hilfe", "bahn-de_bahnbusiness_hilfe", "bahn-de_search-result", "bahn-de_faq-results"].includes(visitor.getCurrentPagename())) {
      return null;
    }
    return searchTerm;
  }

  function getAnzahlTreffer() {
    let result = hilfeAnzahlHelper(".suche-result-total", 'Für Ihren Suchbegriff .* gibt es (.*) Ergebnisse.');
    return result;
  }

  function getAnzahlTrefferSuchergebnisse() {
    let result = hilfeAnzahlHelper(".tab-navigation__link span", 'Suchergebnisse (.*)');

    return result;
  }

   function getAnzahlTrefferFAQ() {
    let result = hilfeAnzahlHelper(".tab-navigation__link span", 'FAQ (.*)');

    return result;
  }

  function hilfeAnzahlHelper(selector, text) {
    if (!["bahn-de_hilfe", "bahn-de_bahnbusiness_hilfe", "bahn-de_search-result", "bahn-de_faq-results"].includes(visitor.getCurrentPagename())) {
      return null;
    }

    let elements = document.querySelectorAll(selector);
    let elementsArray = Array.from(elements);
    let element = elementsArray.find(el => el.innerText.match(text));

    if(element) {

      let match = element.innerText.match(text);
      
      if(match && match[1] && match[1] != 0) {

        if( match[1].includes("(") && match[1].includes(")") ) {
          match[1] = match[1].replace(/[()]/g, '');
        }

        return match[1].trim();
      }
    }
    
    return 0;
  }

  function getBahnBusiness() {
    let isBusiness = false;
    const header = document.querySelector(".head");
    if (header) {
      const style = window.getComputedStyle(header);
      if (style.getPropertyValue("background-color") === "rgb(10, 30, 110)") {
        isBusiness = true;
      }
    }

    if (document.querySelector(".buchungsstrecke-heading__business-badge")) {
      isBusiness = true;
    }

    if(document.body.classList.contains('is-gk')) {
      isBusiness = true;
    }

    if (isBusiness) {
      return "ja";
    } else {
      return "nein";
    }
  }
  // ############### End Property functions area #############################

  const rateMap = {
    "bahn-de_startseite": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_startseite_bahnbusiness": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_Reiseloesungen": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_ReiseloesungenRueck": { desktop: 0.000000000000025, tablet: 0.000000000000015, phone: 0.000000000000015 },
    "bahn-de_Angebote": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_GraphicalSeatDisplay": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_Anmeldung": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_Kundendaten": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_Zahlung": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_PruefungBuchung": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_Buchungsbestaetigung": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_KeineReiseloesungen": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_angebot": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_service": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_Auftragssuche": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_hilfe": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_VergangeneReisen": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_NaechsteReisen": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_AktiveMehrfahrtenkarten": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_Zeitkarten": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_PersoenlicheDaten": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_Zahlungsmittel": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahncardService": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnBonus": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_PermissionCenter": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_NewsletterBestaetigung": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_404page": { desktop: 0.0000001, tablet: 0.0000001, phone: 0.0000001 },
    "bahn-de_BahncardVerwalten": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardSelfServiceFehler": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKuendigung": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKuendigungErfolgreich": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKuendigungFehler": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKontakt": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKontaktErfolgreich": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_BahnCardServiceKontaktFehler": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_angebot_bahncard": { desktop: 0.005, tablet: 0.005, phone: 0.005 },
    "bahn-de_UnerwarteterFehler": { desktop: 0.005, tablet: 0.005, phone: 0.005 }
  };
});