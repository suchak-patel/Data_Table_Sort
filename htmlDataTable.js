var htmlDataTable = (function () {
    var table = null;
    var thSettings = null;
    var thFilters = null;
    var trFooter = null;
    var trData = null;

    var initialize = function (tableToInitialize) {
        if (!(tableToInitialize.tHead && tableToInitialize.tHead.rows.length > 0)) return;  // nothing to do if <thead> is missing or does not have any single row...

        table = tableToInitialize;
        thSettings = table.tHead.rows[table.tHead.rows.length - 1];

        table.classList.add("htmlDataTable");

        var filtersExist = false;
        var footerExist = false;

        for (var i = 0; i < thSettings.cells.length; i++) (function (i) {  // notice the function(i) pattern to ensure the addEventListener correctly registers the function with correct i value...
            // inject filters row
            if (!filtersExist) {
                if (thSettings.cells[i].attributes["data-filter"]) {
                    thFilters = table.tHead.insertRow();
                    thFilters.classList.add("filter");
                    for (var j = 0; j < thSettings.cells.length; j++) {
                        thFilters.insertCell(j);
                    }
                    filtersExist = true;
                    setupFilterControls();
                }
            }

            // inject footer tag with one row
            if (!footerExist) {
                if (thSettings.cells[i].attributes["data-footer"]) {
                    if (!table.tFoot) {
                        trFooter = table.createTFoot().insertRow();
                        for (var j = 0; j < thSettings.cells.length; j++) {
                            trFooter.insertCell(j);
                        }
                        footerExist = true;
                        updateFooter();
                    }
                }
            }

            // register header click event listners...
            if (thSettings.cells[i].attributes["data-sort"])
                thSettings.cells[i].addEventListener('click', function (e) { sortTable(e, i); });
        }(i));

        // save all rows in an array
        trData = Array.prototype.slice.call(table.tBodies[0].rows, 0);

        // inject scrollbar above table...
        if (table.attributes["data-scroll"].value == "true") {
            var divScroll = document.createElement("div");
            divScroll.classList.add("scroll");
            var divScrollChild = document.createElement("div");
            divScrollChild.innerHTML = "&nbsp;";
            divScroll.appendChild(divScrollChild);
            table.parentNode.parentNode.insertBefore(divScroll, table.parentNode);
        }

        // for SharePoint only - define scroll event listner on #s4-workspace instead of window because SharePoint doesn't like window scroll event...
        if (document.getElementById('s4-workspace')) {
            document.getElementById('s4-workspace').addEventListener("scroll", function() {
                document.body.querySelectorAll('table.htmlDataTable').forEach(function(t) {
                    var scrollbarHeight = t.parentNode.parentNode.querySelector('div.scroll') ? t.parentNode.parentNode.querySelector('div.scroll').offsetHeight - 1 : 0;
                    if (t.getBoundingClientRect().top < 0 && (t.getBoundingClientRect().top + t.offsetHeight + (t.tFoot ? t.tFoot.offsetHeight : 0) - (t.tHead ? t.tHead.offsetHeight : 0)) > 0) {
                        t.tHead.style.transform = "translateY(" + (window.pageYOffset - (t.getBoundingClientRect().top + window.scrollY) + scrollbarHeight) + "px)";
                        if (t.parentNode.parentNode.querySelector('div.scroll')) {
                            t.parentNode.parentNode.querySelector('div.scroll').style.transform = "translateY(" + (window.pageYOffset - (t.getBoundingClientRect().top + window.scrollY) + scrollbarHeight) + "px)";
                        }
                    }
                    else {
                        t.tHead.style.transform = "inherit";
                        if (t.parentNode.parentNode.querySelector('div.scroll')) {
                            t.parentNode.parentNode.querySelector('div.scroll').style.transform = "inherit";
                        }
                    }
                });
            });
        }
    }

    var setupFilterControls = function () {
        for (var i = 0; i < thFilters.cells.length; i++) {
            if (thSettings.cells[i].attributes["data-filter"]) {
                switch (thSettings.cells[i].attributes["data-filter"].value) {
                    case "choice":
                        var choiceElement = document.createElement("select");
                        var option = document.createElement("option");
                        option.value = "Show All";
                        option.text = "Show All";
                        choiceElement.appendChild(option);
                        choiceElement.addEventListener("change", function (e) { filterTable(); });
                        thFilters.cells[i].appendChild(choiceElement);
                        break;
                    case "number":
                    case "string":
                    default:
                        var inputElement = document.createElement("input");
                        inputElement.setAttribute("type", "text");
                        inputElement.addEventListener('keyup', function () { filterTable(); });
                        thFilters.cells[i].appendChild(inputElement);
                        break;
                }
            }
        }
        updateSelectOptions();
    }

    var updateSelectOptions = function () {
        if (thFilters) {
            var trVisible = Array.prototype.slice.call(table.tBodies[0].rows, 0).filter(function(r){return r.classList.contains("hide") == false});

            for (var i = 0; i < thFilters.cells.length; i++) {
                if (thSettings.cells[i].attributes["data-filter"]) {
                    if (thSettings.cells[i].attributes["data-filter"].value == "choice" && thFilters.cells[i].children[0].value == "Show All") {
                        var choices = trVisible.reduce(function(accumulator, current) { 
                            if (accumulator.filter(function(element) { return element.toLowerCase() == current.cells[i].textContent.trim().toLowerCase() })[0] == undefined) {
                                accumulator.push(current.cells[i].textContent.trim());
                            }
                            return accumulator;
                        }, []);
                        choices.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });

                        var choiceElement = thFilters.cells[i].children[0];
                        for (var j = choiceElement.length; j > 0; j--) {
                            choiceElement.remove(j);
                        }
                        for (var j = 0; j < choices.length; j++) {
                            var option = document.createElement("option");
                            option.value = choices[j];
                            option.text = choices[j];
                            choiceElement.appendChild(option);
                        }
                    }
                }
            }
        }
    }

    var updateFooter = function () {
        if (trFooter) {
            var trVisible = Array.prototype.slice.call(table.tBodies[0].rows, 0).filter(function(r){return r.classList.contains("hide") == false});

            for (var i = 0; i < thSettings.cells.length; i++) {
                if (thSettings.cells[i].attributes["data-footer"]) {
                    if (trVisible.every(function(row) { return row.cells[i].textContent.trim() == ""; })) {
                        trFooter.cells[i].innerHTML = "";
                    }
                    else {
                        switch (thSettings.cells[i].attributes["data-footer"].value) {
                            case "count":
                                trFooter.cells[i].innerHTML = trVisible.reduce(function(accumulator, current) {
                                    return current.cells[i].textContent.trim() ? (accumulator + 1) : accumulator;
                                }, 0);
                                trFooter.cells[i].classList.add("count");
                                break;
                            case "sum":
                                var result = trVisible.reduce(function(accumulator, current) {
                                    return current.cells[i].textContent.trim() ? (current.cells[i].textContent.trim() != "NA" ? (accumulator + parseCurrency(current.cells[i].textContent.trim())) : accumulator) : accumulator;
                                }, 0);
                                if (thSettings.cells[i].attributes["data-sort"]) {
                                    switch (thSettings.cells[i].attributes["data-sort"].value) {
                                        case "currency":   trFooter.cells[i].innerHTML = formatMoney(result); trFooter.cells[i].classList.add("currency"); break;
                                        case "percentage": trFooter.cells[i].innerHTML = formatPercentage(result); break;
                                        case "number":     trFooter.cells[i].innerHTML = formatNumber(result); break;
                                        default:           trFooter.cells[i].innerHTML = result; break;
                                    }
                                    trFooter.cells[i].classList.add("sum");
                                }
                                break;
                            case "average":
                                var trCleaned = trVisible.filter(function (n) { return n.cells[i].textContent.trim() != "" && n.cells[i].textContent.trim() != "NA" });
                                var result = trCleaned.length == 0 ? "" : trCleaned.reduce(function(accumulator, current) {
                                    return current.cells[i].textContent.trim() ? (accumulator + parseCurrency(current.cells[i].textContent.trim())) : accumulator;
                                }, 0) / trCleaned.length;
                                if (thSettings.cells[i].attributes["data-sort"]) {
                                    switch (thSettings.cells[i].attributes["data-sort"].value) {
                                        case "currency":   trFooter.cells[i].innerHTML = formatMoney(result); trFooter.cells[i].classList.add("currency"); break;
                                        case "percentage": trFooter.cells[i].innerHTML = formatPercentage(result); break;
                                        case "number":     trFooter.cells[i].innerHTML = formatNumber(result); break;
                                        default:           trFooter.cells[i].innerHTML = result; break;
                                    }
                                    trFooter.cells[i].classList.add("average");
                                }
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
    }

    var filterTable = function () {
        var controlsToCheck = [];
        if (thFilters) {
            for (var i = 0; i < thFilters.cells.length; i++) {
                if (thFilters.cells[i].children.length > 0) {
                    var filterType = thSettings.cells[i].attributes["data-filter"].value;
                    var filterValue = thFilters.cells[i].children[0].value.trim();
                    if ((filterType != "choice" && filterValue) || (filterType == "choice" && filterValue != "Show All")) {
                        controlsToCheck.push({ value: filterValue, filterType: filterType, cellIndex: i });
                    }
                }
            }
        }
        for (var i = 0; i < trData.length; i++) {
            var matchFound = true;
            for (var j = 0; j < controlsToCheck.length; j++) {
                if (matchFound) {
                    switch (controlsToCheck[j].filterType) {
                        case "choice":
                            matchFound = trData[i].cells[controlsToCheck[j].cellIndex].textContent.trim().toLowerCase() == controlsToCheck[j].value.toLowerCase();
                            break;
                        case "string":
                            matchFound = trData[i].cells[controlsToCheck[j].cellIndex].textContent.trim().toLowerCase().indexOf(controlsToCheck[j].value.toLowerCase()) >= 0;
                            break;
                        case "number":
                            if (controlsToCheck[j].value) {
                                var cellValue = parseCurrency(trData[i].cells[controlsToCheck[j].cellIndex].textContent.trim());

                                if (controlsToCheck[j].value.indexOf(">=") == "0") matchFound = controlsToCheck[j].value.replace(">=", "").trim() == "" ? true : ((cellValue - parseCurrency(controlsToCheck[j].value.replace(">=", "").trim())) >= 0 ? true : false);
                                else if (controlsToCheck[j].value.indexOf(">") == "0") matchFound = controlsToCheck[j].value.replace(">", "").trim() == "" ? true : ((cellValue - parseCurrency(controlsToCheck[j].value.replace(">", "").trim())) > 0 ? true : false);
                                else if (controlsToCheck[j].value.indexOf("<=") == "0") matchFound = controlsToCheck[j].value.replace("<=", "").trim() == "" ? true : ((cellValue - parseCurrency(controlsToCheck[j].value.replace("<=", "").trim())) <= 0 ? true : false);
                                else if (controlsToCheck[j].value.indexOf("<") == "0") matchFound = controlsToCheck[j].value.replace("<", "").trim() == "" ? true : ((cellValue - parseCurrency(controlsToCheck[j].value.replace("<", "").trim())) < 0 ? true : false);
                                else if (controlsToCheck[j].value.indexOf("=") == "0") matchFound = controlsToCheck[j].value.replace("=", "").trim() == "" ? true : ((cellValue - parseCurrency(controlsToCheck[j].value.replace("=", "").trim())) == 0 ? true : false);
                                else matchFound = (cellValue - parseCurrency(controlsToCheck[j].value)) == 0 ? true : false;
                            }
                            else {
                                matchFound = true;
                            }
                        default:
                            break;
                    }
                }
                else {
                    break;
                }
            }
            matchFound ? trData[i].classList.remove("hide") : trData[i].classList.add("hide");
        }

        updateSelectOptions();
        updateFooter();
    }

    var sortTable = function (e, cellIndex) {
        var reverse = 1;
        if (e.target.classList.contains("asc")) { reverse = -1; }
        else if (e.target.classList.contains("desc")) { reverse = 1; }

        for (var i = 0; i < e.target.parentNode.children.length; i++) {
            e.target.parentNode.children[i].classList.remove("asc");
            e.target.parentNode.children[i].classList.remove("desc");
        }
        e.target.classList.add(reverse > 0 ? "asc" : "desc");
        var sortType = e.target.attributes["data-sort"];

        var map = [];
        for (var i = 0, length = trData.length; i < length; i++) {
            map.push({
                index: i, // remember the index within the original array
                value: trData[i].cells[cellIndex].textContent.trim().toLowerCase() // prepare the element for comparison
            });
        }
        
        map.sort(function(a, b) {
            return reverse * compare(a.value, b.value, sortType);
        });

        for (var i = 0, length = map.length; i < length; i++) {
            table.tBodies[0].appendChild(trData[map[i].index]);
        }
    }

    var compare = function (a, b, sortType) {
        sortType = sortType ? sortType.value : 'string';
        switch (sortType) {
            case "number":
                return compareNumbers(a, b);
            case "currency":
                return compareCurrencies(a, b);
            case "percentage":
                return comparePercentages(a, b);
            case "date":
                return compareDates(a, b);
            case "string":
            default:
                return compareStrings(a, b);
        }
    }

    var compareStrings = function (a, b) {
        return a.localeCompare(b);
    }

    var compareNumbers = function (a, b) {
        if (!a) { return -1; }
        if (!b) { return 1; }
        return parseFloat(a) - parseFloat(b);
    }

    var comparePercentages = function (a, b) {
        var a1 = a.replace("%", "");
        var b1 = b.replace("%", "");
        return compareNumbers(a1, b1);
    }

    var compareCurrencies = function (a, b) {
        var a1 = parseCurrency(a);
        var b1 = parseCurrency(b);
        return compareNumbers(a1, b1);
    }

    var compareDates = function (a, b) {
        var a1 = parseDate(a);
        var b1 = parseDate(b);

        if (!a1) { return -1; }
        if (!b1) { return 1; }
        return a1.getTime() - b1.getTime();
    }

    var parseDate = function (s) {
        var months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        var p = s.split('-');
        if (p.length == 3)
            return new Date(p[2], months[p[1].toLowerCase()], p[0]);
        else
            return NaN;
    }

    var parseCurrency = function (s) {
        var re = /\((.*)\)/;
        if (s.match(re)) {s = "-" + s.match(re)[1]; }
        return parseFloat(s.replace(/,/g, ""));
    }
    var formatMoney = function (result, decimals) {
        if (result) {
            let n = result;
            let c = isNaN(decimals = Math.abs(decimals)) ? 3 : decimals;
            let d = ".";
            let t = ",";
            //let s = this < 0 ? "-" : "";
            let sb = result < 0 ? "(" : "";
            let se = result < 0 ? ")" : "";
            let i = parseInt(n = Math.abs(Number(n) || 0).toFixed(c));
            let j = String(i).length > 3 ? (String(i).length % 3) : 0;
            return sb + (j ? String(i).substr(0, j) + t : "") + String(i).substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "") + se;
        }
        else {
            return result;
        }
    }

    var formatNumber = function (result, decimals) {
        return result ? String((result).toFixed(decimals)) : result;
    }

    var formatPercentage = function (result, percent) {
        return result ? String((result).toFixed(percent)) + '%' : result;
    }

    return {
        initialize: initialize,
        sortTable: sortTable,
        filterTable: filterTable
    }
});