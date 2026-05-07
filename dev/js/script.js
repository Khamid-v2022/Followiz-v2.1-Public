(function () {
    const eventStore = new WeakMap();

    function toCamelCase(value) {
        return String(value).replace(/-([a-z])/g, function (_, ch) {
            return ch.toUpperCase();
        });
    }

    function parseHtmlString(html) {
        const template = document.createElement("template");
        template.innerHTML = html.trim();
        return Array.from(template.content.childNodes);
    }

    function normalizeElements(input, context) {
        if (input instanceof VQuery) {
            return input.elements;
        }

        if (input == null) {
            return [];
        }

        if (typeof input === "string") {
            const value = input.trim();
            if (value.startsWith("<") && value.endsWith(">")) {
                return parseHtmlString(value).filter(function (node) {
                    return node.nodeType === Node.ELEMENT_NODE;
                });
            }

            const root = context instanceof VQuery ? context.elements[0] : context;
            const queryRoot = root || document;
            return Array.from(queryRoot.querySelectorAll(input));
        }

        if (input === window || input === document || input instanceof Element || input instanceof DocumentFragment) {
            return [input];
        }

        if (Array.isArray(input)) {
            return input.filter(Boolean);
        }

        if (typeof NodeList !== "undefined" && input instanceof NodeList) {
            return Array.from(input);
        }

        if (typeof HTMLCollection !== "undefined" && input instanceof HTMLCollection) {
            return Array.from(input);
        }

        return [];
    }

    class VQuery {
        constructor(input, context) {
            this.elements = normalizeElements(input, context);
            this._syncIndexProps();
        }

        _syncIndexProps() {
            Object.keys(this).forEach((key) => {
                if (!Number.isNaN(Number(key))) {
                    delete this[key];
                }
            });

            this.elements.forEach((el, idx) => {
                this[idx] = el;
            });
        }

        get length() {
            return this.elements.length;
        }

        ready(callback) {
            if (typeof callback !== "function") {
                return this;
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", callback, { once: true });
            } else {
                callback();
            }
            return this;
        }

        each(callback) {
            this.elements.forEach(function (el, idx) {
                callback.call(el, idx, el);
            });
            return this;
        }

        map(callback) {
            return this.elements.map(function (el, idx) {
                return callback.call(el, idx, el);
            });
        }

        eq(index) {
            const idx = Number(index);
            if (Number.isNaN(idx)) {
                return new VQuery([]);
            }
            const normalized = idx < 0 ? this.elements.length + idx : idx;
            return new VQuery(this.elements[normalized] ? [this.elements[normalized]] : []);
        }

        find(selector) {
            const found = [];
            this.each(function () {
                if (this && this.querySelectorAll) {
                    found.push.apply(found, Array.from(this.querySelectorAll(selector)));
                }
            });
            return new VQuery(found);
        }

        parents(selector) {
            const result = [];
            this.each(function () {
                let current = this.parentElement;
                while (current) {
                    if (!selector || current.matches(selector)) {
                        result.push(current);
                    }
                    current = current.parentElement;
                }
            });
            return new VQuery(Array.from(new Set(result)));
        }

        closest(selector) {
            const result = this.elements
                .map(function (el) {
                    return el && el.closest ? el.closest(selector) : null;
                })
                .filter(Boolean);
            return new VQuery(result);
        }

        next(selector) {
            const result = this.elements
                .map(function (el) {
                    if (!el || !el.nextElementSibling) {
                        return null;
                    }
                    if (!selector || el.nextElementSibling.matches(selector)) {
                        return el.nextElementSibling;
                    }
                    return null;
                })
                .filter(Boolean);
            return new VQuery(result);
        }

        prev(selector) {
            const result = this.elements
                .map(function (el) {
                    if (!el || !el.previousElementSibling) {
                        return null;
                    }
                    if (!selector || el.previousElementSibling.matches(selector)) {
                        return el.previousElementSibling;
                    }
                    return null;
                })
                .filter(Boolean);
            return new VQuery(result);
        }

        addClass(classNames) {
            const list = String(classNames || "").split(/\s+/).filter(Boolean);
            return this.each(function () {
                this.classList.add.apply(this.classList, list);
            });
        }

        removeClass(classNames) {
            const list = String(classNames || "").split(/\s+/).filter(Boolean);
            return this.each(function () {
                this.classList.remove.apply(this.classList, list);
            });
        }

        hasClass(className) {
            return this.elements.some(function (el) {
                return el.classList && el.classList.contains(className);
            });
        }

        attr(name, value) {
            if (typeof name === "object" && name !== null) {
                return this.each(function () {
                    Object.keys(name).forEach((key) => {
                        this.setAttribute(key, name[key]);
                    });
                });
            }

            if (value === undefined) {
                const el = this.elements[0];
                return el ? el.getAttribute(name) : undefined;
            }

            return this.each(function () {
                this.setAttribute(name, value);
            });
        }

        removeAttr(name) {
            return this.each(function () {
                this.removeAttribute(name);
            });
        }

        prop(name, value) {
            if (value === undefined) {
                const el = this.elements[0];
                return el ? el[name] : undefined;
            }

            return this.each(function () {
                this[name] = value;
            });
        }

        data(name, value) {
            const key = toCamelCase(name);
            if (value === undefined) {
                const el = this.elements[0];
                if (!el || !el.dataset) {
                    return undefined;
                }
                const result = el.dataset[key];
                if (result === "true") return true;
                if (result === "false") return false;
                return result;
            }

            return this.each(function () {
                if (this.dataset) {
                    this.dataset[key] = value;
                }
            });
        }

        val(value) {
            if (value === undefined) {
                const el = this.elements[0];
                if (!el) {
                    return undefined;
                }
                return el.value;
            }

            return this.each(function () {
                this.value = value;
            });
        }

        html(value) {
            if (value === undefined) {
                const el = this.elements[0];
                return el ? el.innerHTML : undefined;
            }

            return this.each(function () {
                this.innerHTML = value;
            });
        }

        text(value) {
            if (value === undefined) {
                const el = this.elements[0];
                return el ? el.textContent : undefined;
            }

            return this.each(function () {
                this.textContent = value;
            });
        }

        append(content) {
            return this.each(function () {
                if (typeof content === "string") {
                    this.insertAdjacentHTML("beforeend", content);
                    return;
                }

                const items = normalizeElements(content);
                items.forEach((item) => {
                    this.appendChild(item.cloneNode(true));
                });
            });
        }

        prepend(content) {
            return this.each(function () {
                if (typeof content === "string") {
                    this.insertAdjacentHTML("afterbegin", content);
                    return;
                }

                const items = normalizeElements(content);
                items.slice().reverse().forEach((item) => {
                    this.insertBefore(item.cloneNode(true), this.firstChild);
                });
            });
        }

        remove() {
            return this.each(function () {
                if (this.remove) {
                    this.remove();
                }
            });
        }

        clone() {
            return new VQuery(this.elements.map((el) => el.cloneNode(true)));
        }

        show() {
            return this.each(function () {
                this.style.display = "";
            });
        }

        hide() {
            return this.each(function () {
                this.style.display = "none";
            });
        }

        css(name, value) {
            if (value === undefined) {
                const el = this.elements[0];
                return el ? getComputedStyle(el)[name] : undefined;
            }

            return this.each(function () {
                this.style[name] = value;
            });
        }

        width() {
            const el = this.elements[0];
            if (!el) {
                return 0;
            }
            if (el === window) {
                return window.innerWidth;
            }
            return el.getBoundingClientRect().width;
        }

        is(selector) {
            const el = this.elements[0];
            if (!el) {
                return false;
            }

            if (selector === ":checked") {
                return !!el.checked;
            }

            if (selector === ":visible") {
                return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            }

            const containsMatch = /^:contains\((['\"])(.*)\1\)$/.exec(selector);
            if (containsMatch) {
                return (el.textContent || "").includes(containsMatch[2]);
            }

            return el.matches(selector);
        }

        _addStoredListener(el, eventName, originalHandler, wrappedHandler, selector) {
            const existing = eventStore.get(el) || [];
            existing.push({ eventName: eventName, originalHandler: originalHandler, wrappedHandler: wrappedHandler, selector: selector || null });
            eventStore.set(el, existing);
        }

        on(eventName, selectorOrHandler, handlerMaybe) {
            const delegated = typeof selectorOrHandler === "string";
            const selector = delegated ? selectorOrHandler : null;
            const handler = delegated ? handlerMaybe : selectorOrHandler;

            if (typeof handler !== "function") {
                return this;
            }

            return this.each((idx, el) => {
                const wrapped = function (event) {
                    if (!selector) {
                        handler.call(el, event);
                        return;
                    }

                    const target = event.target && event.target.closest ? event.target.closest(selector) : null;
                    if (target && el.contains(target)) {
                        handler.call(target, event);
                    }
                };

                el.addEventListener(eventName, wrapped);
                this._addStoredListener(el, eventName, handler, wrapped, selector);
            });
        }

        unbind(eventName) {
            return this.each(function () {
                const handlers = eventStore.get(this) || [];
                const remain = [];
                handlers.forEach((entry) => {
                    if (!eventName || entry.eventName === eventName) {
                        this.removeEventListener(entry.eventName, entry.wrappedHandler);
                    } else {
                        remain.push(entry);
                    }
                });
                eventStore.set(this, remain);
            });
        }

        trigger(eventName) {
            return this.each(function () {
                const ev = new Event(eventName, { bubbles: true, cancelable: true });
                this.dispatchEvent(ev);
            });
        }

        click(handler) {
            if (typeof handler === "function") {
                return this.on("click", handler);
            }
            return this.dispatchEvent(new Event("click", { bubbles: true }));
        }

        change(handler) {
            if (typeof handler === "function") {
                return this.on("change", handler);
            }
            return this.dispatchEvent(new Event("change", { bubbles: true }));
        }

        hover(handlerIn, handlerOut) {
            if (typeof handlerIn === "function") {
                this.on("mouseenter", handlerIn);
            }
            if (typeof handlerOut === "function") {
                this.on("mouseleave", handlerOut);
            }
            return this;
        }

        focus() {
            const el = this.elements[0];
            if (el && el.focus) {
                el.focus();
            }
            return this;
        }

        submit(handler) {
            if (typeof handler === "function") {
                return this.on("submit", handler);
            }

            return this.each(function () {
                if (this.tagName === "FORM") {
                    if (this.requestSubmit) {
                        this.requestSubmit();
                    } else {
                        this.submit();
                    }
                } else {
                    this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                }
            });
        }

        serialize() {
            const el = this.elements[0];
            if (!el || el.tagName !== "FORM") {
                return "";
            }
            const formData = new FormData(el);
            return new URLSearchParams(formData).toString();
        }

        tooltip(action) {
            return this.each(function () {
                if (!window.bootstrap || !window.bootstrap.Tooltip) {
                    return;
                }
                const tip = window.bootstrap.Tooltip.getOrCreateInstance(this);
                if (action === "enable") tip.enable();
                else if (action === "disable") tip.disable();
                else if (action === "dispose") tip.dispose();
            });
        }

        modal(action) {
            return this.each(function () {
                if (!window.bootstrap || !window.bootstrap.Modal) {
                    return;
                }
                const instance = window.bootstrap.Modal.getOrCreateInstance(this);
                if (action === "show") instance.style.display = "";
                else if (action === "hide") instance.style.display = "none";
                else if (action === "toggle") instance.toggle();
            });
        }

        collapse(action) {
            return this.each(function () {
                if (!window.bootstrap || !window.bootstrap.Collapse) {
                    return;
                }
                const instance = window.bootstrap.Collapse.getOrCreateInstance(this, { toggle: false });
                if (action === "show") instance.style.display = "";
                else if (action === "hide") instance.style.display = "none";
                else instance.toggle();
            });
        }

        select2() {
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) {
                window.jQuery(this.elements).select2.apply(window.jQuery(this.elements), arguments);
            }
            return this;
        }

        circleProgress() {
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.circleProgress) {
                window.jQuery(this.elements).circleProgress.apply(window.jQuery(this.elements), arguments);
            }
            return this;
        }

        rating() {
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.rating) {
                window.jQuery(this.elements).rating.apply(window.jQuery(this.elements), arguments);
            }
            return this;
        }

        perfectuploader() {
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.perfectuploader) {
                return window.jQuery(this.elements).perfectuploader.apply(window.jQuery(this.elements), arguments);
            }
            return [];
        }
    }

    function buildUrlWithQuery(url, data) {
        if (!data) {
            return url;
        }
        const params = typeof data === "string" ? data : new URLSearchParams(data).toString();
        if (!params) {
            return url;
        }
        return url + (url.includes("?") ? "&" : "?") + params;
    }

    function parseResponse(xhr, dataType) {
        if (dataType === "json") {
            try {
                return JSON.parse(xhr.responseText);
            } catch (error) {
                return null;
            }
        }
        return xhr.responseText;
    }

    function ajax(options) {
        const opts = options || {};
        const method = (opts.type || opts.method || "GET").toUpperCase();
        const isAsync = opts.async !== false;
        const url = method === "GET" ? buildUrlWithQuery(opts.url, opts.data) : opts.url;

        let resolveFn;
        let rejectFn;
        const promise = new Promise(function (resolve, reject) {
            resolveFn = resolve;
            rejectFn = reject;
        });

        promise.fail = function (handler) {
            promise.catch(handler);
            return promise;
        };

        promise.done = function (handler) {
            promise.then(handler);
            return promise;
        };

        const xhr = new XMLHttpRequest();
        xhr.open(method, url, isAsync);

        if (method !== "GET") {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        }

        xhr.onload = function () {
            const parsed = parseResponse(xhr, opts.dataType);
            if (xhr.status >= 200 && xhr.status < 300) {
                if (typeof opts.success === "function") {
                    opts.success(parsed, "success", xhr);
                }
                resolveFn(parsed);
            } else {
                if (typeof opts.error === "function") {
                    opts.error(xhr, "error", xhr.statusText);
                }
                rejectFn(xhr);
            }
        };

        xhr.onerror = function () {
            if (typeof opts.error === "function") {
                opts.error(xhr, "error", xhr.statusText);
            }
            rejectFn(xhr);
        };

        const payload = method === "GET" || !opts.data
            ? null
            : (typeof opts.data === "string" ? opts.data : new URLSearchParams(opts.data).toString());

        xhr.send(payload);
        return promise;
    }

    function $(input, context) {
        if (typeof input === "function") {
            return new VQuery(document).ready(input);
        }
        return new VQuery(input, context);
    }

    $.ajax = ajax;
    $.get = function (url, success) {
        return ajax({ url: url, type: "GET", success: success });
    };
    $.post = function (url, data, success) {
        return ajax({ url: url, type: "POST", data: data, success: success });
    };

    window.$ = $;
})();

const currentURL = window.location.href;
const homeURL =  location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
const fake_service_name = "------------------------------------------";
// New Order page global variables
    let newServices = [];
    let decreased_services = [];
    let mainBestSeller = [];
    let subBestSeller =[];
    let serviceOrderNew = [];
    let firstSocialPlateForm = '';
    let mainCategory = [];
    let subCategory = []; 
    let mostFavoriteServices = [];
    let myFavoriteServices = [];

    let g_is_search_service = 0;
// Deposit page
    let invoices = [];

// Service Page
    let serviceOrder = [];

