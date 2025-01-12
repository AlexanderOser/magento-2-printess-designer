
define([
        'mage/template',
        'Magento_Catalog/js/price-utils',
        'Digitalprint_PrintessDesigner/js/cart',
        'Digitalprint_PrintessDesigner/js/store/cart',
        'Digitalprint_PrintessDesigner/js/store/ui'
    ], function(mageTemplate, priceUtils, Cart, CartStore, UiStore) {

    function addToCart(storeCode, sku, quantity, thumbnailUrl, saveToken, documents, formFields, priceInfo, customerToken) {

        let payload = {
            'sku': sku,
            'quantity': quantity,
            'thumbnailUrl': thumbnailUrl,
            'saveToken': saveToken,
            'documents': documents,
            'formFields': formFields,
            'priceInfo': priceInfo
        };

        let headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        if (customerToken !== 'anonymous') {
            headers['Authorization'] = `Bearer ${customerToken}`
        }

        return fetch(`/rest/${storeCode}/V1/digitalprint-designer/addtocart`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });
    }

    function updateOrderItem(orderId, itemId, sku, quantity, thumbnailUrl, saveToken, documents, formFields, priceInfo, adminToken) {

        let payload = {
            'orderId': parseInt(orderId),
            'itemId': parseInt(itemId),
            'sku': sku,
            'qty': quantity,
            'thumbnailUrl': thumbnailUrl,
            'saveToken': saveToken,
            'documents': documents,
            'formFields': formFields,
            'priceInfo': priceInfo
        };

        let headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }

        return fetch('/rest/V1/digitalprint-designer/updateorderitem', {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });
    }

    function getProductWithVariants(storeCode, sku, session) {

        let headers = {
            'Content-Type': 'application/json'
        }

        if (typeof session.admin_token !=='undefined' && session.admin_token !== null) {
            headers['Authorization'] = `Bearer ${session.admin_token}`
        }

        return fetch(`/rest/${storeCode}/V1/digitalprint-designer/product?sku=${sku}`, {
            method: 'GET',
            headers: headers
        });
    }

    function getVariant(storeCode, sku, documents, formFields, priceInfo, session) {

        let headers = {
            'Content-Type': 'application/json'
        }

        if (typeof session.admin_token !=='undefined' && session.admin_token !== null) {
            headers['Authorization'] = `Bearer ${session.admin_token}`
        }

        return fetch(`/rest/${storeCode}/V1/digitalprint-designer/variant?sku=${sku}&documents=${encodeURI(JSON.stringify(documents))}&formFields=${JSON.stringify(encodeURI(formFields))}&priceInfo=${JSON.stringify(encodeURI(priceInfo))}`, {
            method: 'GET',
            headers: headers
        });

    }

    function createOffcanvas() {

        let session = this.session;
        let printess = this.printess;
        let config = this.config;

        document.getElementById('cartOffcanvas').addEventListener('cart.add.bs.offcanvas', function() {

            showLoader('cartOffcanvas');

            const fileName = `${CartStore.saveToken}.png`.replace(/st:/i, '');

            printess
                .renderFirstPageImage(fileName, 'preview', 1000, 1000)
                .then((thumbnailUrl) => {

                    CartStore.setThumbnailUrl(thumbnailUrl);

                    if (config.areaCode === 'adminhtml') {
                        return updateOrderItem(config.orderId, config.itemId, CartStore.getSku(), CartStore.getQuantity(), CartStore.getThumbnailUrl(), CartStore.getSaveToken(), CartStore.getDocuments(), CartStore.getFormFields(), CartStore.getPriceInfo(), session.admin_token)
                    }

                    return addToCart(config.storeCode, CartStore.getSku(), CartStore.getQuantity(), CartStore.getThumbnailUrl(), CartStore.getSaveToken(), CartStore.getDocuments(), CartStore.getFormFields(), CartStore.getPriceInfo(), session.customer_token);
                })
                .then(response => response.json())
                .then((data) => {

                    if (data.redirect_url) {
                        location.href = data.redirect_url;
                    }

                })
                .catch((msg) => {
                    console.error(msg);
                });

        });

        return new Cart('cartOffcanvas', this.config);
    }

     function showLoader(elm) {
         let list = document.getElementById(elm).getElementsByClassName('printess-designer-preloader-wrapper');
         if (list && list.length > 0) {
             list[0].classList.remove('hidden');
         }

    }

    function hideLoader(elm) {
         let list = document.getElementById(elm).getElementsByClassName('printess-designer-preloader-wrapper');
         if (list && list.length > 0) {
             list[0].classList.add('hidden');
         }
    }

    function setCurrentVariantByCode(code) {

        const variants = _structuredClone(this.variants);

        this.currentVariant = variants.find((variant) => {
            return variant.sku === code;
        });

        return this.currentVariant;
    }

    function setAttributeMappingByVariant(variant) {
        this.attributeMapping = [];

        variant.attributes.forEach((attribute) => {
            if (attribute.code === 'printess_form_fields' && attribute.value !== null) {
                this.attributeMapping = attribute.value;

                this.attributeMapping.map((mapping) => {
                    delete mapping.value;
                    return mapping;
                });
            }
        });

        return this.attributeMapping;
    }

    function updateCurrentAttributeMap(name, value) {

        if (null === this.currentAttributeMap) {
            return;
        }

        if (Object.keys(this.currentAttributeMap).length === 0) {
            return;
        }

        if (! Object.hasOwn(this.currentAttributeMap, name)) {
            return;
        }

        this.currentAttributeMap[name].value = value;

        return this.currentAttributeMap;

    }

    function setCurrentAttributeMapByVariant(variant) {

        this.currentAttributeMap = {};

        this.attributeMapping.forEach((map) => {
            this.currentAttributeMap[map.printess_ff_name] = getAttributeFromVariantByName(variant, map.pim_attr_name);
        });

        return this.currentAttributeMap;
    }

    function getAttributeFromVariantByName(variant, name) {

        return variant.attributes.find((attribute) => {
            return attribute.code === name;
        });

    }

    function getVariantByAttributeMap(attributeMap) {

        let filteredVariants = _structuredClone(this.variants);
        const variants = _structuredClone(this.variants);

        if (0 === Object.keys(attributeMap).length) {
            return variants[0];
        }

        for (const [name, map] of Object.entries(attributeMap)) {

            if (map) {
                filteredVariants = filteredVariants.filter((variant) => {
                    return variantHasAttribute(variant, map.code, map.value);
                });
            }
            else {
                filteredVariants = variants;
            }
        }

        return filteredVariants[0];
    }

    function variantHasAttribute(variant, attrName, attrValue) {
        let attribute = variant.attributes.find((attribute) => {
            return attribute.code === attrName && attribute.value === attrValue.toLowerCase();
        });

        return attribute !== undefined;
    }

    function setStartDesign(startDesign) {
        this.startDesign = startDesign;
        return this.startDesign;
    }

    function loadStartDesign() {

        if (null === this.startDesign) {
            return;
        }

        this.printess.insertTemplateAsLayoutSnippet(this.startDesign.templateName, this.startDesign.templateVersion, this.startDesign.documentName, this.startDesign.mode);
    }

    function updateVariantInfo() {

        if (CartStore.hasDocumentsChanged(this.printess.getBuyerFrameCountAndMarkers())) {
            CartStore.setDocuments(this.printess.getBuyerFrameCountAndMarkers());
        }

        fetchAndRenderVariantInfo.call(this, this.currentVariant.sku, CartStore.getDocuments(), CartStore.getFormFields(), CartStore.getPriceInfo());
    }

    function fetchAndRenderVariantInfo(sku, documents, formFields, priceInfo) {

        getVariant(this.config.storeCode, sku, documents, formFields, priceInfo, this.session)
            .then(response => response.json())
            .then((variant) => {
                renderVariantInfo.call(this, variant);
            })
            .catch((msg) => {
                console.error(msg);
            });

    }

    function renderVariantInfo(variant) {

        const info = {
            price: priceUtils.formatPrice(variant.prices[0].price.price, JSON.parse(this.config.priceFormat), false),
            legalNotice: variant.legal_notice,
            productName: variant.name,
            oldPrice: null,
            infoUrl: null,
        }

        window.uiHelper.refreshPriceDisplay(this.printess, info);

    }

    function _structuredClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function Bridge(printess, session, config) {

        showLoader('printessDesigner');

        this.printess = printess;

        this.session = session;
        this.config = config;

        this.variants = null;
        this.currentVariant = null;

        this.attributeMapping = null;
        this.currentAttributeMap = null;

        this.currentGroupSnippets = [];
        this.currentLayoutSnippets = [];
        this.currentTabs = [];

        this.cartOffcanvas = createOffcanvas.call(this);

        setStartDesign.call(this, config.startDesign);

    }

    Bridge.prototype.loadingDone = function (spreads, title) {

        this.printess.resizePrintess();

        loadStartDesign.call(this);

        getProductWithVariants(this.config.storeCode, this.config.sku, this.session)
        .then(response => response.json())
        .then((product) => {

            this.variants = product.variants;
            setCurrentVariantByCode.call(this, this.config.variant);

            setAttributeMappingByVariant.call(this, this.currentVariant);
            setCurrentAttributeMapByVariant.call(this, this.currentVariant);

            hideLoader('printessDesigner');

            let event = new CustomEvent('processStop');
            document.getElementById('printessDesigner').dispatchEvent(event);

            UiStore.setAppWasLoaded();

        });

    }

    Bridge.prototype.selectionChange = function(properties, state)  {

        if (!this.printess) {
            return;
        }

        if (this.printess.isMobile()) {
            // **** add mobile-ui *****
            uiHelper.renderMobileUi(this.printess, properties, state, this.currentGroupSnippets, this.currentLayoutSnippets, this.currentTabs);
            uiHelper.renderMobileNavBar(this.printess);
        } else {
            // ***** add desktop-ui *****
            const t = uiHelper.renderDesktopUi(this.printess, properties, state, this.currentGroupSnippets, this.currentLayoutSnippets, this.currentTabs);
            uiHelper.refreshUndoRedoState(this.printess);
        }

        if (state === "frames") {
            updateVariantInfo.call(this);
        }

    }

    Bridge.prototype.spreadChange = function(groupSnippets, layoutSnippets, tabs) {
        this.currentGroupSnippets = groupSnippets;
        this.currentLayoutSnippets = layoutSnippets;
        this.currentTabs = tabs;
    }

    Bridge.prototype.getOverlay = function(properties) {
        return uiHelper.getOverlay(this.printess, properties);
    }

    Bridge.prototype.addToBasket = function(saveToken, thumbnailUrl) {

        this.cartOffcanvas.show();
        showLoader('cartOffcanvas');

        CartStore.setSku(this.currentVariant.sku);
        CartStore.setSaveToken(saveToken);
        CartStore.setThumbnailUrl(thumbnailUrl);
        CartStore.setDocuments(this.printess.getBuyerFrameCountAndMarkers());
        CartStore.setFormFields(this.printess.getAllPriceRelevantFormFields());

        getVariant(this.config.storeCode, this.currentVariant.sku, CartStore.getDocuments(), CartStore.getFormFields(), CartStore.getPriceInfo(), this.session)
            .then(response => response.json())
            .then((variant) => {
                this.cartOffcanvas.updateUi(variant);
                hideLoader('cartOffcanvas');

            })
            .catch((msg) => {
                console.error(msg);
            });

    }

    Bridge.prototype.formFieldChanged = function(name, value, tag) {

        if (UiStore.isAppLoaded() && tag) {

            this.printess.persistExchangeState().then(() => {

                fetch('/rest/V1/printess/designer/geturlbytag?' + new URLSearchParams({'tag': tag }),
                {
                    method: "GET"
                })
                .then(response => response.json())
                .then((data) => {

                    if (data.url) {
                        location.href = data.url;
                    }

                })

            });

            return;

        }

        if (null === this.currentAttributeMap) {
            return;
        }

        updateCurrentAttributeMap.call(this, name, value);
        this.currentVariant = getVariantByAttributeMap.call(this, this.currentAttributeMap);

    }

    Bridge.prototype.refreshPagination = function () {
        window.uiHelper.refreshPagination(this.printess) ;
    }

    Bridge.prototype.backButtonHandler = function(saveToken) {
        window.history.back();
    }

    Bridge.prototype.priceChange = function(priceInfo) {

        CartStore.setPriceInfo(priceInfo);

        if (!this.currentVariant) {
            return;
        }

        updateVariantInfo.call(this);
    }

    Bridge.prototype.receiveMessage = function(topic, data) {
        window.uiHelper.receiveMessage(this.printess, topic, data);
    }

    return Bridge;
});