document.addEventListener('DOMContentLoaded', function () {
    // set Active for the selected Menu item 
        let path = window.location.pathname;

        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const param = urlParams.get('page');
        
        // check new order page: 
        // condition1: ?page=neworder
        // condition2: path: /order/order_id
        let is_neworder_page = 0;
        if(param == "neworder" || path.includes("/order/") || path.includes("/subscription/") || document.getElementById("exist_error").val() == "1"){
            is_neworder_page = 1;
        }

        // change the path for select selected menu item in the case pagenation selected -> ex: https://followizdev.com/orders/all/2 => order history page
        if(path.includes("/orders")) {
            if(path.includes("/orders/refunds")) {
                path = "/orders/refunds";
            } else {
                path = "/orders";
            }
            
        } else if(path.includes("/subscriptions")) {
            path = "/subscriptions";
        } else if(path.includes("/drip-feed")) {
            path = "/drip-feed";
        } else if(path.includes("/refill")) {
            path = "/refill";
        }  else if(path.includes("/addfunds")) {
            path = "/addfunds";
        } else if(path.includes("/tickets")) {
            path = "/tickets";
        } else if(path.includes("/updates")) {
            path = "/updates";
        }
        document.querySelectorAll(".nav-item a[href='" + path + "']")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("li.nav-item")) result.push(current); current = current.parentElement; } return result; }).call(this).classList.add("active");

        document.querySelectorAll(".nav-item a[href='" + path + "']")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("li.nav-item")) result.push(current); current = current.parentElement; } return result; }).call(this)(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("li")) result.push(current); current = current.parentElement; } return result; }).call(this).find(".btn-toggle").classList.remove("collapsed").attr("aria-expanded", true);
        document.querySelectorAll(".nav-item a[href='" + path + "']")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("li.nav-item")) result.push(current); current = current.parentElement; } return result; }).call(this)(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("div.collapse")) result.push(current); current = current.parentElement; } return result; }).call(this).classList.add("show");

        if(document.querySelectorAll(".neworder-page").length > 0){
            // Hide spinner
            document.querySelectorAll(".spinner-wrapper").forEach(el => el.classList.add("d-none"));
            if(is_neworder_page){
                document.querySelectorAll("li.nav-item").forEach(el => el.classList.remove("active"));
                document.querySelectorAll(".neworder-menu").forEach(el => el.classList.add("active"));
                document.querySelectorAll(".neworder-page").forEach(el => el.classList.remove("d-none"));
            } else {
               document.querySelectorAll(".dashboard-page").forEach(el => el.classList.remove("d-none"));
               document.prop( 'title' , 'Dashboard' );
            }
        }

        // asset switch according the the dark/light mode
        document.querySelectorAll(".theme-asset-item").forEach(el => el.classList.add("d-none"));
        if(localStorage.getItem("theme_mode") && localStorage.getItem("theme_mode") == "dark-mode"){
            document.querySelectorAll(".dark-mode-asset-item").forEach(el => el.classList.remove("d-none"));
        } else {
            document.querySelectorAll(".light-mode-asset-item").forEach(el => el.classList.remove("d-none"));
        }
       

    // global starts
        var letCollapseWidth = false,
            paddingValue = 40,
            sumWidth = document.querySelectorAll('.navbar-right-block').getBoundingClientRect().width + document.querySelectorAll('.navbar-left-block').getBoundingClientRect().width + document.querySelectorAll('.navbar-brand').getBoundingClientRect().width + paddingValue;

        window.on('resize', function () {
            navbarResizerFunc();
        });

        var navbarResizerFunc = function navbarResizerFunc() {
            if (sumWidth <= window.getBoundingClientRect().width) {
                if (letCollapseWidth && letCollapseWidth <= window.getBoundingClientRect().width) {
                    document.getElementById('navbar').classList.add('navbar-collapse');
                    document.getElementById('navbar').classList.remove('navbar-collapsed');
                    document.querySelectorAll('nav').forEach(el => el.classList.remove('navbar-collapsed-before'));
                    letCollapseWidth = false;
                }
            } else {
                document.getElementById('navbar').classList.remove('navbar-collapse');
                document.getElementById('navbar').classList.add('navbar-collapsed');
                document.querySelectorAll('nav').forEach(el => el.classList.add('navbar-collapsed-before'));
                letCollapseWidth = window.getBoundingClientRect().width;
            }
        };

        if (window.getBoundingClientRect().width >= 768) {
            navbarResizerFunc();
        }

        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl)
        })

        if(!document.querySelectorAll(".full-layout").classList.contains("narrow-mode")) {
            // disable menu tooltip
            setTimeout(function() {
                document.querySelectorAll('.nav .nav-item svg[data-bs-toggle="tooltip"]').tooltip('disable');
                // document.querySelectorAll('.nav .nav-item a[data-bs-toggle="tooltip"]').tooltip('disable');
            }, 50)
        }

        // narrow btn
        document.querySelectorAll(".narrow-btn").forEach(el => el.addEventListener("click", function() {
            if(this.querySelector("i.fa-solid").classList.contains("fa-chevron-left")){
                this.querySelector("i.fa-solid").classList.remove("fa-chevron-left").classList.add("fa-chevron-right");
                document.querySelectorAll(".full-layout").forEach(el => el.classList.add("narrow-mode"));
                document.querySelectorAll(".top-bar").forEach(el => el.style.width = "calc(100% - 100px)");
                localStorage.setItem("narrow_mode", true);
                // enable menu tooltip
                document.querySelectorAll('.nav .nav-item svg[data-bs-toggle="tooltip"]').tooltip('enable');
                // document.querySelectorAll('.nav .nav-item a[data-bs-toggle="tooltip"]').tooltip('enable');
            } else {
                this.querySelector("i.fa-solid").classList.remove("fa-chevron-right").classList.add("fa-chevron-left");
                document.querySelectorAll(".full-layout").forEach(el => el.classList.remove("narrow-mode"));
                document.querySelectorAll(".top-bar").forEach(el => el.style.width = "calc(100% - 240px)");
                localStorage.removeItem("narrow_mode");
                // disable menu tooltip
                document.querySelectorAll('.nav .nav-item svg[data-bs-toggle="tooltip"]').tooltip('disable');
                // document.querySelectorAll('.nav .nav-item a[data-bs-toggle="tooltip"]').tooltip('disable');
            }
            setTimeout(resizeSelect2Dropdown, 300);
        })

        document.querySelectorAll(".mobile-menu-btn").forEach(el => el.addEventListener("click", function() {
            document.querySelectorAll(".mobile-menu").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".mobile-menu-overlay").forEach(el => el.classList.remove("d-none"));
        })

        document.querySelectorAll(".mobile-menu-overlay, .mobile-menu-close-btn").forEach(el => el.addEventListener("click", function() {
            document.querySelectorAll(".mobile-menu").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".mobile-menu-overlay").forEach(el => el.classList.add("d-none"));
        })

        // theme_mode
        document.querySelectorAll(".theme-mode").forEach(el => el.addEventListener('click', function() {
            document.querySelectorAll(".theme-mode-label").forEach(el => el.classList.remove("active"));
            document.querySelectorAll(".theme-asset-item").forEach(el => el.classList.add("d-none"));

            if(this.checked) {
                // dark mode
                document.querySelectorAll("body").forEach(el => el.classList.remove("light-mode"));
                localStorage.setItem("theme_mode", "dark-mode");
                document.querySelectorAll(".dark-mode-label").forEach(el => el.classList.add("active"));
                document.querySelectorAll(".dark-mode-asset-item").forEach(el => el.classList.remove("d-none"));  
                document.querySelectorAll(".theme-mode").checked = true;         
            } else {
                // light-mode
                document.querySelectorAll("body").forEach(el => el.classList.add("light-mode"));
                localStorage.setItem("theme_mode", "light-mode");
                document.querySelectorAll(".light-mode-label").forEach(el => el.classList.add("active"));
                document.querySelectorAll(".light-mode-asset-item").forEach(el => el.classList.remove("d-none"));
                document.querySelectorAll(".theme-mode").checked = false;
            }

            // drawing circle again
            if(document.querySelectorAll('.vip-status-progress').length > 0) {
                let empty_color = "#525A66";
                if(document.querySelectorAll("body").classList.contains("light-mode")) {
                    empty_color = "#EDEFF2";
                }
                document.querySelectorAll('.vip-status-progress').circleProgress({
                    startAngle: -Math.PI / 2,
                    emptyFill: empty_color
                });
            }
          
        })

        
        // redirect to Dashboard page for Canadian if go to the Deposit page
        const userAgentInfo = localStorage.getItem('user_agent_info');
        const now_time = new Date().getTime();

        if(!userAgentInfo || (userAgentInfo && now_time > JSON.parse(userAgentInfo).setupTime + 24 * 60 * 60 * 1000)) {
            if(userAgentInfo){
                localStorage.removeItem('user_agent_info');
            }
            try {
                const user_IpLink = 'https://api.geoapify.com/v1/ipinfo';
                const API_KEY = '.....';
                const user_info_endpoint = user_IpLink + '?apiKey=' + API_KEY;
                $.get(user_info_endpoint, function(ipInfo){
                    ipInfo.setupTime = new Date().getTime();
                    localStorage.setItem('user_agent_info', JSON.stringify(ipInfo));
                    redirectCanadian(ipInfo);
                })
            } catch(err){
                window.location.href = homeURL;
            }
        } else {
            redirectCanadian(JSON.parse(userAgentInfo));
        }
    // global ends


    //---------------------------------- SignIn page - Cookie bar display ---------------------//
    if(document.querySelectorAll(".signin-page:not(.signup-page)").length > 0) {
        var toastElement = document.getElementById('cookieConsentToast');
        var toast = new bootstrap.Toast(toastElement[0]);

        $.ajax({
            url: api_end_point + "/cookie/getCookieInfo.php",    
            type: "GET",
            success: function(resp)         
            {
                resp = JSON.parse(resp);
                if(resp.cookie_show) {
                    toast.style.display = "";
                }
            }
        });

        // Hide the toast when the Continue button is clicked
        document.getElementById('cookieConsentBtn').on('click', function() {
            $.ajax({
                url: api_end_point + "/cookie/createCookieInfo.php",    
                type: "GET",
                success: function(resp)         
                {
                    resp = JSON.parse(resp);
                    if(resp.status) {
                        toast.style.display = "none";
                    }
                }
            });
            
        });
    }
        
    //---------------------------------- / SignIn page ----------------------------------------//


    //----------------------------------- SignUp page -----------------------------------------//
    if(document.querySelectorAll(".signup-page").length > 0) {
        document.querySelectorAll('.signup-btn').on('click', function(e) {
            // check marketing email
            let is_email_agree = document.getElementById("email_accept_checkbox").prop("checked");

            $.ajax({
                url: api_end_point + "/user/addPreUser.php",
                method: 'POST',
                data: {
                    name: document.getElementById('login').val(),
                    email: document.getElementById('email').val(),
                    is_email_agree: is_email_agree ? 1 : 0
                },
                success: function(resp) {
                    console.log(resp);
                },
                error: function() {
                }
            });
                   
        });
    }


    //---------------------------------- Dashboard page Starts --------------------------------//
    if(document.querySelectorAll('.dashboard-page:not(.d-none)').length > 0) {
        // check this use is first time after signup & email verification
        // check this user is not registred in our External DB if not then register this user from pre_users table
        const data = {
            username: user_info.username,
            email: user_info.email,
            followiz_id: user_info.id
        }
        $.ajax({
            url: api_end_point + "/user/addNewUser.php",      
            type: "POST",                  
            data: data,
            success: function(data) {
            }
        });


        document.querySelectorAll(".copy-btn").forEach(el => el.addEventListener("click", function() {
            navigator.clipboard.writeText(this.getAttribute("data-copy-txt"));
        });

        let empty_color = "#525A66";
        if(document.querySelectorAll("body").classList.contains("light-mode")) {
            empty_color = "#EDEFF2";
        }
        document.querySelectorAll('.vip-status-progress').circleProgress({
            startAngle: -Math.PI / 2,
            emptyFill: empty_color
        });

        if(document.getElementById("table-updates-order").length > 0){
            loadUpdatesNew("https://followizaddons.com/client_js/updates/updates_service.php");
        }

        // News Button actions
        document.querySelectorAll(".prev-news").forEach(el => el.addEventListener("click", function() {
            if(!this.classList.contains("active")){
                return;
            }
            const selected_news_index = parseInt(document.querySelectorAll(".news-item.active").getAttribute("data-news-step"));
            if(selected_news_index > 1){
                const prev_index = selected_news_index - 1;
                document.querySelectorAll(".news-item").forEach(el => el.classList.remove("active"));
                document.querySelectorAll(".news-item[data-news-step='" + prev_index + "']").forEach(el => el.classList.add("active"));
                if(prev_index <= 1) {
                    document.querySelectorAll(".prev-news").forEach(el => el.classList.remove("active"));
                }

                // get last news item index
                const last_index = parseInt(document.querySelectorAll(".news-item:last-child").getAttribute("data-news-step"));
                if(prev_index < last_index) {
                    document.querySelectorAll(".next-news").forEach(el => el.classList.add("active"));
                }
            } else {
                document.querySelectorAll(".prev-news").forEach(el => el.classList.remove("active"));
            }
        })

        document.querySelectorAll(".next-news").forEach(el => el.addEventListener("click", function() {
            if(!this.classList.contains("active")){
                return;
            }

            // get last news item index
            const last_index = parseInt(document.querySelectorAll(".news-item:last-child").getAttribute("data-news-step"));
           
            const selected_news_index = parseInt(document.querySelectorAll(".news-item.active").getAttribute("data-news-step"));
            if(selected_news_index < last_index){
                const next_index = selected_news_index + 1;
                document.querySelectorAll(".news-item").forEach(el => el.classList.remove("active"));
                document.querySelectorAll(".news-item[data-news-step='" + next_index + "']").forEach(el => el.classList.add("active"));
                if(next_index >= last_index) {
                    document.querySelectorAll(".next-news").forEach(el => el.classList.remove("active"));
                }
                if(next_index > 1){
                    document.querySelectorAll(".prev-news").forEach(el => el.classList.add("active"));
                }
            } else {
                document.querySelectorAll(".next-news").forEach(el => el.classList.remove("active"));
            }

        })
    }
    //---------------------------------- / Dashboard page Ends ----------------------------------//


    //---------------------------------- New Order page Starts --------------------------------//
    if(document.querySelectorAll('.neworder-page:not(.d-none)').length > 0) {
        loadUpdatedDecreasedServices("https://followizaddons.com/client_js/updates/updates_service.php");
        loadMostFavoriteServicesByCategory();
        loadMyFavoriteServices();

        document.querySelectorAll("#orderform-main-category, #orderform-category_1").select2({
            templateSelection: formatState1,
            templateResult: formatState1,
        });

        document.getElementById("orderform-service").select2({
            templateSelection: formatState2,
            templateResult: formatState2,
            dropdownAutoWidth: true
        });

        document.querySelectorAll("#orderform-main-category, #orderform-category_1, #orderform-service").on("select2:open", hideSelect2Keyboard);

        // resize the select2
        window.addEventListener('resize', function() {
            resizeSelect2Dropdown();
        });

        let ordersuccesscount = localStorage.getItem('ordersuccesscount');     
        if(ordersuccesscount == 2){
            localStorage.removeItem("ordersuccesscount");
            localStorage.removeItem("service");
        }
        
        if(ordersuccesscount == 1){
            localStorage.setItem('ordersuccesscount', 2);
        }

        document.on('submit','#order-form',function(){
            localStorage.setItem('ordersuccesscount', 1);
            localStorage.setItem('service', document.getElementById('orderform-service').val());
        })    
    
        document.getElementById('orderform-main-category').on('keydown', function(e) {
            if (e.originalEvent && e.which == 40) {
                e.preventDefault();
            }
        });

        // populate new order form value    
        document.getElementById("orderform-service").on("change", function() {
            var data = document.querySelectorAll("#orderform-service option:selected").text();

            //Delay because else the value it was taking from the description was from the previous service chosen
            setTimeout(function() {
                updateMinMax();
                UpdateDescription(data);
                updateServiceTitle();
            }, 100)
        });


        //CODE TO CHANGE LINK TO ACCOUNT LINK  ON NEW ORDER PAGE 
        document.querySelectorAll("#order_check .form-group__label-title").innerHTML = "Repeat Order";
        document.getElementById("field-orderform-fields-user_name").attr('placeholder', "Enter Username");
        document.getElementById("field-orderform-fields-link").attr('placeholder', "Enter Link");
        document.getElementById('field-orderform-fields-quantity').attr('placeholder',"Select Quantity | Min: 5 - Max: 30000");
        document.getElementById("field-orderform-fields-keywords").attr('placeholder', "Enter Keywords (1 per line)");
        document.getElementById("field-orderform-fields-comment").attr('placeholder', "Enter Comments (1 per line)");
        document.getElementById("field-orderform-fields-mentionUsernames").attr('placeholder', "Enter Usernames (1 per line)");
        document.getElementById("field-orderform-fields-usernames").attr('placeholder', "Enter Usernames (1 per line)");
        document.getElementById("field-orderform-fields-usernames_custom").attr('placeholder', "Enter Usernames (1 per line)");
        document.getElementById("field-orderform-fields-username").attr('placeholder', "Enter Username");
        document.getElementById("field-orderform-fields-mediaUrl").attr('placeholder', "Enter Media URL");
        document.getElementById("field-orderform-fields-hashtag").attr('placeholder', "Enter Hashtag");
        document.getElementById("field-orderform-fields-hashtags").attr('placeholder', "Enter Hashtags (1 per line)");
        document.getElementById("field-orderform-fields-runs").attr('placeholder', "Repeats");
        document.getElementById("field-orderform-fields-interval").attr('placeholder', "Interval (in minutes)");
        document.getElementById("field-orderform-fields-total-quantity").attr('placeholder', "Total Quantity");
        document.getElementById("field-orderform-fields-posts").attr('placeholder', "Enter New posts");
        document.getElementById("field-orderform-fields-old_posts").attr('placeholder', "Enter Old posts");
        document.getElementById("field-orderform-fields-expiry").attr('placeholder', "Expiry");
        document.querySelectorAll("#order_count[name='OrderForm[min]']").attr('placeholder', "Quantity | Min");
        document.querySelectorAll("#order_count[name='OrderForm[max]']").attr('placeholder', "Quantity | Max");
        document.getElementById("field-orderform-fields-comment_username").attr('placeholder', "Username of the comment owner");
        document.getElementById("field-orderform-fields-answer_number").attr('placeholder', "Enter Answer number");
        document.getElementById("field-orderform-fields-email").attr('placeholder', "Enter Email");
        document.getElementById("field-orderform-fields-groups").attr('placeholder', "Enter Groups");


        // insert icons for tooltip into Drip-feed label, Runs, Interval input fields
        document.querySelectorAll("#order_check div.form-group__checkbox").insertAdjacentHTML("beforeend", "<img class='tooltip-icon cursor-pointer ms-1' src='https://followizaddons.com/new-design/icons/bx-info-circle-fill.png' data-bs-toggle='tooltip' data-bs-placement='top' title='The Repeat Order feature is used to repeat an order multiple times. You can decide how many times you want the order to be repeated and set the amount of time between each order. Previously called: Drip-Feed'></img>");
        document.getElementById("field-orderform-fields-runs")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".form-group")) result.push(current); current = current.parentElement; } return result; }).call(this).eq(0).insertAdjacentHTML("beforeend", "<img class='tooltip-icon cursor-pointer ms-1' src='https://followizaddons.com/new-design/icons/bx-info-circle.png' data-bs-toggle='tooltip' data-bs-placement='top' title='Repeats is the number of time you want your order to be repeated.'></img>");
        document.getElementById("field-orderform-fields-interval")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".form-group")) result.push(current); current = current.parentElement; } return result; }).call(this).eq(0).insertAdjacentHTML("beforeend", "<img class='tooltip-icon cursor-pointer ms-1' src='https://followizaddons.com/new-design/icons/bx-info-circle.png' data-bs-toggle='tooltip' data-bs-placement='top' title='The interval is the amount of time for each subsequent order to be created. Be sure to insert a significant delay between each order.'></img>");
        document.getElementById("field-orderform-fields-total-quantity")(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".form-group")) result.push(current); current = current.parentElement; } return result; }).call(this).eq(0).insertAdjacentHTML("beforeend", "<img class='tooltip-icon cursor-pointer ms-1' src='https://followizaddons.com/new-design/icons/bx-info-circle.png' data-bs-toggle='tooltip' data-bs-placement='top' title='The Total Quantity represents the cumulative amount you will receive once all orders have been successfully completed.'></img>");
       
        document.getElementById("field-orderform-fields-check").on("click", function() {
            if(this.prop("checked")) {
                if(document.getElementById("field-orderform-fields-total-quantity").val() == 0) {
                    setTimeout(function(){
                        document.getElementById("field-orderform-fields-total-quantity").value = "";
                    }, 50);
                   
                }
            }
        })

        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl)
        })
   
        const categoryOrderURLlocal = 'https://followizaddons.com/client_js/service_order/category.php';       
        const serviceOrderURL = 'https://followizaddons.com/client_js/service_order/index.php';

        loadCategoryOrderLocal(categoryOrderURLlocal);
        loadServiceOrderNew(serviceOrderURL);
        getNewServices();
        getBestSellers();

        // get Main Category using category comes from the Perfect panel => mainCategory
        categories.forEach((item) => {
            if(item.name == 'Favorite services'){
                mainCategory[0] = 'Favorite services';
                firstSocialPlateForm = 'Favorite services';
                subCategory['Favorite services'] = ['Favorite services'];
            } else {
                let ssArr = item.name.split("-");
                let ssName = ssArr[0].trim();

                if(ssName !== firstSocialPlateForm){
                    mainCategory[item.id] = ssName;
                    firstSocialPlateForm = ssName; 
                
                    if(typeof subCategory[ssName] === 'undefined'){
                        subCategory[ssName] = [];
                    }
                }
                subCategory[ssName][item.id] = item.name; 
            }                       
        })

        //sort categories
        let sortedMainCategory = [];
        let sortedCategoryIds = JSON.parse(localStorage.getItem('categoryOrder'));

        if(sortedCategoryIds) {
            sortedCategoryIds.forEach((cat)=>{
                let catId = parseInt(cat.category_id);
                if(typeof mainCategory[catId] != 'undefined') {
                    sortedMainCategory[cat.sort_order] = mainCategory[catId];
                }
            });
        } else {
            sortedMainCategory = mainCategory;
        }      

        let oldMainCat = sortedMainCategory;
        mainCategory = [];

        mainCategory = oldMainCat.filter(onlyUnique);
    
        let firstOption = "New Services";
        let mainCategoryOption = '<option value="New Services">New Services</option>';
        mainCategoryOption += '<option value="Favorite services">Favorite services</option>';

        mainCategory.forEach(element => {
            mainCategoryOption += '<option value="' + element + '" >' + element + '</option> ';
        });

        document.getElementById("orderform-category").addEventListener("change", function() {
            const selected_category_id = this.value;

            if(selected_category_id == -1){
                // Favorite services
            } else {
                let selected_category_name = '';

                for(let index = 0; index < categories.length; index++){
                    if(categories[index].id == selected_category_id){
                        selected_category_name = categories[index].name;
                        break;
                    }
                }
                
                if(selected_category_name){
                    let ssArr = selected_category_name.split("-");
                    const main_cat_name = ssArr[0].trim();
                    document.getElementById("orderform-main-category").val(main_cat_name).dispatchEvent(new Event('change', { bubbles: true }));
                    // document.getElementById("orderform-category_1").val(selected_category_id);
                    setTimeout(function() {
                        document.getElementById("orderform-category_1").val(selected_category_id).dispatchEvent(new Event('change', { bubbles: true }));
                    }, 10);
                }
            }
        })

        document.getElementById("orderform-category_1").addEventListener("change", function() {
            let old_selected_service_id = document.getElementById("orderform-service").val();
            

            var cat_id = document.querySelectorAll('option:selected', this).val();

            // get services by selected category
            let orderform_service = getServiceByCategoryId(cat_id);
            
            let lsubCategoryOption = '';
            
            let newSortedService = [];
            let best_ids = [];
            

            if(cat_id == "Best sellers"){
                let index = 0;
                
                // sort by category(cid) to put separator for the Best Seller category
                let seenCids = new Set();
                let resorted_service = [];

                orderform_service.forEach(item => {
                    if (!seenCids.has(item.cid)) {
                        seenCids.add(item.cid);
                        // add items that have same `cid`
                        resorted_service.push(...orderform_service.filter(el => el.cid === item.cid));
                    }
                });
                
                if(resorted_service.length > 0) {
                    let prev_cid = resorted_service[0].cid;
                    for (const [key, value] of Object.entries(resorted_service)) { 
                        if(prev_cid != value.cid) {
                            // put fake separator row
                            let temp = [];
                            temp['key'] = index;
                            temp['value'] = fake_service_name;
                            temp['type'] = ""
                            newSortedService[index] = temp;
                            index++;
                        }
                        prev_cid = value.cid;

                        let quality = "";
                        let is_fast = is_best = is_recommend = is_real = 0;
    
                        if(value['description']){
                            let s_des = value['description'].split("<br>");
    
                            for(var j in s_des) {
                                let temp_array = s_des[j].split(":");
                    
                                if(temp_array[0].trim() == 'Quality'){
                                    quality = temp_array[1].trim();
                                }
    
                                if(temp_array[0] == 'Tags') {
                                    // check recommended, best seller, fast services
                                    if(temp_array[1].includes("#Fast")){
                                        is_fast = 1;
                                    }
                                    if(temp_array[1].includes("#BestSellers")){
                                        is_best = 1;
                                    }
                                    if(temp_array[1].includes("#Recommended")){
                                        is_recommend = 1;
                                    }
                                    if(temp_array[1].includes("#Real")){
                                        is_real = 1;
                                    }
                                }
                            }
                        }
    
    
                        let temp = [];
                        temp['key'] = resorted_service[key]['id'];
                        temp['value'] = resorted_service[key]['name']; 
    
                        temp['type'] = resorted_service[key]['type'];
                        temp['value'] += "##AVG:" + resorted_service[key]['average_time'];
    
                        if(isLessOneMinute(resorted_service[key]['average_time']) || is_fast){
                            temp['value'] += "##FAST-TAG##";
                        }
                        if(is_best)
                            temp['value'] += "##BEST-SELLER-TAG##";
                        if(is_recommend)
                            temp['value'] += "##RECOMMEND-TAG##";
                        if(quality == "Real" || is_real )
                            temp['value'] += "##REAL-TAG##";
    
                        newSortedService[index] = temp;
                        index++;
                    }
                }
               
            } else {
                var selected_category_name = document.querySelectorAll("#orderform-category_1 option:selected").text();
                // get best seller for selected category id
                for(let index = 0; index < subBestSeller.length; index++){
                    if(subBestSeller[index].category_name == selected_category_name){
                        best_ids = subBestSeller[index].best_ids.split(" ");
                    }
                }

                // and then put rest services
                for (const [key, value] of Object.entries(orderform_service)) { 
                    let is_fast = is_best = is_recommend = is_real = 0;

                    let sort_order_arr = serviceOrderNew.filter((order)=>{  return order.service_id == key; });    

                    if(sort_order_arr[0] !== undefined){    
                        let quality = "";
                        if(value['description']){
                            let s_des = value['description'].split("<br>");
                            for(var j in s_des) {
                                let temp_array = s_des[j].split(":");
                    
                                if(temp_array[0].trim() == 'Quality'){
                                    quality = temp_array[1].trim();
                                }

                                if(temp_array[0] == 'Tags') {
                                    // check recommended, best seller, fast services
                                    if(temp_array[1].includes("#Fast")){
                                        is_fast = 1;
                                    }
                                    if(temp_array[1].includes("#BestSellers")){
                                        is_best = 1;
                                    }
                                    if(temp_array[1].includes("#Recommended")){
                                        is_recommend = 1;
                                    }
                                    if(temp_array[1].includes("#Real")){
                                        is_real = 1;
                                    }
                                }
                            }
                        }

                        let sort_val = sort_order_arr[0];           
                        
                        let temp = [];
                        temp['key'] = key;
                        temp['value'] = orderform_service[key]['name']; 
                        
                        temp['type'] = orderform_service[key]['type'];
                        temp['value'] += "##AVG:" + orderform_service[key]['average_time'];

                        if(isLessOneMinute(orderform_service[key]['average_time']) || is_fast){
                            temp['value'] += "##FAST-TAG##";
                        }
                        if(is_best || best_ids.includes(key))
                            temp['value'] += "##BEST-SELLER-TAG##";
                        if(is_recommend)
                            temp['value'] += "##RECOMMEND-TAG##";
                        if(quality == "Real" || is_real )
                            temp['value'] += "##REAL-TAG##";

                        newSortedService[sort_val.sort_order] = temp;
                    }
                }
            }
        
            let index = 0;      
            newSortedService.forEach((element, key) => {   
                // check best seller
                let option_string = element['value'];
                if(cat_id == "Best sellers" && !option_string.includes("##BEST-SELLER-TAG##") && option_string != fake_service_name){
                    // all items are best seller
                    option_string += "##BEST-SELLER-TAG##";
                }

                lsubCategoryOption += '<option data-type="' + element['type'] + '"  value="' + element['key'] + '" >' + option_string + '</option> ';
                index++;
            });
            lsubCategoryOption += '</optgroup>';
        
            document.getElementById("orderform-service").html(lsubCategoryOption);
            if(g_is_search_service == 1) {
                document.getElementById("orderform-service").val(old_selected_service_id);
                g_is_search_service = 0;
            }
            setTimeout(function(){
                document.getElementById("orderform-service").dispatchEvent(new Event('change', { bubbles: true }));
            }, 50)

            document.getElementById("orderform-category_1").select2("close");
        })

        document.getElementById("orderform-main-category").innerHTML = ''.html(mainCategoryOption);
        createSubCategoryOption(firstOption, 1);
    
        document.getElementById("orderform-main-category").addEventListener("change", function() {
            createSubCategoryOption(this.value, 2);
        })
        
        const params = new URLSearchParams(window.location.search);
        // order again button mode
        if(params.has('service') || localStorage.getItem('service')){
            let selected_service_id;
            if(params.has('service'))
                selected_service_id = params.get('service');
            else 
                selected_service_id = localStorage.getItem('service');
            
            // get service detail
            let service = getServiceDetailsById(selected_service_id);
            if(service != undefined) {

                document.getElementById("orderform-category").val(service.cid).dispatchEvent(new Event("change", { bubbles: true }));
                setTimeout(function() {
                    document.getElementById("orderform-service").val(selected_service_id).dispatchEvent(new Event("change", { bubbles: true }));
                }, 50);
            }
        }

        document.querySelectorAll(".new-order-search input").on("keydown click", function() {
            g_is_search_service = 0;
            setTimeout(function() {
                if(document.getElementById("select-category-container").length > 0) {
                    // add service click listener
                    document.querySelectorAll("#select-category-container li a").unbind( "click" );
                    document.querySelectorAll("#select-category-container li a").forEach(el => el.addEventListener("click", function() {
                        g_is_search_service = 1;
                    })
                }
            }, 10);
        })

        document.querySelectorAll(".neworder-btn").forEach(el => el.addEventListener('click', function() {
            document.querySelectorAll(".neworder-wrapper").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".service-ruler-wrapper").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".custom-tag").forEach(el => el.classList.remove("active"));
            this.classList.add("active");
        })

        document.querySelectorAll(".service-ruler-btn").forEach(el => el.addEventListener('click', function() {
            document.querySelectorAll(".neworder-wrapper").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".service-ruler-wrapper").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".custom-tag").forEach(el => el.classList.remove("active"));
            this.classList.add("active");
        })

        document.querySelectorAll(".btn-favorite").forEach(el => el.addEventListener('click', function() {
            const service_id = document.getElementById("orderform-service").val();

            let is_favorite = this.data("favorite");
            
            if(is_favorite) {
                // display favorite badge in the Description sectin
                document.querySelectorAll("#tags_wrapper .favorite-badge").forEach(el => el.classList.remove("d-none"));
                document.getElementById("add_favorite_btn").classList.add("d-none");
                document.getElementById("remove_favorite_btn").classList.remove("d-none");

                // // select box
                // document.querySelectorAll(".selectbox-tags-badge-wrapper .favorite-badge[data-service_id=" + service_id + "]").forEach(el => el.classList.remove("d-none"));
                

            } else {
                document.querySelectorAll("#tags_wrapper .favorite-badge").forEach(el => el.classList.add("d-none"));
                document.getElementById("remove_favorite_btn").classList.add("d-none");
                document.getElementById("add_favorite_btn").classList.remove("d-none");

                // // select box
                // document.querySelectorAll(".selectbox-tags-badge-wrapper .favorite-badge[data-service_id=" + service_id + "]").forEach(el => el.classList.add("d-none"));
            }

            // Update MyFavorite Array to show/hide the favorite-badge on the selectbox
            if(myFavoriteServices.length > 0) {
                if(is_favorite)
                    myFavoriteServices.push({service_id: service_id});
                else
                    myFavoriteServices = myFavoriteServices.filter(item => item.service_id !== service_id);
            } else {
                myFavoriteServices.push({service_id: service_id});
            }

            $.ajax({
                url: "https://followiz.com/services/switch-favorite-service?active=" + is_favorite + "&service_id=" + service_id,
                async: !0,
                method: "POST",
                data: {
                    _csrf: window.modules.layouts.csrftoken
                },
                success: function success() {
                },
                error: function error() {
                }
            });

            // update favorite table and re-calculate top most favorite services
            const link = 'https://followizaddons.com/vote/updateOneServiceFavorite.php';
            $.ajax({
                url: link,
                type: "POST",
                dataType: "json",
                cache: false,
                data:  { 
                    'service_id': service_id, 
                    'user_id': user_info.id,
                    'category_name': "",
                    'is_favorite': is_favorite
                },
                crossDomain: true,
                success: function(data)         
                {
                    mostFavoriteServices = data.favoriteServices;
                }
            });
        })
    }
    //---------------------------------- / New Order page Ends --------------------------------//


    //---------------------------------- Mass Order page starts --------------------------------// 
    if(document.querySelectorAll('.massorder-page').length > 0) {

        document.querySelectorAll("li.nav-item").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".neworder-menu").forEach(el => el.classList.add("active"));

        document.querySelectorAll(".mass-order-btn").forEach(el => el.addEventListener('click', function() {
            document.querySelectorAll(".massorder-wrapper").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".service-ruler-wrapper").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".custom-tag").forEach(el => el.classList.remove("active"));
            this.classList.add("active");
        })

        document.querySelectorAll(".service-ruler-btn").forEach(el => el.addEventListener('click', function() {
            document.querySelectorAll(".massorder-wrapper").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".service-ruler-wrapper").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".custom-tag").forEach(el => el.classList.remove("active"));
            this.classList.add("active");
        })
    }
    //---------------------------------- / Mass Order page Ends --------------------------------// 


    //---------------------------------- Deposit page starts --------------------------------//
    if(document.querySelectorAll(".deposit-page").length > 0) {
        // FAQ accordion to bs v5.0.2
        document.querySelectorAll(".accordion button").map(function(){
            const target = this.getAttribute("data-target");
            this.setAttribute("data-bs-toggle", "collapse").attr("data-bs-target", target).removeAttribute("data-toggle").removeAttribute("data-target");
        })

        // get user Other detail info from External server
        $.ajax({
            url: api_end_point + "/user/getUserInfo.php?user_id=" + user_info.id,      
            type: "GET",
            success: function(data) {
                data = JSON.parse(data);
                document.getElementById("other_name").val(data.user_info.other_name);
                document.getElementById("other_phone").val(data.user_info.other_phone);
                document.getElementById("other_address").val(data.user_info.other_address);
                document.getElementById("other_city").val(data.user_info.other_city);
                document.getElementById("other_country").val(data.user_info.other_country);
                document.getElementById("other_province").val(data.user_info.other_province);
                document.getElementById("other_postal").val(data.user_info.other_postal);
                document.getElementById("other_detail").html(data.user_info.other_detail);
            }
        });

        // register Payment & generate PDF list to external server
        $.ajax({
            url: api_end_point + "/invoice/register_paymentlist.php", 
            async: false,    
            type: "POST",
            data:  { 
                "paymentList": paymentList,
                "user_id": user_info.id,
                "user_name": user_info.username,
                "first_name": user_info.first_name,
                "last_name": user_info.last_name,
                "email": user_info.email,
            },
            success: function(data) {
            }
        });

        // read PDF path from external server 
        $.ajax({
            url: api_end_point + "/invoice/read_paymentlist.php?user_id=" + user_info.id, 
            type: "GET",
            success: function(data) {
                data = JSON.parse(data);
                invoices = data.data;
            }
        });

        document.querySelectorAll(".payment-item").forEach(el => el.addEventListener("click", function() {
            document.querySelectorAll(".payment-item").forEach(el => el.classList.remove("active"));
            this.classList.add("active");
            const payment_id = parseInt(this.getAttribute("data-payment-id"));
            document.getElementById("method").val(payment_id).change();

            const payment_name = this.getAttribute("data-payment-name");
            document.querySelectorAll(".payment-note-item").forEach(el => el.classList.add("d-none"));

            let estimated_time = "";
            let note = "";
            let min_str = "";
            switch(payment_name) {
                case "Perfect Money USD":
                    document.getElementById("perfect_money_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".perfect_money_note .estimated-time").html();
                    note = document.querySelectorAll(".perfect_money_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".perfect_money_note .minimum").html();
                    break;
                case "Stripe":
                    document.getElementById("stripe_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".stripe_note .estimated-time").html();
                    note = document.querySelectorAll(".stripe_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".stripe_note .minimum").html();
                    break;
                case "PayPal":
                    document.getElementById("paypal_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".paypal_note .estimated-time").html();
                    note = document.querySelectorAll(".paypal_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".paypal_note .minimum").html();
                    break;
                case 'Coinbase':
					document.getElementById("coinbase_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".coinbase_note .estimated-time").html();
                    note = document.querySelectorAll(".coinbase_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".coinbase_note .minimum").html();
                    break;
                case "Coinpayments":
                    document.getElementById("coinpayment_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".coinpayment_note .estimated-time").html();
                    note = document.querySelectorAll(".coinpayment_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".coinpayment_note .minimum").html();
                    break;
                case "Payeer":
                    document.getElementById("payeer_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".payeer_note .estimated-time").html();
                    note = document.querySelectorAll(".payeer_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".payeer_note .minimum").html();
                    break;
                case "PayPal Invoice":
                    document.getElementById("paypal_invoice_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".paypal_invoice_note .estimated-time").html();
                    note = document.querySelectorAll(".paypal_invoice_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".paypal_invoice_note .minimum").html();
                    break;
                case "Skrill":
                    document.getElementById("skrill_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".skrill_note .estimated-time").html();
                    note = document.querySelectorAll(".skrill_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".skrill_note .minimum").html();
                    break;
				case "Cryptomus":
                    document.getElementById("cryptomus_note").classList.remove("d-none");
                    estimated_time = document.querySelectorAll(".cryptomus_note .estimated-time").html();
                    note = document.querySelectorAll(".cryptomus_note .payment-note-detail").html();
                    min_str = document.querySelectorAll(".cryptomus_note .minimum").html();
                    break;
            }

            document.querySelectorAll(".payment-detail .estimated-time").html(estimated_time);
            document.querySelectorAll(".payment-detail .payment-note-detail").html(note);
            document.getElementById("amount").attr("placeholder", "Minimum: " + min_str);
        })

        document.querySelectorAll('.invoice-download-btn').on('click', function () {
            if(invoices.length > 0){
                for(let index = 0; index < invoices.length; index++){
                    if(invoices[index].id == this.getAttribute('data-payment-id')){
                        window.open("https://followizaddons.com" + invoices[index].path);
                        return;
                    }
                }
            }

            var data = {};
            
            data.payment_id = this.getAttribute('data-payment-id');
            data.payment_date = this.getAttribute('data-payment-date');
            data.payment_method = this.getAttribute('data-payment-method');
            data.payment_amount = this.getAttribute('data-payment-amount');
            data.user_id = user_info.id;
            data.user_name = user_info.username;
            data.first_name = user_info.first_name;
            data.last_name = user_info.last_name;
            data.email = user_info.email;     
            data.other_name =   document.getElementById("other_name").val();
            data.other_phone =   document.getElementById("other_phone").val();
            data.other_address =   document.getElementById("other_address").val();
            data.other_city =   document.getElementById("other_city").val();
            data.other_country =   document.getElementById("other_country").val();
            data.other_province =   document.getElementById("other_province").val();
            data.other_postal =   document.getElementById("other_postal").val();
            data.other_detail = document.getElementById("other_detail").html();
            generateInvoice(data);

        } ); 

        
    }

    const invoice_api_url = api_end_point + "/invoice/";

    function generateInvoice(data){
           
        $.ajax({
            url: invoice_api_url+"generateInvoice.php",      
            type: "POST",                  
            data:  data,
            success: function(data)         
            {
                var link=document.createElement('a');
                link.href=invoice_api_url+'get-invoice.php?file_path='+data.file_path;
                link.download="invoice.pdf";
                link.click();
                link.remove();
            }
        });
    }
    //---------------------------------- / Deposit page Ends --------------------------------//


    //---------------------------------- Tickets page starts --------------------------------//
    if(document.querySelectorAll(".tickets-page").length > 0) {
        document.getElementById('createTicket').on('shown.bs.modal', function () {
            this.querySelector('form').dispatchEvent(new Event('reset', { bubbles: true }));
            document.getElementById("main_subject_select").dispatchEvent(new Event("change", { bubbles: true }));
            document.querySelectorAll(".sub-title-select").forEach(el => el.classList.add("d-none"));
            document.getElementById("Orders_subtitle").classList.remove("d-none").dispatchEvent(new Event("change", { bubbles: true }));
        })


        document.getElementById("main_subject_select").on("change", function() {
            document.querySelectorAll(".sub-title-select").forEach(el => el.classList.add("d-none"));

            if(document.querySelectorAll("#" + this.value + "_subtitle").length) {
                document.querySelectorAll("#" + this.value + "_subtitle").forEach(el => el.classList.remove("d-none"));
                document.querySelectorAll("#" + this.value + "_subtitle").dispatchEvent(new Event("change", { bubbles: true }));
            }

            //hide all extra field
            document.getElementById("txtIdInput").setAttribute('style', 'display:none');
            document.getElementById("acNumIdInput").setAttribute('style', 'display:none');
            document.getElementById("opIdInput").setAttribute('style', 'display:none');
            document.getElementById("message_box1").value = '';
            document.getElementById("txtIdInput").value = '';
            document.getElementById("acNumIdInput").value = '';
            document.getElementById("opIdInput").value = '';

            document.getElementById("orderIdInput").setAttribute("style", "display:none");
            switch(this.value) {
                case "Orders":
                    document.getElementById("orderIdInput").setAttribute("style", "display:block");
                    break;
                case "Payments":
                    document.getElementById("txtIdInput").setAttribute('style', 'display:block');
                    break;
                case "Request":
                    break;
            }

        })

        document.querySelectorAll(".sub-title-select").forEach(el => el.addEventListener("change", function() {
            switch(this.value) {
                case "Refill":
                case "Speed Up":
                case "Cancellation":
                    break;
                case "Coinpayments":
                case "Coinbase":
                case "Cryptomus":
                    document.getElementById("txtIdInput").setAttribute('style', 'display:block');
                    document.getElementById("acNumIdInput").setAttribute('style', 'display:none');
                    document.getElementById("opIdInput").setAttribute('style', 'display:none');        
                    break;
                case "Perfect Money":
                    document.getElementById("txtIdInput").setAttribute('style', 'display:none');
                    document.getElementById("acNumIdInput").setAttribute('style', 'display:block');
                    document.getElementById("opIdInput").setAttribute('style', 'display:none');
                    break;
                case "Payeer":
                    document.getElementById("txtIdInput").setAttribute('style', 'display:none');
                    document.getElementById("acNumIdInput").setAttribute('style', 'display:none');
                    document.getElementById("opIdInput").setAttribute('style', 'display:block');
                    break;
                case "Stripe":
                case "Payments Other":
                    document.getElementById("txtIdInput").setAttribute('style', 'display:none');
                    document.getElementById("acNumIdInput").setAttribute('style', 'display:none');
                    document.getElementById("opIdInput").setAttribute('style', 'display:none');
                    break;
                case "Feature":
                    break;
                case "Service":
                    break;
            }
        })

        document.on("click","#submitTicketBtn", function(e){
            e.preventDefault();

            var subject = document.getElementById("main_subject_select").val();
            var request = "";
            if(document.querySelectorAll(".sub-title-select:not(.d-none)").length > 0) {
                request = document.querySelectorAll(".sub-title-select:not(.d-none)").val();
            }
        
            var ticketSubject = '';
            var ticketSubjectForMessage = '';

            
            if(subject == 'Orders') {             
                if(document.getElementById('order_id').val() == '') {
                    document.querySelectorAll('.alert-danger').style.display = "";
                    document.querySelectorAll('.alert-danger > div').innerHTML = '<div>Order ID cannot be blank.</div>';
                    return;
                }
        
                let order_id = document.getElementById("order_id").val();

                ticketSubject = ticketSubjectForMessage = subject + " - " + request;
                if(order_id != '') {
                    ticketSubjectForMessage = ticketSubject + " - " + order_id;
                }
            } else if(subject == 'Payments') {
                ticketSubject = ticketSubjectForMessage = subject + " - " + request;
                
                if(request == 'Coinpayments' || request == 'Coinbase' || request == 'Cryptomus') {
                    if(document.getElementById('txt_id').val() == '') {
                        document.querySelectorAll('.alert-danger').style.display = "";
                        document.querySelectorAll('.alert-danger > div').innerHTML = '<div>Transaction ID cannot be blank.</div>';
                        return;
                    } else {
                        let txt_id = document.getElementById("txt_id").val();
                        if(txt_id != ''){
                            ticketSubjectForMessage = ticketSubject + " - " + txt_id;
                        }
                    }
                } else if(request == 'Perfect Money') {
                    if(document.getElementById('acNum').val() == ''){
                        document.querySelectorAll('.alert-danger').style.display = "";
                        document.querySelectorAll('.alert-danger > div').innerHTML = '<div>Account Number/ Batch Number cannot be blank.</div>';
                        return;
                    } else {
                        let acNum = document.getElementById("acNum").val();
                        if(acNum != ''){
                            ticketSubjectForMessage = ticketSubject + " - " + acNum;
                        }
                    }
                } else if(request == 'Payeer') {
                    if(document.getElementById('op_id').val() == '') {
                        document.querySelectorAll('.alert-danger').style.display = "";
                        document.querySelectorAll('.alert-danger > div').innerHTML = '<div>Operation ID cannot be blank.</div>';
                        return;
                    } else {
                        let op_id = document.getElementById("op_id").val();
                        if(op_id != ''){
                            ticketSubjectForMessage = ticketSubject + " - " + op_id;
                        }
                    }
                }
        
            } else if( subject=='Request') {
                ticketSubject = ticketSubjectForMessage = subject + " - " + request;
            } else {
                ticketSubject = ticketSubjectForMessage = subject;
            }
            
            if(document.getElementById("vip-client").val() == "true"){
                ticketSubject = "VIP: " + ticketSubject;
                ticketSubjectForMessage = "VIP: " + ticketSubjectForMessage;
            }
            
            document.getElementById("ticketSubject").val(ticketSubject);
            document.getElementById("message_box2").html(ticketSubjectForMessage + "\r\n" + document.getElementById("message_box1").val());

            document.getElementById("submitTicketBtn").submit();
        })

        // feath chat container
        if(typeof firstTicketId !== 'undefined'){
            
            let link = homeURL + ticketPageURL + firstTicketId;
            console.log(link, firstTicketId);
            getTicketDetailsFromDetailPage(link, firstTicketId)
            
            document.querySelectorAll(".show-ticket-message").addEventListener("click", function() {
                
                const ticket_id = this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("tr")) result.push(current); current = current.parentElement; } return result; }).call(this).getAttribute("data-ticket_id");
                const link = homeURL + ticketPageURL + ticket_id;
                getTicketDetailsFromDetailPage(link, ticket_id);

                document.querySelectorAll("#ticket_list_body tr").forEach(el => el.classList.remove("active"));
                this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("tr")) result.push(current); current = current.parentElement; } return result; }).call(this).classList.add("active");

                // 
            })
        }
    }
    //---------------------------------- Tickets page ends --------------------------------//


    //---------------------------------- Ticket View page starts --------------------------------//
    if(document.querySelectorAll(".ticket-view-page").length > 0 || document.querySelectorAll(".tickets-page").length > 0) {
        
        let isAgentExit = JSON.parse(localStorage.getItem('agents'));

        if(isAgentExit == null || isAgentExit == 'undefined'){
            getAgents();
        }
    }
    //---------------------------------- Ticket View page Ends --------------------------------//


    //---------------------------------- Services page Starts --------------------------------//
    if(document.querySelectorAll(".services-page").length > 0) {
        updateUsersFavoriteAndReCaculateTopFavorites(serviceCategoryList);
        getBestSellers();
        getNewServices();
        loadUpdatedDecreasedServices("https://followizaddons.com/client_js/updates/updates_service.php");
        const serviceOrderURL = 'https://followizaddons.com/client_js/service_order/index.php';
        loadServiceOrder(serviceOrderURL); 
         

        // search category
        document.on("change", "#sel_category",function() {
            // Retrieve the input field text and reset the count to zero
            var filter = this.value,
                count = 0;
            
            // Loop through the comment list
            document.querySelectorAll('.service-data-panel').forEach(function() {
                if(filter == "all"){
                    this.style.display = "";
                } else{
                    // If the list item does not contain the text phrase fade it out
                    if (this.textContent.search(new RegExp(filter, "i")) < 0) {
                        this.style.display = "none";  // MY CHANGE
                        // Show the list item if the phrase matches and increase the count by 1
                    } else {
                        this.style.display = ""; // MY CHANGE
                        count++;
                    }
                }
            });
        });

        // search key
        document.on("keyup", "#searchService",function() {
            
            // Retrieve the input field text and reset the count to zero
            var filter = this.value,
                count = 0;
            let flag = false;
            
            document.querySelectorAll('.service-data-panel a.list-item').forEach(function() {
                let texts = this.querySelector(".filter--text").html();
                let ids =  this.querySelector(".filter--id").html();
            
                if (texts.search(new RegExp(filter, "i")) < 0 && ids.search(new RegExp(filter, "i")) < 0) {
                    if(!this.classList.contains("collapsed")){
                        this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".service-data-panel")) result.push(current); current = current.parentElement; } return result; }).call(this).find(".panel-collapse").collapse('toggle');
                    }
                    // this.style.display = "none";  // MY CHANGE
                    this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".service-data-panel")) result.push(current); current = current.parentElement; } return result; }).call(this).style.display = "none";  
                    // Show the list item if the phrase matches and increase the count by 1
                } else {
                    // this.style.display = ""; // MY CHANGE
                    this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".service-data-panel")) result.push(current); current = current.parentElement; } return result; }).call(this).style.display = "";

                    if(filter.length == 0 && !this.classList.contains("collapsed")){
                        this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".service-data-panel")) result.push(current); current = current.parentElement; } return result; }).call(this).find(".panel-collapse").collapse('toggle');
                    }
                    if(filter.length != 0 && !flag ){
                        flag = true;
                        if(this.classList.contains("collapsed")){
                            this.click();
                        }
                    }
                } 
            });
        
            // Loop through the comment list
            document.querySelectorAll('.service-data-panel tr.service-info-row').forEach(function() {
                // If the list item does not contain the text phrase fade it out
                if (this.innerHTML.search(new RegExp(filter, "i")) < 0 && !this.classList.contains("best-seller-separator")) {
                    this.style.display = "none";  // MY CHANGE
                    this.next("tr.service-detail-row").style.display = "none"; 
                    this.next("tr.service-detail-row").next("tr.service-tag-row").style.display = "none"; 
                // Show the list item if the phrase matches and increase the count by 1
                } else {
                    this.style.display = ""; // MY CHANGE
                    this.next("tr.service-detail-row").style.display = "";
                    this.next("tr.service-detail-row").next("tr.service-tag-row").style.display = ""; 
                    count++;
                }
            });
        });

        document.querySelectorAll(".service-data-panel .list-item").addEventListener("click", function() {
                        
            let inputed_val = document.getElementById("searchService").val();
            let parent_panel = this.parents('.service-data-panel');
            let service_cat_id = parent_panel.getAttribute('data-cat_key');
            
            let serviceContent = document.querySelectorAll("#service_container_" + service_cat_id).text().trim();
            
            //  searchService
            let sortedService = {};
            let service_of_cat = serviceByCate[service_cat_id];
            
            let last_order_num = 1;
            let temp = [];
            for (const [key, value] of Object.entries(service_of_cat)) {
                if(value['id'].search(new RegExp(inputed_val, "i")) >= 0 || value['name'].search(new RegExp(inputed_val, "i")) >= 0 ){
                    let sort_order_arr = serviceOrder.filter((order)=>{  return order.service_id == key; });                
                    let sort_val = sort_order_arr[0];
                    
                    if(sort_val){
                        sortedService[sort_val.sort_order] = value;
                        last_order_num = sort_val.sort_order;
                    }
                    else
                        temp.push(value);
                }                
            }

            if(temp.length > 0){
                temp.forEach(function(element){
                    last_order_num++;
                    sortedService[last_order_num] = element;
                })
            }

            let category_name = this.parents('.service-data-panel').getAttribute("data-category");

            let mostFavoriteServiceIds = [];
            if(mostFavoriteServices.length > 0) {
                for(let index  = 0; index < mostFavoriteServices.length; index++) {
                    if(mostFavoriteServices[index]['category_name'] == category_name) {
                        if(mostFavoriteServices[index]['top_favorite_count'] > 0) {
                            mostFavoriteServiceIds = mostFavoriteServices[index]['top_favorite_ids'].split(" ");
                            break;
                        }
                    }
                }
            }

            let tbody = getTbodyForService(sortedService, category_name, mostFavoriteServiceIds);
            document.querySelectorAll("#service_container_" + service_cat_id).html(tbody);

            document.querySelectorAll("#service_container_" + service_cat_id + " [data-bs-toggle='tooltip']")new bootstrap.Tooltip(this);

            orderAgainBtn_action();
            
            document.querySelectorAll(".rest-details-modal").forEach(el => el.addEventListener("click", function() {
                document.getElementById("service_detail_id").html(" Id : " + this.getAttribute("service_detail_id"));

                document.getElementById("service_detail_name").html(this.querySelector("span.detail-name").html());
                let avg_time = this.querySelector("span.detail-avg-time").html();
                setDescriptiontoModal(this.querySelector("span.service-detail").html(), avg_time);
                // document.getElementById("service_detail").html(this.querySelector("span.service-detail").html());

                document.getElementById("service_detail_modal").modal('show');
            })

            TRowHoverAction();
            favoriteButtonAction();
        })
    }
    //---------------------------------- Services page Ends --------------------------------//


    //---------------------------------- Affiliates page Starts --------------------------------//
    if(document.querySelectorAll(".affiliates-page").length > 0) {
        document.getElementById("copy_refferal_link_btn").on("click", function(){
            navigator.clipboard.writeText(document.getElementById("refferal_link").html());
        });
    }
    //---------------------------------- Affiliates page Ends --------------------------------//


    //---------------------------------- UPdates page Starts --------------------------------//
    if(document.querySelectorAll(".updates-page").length > 0) {
        document.getElementById("sel_status").on("change", function(){
            if(this.value == 'all') {
                location.href = document.getElementById("this_page_url").val();
                return;
            }

            location.href = document.getElementById("this_page_url").val() + '/' + this.value;
        })
    }
    //---------------------------------- UPdates page Ends --------------------------------//


    //---------------------------------- Order History page, Subscription, Drip-feed, Refill page Starts --------------------------------//
    if(document.querySelectorAll(".refund-page").length > 0) {
        document.getElementById("sel_status").on("change", function(){
            location.href = this.value;
        })
    }

    if(document.querySelectorAll(".orders-page, .subscriptions-page, .drip-feed-page, .refill-page").length > 0) {
        loadMostFavoriteServicesByCategoryWithPromise()
        .then(() => {
            let mostFavoriteServiceIds = [];
            if(mostFavoriteServices.length > 0) {
                for(let index  = 0; index < mostFavoriteServices.length; index++) {
                    if(mostFavoriteServices[index]['top_favorite_count'] > 0) {
                        let ids = mostFavoriteServices[index]['top_favorite_ids'].split(" ");
                        mostFavoriteServiceIds = mostFavoriteServiceIds.concat(ids);
                    }
                }
            }

            if(mostFavoriteServiceIds.length > 0) {
                document.querySelectorAll('.favorite-btn').forEach(function() {
                    var service_id = this.getAttribute('data-service_id');

                    is_most_favorite = 0;
                    for (let index = 0; index < mostFavoriteServiceIds.length; index++) {
                        if (mostFavoriteServiceIds[index] == service_id) {
                            is_most_favorite = 1;
                            break;
                        }
                    }
                
                    if(is_most_favorite) {
                        this.classList.add("most-favorite-star");
                        this.setAttribute('data-bs-original-title', 'Most Favorite');
                        this.tooltip('dispose')new bootstrap.Tooltip(this);
                    }
                });
            }
        });

        loadMyFavoriteServicesWithPromise()
        .then(() => {
            if (myFavoriteServices.length > 0) {
                document.querySelectorAll('.favorite-btn').forEach(function() {
                    var service_id = this.getAttribute('data-service_id');

                    is_favorite = 0;
                    for (let index = 0; index < myFavoriteServices.length; index++) {
                        if (myFavoriteServices[index]['service_id'] == service_id) {
                            is_favorite = 1;
                            break;
                        }
                    }
                
                    if(is_favorite) {
                        this.classList.add("favorite-star");
                        this.setAttribute('data-bs-original-title', 'Remove Favorite');
                        this.tooltip('dispose')new bootstrap.Tooltip(this);
                    }
                });
            }

            // show favorite button
            document.querySelectorAll('.favorite-btn').forEach(el => el.classList.remove("d-none"));
        })
        .catch(error => {
            console.error("AJAX error:", error);
        });

        TRowHoverAction();


        if(document.querySelectorAll(".orders-page").length > 0) {
            // order History page
            orderAgainBtn_action();
        }
        

        document.getElementById("sel_status").on("change", function(){
            if(this.value == 'all') {
                location.href = document.getElementById("this_page_url").val();
                return;
            }

            location.href = document.getElementById("this_page_url").val() + '/' + this.value;
        })

        document.querySelectorAll(".copy-all-btn").on("click", function(e){
            if(this.classList.contains('active')){
                this.classList.remove('active');
                document.querySelectorAll("td .copy-btn").forEach(el => el.classList.remove('active'));
            } else {
                this.classList.add("active");
                document.querySelectorAll("td .copy-btn").forEach(el => el.classList.remove('active'));
                document.querySelectorAll("td .copy-btn").forEach(el => el.classList.add('active'));
            }

            copyIdsToClipboard(e);
        })

        document.querySelectorAll("td .copy-btn").on("click", function(e){
            if(this.classList.contains('active')){
                this.classList.remove('active');
            } else {
                this.classList.add("active");
            }
            copyIdsToClipboard(e);
        })


        document.querySelectorAll(".favorite-btn").forEach(el => el.addEventListener("click", function() {

            const service_id = this.getAttribute("data-service_id");

            let is_favorite = 0;
            if(this.classList.contains("favorite-star")){
                document.querySelectorAll(".favorite-btn[data-service_id=" + service_id + "]").forEach(el => el.classList.remove("favorite-star"));
                document.querySelectorAll(".favorite-btn[data-service_id=" + service_id + "]").setAttribute('data-bs-original-title', 'Favorite');
            } else {
                document.querySelectorAll(".favorite-btn[data-service_id=" + service_id + "]").forEach(el => el.classList.add("favorite-star"));
                document.querySelectorAll(".favorite-btn[data-service_id=" + service_id + "]").setAttribute('data-bs-original-title', 'Remove Favorite');
                is_favorite = 1;
            }

            document.querySelectorAll('.favorite-btn.most-favorite-star:not(.favorite-star)').each(function() {
                this.setAttribute('data-bs-original-title', 'Most Favorite');
                this.tooltip('dispose')new bootstrap.Tooltip(this);
            });

            
            $.ajax({
                url: "https://followiz.com/services/switch-favorite-service?active=" + is_favorite + "&service_id=" + service_id,
                async: !0,
                method: "POST",
                data: {
                    _csrf: window.modules.layouts.csrftoken
                },
                success: function success() {
                },
                error: function error() {
                }
            });

            let category_name = "";
            if(this.getAttribute("data-service-category")) {
                category_name = this.getAttribute("data-service-category");
            }

            // update favorite table and re-calculate top most favorite services
            const link = 'https://followizaddons.com/vote/updateOneServiceFavorite.php';
            $.ajax({
                url: link,
                type: "POST",
                dataType: "json",
                cache: false,
                data:  { 
                    'service_id': service_id, 
                    'user_id': user_info.id,
                    'category_name': category_name,
                    'is_favorite': is_favorite
                },
                crossDomain: true,
                success: function(data)         
                {
                    mostFavoriteServices = data.favoriteServices;
                }
            });
        })

        function copyIdsToClipboard(e){
            let selected_ids = "";
         
            document.querySelectorAll('td .copy-btn.active').forEach(function() {
                selected_ids += this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("tr")) result.push(current); current = current.parentElement; } return result; }).call(this).getAttribute('data-service_id') + ", ";
            });

            if(selected_ids){
                selected_ids = selected_ids.substr(0, selected_ids.length-2);
            }

            navigator.clipboard.writeText(selected_ids);
        }

        orderAgainBtn_action();
    }
    //----------------------------------  Order History page, Subscription, Drip-feed, Refill page Ends --------------------------------//


    //---------------------------------- Account page Starts --------------------------------//
    if(document.querySelectorAll(".account-page").length > 0) { 
        $.ajax({
            url: api_end_point + "/user/getUserInfo.php?user_id=" + user_info.id,      
            type: "GET",
            success: function(data) {
               data = JSON.parse(data);
               
               document.getElementById("other_name").val(data.user_info.other_name);
               document.getElementById("other_phone").val(data.user_info.other_phone);
               document.getElementById("other_address").val(data.user_info.other_address);
               document.getElementById("other_city").val(data.user_info.other_city);
               document.getElementById("other_province").val(data.user_info.other_province);
               document.getElementById("other_postal").val(data.user_info.other_postal);
               document.getElementById("other_country").val(data.user_info.other_country);
               document.getElementById("other_detail").html(data.user_info.other_detail);
            }
        });

        document.getElementById("save_other_details").on("click", function(){
            document.querySelectorAll(".fa-spinner").forEach(el => el.classList.remove("d-none"))
            const data = {
                username: user_info.username,
                first_name: user_info.first_name,
                last_name: user_info.last_name,
                email: user_info.email,
                followiz_id: user_info.id,
                other_name: document.getElementById("other_name").val(),
                other_phone: document.getElementById("other_phone").val(),
                other_address: document.getElementById("other_address").val(),
                other_city: document.getElementById("other_city").val(),
                other_province: document.getElementById("other_province").val(),
                other_postal: document.getElementById("other_postal").val(),
                other_country: document.getElementById("other_country").val(),
                other_detail: document.getElementById("other_detail").val()
            }
            $.ajax({
                url: api_end_point + "/user/insertOrUpdateOneUser.php",      
                type: "POST",                  
                data:  data,
                success: function(data) {
                    document.querySelectorAll(".fa-spinner").forEach(el => el.classList.add("d-none"));
                }
            });
        })

        document.querySelectorAll(".copy-btn").forEach(el => el.addEventListener("click", function() {
            const message = document.querySelectorAll("span").html();
            const messages = message.split("<br>");

            navigator.clipboard.writeText(messages[1]);
        })
    }
    //---------------------------------- Account page Ends --------------------------------//
    

    //---------------------------------- Child Panel page starts --------------------------------//
    if(document.querySelectorAll(".childpanel-page").length > 0){
        document.querySelectorAll(".copy-btn").forEach(el => el.addEventListener("click", function() {
            const copy_data = this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".child-panel-info-wrapper")) result.push(current); current = current.parentElement; } return result; }).call(this).find(".copy-data").html();
            navigator.clipboard.writeText(copy_data);
        })
    }
    //---------------------------------- Child Panel page ends --------------------------------//


    /********************************************* EXTRA FEATURE PAGE START *************************************************/
    if (currentURL.includes("extra-feature")) 
    {

        //code to generate invoice for client
        const limit_page_number = 8;

        // Updated Services to our external DB
        async function featchUpdatedServicesSequentially() {
            for (let index = limit_page_number; index > 0; index--) {
                await featchUpdatedServicesFromBackend(index);
            }            
        }
        async function featchUpdatedServicesFromBackend(pageNumber) {
            return new Promise((resolve) => {
                let _url = 'https://followiz.com/admin/api/updates/list';
                if(pageNumber > 1) {
                    _url += '?page=' + pageNumber;
                }

                $.get(_url, function( response ) {
                    if(typeof response !== 'undefined' && response !== null) {
                        if('success' in response && response.success === true) {
                            let updated_list = response.data.updates;
                            let updatedInfo = []; 

                            updated_list.forEach(function(item) {
                                let data = {
                                    "id": item.id,
                                    "service": item.service,
                                    "service_id": item.service_id,
                                    "date": item.date,
                                    "type": item.type,
                                };
                                updatedInfo.push(data);
                            })
        
                            if(updatedInfo.length > 0) {
                                insertUpdatedServicesToDB(updatedInfo);
                            }
                        }
                    }
                    resolve();
                });
            });
        }

        featchUpdatedServicesSequentially();
        
        
        // Best Seller selection- from csv file
        $.get('https://followizaddons.com/bestseller/bestseller.php', function( response ) {
        }); 

        //code to save user on our server
        // $.get('https://followiz.com/admin/api/users/list', function( response ) {
        //     processUsers(response.data.pagination.pages);
        // });  

        
        // const start_page = 240, end_page = 250;

        async function generateInvoicesSequentially() {
            for (let index = limit_page_number; index > 0; index--) {
                await generateInvoiceFromBackend(index);
            }

            // Done ID = #366442
            // for (let index = end_page; index > start_page; index--) {
            //     await generateInvoiceFromBackend(index);
            // }
        }
        async function generateInvoiceFromBackend(pageNumber) {
            return new Promise((resolve) => {
                // https://followiz.com/admin/api/payments/list?page=1
                let _url = 'https://followiz.com/admin/api/payments/list';
                if(pageNumber > 1) {
                    _url += '?page=' + pageNumber;
                }

                $.get(_url, function( response ) {
                    if(typeof response !== 'undefined' && response !== null) {
                        if('success' in response && response.success === true) {
                            let payment_list = response.data.payments;
                            let paymentInfo = []; 

                            payment_list.forEach(function(item) {
                                let data = {
                                    "payment_id": item.id,
                                    "username": item.user_name,
                                    "payment_method": item.method_name,
                                    "payment_date": item.created,
                                    "payment_amount": item.amount,
                                };
                                paymentInfo.push(data);
                            })
        
                            if(paymentInfo.length > 0) {
                                generateAllInvoice(paymentInfo);
                            }
                        }
                    }
                    resolve();
                });
            });
        }

        generateInvoicesSequentially();
        

        //code to update serive 
        $.get('https://followiz.com/admin/api/services/list', function( response ) {
            setTimeout(function(){
                processCategoryOrder(response.data);
            }, 1500);
            
            setTimeout(function(){
                processServices(response.data);
            }, 3000);
            
            setTimeout(function(){
                processServicesOrder(response.data);
            }, 4500);            
        });          
    }
    /********************************************* EXTRA FEATURE PAGE END *************************************************/

});

function redirectCanadian(userAgentInfo) {
    if(userAgentInfo.country.name == 'Canada'){
        if (currentURL.includes('addfunds')) {
            window.location.href = homeURL;
        }
        // show tooltip when hover Deposit menu
        document.querySelectorAll(".deposit-menu").setAttribute("data-bs-toggle", "tooltip").setAttribute("data-bs-placement", "top").setAttribute("title", "Deposits are blocked for Canadian users.");
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('.deposit-menu'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl)
        })
    }
}

// -------------- Dashboard page functions starts ---------------------//

    // load Updated Services list from the API server
    function loadUpdatesNew(link){
        $.ajax({
            url: link + '?type=main',      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                document.querySelectorAll('.table.update-table tbody').innerHTML = '';
                response.data.forEach(function(data) {
                    var type = "";
                    if (data.update_status == "updates-service-decreased") type = "blue";
                    if (data.update_status == "updates-service-increased") type = "orange";
                    if (data.update_status == "updates-service-enabled" || data.update_status == "updates-service-new") type = "green";
                    if (data.update_status == "updates-service-disabled") type = "danger";

                    var service = data.service.split("-");
                    var id = service[0].trim();

                    var service_name = service.splice(1);
                    service_name = service_name.join('-');
                    
                    var html_row = "<tr class='data-services'>" +
                    "  <td class='text-center'><div class='id-boxi'>" + id + "</div></td>" +
                    "    <td><a href='javascript:;' class='text-decoration-none order-again-btn service-name-field' data-service_id='" + id + "'>" + service_name + "</a></td>" +
                    "    <td>" + data.date + "</td>" +
                    "</tr> ";
                    document.querySelectorAll('#update_all .table.update-table tbody').append("" + html_row); 
                    
                    switch(data.update_status){
                        case 'updates-service-new':
                        case 'updates-service-enabled':
                            document.querySelectorAll('.table.update-table tbody').append("" + html_row); 
                            break;
                        case 'updates-service-decreased':
                            // document.querySelectorAll('#update_decrease .table.update-table tbody').append("" + html_row); 
                            break;
                        case 'updates-service-increased':
                            // document.querySelectorAll('#update_increase .table.update-table tbody').append("" + html_row); 
                            break;
                        
                        case 'updates-service-disabled':
                            // document.querySelectorAll('#update_disable .table.update-table tbody').append("" + html_row); 
                            break;
                    }
                });

                
                // click event trigger
                orderAgainBtn_action();
            }
        });
    }
// -------------- / Dashboard page functions ends ---------------------//


// -------------- New Order page functions starts ---------------------//
    function loadMostFavoriteServicesByCategory() {
        $.ajax({
            // async: false,
            url: 'https://followizaddons.com/vote/readMostFavoriteServicesByCategory.php',      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                mostFavoriteServices = response.favoriteServices;
            }
        });
    }

    function loadMostFavoriteServicesByCategoryWithPromise() {
        return new Promise((resolve, reject) => {
            $.ajax({
                // async: false,
                url: 'https://followizaddons.com/vote/readMostFavoriteServicesByCategory.php',      
                type: "GET",
                dataType: "json",
                cache: false,
                crossDomain: true,
                success: function(response)         
                {
                    mostFavoriteServices = response.favoriteServices;
                    resolve(mostFavoriteServices);
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    }

    function loadMyFavoriteServices() {
        $.ajax({
            url: 'https://followizaddons.com/vote/readMyFavoriteServices.php',      
            type: "POST",
            dataType: "json",
            data: {
                user_id: user_info.id
            },
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                myFavoriteServices = response.data;
            }
        });
    }

    function loadMyFavoriteServicesWithPromise() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'https://followizaddons.com/vote/readMyFavoriteServices.php',
                type: "POST",
                dataType: "json",
                data: {
                    user_id: user_info.id
                },
                cache: false,
                crossDomain: true,
                success: function(response) {
                    myFavoriteServices = response.data;
                    resolve(myFavoriteServices);
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    }

    function loadUpdatedDecreasedServices(link){
        $.ajax({
            url: link + '?type=main',      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                decreased_services = [];
                response.data.forEach(function(data) {  
                    if(data.update_status == 'updates-service-decreased') {
                        decreased_services.push(data);
                    }            
                });
            }
        });
    }

    // New Order page Select category format
    function formatState1(state) {
        if (!state.id) {
            return state.text;
        }
        var baseUrl = serverURL + "followiz-categories-icon";
        
        let imageURL = getImageName(state.element.text.toLowerCase());
        if(imageURL)
            var $state = $('<span><img src="' + baseUrl + '/' + imageURL  + '" class="img-flag" /> ' + state.text + '</span>'
            );
        else 
            var $state = $('<span>' + state.text + '</span>'
            );
        return $state;
    }; 

    // New Order page Select services format
    function formatState2(state) {
        if (!state.id) {
            return state.text;
        }
        var baseUrl = serverURL + "followiz-categories-icon";
        
        let is_best_seller = is_fast = is_recommend = is_real = is_decreased = is_most_favorite = is_favorite = is_new = 0;
        // let is_tags = 0;
        let is_tags = 1;        // favorite badge always put but hide/show, so we will have always tags

        var name = state.text.split("-");
        let service_id = name[0].trim();

        const service_detail = getServiceDetailsById(service_id);
        let category_name = "";
        if(categories && categories.length > 0) {
            // get category name from category ID
            for(let index = 0; index < categories.length; index++) {
                if(categories[index].id == service_detail.cid) {
                    category_name = categories[index].name;
                    break;
                }
            }
        }

        let imageURL = "";
        if(category_name) {
            imageURL = getImageName(category_name.toLowerCase());
        } else {
            imageURL = getImageName(state.element.text.toLowerCase());
        }
        
        // check most favorite service
        if(mostFavoriteServices.length > 0) {
            for(let index = 0; index < mostFavoriteServices.length; index++) {
                if(mostFavoriteServices[index]['top_favorite_count'] > 0) {
                    let ids = mostFavoriteServices[index]['top_favorite_ids'].split(" ");
                    ids.forEach((id) => {
                        if(id == service_id) {
                            is_tags = 1;
                            is_most_favorite = 1;
                        }
                    })
                }
            }
        }

        // check favorite service
        if(myFavoriteServices.length > 0) {
            for(let index = 0; index < myFavoriteServices.length; index++) {
                if(myFavoriteServices[index]['service_id'] == service_id) {
                    is_tags = 1;
                    is_favorite = 1;
                }
            }
        }

        // Check decreased services
        if(decreased_services.length > 0) {
            for(let index  = 0; index < decreased_services.length; index++) {
                const item_id = decreased_services[index].service.split("-")[0].trim();
                if(service_id == item_id) {
                    is_decreased = 1;
                    is_tags = 1;
                    break;
                }
            }
        }

        // check New services
        if(newServices.length > 0) {
            for(let i = 0; i < newServices.length; i++){
                let service = newServices[i].service.split("-");
                var id = service[0].trim();

                if (service_id == id) {
                    is_new = 1;
                    is_tags = 1;
                    break;
                }
            }
        }

        var id_space = name[0] + "- ";
        var rest = name.splice(1);
        var rest_str = "";
        if(rest.length > 1)
            rest_str = rest.join('-');
        else if(rest.length == 1)
            rest_str = rest[0];

        var option_str = '';
        option_str = '<span>';
            if(imageURL)
                option_str += '<img src="' + baseUrl + '/' + imageURL  + '" class="img-flag" />';
            option_str += '<span class="id-space">' + id_space + '</span>';

        // check Best Seller
        if(rest_str.includes("##BEST-SELLER-TAG##")) {
            is_best_seller = 1;
            is_tags = 1;
            rest_str = rest_str.replace("##BEST-SELLER-TAG##", '');
        }

        // Check Fast service
        if(rest_str.includes("##FAST-TAG##")) {
            is_fast = 1;
            is_tags = 1;
            rest_str = rest_str.replace("##FAST-TAG##", '');
        }

        // Check Recommend
        if(rest_str.includes("##RECOMMEND-TAG##")) {
            is_recommend = 1;
            is_tags = 1;
            rest_str = rest_str.replace("##RECOMMEND-TAG##", '');
        }

        // Check real tag
        if(rest_str.includes("##REAL-TAG##")) {
            is_real = 1;
            is_tags = 1;
            rest_str = rest_str.replace("##REAL-TAG##", '');
        }
          
        // AVG TIME
        let str_arr = rest_str.split("##AVG:");
        let avg_time = null;
        
        if(rest_str[1]) {
            is_tags = 1;
            avg_time = str_arr[1];
            rest_str = str_arr[0];
        }

        option_str += rest_str;

        if(is_tags){
            option_str += '<br>';
            option_str += '<span class="selectbox-tags-badge-wrapper">';
                if(avg_time){
                    option_str += '<span class="badge tag-badge rounded-pill bg-label-transparent">' + avg_time + '</span>';
                }
                
                option_str += '<span class="tags-badge-wrapper">';
                    if(is_recommend) {
                        //  Recommend 
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-like mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-check me-1"></i>';
                        option_str += 'Recommended</span>';
                    }

                    if(is_best_seller) {
                        //  Best Seller 
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-warning mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-certificate me-1"></i>';
                        option_str += 'Best Sellers</span>';
                    }

                    if(is_real) {
                        //  Real 
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-info mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-user me-1"></i>';
                        option_str += 'Real</span>';
                    }

                    if(is_fast) {
                        //  Fast
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-secondary mt-2 me-1">';
                        option_str += '<i class="fa-regular fa-clock me-1"></i>';
                        option_str += 'Fast</span>';
                    }

                    if(is_new) {
                        //  New
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-new mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-plus me-1"></i>';
                        option_str += 'New Service</span>';
                    }

                    if(is_decreased) {
                        // Price Reduced
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-like mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-tag me-1"></i>';
                        option_str += 'Price Reduced</span>';
                    }

                    if(is_most_favorite) {
                        option_str += '<span class="badge tag-badge rounded-pill bg-label-primary mt-2 me-1">';
                        option_str += '<i class="fa-solid fa-star me-1"></i>';
                        option_str += 'Most Favorite</span>';
                    }

                    // Add Favorite badge always but show/hide according to the is_favorite value 
                    option_str += '<span class="badge tag-badge rounded-pill bg-label-yellow mt-2 favorite-badge'
                    if(!is_favorite) 
                        option_str += ' d-none';
                    option_str += '" data-service_id="' + service_id + '"><i class="fa-solid fa-star me-1"></i>';
                    option_str += 'Favorite</span>';
                    

                option_str += '</span>';
            option_str += '</span>'; 
        }
        option_str += '</span>';

        var $state = option_str;
        return $state;
    };

    // get Social Image from the service name
    function getImageName(serviceName){
        if(serviceName.includes(fake_service_name)) {
            return "";
        }

        let type = "";
        if(document.getElementById("orderform-main-category").length > 0){
            type = document.getElementById("orderform-main-category").val();
        }

        if(serviceName.includes("traffic") && type == "Website Traffic"){
            if(serviceName.includes('best sellers')){
                return "bestseller.svg";
            }
            return "website.svg"
        }

        if(serviceName.includes("favorite")){
            return "favorite.svg"
        }
        if(serviceName.includes("kick")){
            return "kick.svg"
        }

        if(serviceName.includes("traffic")){
            return "website.svg"
        }

        if(serviceName.includes("instagram")){
            return "instagram-color.svg"
        }

        if(serviceName.includes("youtube")){
            return "youtube-color.svg"
        }
        
        if(serviceName.includes("facebook")){
            return "facebook-color.svg"
        }

        if(serviceName.includes("twitter")){
            return "twitter-color.svg"
        }

        if(serviceName.includes("coub")){
            return "coub-color.svg"
        }

        if(serviceName.includes("datpiff")){
            return "datpiff.svg"
        }

        if(serviceName.includes("imdb")){
            return "imdb-color.svg"
        }

        if(serviceName.includes("likee")){
            return "likee-color.svg"
        }

        if(serviceName.includes("linkedin")){
            return "linkedin-color.svg"
        }

        if(serviceName.includes("mixcloud")){
            return "mixcloud-color.svg"
        }

        if(serviceName.includes("ok.ru")){
            return "ok.ru-color.svg"
        }

        if(serviceName.includes("periscope")){
            return "periscope-color.svg"
        }

        if(serviceName.includes("pinterest")){
            return "pinterest-color.svg"
        }

        if(serviceName.includes("quora")){
            return "quora-color.svg"
        }

        if(serviceName.includes("reddit")){
            return "reddit-color.svg"
        }

        if(serviceName.includes("shazam")){
            return "shazam-color.svg"
        }

        if(serviceName.includes("snapchat")){
            return "snapchat-color.svg"
        }

        if(serviceName.includes("soundcloud")){
            return "soundcloud-color.svg"
        }

        if(serviceName.includes("spotify")){
            return "spotify-color.svg"
        }

        if(serviceName.includes("telegram")){
            return "telegram-color.svg"
        }

        if(serviceName.includes("tiktok")){
            return "tiktok-color.svg"
        }

        if(serviceName.includes("tumblr")){
            return "tumblr-color.svg"
        }

        if(serviceName.includes("twitch")){
            return "twitch-color.svg"
        }

        if(serviceName.includes("reverbnation")){
            return "reverbnation-color.svg"
        }

        if(serviceName.includes("vimeo")){
            return "vimeo-color.svg"
        }

        if(serviceName.includes("vk.com")){
            return "vk.com-color.svg"
        }

        if(serviceName.includes("yandex")){
            return "yandex-color.svg"
        }

        if(serviceName.includes("seo")){
            return "seo-color.svg"
        }

        if(serviceName.includes("guest")){
            return "guest-color.svg"
        }

        if(serviceName.includes("press")){
            return "press-color.svg"
        }

        if(serviceName.includes("android")){
            return "android-color.svg"
        }

        if(serviceName.includes("ios")){
            return "ios-color.svg"
        }
        if(serviceName.includes("audiomack")){
            return "audiomack-color.svg"
        }
        if(serviceName.includes("clubhouse")){
            return "clubhouse-color.svg"
        }
        if(serviceName.includes("discord")){
            return "discord-color.svg"
        }

        if(serviceName.includes("marketing")){
            return "marketing-color.svg"
        }

        if(serviceName.includes("new")){
            return "new-color.svg"
        }

        if(serviceName.includes("apple")){
            return "apple-color.svg"
        }

        if(serviceName.includes("behance")){
            return "behance-color.svg"
        }

        if(serviceName.includes("dailymotion")){
            return "dailymotion-color.svg"
        }

        if(serviceName.includes("deezer")){
            return "deezer-color.svg"
        }

        if(serviceName.includes("dribble")){
            return "dribble-color.svg";
        }

        if(serviceName.includes("fansly")){
            return "fansly-color.svg";
        }


        if(serviceName.includes("google")){
            return "google-color.svg";
        }

        if(serviceName.includes("kwai")){
            return "kwai-color.svg";
        }

        if(serviceName.includes("nft")){
            return "nft.svg";
        }

        if(serviceName.includes("onlyfans")){
            return "onlyfans-color.svg";
        }

        if(serviceName.includes("podcast")){
            return "podcast-color.svg";
        }

        if(serviceName.includes("sitejabber")){
            return "sitejabber.svg";
        }

        if(serviceName.includes("tidal")){
            return "tidal-color.svg";
        }

        if(serviceName.includes("trust")){
            return "trust.svg";
        }

        if(serviceName.includes("steam")){
            return "steam-color.svg";
        }

        if(serviceName.includes("yellow")){
            return "yellow-color.svg";
        }

        if(serviceName.includes("random")){
            return "random-color.svg";
        }

        if(serviceName.includes("your favorite")){
            return "favorite.svg";
        }

        if(serviceName.includes("new services")){
            return "marketing-color.svg";
        }

        if(serviceName.includes('best sellers')){
            return "bestseller.svg";
        }

        if(serviceName.includes('rumble')){
            return "rumble-color.svg";
        }

        if(serviceName.includes('crypto coin')){
            return "crypto-coin-color.svg";
        }

        if(serviceName.includes('threads')){
            return "threads.svg";
        }

        if(serviceName.includes('whatsapp')){
            return "whatsapp.svg";
        }

        if(serviceName.includes('trovo')){
            return "trovo.svg";
        }

        if(serviceName.includes('snackvideo')){
            return "snackvideo.svg";
        }
        return "marketing.svg";
    }

    function hideSelect2Keyboard(e){
        document.querySelectorAll('.select2-search input').prop('focus', false).blur();
    }

    function updateMinMax(){
        var selected_val =  document.getElementById("orderform-service").val();
        if(!selected_val){
            selected_val = document.getElementById("orderform-service").prop("selectedIndex", 0).val();
        }
    
        var serviceDetails = getServiceDetailsById(selected_val);
        
        setTimeout(function(){
            let serviceDetailsMax = (parseInt(serviceDetails.max)).toLocaleString();
            let serviceDetailsmin = (parseInt(serviceDetails.min)).toLocaleString();
    
            document.querySelectorAll(".minMax-split").html(serviceDetailsmin + " / " + serviceDetailsMax);
            document.getElementById('field-orderform-fields-quantity').attr('placeholder', "Select Quantity | Min: " + serviceDetailsmin + " - Max: " + serviceDetailsMax); 
            document.querySelectorAll("#order_count[name='OrderForm[min]']").attr('placeholder', "Quantity | Min: " + serviceDetailsmin); 
            document.querySelectorAll("#order_count[name='OrderForm[max]']").attr('placeholder', "Quantity | Max: " + serviceDetailsMax); 
            document.querySelectorAll(".price-split").html(serviceDetails.price);

            // AVG Time set
            document.querySelectorAll(".avg_txt").html(serviceDetails.average_time);
        }, 100);
    }


    function getServiceDetailsById(service_id){
   
        var service_details = {};
        if(typeof window.modules.siteOrder !== 'undefined'){
            var services = window.modules.siteOrder.services;
            
            for (let list_service_id of Object.keys(services)) {
         
                if(list_service_id == service_id){
                    service_details = services[list_service_id];
                }
            }
        }
        
        return service_details;
    }; 

    function getServiceByCategoryId(catId) {

        var service_details = [];
        var services = window.modules.siteOrder.services;

        if(catId == "Favorite services"){
            for (let list_service_id of Object.keys(services)) {
                if (services[list_service_id]['favorite'] == true) {
                    service_details[services[list_service_id]['id']] = services[list_service_id];
                }
            }
        } 
        else if(catId == "New Services" && newServices.length > 0){
            for (let list_service_id of Object.keys(services)) {
                for(let i = 0; i < newServices.length; i++){
                    let service = newServices[i].service.split("-");
                    var id = service[0].trim();

                    if (services[list_service_id]['id'] == id) {
                        service_details[services[list_service_id]['id']] = services[list_service_id];
                    }
                }
            }
        } else if(catId == "Best sellers" && mainBestSeller.length > 0){
            let main_category = document.getElementById("orderform-main-category").val();
            for(let i = 0; i < mainBestSeller.length; i++){
                if(mainBestSeller[i].category_name == main_category){
                    let best_ids = mainBestSeller[i].best_ids.split(" ");
                    let ii = 0;
                    for(index = 0; index < best_ids.length; index++){
                        
                        for (let list_service_id of Object.keys(services)) {
                            if(best_ids[index] == services[list_service_id]['id']){
                                service_details[ii] = services[list_service_id];
                                ii++;
                            }
                        }
                    }
                }
            }
        } else {
            for (let list_service_id of Object.keys(services)) {

                if (services[list_service_id]['cid'] == catId) {
                    service_details[services[list_service_id]['id']] = services[list_service_id];
                }
            }
        }
        
        return service_details;
    };

    function UpdateDescription(selected_service_name){

        let is_most_favorite = is_favorite = is_decreased = is_best_seller = is_fast = is_recommend = is_real = is_new = 0;

        let tags_html = "";
        // get ID from service name
        let service_names = selected_service_name.split("-");
        if(service_names.length > 1 && parseInt(service_names[0].trim()) > 0) {
            const service_id = parseInt(service_names[0].trim());
            // check most favorite service
            if(mostFavoriteServices.length > 0) {
                for(let index = 0; index < mostFavoriteServices.length; index++) {
                    if(mostFavoriteServices[index]['top_favorite_count'] > 0) {
                        let ids = mostFavoriteServices[index]['top_favorite_ids'].split(" ");
                        ids.forEach((id) => {
                            if(id == service_id) {
                                is_most_favorite = 1;
                            }
                        })
                    }
                }
            }

            // check favorite service
            if(myFavoriteServices.length > 0) {
                for(let index = 0; index < myFavoriteServices.length; index++) {
                    if(myFavoriteServices[index]['service_id'] == service_id) {
                        is_favorite = 1;
                    }
                }
            }

            if(decreased_services.length > 0){
                for(let index  = 0; index < decreased_services.length; index++) {
                    const item_id = decreased_services[index].service.split("-")[0].trim();
                    if(service_id == item_id) {
                        is_decreased = 1;
                        break;
                    }
                }
            }

            if(newServices.length > 0) {
                // check New services
                for(let i = 0; i < newServices.length; i++){
                    let service = newServices[i].service.split("-");
                    var id = service[0].trim();
    
                    if (service_id == id) {
                        is_new = 1;
                        break;
                    }
                }
            }
        }

        if(selected_service_name.includes("##BEST-SELLER-TAG##")) {
            is_best_seller = 1;
        }

        if(selected_service_name.includes("##FAST-TAG##")) {
            is_fast = 1;
        }

        if(selected_service_name.includes("##RECOMMEND-TAG##")) {
            is_recommend = 1;
        }

        if(selected_service_name.includes("##REAL-TAG##")) {
            is_real = 1;
        }

        tags_html += '<span class="tags-badge-wrapper">';

            if(is_most_favorite + is_decreased + is_best_seller + is_fast + is_recommend + is_real + is_new > 0) {      
                if(is_recommend) {
                    //  Recommend 
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-like mt-2 me-1">';
                    tags_html += '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 14 10" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.37819 9.99977C4.09175 9.99977 3.82648 9.84923 3.67919 9.60267C2.93219 8.34953 1.97117 7.22251 0.824622 6.25335C0.481227 5.96285 0.438913 5.44939 0.728602 5.10599C1.0191 4.76178 1.53175 4.71947 1.87515 5.00997C2.80606 5.79685 3.62874 6.67812 4.33018 7.63995C5.66223 5.486 8.28082 2.07079 12.3877 0.0812145C12.7921 -0.113267 13.2788 0.0535475 13.4749 0.458786C13.6702 0.863211 13.5017 1.34982 13.0973 1.54593C8.55993 3.7438 5.99017 7.88814 5.09671 9.5685C4.95838 9.82726 4.69147 9.99245 4.39772 9.99977H4.37819Z"/></svg>';
                    tags_html += 'Recommended</span>';
                }
                if(is_best_seller) {
                    //  Best Seller 
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-warning mt-2 me-1">';
                    tags_html += '<i class="fa-solid fa-certificate me-1"></i>';
                    tags_html += 'Best Sellers</span>';
                }
                if(is_real) {
                    //  Real 
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-info mt-2 me-1">';
                    tags_html += '<i class="fa-solid fa-user me-1"></i>';
                    tags_html += 'Real</span>';
                }
                if(is_fast) {
                    //  Fast
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-secondary mt-2 me-1">';
                    tags_html += '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5562 6C10.5562 8.76162 8.3178 11 5.55618 11C2.79456 11 0.556183 8.76162 0.556183 6C0.556183 3.23838 2.79456 1 5.55618 1C8.3178 1 10.5562 3.23838 10.5562 6Z" stroke="#CCE5FF" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.41122 7.58958L5.37338 6.37391V3.75391" stroke="#CCE5FF" stroke-linecap="round" stroke-linejoin="round" /></svg>';
                    tags_html += 'Fast</span>';
                }

                if(is_new) {
                    // New Service
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-new mt-2 me-1">';
                    tags_html += '<i class="fa-solid fa-plus me-1"></i>';
                    tags_html += 'New Service</span>';
                } 

                if(is_decreased) {
                    // Price Reduced
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-like mt-2 me-1">';
                    tags_html += '<i class="fa-solid fa-tag me-1"></i>';
                    tags_html += 'Price Reduced</span>';
                }

                if(is_most_favorite) {
                    tags_html += '<span class="badge tag-badge rounded-pill bg-label-primary mt-2 me-1">';
                    tags_html += '<i class="fa-solid fa-star me-1"></i>';
                    tags_html += 'Most Favorite</span>';
                }
            }

            // Favorite
            tags_html += '<span class="badge tag-badge rounded-pill bg-label-yellow favorite-badge mt-2';
            if(!is_favorite) {
                tags_html += ' d-none';
                // display Add favorite button
                document.getElementById("add_favorite_btn").classList.remove("d-none");
                document.getElementById("remove_favorite_btn").classList.add("d-none");
            } else {
                document.getElementById("add_favorite_btn").classList.add("d-none");
                document.getElementById("remove_favorite_btn").classList.remove("d-none");
            }
            tags_html += '"><i class="fa-solid fa-star me-1"></i>';
            tags_html += 'Favorite</span>';

        tags_html += '</span>';

        document.getElementById("tags_wrapper").classList.remove("d-none");


        document.getElementById("tags_wrapper").html(tags_html)
    
        lines = document.querySelectorAll(".service-description-split").html().split("<br>");
        
        document.querySelectorAll(".service-description-split").innerHTML = '';
        document.querySelectorAll(".service-description-split").html('<div>' + lines.join("</div><div>") + '</div>');
    
        var i = 1;
        let selector = ".service-description-split div";
        if (document.querySelectorAll('.service-description-split div div').length > 0) {
            selector = '.service-description-split div div';
        } 

        selector.each(function(){
            if(i < 6) {
                this.addClass('split-class' + i);
                i++;
            } else {
                this.classList.add('split-class-extra');
            }
        });
        
        
        var extraData = '';
        var info = '';
    
        var infoArr = {};
        var infoStr = '';
        
        //CODE TO GET DETAILS DATA
    
        var detailsData = '';
        var profileData = '';
        var QualityExamplesData = '';
        var datakey = 'Details';
    
        document.querySelectorAll('.split-class-extra').forEach(function() {
            info = this.textContent;
            detailsData += info + "<br>";    
        })
        document.querySelectorAll(".details-split").html(detailsData);

        var splt1 = document.querySelectorAll(".split-class1").text();
        if(!isNotEmpty(splt1)){
            return;
        }
        
        var str1 = splt1.split(":");
        if(str1[1]) {
            str1[1] = str1[1].replace("Start Time", "");
        }
            
        document.querySelectorAll(".quality-split").html(str1[1]);
    
        var splt2 = document.querySelectorAll(".split-class2").text();
        var str2 = splt2.split(":");
        if(str2[1])
            str2[1] = str2[1].replace("Start Time", "");
        document.querySelectorAll(".time-split").html(str2[1]);
    
        var splt3 = document.querySelectorAll(".split-class3").text();
        var str3 = splt3.split(":");
        if(str3[1])
            str3[1] = str3[1].replace("Speed per Day", "");
        document.querySelectorAll(".speed-split").html(str3[1]);
    
        var splt4 = document.querySelectorAll(".split-class4").text();  
        var str4 = splt4.split(":");
        if(str4[0]=='Min/Max') {
            str4[1] = str4[1].replace("Min/Max", "");
            document.querySelectorAll(".minMax-split").html(str4[1]);
    
            var splt5 = document.querySelectorAll(".split-class5").text();
            var str5 = splt5.split(":");
            
            if(str5[0]=='Refill Available'){
                document.querySelectorAll(".refill-split").html(str5[1]);
    
                var splt6 = document.querySelectorAll(".split-class6").text();
                var str6 = splt6.split(":");
                
                str6[1] = str6[1].replace("Price per 1000", "");
                document.querySelectorAll(".price-split").html(str6[1]);
        
            }else if(str5[0]=='Price per 1000') {
                document.querySelectorAll(".price-split").html(str5[1]);
            }
    
        } else if(str4[0]=='Refill Available') {
    
            str4[1] = str4[1].replace("Refill Available", "");
            document.querySelectorAll(".refill-split").html(str4[1]);
        
            var splt5 = document.querySelectorAll(".split-class5").text();
            var str5 = splt5.split(":");
            str5[1] = str5[1].replace("Price per 1000", "");
            document.querySelectorAll(".price-split").html(str5[1]);
        }  
    }

    function updateServiceTitle(){
        var valService = document.getElementById("orderform-service").find("option:selected").text();
    
        var valService_arr = valService.split("##AVG:");
        valService = valService_arr[0];
        document.getElementById("seviceTitle").text(valService);

        if (document.getElementById("seviceTitle").is(':contains("⛔")')) {
            document.getElementById('cancel_text').innerHTML = '<sapn>Yes</span>';
        } else {
            document.getElementById('cancel_text').innerHTML = '<sapn>No</span>';
        }
        
        if (document.getElementById("seviceTitle").is(':contains("♻")')) {
            document.getElementById('refill_text').innerHTML = '<sapn>Yes</span>';
        } else {
            document.getElementById('refill_text').innerHTML = '<sapn>No</span>';
        }

        //Refill Available - Depending on the service name
        var refillregex = new RegExp('[r[0-9]+\]');
        var refillregexlifetime = new RegExp('[r∞\]');
        
        if (refillregex.test(document.getElementById("seviceTitle").text()) || refillregexlifetime.test(document.getElementById("seviceTitle").text()) ) {
            var cur_text = document.getElementById('Refill-Available-txt').html();
            document.getElementById('Refill-Available-txt').html('<span>' + cur_text + '</span>');
        }else{
            var cur_text = document.getElementById('Refill-Available-txt').html();
            document.getElementById('Refill-Available-txt').innerHTML = '<sapn>None</span>';
        }
        
        if (document.querySelectorAll(".refill-split").is(':contains("None")')){
            document.querySelectorAll(".refill-split").forEach(el => el.style.color = "#e22424");
        }else{
            document.querySelectorAll(".refill-split").forEach(el => el.style.color = "#3ecf8e");
        }
        
        if(document.querySelectorAll(".details-split").text()==""){
            document.querySelectorAll('.details-split').closest('.card').style.display = "none";
        }
        else{
            document.querySelectorAll('.details-split').closest('.card').style.display = "";
        }
        
        document.querySelectorAll('#fields .col-xs-6').forEach(el => el.classList.remove('col-xs-6')).classList.add('col');
        document.querySelectorAll('#fields .fa-trash-o').forEach(el => el.classList.remove('fa-trash-o')).classList.add('fa-trash');
    }

    function createSubCategoryOption(mainCatOption, onload){
        let subCategoryOption = '';
         
        if(mainCatOption == "Favorite services"){
            subCategoryOption = '<option value="Favorite services" selected="true">Favorite services</option>';
        }else if(mainCatOption == "New Services"){
            subCategoryOption = '<option value="New Services" selected="true">New Services</option>';
        } else {
            
            let fO = ''; 

            // Order Again Mode
            if(localStorage.getItem('category')){
                fO = localStorage.getItem('category');
            }
            
            if(fO == "Best sellers" || fO == '')
                subCategoryOption = '<option value="Best sellers" selected="true">Best sellers</option>';
            else
                subCategoryOption = '<option value="Best sellers" >Best sellers</option>';
            
            let categoryOrder = '';
        
            if(localStorage.getItem('categoryOrder')){
                categoryOrder = localStorage.getItem('categoryOrder');
                categoryOrder = JSON.parse(categoryOrder);
            }
            
            let rowSubcategory = subCategory[mainCatOption];
            let sortedService = [];

            rowSubcategory.forEach((value, key)=>{
                let sort_order_arr = categoryOrder.filter((order)=>{  return order.category_id == key; });          
            
                if(sort_order_arr.length){
                
                    let sort_val = sort_order_arr[0];
                        
                    let sort_index = (sort_val.sort_order).toString();
                    let temp = {};
                
                    temp.value = value;
                    temp.category_id = sort_order_arr[0].category_id;
                    sortedService[sort_index] = temp;
                }
            });

            sortedService.forEach((element,key) => {    
                if ( fO == element["category_id"]){
                    subCategoryOption += '<option cat_id="' + key + '" value="' + element["category_id"] + '" selected="true">' + element['value'] + '</option> ';
                } else {
                    subCategoryOption += '<option cat_id="' + key + '" value="' + element["category_id"] + '" >' + element['value'] + '</option> ';
                }
            });
        }

        document.getElementById("orderform-category_1").html(subCategoryOption).dispatchEvent(new Event('change', { bubbles: true }));
    }

    function loadCategoryOrderLocal(link) {
        return $.ajax({
            async: false,
            url: link,      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                localStorage.setItem('categoryOrder', JSON.stringify(response.data));
            }
        });
    }
  
    function loadServiceOrderNew(link) {
        return $.ajax({
            async: false,
            url: link,      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                serviceOrderNew = response.data;
            }
        });
    } 

    function getNewServices(){
        return $.ajax({
            async: false,
            url: "https://followizaddons.com/client_js/updates/new_services.php",      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                newServices = response.data;
            }
        });
    }

    function getBestSellers(){
        return $.ajax({
            async: false,
            url: "https://followizaddons.com/bestseller/read_bestseller.php",      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                mainBestSeller = response.data.main;
                subBestSeller = response.data.sub;
            }
        });
    }

    function isNotEmpty(val){
        return (val === undefined || val == null || val.length <= 0) ? false : true;
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    // str_time format:  "1 minute", "9 minutes", "1 hour 6 minutes", "54 hours 34 minutes", "Not enough data"   
    function isLessOneMinute(str_time){
        if(str_time.includes("hour") || str_time == "Not enough data"){
            return false;
        }
        return true;
    }

    function resizeSelect2Dropdown() {
        const containers = document.querySelectorAll(".select2-container");
        containers.forEach(function(container) {
            const parent = container.closest("div.form-group");
            if (parent) {
                const width = window.getComputedStyle(parent).width;
                container.style.width = width;
            }
        });
    };
// -------------- New Order page functions ends ---------------------//


// --------------- API page starts ---------------------------//

function CopyToClipboard(containerid) {
    
    if (document.selection) { 
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select().createTextRange();
        document.execCommand("copy"); 
    } else if (window.getSelection) {
    
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        //window.getSelection().addRange(range);
        
        let selection = window.getSelection();
        if (selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
        selection.addRange(range);
    
        document.execCommand("copy")
    }
}

function thousands_separators(num) {
    var num_parts = num.toString().split(".");
    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return num_parts.join(".");
}

// --------------- API page ends ---------------------------//


function orderAgainBtn_action(){
    document.querySelectorAll(".order-again-btn").forEach(function(btn) {
        btn.addEventListener('click', function(e){
            let service_id = this.getAttribute("data-service_id");
            location.href = homeURL + '/?page=neworder&service=' + service_id;
        });
    })
}


// ------------------------ Service page starts ----------------------------//

    function loadServiceOrder(link) {
        $.ajax({
            async: false,
            url: link,      
            type: "GET",
            dataType: "json",
            cache: false,
            crossDomain: true,
            success: function(response)         
            {
                serviceOrder = response.data;
                loadServicesAuto(serviceOrder);
            }
        });
    }

    function loadServicesAuto(serviceOrder){
        document.querySelectorAll(".filter--text").remove();
        document.querySelectorAll(".filter--id").remove();
        document.querySelectorAll(".service-data-panel").forEach(function() {
            let service_cat_id = this.getAttribute('data-cat_key');
            let serviceContent = document.querySelectorAll("#service_container_"+service_cat_id).text().trim();
            let sortedService = {};
            let service_of_cat = serviceByCate[service_cat_id];
            let filter_text = "";
            let filter_id = "";
            for (const [key, value] of Object.entries(service_of_cat)) { 
                filter_text += value['name'] + " ";
                filter_id += value['id'] + " ";
            }

            this.querySelector(".collapsed").append("<div class='filter--text' style='display:none'>" + filter_text + "</div>");
            this.querySelector(".collapsed").append("<div class='filter--id' style='display:none'>" + filter_id + "</div>");
            
        });
        
    }    

    function getTbodyForService(serviceDetails, category_name, mostFavoriteServiceIds){
        let best_sellers = [];
        if(subBestSeller.length > 0){
            for(let item of subBestSeller){
                if(category_name == item['category_name']){
                    best_sellers = item['best_ids'].split(" ");
                    break;
                }
            }
        }
        
        let tbody = '';
        for(var k in serviceDetails) {
            if(best_sellers.length > 0) {
                let best_seller_flag = 0;
                for(let i = 0; i < best_sellers.length; i++){
                    if(serviceDetails[k]['id'] == best_sellers[i]){
                        best_seller_flag = 1;
                        tbody += getTRow(serviceDetails[k], category_name, 1, mostFavoriteServiceIds);
                        break;
                    }
                }
                if(best_seller_flag == 0) {
                    tbody += getTRow(serviceDetails[k], category_name, 0, mostFavoriteServiceIds);
                }
            } else {
                tbody += getTRow(serviceDetails[k], category_name, 0, mostFavoriteServiceIds);
            }
            
        }
        
        return tbody;
    }

    function getTRow(serviceItemDetail, category_name, is_best_seller, mostFavoriteServiceIds){
        let tbody = '';
        let service = serviceItemDetail;

        let service_id = serviceItemDetail['id'];

        let quality = start_time = speed_per_day = min_max = refill_available = price_per_1000 = details = drop = model_details = '';

        let is_recommend = is_best = is_fast = is_real = is_decreased = is_most_favorite = is_new = 0;
        is_best = is_best_seller;

        if(mostFavoriteServiceIds.length > 0) {
            for(let index = 0; index < mostFavoriteServiceIds.length; index++) {
                if(service_id == mostFavoriteServiceIds[index]) {
                    is_most_favorite = 1;
                    break;
                }
            }
        }

        if(decreased_services.length > 0){
            for(let index  = 0; index < decreased_services.length; index++) {
                const item_id = decreased_services[index].service.split("-")[0].trim();
                if(service_id == item_id) {
                    is_decreased = 1;
                    break;
                }
            }
        }

        if(newServices.length > 0) {
            // check New services
            for(let i = 0; i < newServices.length; i++){
                let service = newServices[i].service.split("-");
                var id = service[0].trim();

                if (service_id == id) {
                    is_new = 1;
                    break;
                }
            }
        }

        if(isNotEmpty(service['description']) ){
            // let s_des = service['description'].split("<br>");

            let regex = /<br\s*\/?>/gi; // <br>, <br/>, <br /> all matching
            let s_des = service['description'].split(regex).map(item => item.trim()).filter(item => item !== '');

            
            for(var j in s_des) {
                let temp_array = s_des[j].split(":");
    
                if(temp_array[0].trim() == 'Quality'){
                    quality = temp_array[1].trim();
                    break;
                }
            }

            if(quality == "Real"){
                is_real = 1;
            }

            if(isLessOneMinute(service['average_time'])){
                is_fast = 1;
            }

            let model_des_arr = service['description'].split("Details");
            
            if(isNotEmpty(model_des_arr[1]) ){
                model_details = model_des_arr[1].ltrim(':');
                model_details = service['description'];//override all feature show details plain
            }
    
            for(var j in s_des) {
                let temp_array = s_des[j].split(":");

                if(temp_array[0] == 'Quality'){
                    quality = temp_array[1];
                }

                if(temp_array[0] == 'Start Time'){
                    start_time = temp_array[1];
                }

                if(temp_array[0] == 'Speed per Day'){
                    speed_per_day = temp_array[1];
                }
            
                if(temp_array[0] == 'Min/Max'){
                    min_max = temp_array[1];
                }

                if(temp_array[0] == 'HQ Refill Available'){
                    refill_available = temp_array[1];
                }

                if(temp_array[0] == 'Refill Available'){
                    refill_available = temp_array[1];
                }

                if(temp_array[0] == 'Price per 1000'){
                    price_per_1000 = temp_array[1];
                }

                if(temp_array[0] == 'Details'){
                    details = temp_array[1];
                }

                if(temp_array[0] == 'Drop'){
                    drop = temp_array[1];
                }

                if(temp_array[0] == 'Tags') {
                    // check recommended, best seller, fast services
                    if(temp_array[1].includes("#Fast")){
                        is_fast = 1;
                    }
                    if(temp_array[1].includes("#BestSellers")){
                        is_best = 1;
                    }
                    if(temp_array[1].includes("#Recommended")){
                        is_recommend = 1;
                    }
                    if(temp_array[1].includes("#Real")){
                        is_real = 1;
                    }
                }
            }
        } //description if

        tbody += '<tr class="service-info-row trow trow-' + service_id + '" data-service_id="' + service_id + '" data-is_decreased="' + is_decreased + '">';
            tbody += "<td rowspan='3'>"; 
                tbody += '<span role="button" class="me-2 ';
                if(service.favorite) {
                    tbody += ' favorite-active'; 
                }

                tbody += '" data-favorite-service-id="' + service.id + '">';
                    tbody += '<span data-favorite-icon class="';
                        if(service.favorite) 
                            tbody += 'fas fa-star favorite-icon d-none';
                        else 
                            tbody += 'far fa-star favorite-icon d-none';
                    tbody += '"></span>';

                    tbody += '<span data-bs-toggle="tooltip" data-bs-placement="top" class="fas fa-star favorite-btn';
                    if(is_most_favorite)
                        tbody += ' most-favorite-star';
                    if(service.favorite) 
                        tbody += ' favorite-star';
                    tbody += '" title="';
                    if(service.favorite){
                        tbody += 'Remove Favorite';
                    } else {
                        if(is_most_favorite)
                            tbody += 'Most Favorite';
                        else
                            tbody += 'Favorite';
                    }
                    
                    tbody += '"></span>';
                tbody += '</span><span class="id">' + service_id + '</span>';
            tbody += "</td>";

            let service_name = service['name'];
            tbody += '<td colspan="5" class=" pb-0 no-border name"><a href="javascript:;" class="order-again-btn" data-service_id="' + service_id + '" data-service-category="' + category_name + '">' + service_name + '</a></td>'; 
            tbody += "<td class='no-border color-primary-400 pb-0'>" + service['rate'] + "</td>";
            tbody += '<td  rowspan="3" class="rest-details" data-serviceid="' + service_id + '">';
                if(model_details == '') {
                    tbody += '<button class="icon disabled btn">';
                    tbody += '<img src="https://followizaddons.com/followiz-icons/details_eye_icon.png">';
                    tbody +='</button>';
                } else {
                    tbody += '<button class="icon rest-details-modal btn" service_id = "' + service_id + '" service_detail_id = "' + service['id'] + '">';
                    tbody += '<span class="d-none detail-name">' + service['name'] + '</span>';
                    tbody += '<span class="d-none detail-avg-time">' + service['average_time'] + '</span>';
                    tbody += '<span class="d-none service-detail">' + model_details + '</span>';
                    tbody += '<img src="https://followizaddons.com/followiz-icons/details_eye_icon.png">';
                    tbody += '</button>';
                }
            tbody += '</td>';
        tbody += '</tr>';


        tbody += '<tr class="service-detail-row trow trow-' + service_id + '" data-service_id="' + service_id + '">'; 
            tbody += '<td class="no-border pt-2 pb-0">'; 
                tbody += '<div class="service-description" id="' + service_id + '"></div>';
                tbody += ' <span class="quality-split-' + service_id + '">' + quality + '</span>';
            tbody += '</td>';
            tbody += '<td class="no-border pt-2 pb-0"><span class="time-split-' + service_id + '">' + start_time + ' </span></td>';
            tbody += '<td class="no-border pt-2 pb-0"><span class="speed-split-' + service_id + '">' + speed_per_day + ' </span></td>';
            
            tbody += '<td class="no-border pt-2 pb-0"><span class="refill-split-' + service_id + '">' + refill_available + ' </span></td>';
            tbody += '<td class="no-border pt-2 pb-0">' + service['min'] + ' / ' + service['max'] + '</td>';
            tbody += '<td class="no-border pt-2 pb-0"><span class="avgtime-split-' + service_id + '">' + service['average_time'] + '</span></td>';
            
        tbody += '</tr>'; 

        tbody += '<tr class="service-tag-row trow trow-' + service_id + '" data-service_id="' + service_id + '">'; 
            if(!service.favorite && is_recommend + is_best + is_fast + is_real + is_decreased + is_most_favorite + is_new == 0)
                tbody += '<td colspan="6" class="pt-0">'; 
            else {
                tbody += '<td colspan="6" class="pt-2">';
            }
                if(is_recommend) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-like me-1">';
                    tbody += '<i class="fa-solid fa-check me-1"></i>';
                    tbody += 'Recommended</span>';
                }
                 
                if(is_best) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-warning me-1">';
                    tbody += '<i class="fa-solid fa-certificate me-1"></i>';
                    tbody += 'Best Sellers</span>';
                }

                if(is_real) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-info me-1">';
                    tbody += '<i class="fa-solid fa-user me-1"></i>';
                    tbody += 'Real</span>';
                }

                if(is_fast) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-secondary me-1">';
                    tbody += '<i class="fa-regular fa-clock me-1"></i>';
                    tbody += 'Fast</span>';
                }

                if(is_new) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-new me-1">';
                    tbody += '<i class="fa-solid fa-plus me-1"></i>';
                    tbody += 'New Service</span>';
                }

                if(is_decreased) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-like me-1">';
                    tbody += '<i class="fa-solid fa-tag me-1"></i>';
                    tbody += 'Price Reduced</span>';
                }

                if(is_most_favorite) {
                    tbody += '<span class="badge tag-badge rounded-pill bg-label-primary me-1">';
                    tbody += '<i class="fa-solid fa-star me-1"></i>';
                    tbody += 'Most Favorite</span>';
                }

                
                tbody += '<span class="badge tag-badge rounded-pill bg-label-yellow favorite-badge';
                if(!service.favorite) {
                    tbody += ' d-none';
                }
                tbody += '">';
                tbody += '<i class="fa-solid fa-star me-1"></i>';
                tbody += 'Favorite</span>';
                
            tbody += '</td>'; 
        tbody += '</tr>';
        return tbody;
    }

    function TRowHoverAction(){
        document.querySelectorAll(".trow").hover(
            function() {
                document.querySelectorAll(".trow").forEach(el => el.classList.remove("hovered"));
                const service_id = this.getAttribute("data-service_id");
                document.querySelectorAll(".trow-"+service_id).forEach(el => el.classList.add("hovered"));
            }, function() {
                const service_id = this.getAttribute("data-service_id");
                document.querySelectorAll(".trow-"+service_id).forEach(el => el.classList.remove("hovered"));
            }
        );
    }

    function favoriteButtonAction() {
        document.querySelectorAll(".favorite-btn").forEach(el => el.addEventListener("click", function() {
            let is_favorite = 0;

            this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("span.favorite-active")) result.push(current); current = current.parentElement; } return result; }).call(this).find("span.favorite-icon").dispatchEvent(new Event("click", { bubbles: true }));

            if(this.classList.contains("favorite-star")){
                this.classList.remove("favorite-star");
                if(this.classList.contains("most-favorite-star"))
                    this.setAttribute('data-bs-original-title', 'Most Favorite');
                else
                    this.setAttribute('data-bs-original-title', 'Favorite');
            } else {
                this.classList.add("favorite-star");
                this.setAttribute('data-bs-original-title', 'Remove Favorite');
                is_favorite = 1;
            }

            const favorite_el = this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("tr.service-info-row")) result.push(current); current = current.parentElement; } return result; }).call(this).next("tr").next("tr.service-tag-row").find(".favorite-badge");
            if(is_favorite) 
                favorite_el.classList.remove("d-none");
            else 
                favorite_el.classList.add("d-none");

            // update favorite table and re-calculate top most favorite services
            const link = 'https://followizaddons.com/vote/updateOneServiceFavorite.php';
        
            $.ajax({
                url: link,
                type: "POST",
                dataType: "json",
                cache: false,
                data:  { 
                    'service_id': this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches("tr.service-info-row")) result.push(current); current = current.parentElement; } return result; }).call(this).getAttribute("data-service_id"), 
                    'user_id': user_info.id,
                    'category_name': this(function() { let current = this.parentElement; let result = []; while(current) { if(current.matches(".service-data-panel")) result.push(current); current = current.parentElement; } return result; }).call(this).getAttribute("data-category"),
                    'is_favorite': is_favorite
                },
                crossDomain: true,
                success: function(data)         
                {
                    mostFavoriteServices = data.favoriteServices;
                }
            });
        })
    }

    // str_time format:  "1 minute", "9 minutes", "1 hour 6 minutes", "54 hours 34 minutes", "Not enough data"   
    function isLessOneMinute(str_time){
        if(str_time.includes("hour") || str_time == "Not enough data"){
            return false;
        }
        return true;
    }

    String.prototype.ltrim = function() {
        return this.replace(/^\s+/,"");
    }

    function setDescriptiontoModal(detail_str, avg_time) {  
        lines = detail_str.split("<br>");   
        document.querySelectorAll(".service-description-split").html('<div>' + lines.join("</div><div>") + '</div>');
    
        var i = 1;
        document.querySelectorAll('.service-description-split div').forEach(function() {
            if(i < 6) {
                this.addClass('split-class' + i);
                i++;
            } else {
                this.classList.add('split-class-extra');
            }
        });
        
        var extraData = '';
        var info = '';
    
        var infoArr = {};
        var infoStr = '';
        
        //CODE TO GET DETAILS DATA
    
        var detailsData = '';
        var profileData = '';
        var QualityExamplesData = '';
        
        var datakey = 'Details';
    
        document.querySelectorAll('.split-class-extra').forEach(function() {
            info = this.textContent;
            detailsData += info + "<br>";    
        })
        
        document.querySelectorAll(".details-split").html(detailsData);
        var splt1 = document.querySelectorAll(".split-class1").text();
        if(!isNotEmpty(splt1)){
            return;
        }
        
        var str1 = splt1.split(":");
        if(str1[1])
            str1[1] = str1[1].replace("Start Time", "");
        document.querySelectorAll(".quality-split").html(str1[1]);
    
        var splt2 = document.querySelectorAll(".split-class2").text();
        var str2 = splt2.split(":");
        if(str2[1])
            str2[1] = str2[1].replace("Start Time", "");
        document.querySelectorAll(".time-split").html(str2[1]);
    
        var splt3 = document.querySelectorAll(".split-class3").text();
        var str3 = splt3.split(":");
        if(str3[1])
            str3[1] = str3[1].replace("Speed per Day", "");
        document.querySelectorAll(".speed-split").html(str3[1]);
        
        var splt4 = document.querySelectorAll(".split-class4").text();  
        var str4 = splt4.split(":");
        if(str4[0]=='Min/Max') {
            str4[1] = str4[1].replace("Min/Max", "");
            document.querySelectorAll(".minMax-split").html(str4[1]);
    
            var splt5 = document.querySelectorAll(".split-class5").text();
            var str5 = splt5.split(":");
            
            if(str5[0]=='Refill Available') {
                document.querySelectorAll(".refill-split").html(str5[1]);
    
                var splt6 = document.querySelectorAll(".split-class6").text();
                var str6 = splt6.split(":");
                
                str6[1] = str6[1].replace("Price per 1000", "");
                document.querySelectorAll(".price-split").html(str6[1]);
        
            } else if(str5[0]=='Price per 1000') {
                document.querySelectorAll(".price-split").html(str5[1]);
            }
    
        } else if(str4[0]=='Refill Available') {
            str4[1] = str4[1].replace("Refill Available", "");
            document.querySelectorAll(".refill-split").html(str4[1]);
        
            var splt5 = document.querySelectorAll(".split-class5").text();
            var str5 = splt5.split(":");
            str5[1] = str5[1].replace("Price per 1000", "");
            document.querySelectorAll(".price-split").html(str5[1]);
        }  

        document.querySelectorAll(".avg_txt").html(avg_time);
    }

    function updateUsersFavoriteAndReCaculateTopFavorites(services_by_category) {
        // list structure: icon, id, name, services(array(id, added_to_favorite_at, averate_time, description, min, max, favorite, name, rate, original-rate))
        let favorite_services = [];
        
        services_by_category.forEach((category) => {
            for (const [key, service] of Object.entries(category.services)) {
                if(service.favorite == true){
                    favorite_services.push({'service_id': service.id, 'category_name': category.name});
                }
            }
        })

        const link = 'https://followizaddons.com/vote/updateUserFavorite.php';
        
        $.ajax({
            url: link,
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'favorite_services': favorite_services, 'user_id': user_info.id},
            crossDomain: true,
            success: function(data)         
            {
                mostFavoriteServices = data.favoriteServices;
            }
        });

    }
// ------------------------- Service page ends ----------------------------//


// ------------------------- Tickets page starts ----------------------------//
    var agents = [];

    function getTicketDetailsFromDetailPage(link, ticket_id){
        // display spinner and hide chat container section
        document.querySelectorAll(".spinner-wrapper").forEach(el => el.classList.remove("d-none"));
        document.querySelectorAll(".chat-cotainer").forEach(el => el.classList.add("d-none"));
        document.querySelectorAll(".chat-cotainer").innerHTML = "";

        $.get(link, function(data) {
            document.getElementById("ticketInfoHolder").innerHTML = '';
            document.querySelectorAll(".chat-cotainer").html(data.find("#chat_container").cloneNode(true));
            
            document.querySelectorAll(".spinner-wrapper").forEach(el => el.classList.add("d-none"));
            document.querySelectorAll(".chat-cotainer").forEach(el => el.classList.remove("d-none"));

            setTimeout(function(){
                //get agents Rating on page load
                ticket_viewpage_listener(ticket_id);

                const element = document.querySelectorAll('.ticket-content');
                element.animate({
                    scrollTop: element.prop("scrollHeight")
                }, 200);
                
            }, 500)
        });
    }

    function ticket_viewpage_listener(ticket_id) {
        // caclulate Response time of Agencies message fot this ticket and update it
        let isAgentExit = JSON.parse(localStorage.getItem('agents'));
        if(isAgentExit == null || isAgentExit == 'undefined'){
            getAgents();
        }
        agents = JSON.parse(localStorage.getItem('agents'));

        var request_arr = [];

        var r = document.querySelectorAll(".tickets-uploader"),
            file_uploader = r.perfectuploader ? r.perfectuploader({
            uploadUrl: 'https://upload.mypanel.link/api/upload',
            updateTokenUrl: '/tickets/get-cdn-token',
            accept: ["image/jpg", "image/jpeg", "image/png", "image/gif", "text/plain", "text/csv", "application/pdf"]
        }) : [];

        document.querySelectorAll(".ticket-support-message").forEach(function() {
            const msg_id = this.getAttribute("data-msg_id");
            const msg_content = document.querySelectorAll("#msg_container_" + msg_id).text();

            const agent_id = getAgentId(agents, msg_content);
            if(agent_id != "") { 
                const replyTime = this.querySelector('.reply-time').html(); 
                const askTime = getAskTimeFromReply(this);
                if(askTime !== false){
                    let response_time = responsetime(askTime, replyTime);// min
                    // update response time
                    request_arr.push({
                        "user_id": user_info.id,
                        "ticket_id": ticket_id,
                        "msg_id": msg_id,
                        "agent_id": agent_id,
                        "asked_at": askTime,
                        "responsed_at": replyTime,
                        "response_time": response_time
                    });
                }
            }
        });


        if(request_arr.length > 0){
            insertOrUpdateResponseTime(request_arr);
        }

        getTicketDetails(ticket_id);

        document.getElementById("send_message_btn").on("click", function() {
            let message = document.getElementById("message").val();
            if(message.trim() == "") {
                document.getElementById("message_error_wrapper").classList.remove("d-none");
                return;
            }

            var form = document.getElementById("send_message_form");
            custom.patronus(form);

            
            var o = form.serialize(), 
                s = file_uploader.perfectuploader("getFiles");
            if ((s = s.filter((function(e) {
                return !e.error
            }
            )).map((function(e) {
                return {
                    name: e.name,
                    size: e.size,
                    url: e.cdn_url
                }
            }
            ))).length > 0) {
                var l = {
                    "TicketMessageForm[files]": s
                };
                o = o + "&" + $.param(l)
            }
            form.find(".alert.alert-danger").remove();

            let ticket_id = form.getAttribute("data-ticket_id");

            var t = function alert(e) {
                return '\n                    <div class="alert alert-dismissible alert-danger">\n                        <button type="button" class="close" data-dismiss="alert">&times;</button>\n                        '.concat(e, "\n                    </div>\n                ")
            }

            $.post('/viewticket/' + ticket_id, o, (function(e) {
                location.reload()
                // "success" == e.status && window.location.reload(),
                // "error" == form.prepend(t(e.error))
            })).fail((function(e) {
                console.log("Failed: ", e);
                location.reload()
            }
            ));

        })

        document.querySelectorAll(".close-alert-btn").forEach(el => el.addEventListener("click", function() {
            document.getElementById("message_error_wrapper").classList.add("d-none");
        })

        
    }

    const get_agent_url = api_end_point + "/agent/getAgents.php";
    const agent_url = api_end_point + "/agent/";
    const get_agent_ratings_url = api_end_point + "/agent/read.php";
    /**************************** code for ticket rating ***************************************/
        function getAgents(){
            $.ajax({
                url : get_agent_url,
                type: "GET",
                dataType: "json",
                cache: false,
                crossDomain: true,
                success: function(data, textStatus, jqXHR)
                {
                    localStorage.setItem('agents', JSON.stringify(data.data));
                },
                error: function (jqXHR, textStatus, errorThrown)
                {
                }
            });
        }

        function getAgentRatings(ticket_id){    
            var formData = {"user_id": user_info.id, "ticket_id": ticket_id}; 
            
            $.ajax({
                url : get_agent_ratings_url,
                type: "POST",
                dataType: "json",
                cache: false,
                data :formData,
                crossDomain: true,
                success: function(response, textStatus, jqXHR)
                {
                    let agents_rating = response.data;
                    for (i = 0; i < agents_rating.length; i++) {              
                        document.querySelectorAll(".msg_" + agents_rating[i].msg_id).rating({"value": agents_rating[i].rating });
                    } 

                    // check last agent message is got a rate
                    if(document.querySelectorAll(".last-ticket-rating-wrapper").length > 0) {
                        let score = document.querySelectorAll(".last-ticket-rating-wrapper .lastMessageReview .fas.fa-star").length;
                        if(score > 0) {
                            // hide rating wrapper and show message box
                            document.querySelectorAll(".last-ticket-rating-wrapper").forEach(el => el.classList.add("d-none"));
                            document.getElementById("message").classList.remove("d-none");
                            document.getElementById("send_message_btn").removeAttribute("disabled");
                        } else {
                            document.querySelectorAll(".last-ticket-rating-wrapper").forEach(el => el.classList.remove("d-none"));
                        }
                    }

                },
                error: function (jqXHR, textStatus, errorThrown)
                {
                }
            });
        }

        function getKeyByValue(object, value) {
            return Object.keys(object).find(key => object[key] === value);
        }
        
        function getAgentId(agents, msg_txt){
            var agent_key = '';
                
            for (const [key, agent]  of Object.entries(agents)) {
                
                if(msg_txt.includes("-" + agent) ){
                    let agent_k = getKeyByValue(agents, agent);
                    agent_key = agent_k;
                    break;
                }
            }
            
            return agent_key; 
        }

        function getAskTimeFromReply(el){
            let prev_el = el.prev(".ticket-message-block");
            while(prev_el.length > 0){
                const msg_id = prev_el.getAttribute("data-msg_id");
                
                if(msg_id === undefined)
                    break;

                if(prev_el.classList.contains("ticket-support-message")){
                    const msg_content = document.querySelectorAll("#msg_container_" + msg_id).text();

                    let agent_id = getAgentId(agents, msg_content);
                    if(agent_id != "") {
                        // do not calculate this message because response time was calculated with above message 
                        return false;
                    }
                } else if(prev_el.classList.contains("ticket-ask-message")) {
                    // get first client message on this section
                    
                    // return prev_el.find(".ask-time").html();
                    return getFirstClientMessageFromMessageElement(prev_el);
                }
                
                prev_el = prev_el.prev(".ticket-message-block");
            }

            return false;
        }

        function getFirstClientMessageFromMessageElement(el){
            let curr_el = el;
            let prev_el = el.prev(".ticket-ask-message");
            while(prev_el.length > 0){
                curr_el = prev_el;
                prev_el = prev_el.prev(".ticket-ask-message");
            }

            return curr_el.find(".ask-time").html();
        }
        
        function insertOrUpdateTicketRating(user_id, ticket_id, msg_id, agent_id, rating){
            if (user_id == '') {
                user_id = 0; 
            }

            var formData = { 
                "user_id": user_id, 
                "msg_id": msg_id,
                "agent_id": agent_id,
                "ticket_id": ticket_id,
                "rating": rating
            }; 
        
            $.ajax({
                url : agent_url + "insertOrUpdateAgentRating.php",
                type: "POST",
                dataType: "json",
                cache: false,
                data: formData,
                crossDomain: true,
                success: function(data, textStatus, jqXHR)
                {
                },
                error: function (jqXHR, textStatus, errorThrown)
                {
                }
            });
        }

        function insertOrUpdateResponseTime(request_arr){
            $.ajax({
                url : agent_url + "insertOrUpdateAgentResponseRating.php",
                type: "POST",
                dataType: "json",
                cache: false,
                data: {data: JSON.stringify(request_arr)},
                crossDomain: true,
                success: function(data, textStatus, jqXHR)
                {
                },
                error: function (jqXHR, textStatus, errorThrown)
                {
                }
            });
        }
    /**************************** code for agent rating ************************************/

    function responsetime(timestamp1, timestamp2) {

        const unixTimeZero1 = Date.parse(timestamp1);
        const unixTimeZero2 = Date.parse(timestamp2);
        
        var difference = unixTimeZero2 - unixTimeZero1;
        var daysDifference = Math.floor(difference / 1000 / 60);

        return daysDifference;
    }

    function getTicketDetails(ticket_id){
        getAgentRatings(ticket_id);
        
        //init blank rating
        if(document.querySelectorAll(".ticketReview").length > 0){
            document.querySelectorAll(".ticketReview").rating({
                "value": 0,
                "click": function (e) {
                    if(typeof e.event !== "undefined"){

                        // var msg_id = (e.event.target.parentNode.id).split("_")[1];

                        var msg_id = e.event.target.parentNode.getAttribute("data_msg_id");
                        var msg_txt = document.querySelectorAll("#msg_container_" + msg_id).text();

                        agents = JSON.parse(localStorage.getItem('agents'));
                        var agent_id = getAgentId(agents, msg_txt);
                        if(agent_id == "") { agent_id = 1; }
                        
                        if(agent_id != ''){
                            insertOrUpdateTicketRating(user_info.id, ticket_id, msg_id, agent_id, e.stars)
                        }
                    }
                },
            });
        }

        if(document.querySelectorAll(".lastMessageReview").length > 0){
            document.querySelectorAll(".lastMessageReview").rating({
                "value": 0,
                "click": function (e) {
                    if(typeof e.event !== "undefined"){
                        var msg_id = e.event.target.parentNode.getAttribute("data_msg_id");
                        var msg_txt = document.querySelectorAll("#msg_container_" + msg_id).text();

                        document.querySelectorAll(".viewticket-followiz .msg_" + msg_id).rating({"value": e.stars });

                        agents = JSON.parse(localStorage.getItem('agents'));
                        var agent_id = getAgentId(agents, msg_txt);
                        if(agent_id == "") { agent_id = 1; }
                        
                        if(agent_id != ''){
                            insertOrUpdateTicketRating(user_info.id, ticket_id, msg_id, agent_id, e.stars);
                        }

                        // hide rating wrapper and display message box
                        document.querySelectorAll(".last-ticket-rating-wrapper").forEach(el => el.classList.add("d-none"));
                        document.getElementById("message").classList.remove("d-none");
                        document.getElementById("send_message_btn").removeAttribute("disabled");
                        document.getElementById("message").focus();
                    }
                },
            });
        }
    }

// ------------------------- Tickets page ends ----------------------------//


// ------------------------- Extra feature page starts -----------------------------//
    async function processCategoryOrder(categories){

        let totalCategory = categories.length;;
    
        let cat_counter = 1;
        let allCategoriesOrder = [];
        for(let i = 0; i < totalCategory; i++){
            let category = categories[i];

            //code for service order
            let temArr3 = [];
                
            temArr3['category_id'] = category.id;
            temArr3['sort_order'] = cat_counter;
            
            cat_counter++;
            allCategoriesOrder.push({ ...temArr3 });

        }

        await synchronizeCategoryOrder(allCategoriesOrder)
    }  

    function synchronizeCategoryOrder(allCategoriesOrder){
       
        var categoryOrder = { ...allCategoriesOrder }; 
        return $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'categoryOrder' :  categoryOrder },
            crossDomain: true,
            url: api_end_point + "/api/order/insertOrUpdateCategorySorting.php",
            success: function(data)         
            {
            }
        });
    }

    async function processServices(categories){
        let totalCategory = categories.length;;
    
        for(let i = 0; i < totalCategory; i++){
            let category = categories[i];
            let service = category.services;
            let allServices = [];
            service.forEach(function (s) {
                let temArr = [];
                temArr['service_id'] = s.id;
                temArr['service_details'] = s.name;
                temArr['price'] = parseFloat(s.rate.custom);
                temArr['status'] = parseInt(s.status);
                allServices.push({ ...temArr });
            });
            if(allServices.length){
                await synchronizeService(allServices);
            }
        }
    }

    let count_index = 0;
    function synchronizeService(allServices){
        count_index ++;
        var updates = { ...allServices };
        $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'updates' :  updates },
            crossDomain: true,
            url: api_end_point + "/api/update/insertOrUpdateServices.php",
            success: function(data)         
            {
            }
        });
    }

    async function processServicesOrder(categories){
        let totalCategory = categories.length;;
    
        let counter = 1;
        
        
        for(let i = 0; i < totalCategory; i++){
            let category = categories[i];
            let service = category.services;
    
            let allServicesOrder = [];
            service.forEach(function (s) {
                
                let temArr2 = [];
                
                temArr2['service_id'] = s.id;
                temArr2['sort_order'] = counter;
                
                counter++;
                allServicesOrder.push({ ...temArr2 });
            });
            
            if(service.length){
                await synchronizeServiceOrder(allServicesOrder)
            }
            
            // if(i == 1) break;
        }
    }

    function synchronizeServiceOrder(allServicesOrder){
       
        var serviceOrder = { ...allServicesOrder }; 
        return $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'serviceOrder' :  serviceOrder },
            crossDomain: true,
            url: api_end_point + "/api/order/insertOrUpdateServiceSorting.php",
            success: function(data)         
            {
            }
        });
    }

    async function processUsers(totalPage){
        let result;
        let promises = [];
        let allUsers = [];
  
        for(let i = 0; i < totalPage; i++){
        // for(let i = 0; i < 100; i++){
            promises.push(getAllUsers(i));
           //result[i] = getAllUsers(i);
        }
        
        result = await Promise.all(promises);
        for(let i = 0; i < totalPage; i++){
        // for(let i = 0; i < 100; i++){
  
            let tempUser = result[i].data.users;
            tempUser.forEach(function (u) {
                let temArr = [];
                temArr['followiz_id'] = u.id;
                temArr['username'] = u.username;
                temArr['email'] = u.email;
                allUsers.push(temArr);
            });
        }
        //save user to other server
        //synchronisUser(allUsers);
        processUsersDetails(allUsers);
    }

    async function processUsersDetails(allUsers){
        let result;
        let newAllUsers = [];
        let promises = [];
        
        let totalUsers = allUsers.length;
        for(let i = 0; i < totalUsers; i++){
            promises.push(getUserDetails(allUsers[i]['followiz_id']));
        }
        result = await Promise.all(promises);
  
        for(let i = 0; i < totalUsers; i++){
         
          let tempUser = result[i].data;
          
          allUsers[i]['first_name'] = tempUser.first_name;
          allUsers[i]['last_name'] = tempUser.last_name;
          newAllUsers.push({ ...allUsers[i] });
                
        }
        //save user to other server
        synchronisUser(newAllUsers);
    }

    function synchronisUser(allUsers){
        var users = { ...allUsers }; 
        
        $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'users' :  users },
            crossDomain: true,
            url: api_end_point + "/user/insertOrUpdateUser.php",      
            success: function(data)         
            {
            }
        });
    }

    function generateAllInvoice(paymentInfo){
        var paymentInfo = { ...paymentInfo }; 
        
        $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'payment_info' :  paymentInfo },
            crossDomain: true,
            url: api_end_point + "/invoice/generate-all-invoice.php",      
            success: function(data)         
            {
            }
        });
    }

    function insertUpdatedServicesToDB(updatedInfo){
        $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data:  { 'updated_list' :  updatedInfo },
            crossDomain: true,
            url: api_end_point + "/updates/insert_updated_service.php",      
            success: function(data)         
            {
            }
        });
    }

    /************************** code for synchronise user on other server ************/
    function getAllUsers(pageNumber){

        pageNumber = pageNumber+1;
        let url = 'https://followiz.com/admin/api/users/list?page=' + pageNumber;
        return $.ajax({
            // async:false,
            url : url,
            method : 'GET',
            json : true
        });
  
    }

    function getUserDetails(UserId){
        let url = 'https://followiz.com/admin/api/users/view/'+UserId;
        return $.ajax({
            async:false,
            url : url,
            method : 'GET',
            json : true
        });
    }

// ------------------------- Extra feature page ends -----------------------------//