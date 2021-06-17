/**
 * @NApiVersion 2.x
 * @NScriptType restlet
 */

define(['N/runtime', 'N/log', './Nutils-v2'],

    function (Nruntime, Nlog, Nutils) {

        var current_script = Nruntime.getCurrentScript();
        var CUSTOMER_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_customer_id'].join('') });
        var SO_LOCATION = current_script.getParameter({ name: ['custscript', '_aoarv2_location'].join('') });
        var MARKETPLACE_NAME = current_script.getParameter({ name: ['custscript', '_aoarv2_marketplace_name'].join('') });
        var ORDER_GROUP = current_script.getParameter({ name: ['custscript', '_aoarv2_order_group'].join('') });
        var DISCOUNT_ITEM_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_discount_id'].join('') });
        var COUPON_ITEM_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_coupon_id'].join('') });
        var AMCG_COUPON_ITEM_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_amcg_coupon_id'].join('') });
        var REBATE_ITEM_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_rebate_id'].join('') });
        var STORE_CREDIT_ITEM_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_store_credit_id'].join('') });
        var REBATE_PRICE_LEVEL_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_rebate_price_level_id'].join('') });
        var RETAIL_PRICE_LEVEL_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_retail_price_level_id'].join('') });
        var COPAY_PRICE_LEVEL_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_copay_price_level_id'].join('') });
        var OVERRIDE_PRICE_LEVEL_ID = current_script.getParameter({ name: ['custscript', '_aoarv2_override_price_level_i'].join('') });
        var FREE_SHIPPING_MINIMUM = current_script.getParameter({ name: ['custscript', '_aoarv2_free_shipping_min'].join('') });
        var DEFAULT_SHIPPING_COST = current_script.getParameter({ name: ['custscript', '_aoarv2_default_shipping_cost'].join('') });
        var AUTOMATICALLY_CHARGE_FOR_SHIPPING = current_script.getParameter({ name: ['custscript', '_aoarv2_charge_for_shipping'].join('') });
        var USE_NS_CUSTOMER_DEFAULT_BILLING = current_script.getParameter({ name: ['custscript', '_aoarv2_faco_use_ns_cust_billi'].join('') });
        var DEFAULT_APPROVED = current_script.getParameter({ name: ['custscript', '_aoarv2_default_approved'].join('') });
        var DEFAULT_DOWNLOAD_TO_A1 = current_script.getParameter({ name: ['custscript', '_aoarv2_default_download_to_a1'].join('') });
        var DISPATCHER_NOTES_1 = current_script.getParameter({ name: ['custscript', '_aoarv2_dipsatcher_notes_1'].join('') });
        var DISPATCHER_NOTES_2 = current_script.getParameter({ name: ['custscript', '_aoarv2_dipsatcher_notes_2'].join('') });
        var SALES_ORDER_TEMPLATE_VERSION = current_script.getParameter({ name: ['custscript', '_aoarv2_so_template_v'].join('') });
        var SKU_OPTIONS_MAP = current_script.getParameter({ name: ['custscript', '_aoarv2_sku_options_map'].join('') });
        var SKU_SUBSTITUTION_MAP = current_script.getParameter({ name: ['custscript', '_aoarv2_sku_substitution_map'].join('') });
        var DROPSHIP_SO_LOCATION = current_script.getParameter({ name: ['custscript', '_aoarv2_dropship_so_location'].join('') });
        var DROPSHIP_ENABLED = current_script.getParameter({ name: ['custscript', '_aoarv2_dropship_enabled'].join('') });
        var DROPSHIP_SKUS_MAP = current_script.getParameter({ name: ['custscript', '_aoarv2_dropship_skus'].join('') });
        var ADD_PRODUCT_LINE_TO_CHARGES = current_script.getParameter({ name: ['custscript', '_aoarv2_add_product_line'].join('') });

        // Netsuite Approval Status Mappings
        var NETSUITE_SALES_ORDER_PENDING_APPROVAL_STATUS = 'A';
        var NETSUITE_SALES_ORDER_APPROVED_STATUS = 'B';

        var NETSUITE_SALES_ORDER_STATUS = NETSUITE_SALES_ORDER_PENDING_APPROVAL_STATUS;
        if (DEFAULT_APPROVED) {
            NETSUITE_SALES_ORDER_STATUS = NETSUITE_SALES_ORDER_APPROVED_STATUS;
        }

        if (SKU_OPTIONS_MAP) {
            SKU_OPTIONS_MAP = JSON.parse(SKU_OPTIONS_MAP);
        }

        if (SKU_SUBSTITUTION_MAP) {
            SKU_SUBSTITUTION_MAP = JSON.parse(SKU_SUBSTITUTION_MAP);
        }

        if (DROPSHIP_SKUS_MAP) {
            DROPSHIP_SKUS_MAP = JSON.parse(DROPSHIP_SKUS_MAP);
        } else if (DROPSHIP_ENABLED) {
            DROPSHIP_SKUS_MAP = {};
        }

        function formatBigCommerceOrderData(bc_order_data) {


            Nlog.audit({
                title: 'formatOrderData',
                details: bc_order_data,
            });

            var REBATE_VALUES_BY_SKU;
            if (REBATE_PRICE_LEVEL_ID) {
                REBATE_VALUES_BY_SKU = Nutils.getPriceMap(REBATE_PRICE_LEVEL_ID);
            }
            var RETAIL_PRICING_BY_SKU;
            if (RETAIL_PRICE_LEVEL_ID) {
                RETAIL_PRICING_BY_SKU = Nutils.getPriceMap(RETAIL_PRICE_LEVEL_ID);
            }
            var COPAY_PRICING_BY_SKU;
            if (COPAY_PRICE_LEVEL_ID) {
                COPAY_PRICING_BY_SKU = Nutils.getPriceMap(COPAY_PRICE_LEVEL_ID);
            }
            var PRODUCT_LINES_BY_SKU = Nutils.getProductLineMap();

            var dropship_sales_order_data = {};
            var sales_order_data = {
                custbody_external_account_id: bc_order_data.custbody_external_account_id,
                order_number: bc_order_data.id,
                location: SO_LOCATION,
                customer_id: CUSTOMER_ID,
                custbody_a1wms_dnloadtowms: DEFAULT_DOWNLOAD_TO_A1,
                order_status: NETSUITE_SALES_ORDER_STATUS,
                order_group: ORDER_GROUP,
                status: bc_order_data.status,
                status_id: bc_order_data.status_id,
                created: bc_order_data.date_created,
                custbody_external_order_json: bc_order_data.customer_message,
                custbody_external_customer_email: bc_order_data.billing_address.email,
                external_marketplace_name: MARKETPLACE_NAME,
                staff_notes: bc_order_data.staff_notes,
                shipping_cost: parseFloat(bc_order_data.shipping_cost_inc_tax),
                custbody_bol_comments_1: DISPATCHER_NOTES_1,
                custbody_bol_comments_2: DISPATCHER_NOTES_2,
                price: {
                    subtotal: bc_order_data.total_ex_tax,
                    tax: bc_order_data.total_tax,
                    total_price: bc_order_data.total_inc_tax,
                },
                shipping_address: {},
                items: [],
                discounts: {},
            };

            // Whether to override default NS customer billing with BC billing
            if (USE_NS_CUSTOMER_DEFAULT_BILLING !== true) {
                sales_order_data.billing_address = Nutils.getNSAddressFromBCAddress(bc_order_data.billing_address);
            }

            // Get shipping address from URL
            if (bc_order_data && bc_order_data.shipping_addresses && bc_order_data.shipping_addresses.length) {
                for (var j = 0; j < bc_order_data.shipping_addresses.length; j++) {
                    var shipping_address = bc_order_data.shipping_addresses[j];
                    sales_order_data.shipping_address = {
                        id: shipping_address.id,
                        attention: shipping_address.attention,
                        addressee: shipping_address.first_name + ' ' + shipping_address.last_name,
                        address1: shipping_address.street_1,
                        address2: shipping_address.street_2,
                        city: shipping_address.city,
                        state: shipping_address.state,
                        postal_code: shipping_address.zip,
                        country: shipping_address.country_iso2,
                        phone: shipping_address.phone,
                    };
                    if (shipping_address.company !== undefined && shipping_address.company !== '') {
                        sales_order_data.shipping_address.attention = sales_order_data.shipping_address.addressee;
                        sales_order_data.shipping_address.addressee = shipping_address.company;
                    }
                }
            }

            var order_products = bc_order_data.products;
            for (var j = 0; j < order_products.length; j++) {
                var order_product = order_products[j];
                var sku = order_product.sku;
                var original_sku = sku;
                var is_demand_response = false;
                if (SKU_OPTIONS_MAP && SKU_OPTIONS_MAP[sku] !== undefined) {
                    is_demand_response = SKU_OPTIONS_MAP[sku].dr;
                    sku = SKU_OPTIONS_MAP[sku].sku;
                }
                if (SKU_SUBSTITUTION_MAP && SKU_SUBSTITUTION_MAP[sku]) {
                    sku = SKU_SUBSTITUTION_MAP[sku];
                }
                // Check if dropshipping is enabled, and if this is a SKU we should dropshop
                var target_sales_order_data = sales_order_data;
                if (DROPSHIP_ENABLED && (DROPSHIP_SKUS_MAP[sku] || sku.match(/^Z-/i))) {
                    is_dropship = true;
                    if (DROPSHIP_SKUS_MAP[sku]) {
                        sku = DROPSHIP_SKUS_MAP[sku];
                    }
                    // Initialize dropship sales order data
                    if (dropship_sales_order_data === undefined || dropship_sales_order_data.items === undefined) {
                        // Copy sales order data to new dropship order
                        dropship_sales_order_data = JSON.parse(JSON.stringify(sales_order_data));
                        // Update location of copy to DROPSHIP
                        dropship_sales_order_data.location = DROPSHIP_SO_LOCATION;
                        // Initialize empty dropship items array
                        dropship_sales_order_data.items = [];
                    }
                    target_sales_order_data = dropship_sales_order_data;
                }
                var sales_order_data_item = {
                    external_order_product_id: parseInt(order_product.id) + "",
                    sku: sku,
                    quantity: order_product.quantity,
                    is_demand_response: is_demand_response,
                };
                if (OVERRIDE_PRICE_LEVEL_ID) {
                    sales_order_data_item.price_level = OVERRIDE_PRICE_LEVEL_ID;
                } else {
                    if (RETAIL_PRICING_BY_SKU && RETAIL_PRICING_BY_SKU[sku] !== undefined && parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1) {
                        sales_order_data_item.price = RETAIL_PRICING_BY_SKU[sku];
                    } else {
                        sales_order_data_item.price = order_product.price_ex_tax;
                    }
                }
                target_sales_order_data.items.push(sales_order_data_item);
                var order_product_index = target_sales_order_data.items.length - 1;
                var sale_price_line_item_index;
                var bc_price;
                var ns_price;

                // Check for sale pricing
                if (COPAY_PRICING_BY_SKU && COPAY_PRICING_BY_SKU[sku] !== undefined) {
                    var bc_price = parseFloat(order_product.price_ex_tax);
                    var ns_price = parseFloat(COPAY_PRICING_BY_SKU[sku]);
                    if (is_demand_response) {
                        bc_price += parseFloat(REBATE_VALUES_BY_SKU[sku]);
                    }
                }
                if (!isNaN(bc_price) && !isNaN(ns_price)) {
                    if (bc_price != ns_price) {
                        Nlog.debug({
                            title: 'price level and bc price mismatch',
                            details: {
                                bc: bc_price,
                                ns: ns_price
                            }
                        });
                        var sale_price_discount_price = parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -(ns_price - bc_price) : ns_price - bc_price;
                        if (is_demand_response) {
                            sale_price_discount_price += parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -(parseFloat(REBATE_VALUES_BY_SKU[sku])) : parseFloat(REBATE_VALUES_BY_SKU[sku]);
                        }
                        target_sales_order_data.items.push({
                            description: sku + ' Sale Price Discount',
                            buydown_code: sku,
                            price: sale_price_discount_price,
                            is_discount: true,
                            internalid: DISCOUNT_ITEM_ID,
                            quantity: order_product.quantity,
                            product_line: PRODUCT_LINES_BY_SKU[sku],
                        });
                        sale_price_line_item_index = target_sales_order_data.items.length - 1;
                    }

                }

                // Add discounts
                if (order_product.applied_discounts.length) {
                    var total_line_item_discount = 0;
                    for (var k = 0; k < order_product.applied_discounts.length; k++) {
                        var discount = order_product.applied_discounts[k];
                        discount.amount = parseFloat(discount.amount);
                        var internalid = DISCOUNT_ITEM_ID;
                        var key = discount.id;
                        var quantity = 1;
                        if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1) {
                            discount.amount = -Math.abs(discount.amount);
                        }
                        total_line_item_discount += discount.amount;
                        var price = discount.amount;
                        // Check if this is actually a coupon code by looking at "code" property.
                        if (discount.code != null && discount.code.length) {
                            key = discount.code;
                            internalid = COUPON_ITEM_ID;
                        } else {
                            quantity = order_product.quantity;
                            price /= quantity;
                        }
                        if (discount.name.match(/^AMCG/i)) {
                            internalid = AMCG_COUPON_ITEM_ID;
                        }
                        target_sales_order_data.items.push({
                            description: key + ' - ' + discount.name,
                            buydown_code: sku,
                            price: price,
                            is_discount: true,
                            quantity: quantity,
                            internalid: internalid,
                            product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                        });
                    }
                    // subtract discount amount from most recent order data item
                    if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) <= 1 && target_sales_order_data.items[order_product_index]) {
                        target_sales_order_data.items[order_product_index].price -= total_line_item_discount / order_product.quantity;
                    }
                }
                // Add rebates
                if (REBATE_VALUES_BY_SKU && REBATE_VALUES_BY_SKU[sku]) {
                    target_sales_order_data.items.push({
                        internalid: REBATE_ITEM_ID,
                        description: sku + ' Rebate',
                        quantity: order_product.quantity,
                        price: parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -REBATE_VALUES_BY_SKU[sku] : REBATE_VALUES_BY_SKU[sku],
                        product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                        buydown_code: sku
                    });
                }
                if (is_demand_response) {
                    target_sales_order_data.items.push({
                        internalid: REBATE_ITEM_ID,
                        description: sku + ' DR Enrollment Rebate',
                        quantity: order_product.quantity,
                        price: parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -REBATE_VALUES_BY_SKU[sku] : REBATE_VALUES_BY_SKU[sku],
                        product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                        buydown_code: sku + '-DR',
                    });
                    if (sale_price_line_item_index && target_sales_order_data.items[sale_price_line_item_index]) {
                        target_sales_order_data.items[sale_price_line_item_index].price += REBATE_VALUES_BY_SKU[sku];
                    }
                }
            }
            // Check for applied store credit
            var store_credit_applied = parseFloat(bc_order_data.store_credit_amount);
            if (STORE_CREDIT_ITEM_ID !== undefined && store_credit_applied > 0) {
                target_sales_order_data.items.push({
                    internalid: STORE_CREDIT_ITEM_ID,
                    description: 'Store Credit Applied',
                    quantity: 1,
                    price: -store_credit_applied,
                    product_line: null,
                });
            }
            return { sales_order_data: sales_order_data, dropship_sales_order_data: dropship_sales_order_data };
        }

        function formatMiraklOrderData(external_order_data) {

            Nlog.audit({
                title: 'formatMiraklOrderData',
                details: external_order_data,
            });

            var REBATE_VALUES_BY_SKU = {};
            if (REBATE_PRICE_LEVEL_ID) {
                REBATE_VALUES_BY_SKU = Nutils.getPriceMap(REBATE_PRICE_LEVEL_ID);
            }
            var RETAIL_PRICING_BY_SKU = {};
            if (RETAIL_PRICE_LEVEL_ID) {
                RETAIL_PRICING_BY_SKU = Nutils.getPriceMap(RETAIL_PRICE_LEVEL_ID);
            }
            var COPAY_PRICING_BY_SKU = {};
            if (COPAY_PRICE_LEVEL_ID) {
                COPAY_PRICING_BY_SKU = Nutils.getPriceMap(COPAY_PRICE_LEVEL_ID);
            }
            var PRODUCT_LINES_BY_SKU = Nutils.getProductLineMap();

            var dropship_sales_order_data;
            var sales_order_data = {
                custbody_external_account_id: external_order_data.customer.customer_id,
                order_number: external_order_data.order_id,
                location: SO_LOCATION,
                customer_id: CUSTOMER_ID,
                custbody_a1wms_dnloadtowms: DEFAULT_DOWNLOAD_TO_A1,
                order_status: NETSUITE_SALES_ORDER_STATUS,
                order_group: ORDER_GROUP,
                external_marketplace_name: MARKETPLACE_NAME,
                automatically_charge_for_shipping: AUTOMATICALLY_CHARGE_FOR_SHIPPING,
                free_shipping_minimum: FREE_SHIPPING_MINIMUM,
                shipping_cost: external_order_data.shipping_price,
                custbody_bol_comments_1: DISPATCHER_NOTES_1,
                custbody_bol_comments_2: DISPATCHER_NOTES_2,
                shipping_address: {},
                items: [],
                discounts: {},
            };

            // Whether to override default NS customer billing with BC billing
            if (USE_NS_CUSTOMER_DEFAULT_BILLING !== true) {
                sales_order_data.billing_address = Nutils.getNSAddressFromMiraklAddress(external_order_data.customer.billing_address);
            }

            // Get shipping address from URL
            if (external_order_data && external_order_data.customer.shipping_address) {
                var shipping_address = external_order_data.customer.shipping_address;
                sales_order_data.shipping_address = {
                    // id: shipping_address.id,
                    // attention: shipping_address.attention,
                    addressee: shipping_address.firstname + ' ' + shipping_address.lastname,
                    address1: shipping_address.street_1,
                    address2: shipping_address.street_2,
                    city: shipping_address.city,
                    state: shipping_address.state,
                    postal_code: shipping_address.zip_code,
                    country: shipping_address.country_iso_code,
                    phone: shipping_address.phone,
                };
                if (shipping_address.company !== undefined && shipping_address.company !== '' && shipping_address.company !== null) {
                    sales_order_data.shipping_address.attention = sales_order_data.shipping_address.addressee;
                    sales_order_data.shipping_address.addressee = shipping_address.company;
                }
            }

            var order_products = external_order_data.order_lines;
            for (var j = 0; j < order_products.length; j++) {
                var order_product = order_products[j];
                if (order_product.order_line_state === 'SHIPPING') {
                    var sku = order_product.offer_sku;
                    var original_sku = sku;
                    var is_demand_response = false;
                    var is_dropship = false;
                    if (SKU_OPTIONS_MAP[sku] !== undefined) {
                        is_demand_response = SKU_OPTIONS_MAP[sku].dr;
                        sku = SKU_OPTIONS_MAP[sku].sku;
                    }
                    if (SKU_SUBSTITUTION_MAP && SKU_SUBSTITUTION_MAP[sku]) {
                        sku = SKU_SUBSTITUTION_MAP[sku];
                    }
                    Nlog.debug({
                        title: 'SKU',
                        details: sku
                    });
                    // Check if dropshipping is enabled, and if this is a SKU we should dropshop
                    if (DROPSHIP_ENABLED && DROPSHIP_SKUS_MAP[sku]) {
                        is_dropship = true;
                        sku = DROPSHIP_SKUS_MAP[sku];
                        // Initialize dropship sales order data
                        if (dropship_sales_order_data === undefined || dropship_sales_order_data.items === undefined) {
                            // Copy sales order data to new dropship order
                            dropship_sales_order_data = JSON.parse(JSON.stringify(sales_order_data));
                            // Update location of copy to DROPSHIP
                            dropship_sales_order_data.location = DROPSHIP_SO_LOCATION;
                            // Initialize empty dropship items array
                            dropship_sales_order_data.items = [];
                        }
                    }
                    var sales_order_data_item = {
                        external_order_product_id: order_product.order_line_id,
                        sku: sku,
                        quantity: order_product.quantity,
                        is_demand_response: is_demand_response,
                        buydown_code: original_sku,
                    };
                    if (OVERRIDE_PRICE_LEVEL_ID) {
                        sales_order_data.price_level = OVERRIDE_PRICE_LEVEL_ID;
                    } else {
                        if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1) {
                            sales_order_data_item.price = RETAIL_PRICING_BY_SKU[sku];
                        } else {
                            sales_order_data_item.price = order_product.price;
                        }
                    }
                    if (is_dropship) {
                        Nlog.debug({
                            title: 'Adding sales_order_data_item to dropship_sales_order_data.items',
                            details: sales_order_data_item
                        });
                        dropship_sales_order_data.items.push(sales_order_data_item);
                    } else {
                        Nlog.debug({
                            title: 'Adding sales_order_data_item to sales_order_data.items',
                            details: sales_order_data_item
                        })
                        sales_order_data.items.push(sales_order_data_item);
                    }
                    var order_product_index = sales_order_data.items.length - 1;
                    var sale_price_line_item_index;
                    // Check for sale pricing
                    var bc_price = parseFloat(order_product.price_ex_tax);
                    var ns_price = parseFloat(COPAY_PRICING_BY_SKU[sku]);
                    if (is_demand_response) {
                        bc_price += parseFloat(REBATE_VALUES_BY_SKU[sku]);
                    }
                    if (!isNaN(bc_price) && !isNaN(ns_price)) {
                        if (bc_price != ns_price) {
                            Nlog.debug({
                                title: 'price level and bc price mismatch',
                                details: {
                                    bc: bc_price,
                                    ns: ns_price
                                }
                            });
                            sales_order_data.items.push({
                                description: sku + ' Sale Price Discount',
                                buydown_code: sku,
                                price: parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -(ns_price - bc_price) : ns_price - bc_price,
                                is_discount: true,
                                internalid: DISCOUNT_ITEM_ID,
                                quantity: order_product.quantity,
                                product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                            });
                            sale_price_line_item_index = sales_order_data.items.length - 1;
                        }

                    }
                    // Add discounts
                    if (order_product.order_line_additional_fields.length) {
                        var total_line_item_discount = 0;
                        for (var k = 0; k < order_product.order_line_additional_fields.length; k++) {
                            var discount = order_product.order_line_additional_fields[k];
                            if (discount.code === 'disabled-rebate-discount') {
                                discount.amount = parseFloat(discount.amount);
                                var internalid = DISCOUNT_ITEM_ID;
                                var key = discount.id;
                                var quantity = 1;
                                if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1) {
                                    discount.amount = -Math.abs(discount.amount);
                                }
                                total_line_item_discount += discount.amount;
                                var price = discount.amount;
                                // Check if this is actually a coupon code by looking at "code" property.
                                if (discount.code != null && discount.code.length) {
                                    key = discount.code;
                                    internalid = COUPON_ITEM_ID;
                                } else {
                                    quantity = order_product.quantity;
                                    price /= quantity;
                                }
                                if (discount.name.match(/^AMCG/i)) {
                                    internalid = AMCG_COUPON_ITEM_ID;
                                }
                                sales_order_data.items.push({
                                    description: key + ' - ' + discount.name,
                                    buydown_code: sku,
                                    price: price,
                                    is_discount: true,
                                    quantity: quantity,
                                    internalid: internalid,
                                    product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                                });
                            }
                        }
                        // subtract discount amount from most recent order data item
                        if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) <= 1 && sales_order_data.items[order_product_index]) {
                            sales_order_data.items[order_product_index].price -= total_line_item_discount / order_product.quantity;
                        }
                    }
                    // Add rebates
                    if (REBATE_VALUES_BY_SKU[sku]) {
                        sales_order_data.items.push({
                            internalid: REBATE_ITEM_ID,
                            description: sku + ' Rebate',
                            quantity: order_product.quantity,
                            price: parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -REBATE_VALUES_BY_SKU[sku] : REBATE_VALUES_BY_SKU[sku],
                            product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                            buydown_code: sku
                        });
                    }
                    if (is_demand_response && REBATE_VALUES_BY_SKU[sku]) {
                        sales_order_data.items.push({
                            internalid: REBATE_ITEM_ID,
                            description: sku + ' DR Enrollment Rebate',
                            quantity: order_product.quantity,
                            price: parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1 ? -REBATE_VALUES_BY_SKU[sku] : REBATE_VALUES_BY_SKU[sku],
                            product_line: ADD_PRODUCT_LINE_TO_CHARGES ? PRODUCT_LINES_BY_SKU[sku] : null,
                            buydown_code: sku + '-DR',
                        });
                        if (sale_price_line_item_index && sales_order_data.items[sale_price_line_item_index]) {
                            sales_order_data.items[sale_price_line_item_index].price += REBATE_VALUES_BY_SKU[sku];
                        }
                    }
                }
            }
            return { sales_order_data: sales_order_data, dropship_sales_order_data: dropship_sales_order_data };
        }

        function formatICFVHECOrderData(external_order_data) {

            Nlog.audit({
                title: 'formatICFVHECOrderData',
                details: external_order_data,
            });

            var SKUS_NEEDING_TAPE = ['N2915BN', 'N2915CH', 'N2915C-V', 'N2915-V', 'N2515CH', 'N9615CH', 'N2945CH'];
            var TAPE_SKU = 'PT060';

            var REBATE_VALUES_BY_SKU = {};
            if (REBATE_PRICE_LEVEL_ID) {
                REBATE_VALUES_BY_SKU = Nutils.getPriceMap(REBATE_PRICE_LEVEL_ID);
            }
            var RETAIL_PRICING_BY_SKU = {};
            if (RETAIL_PRICE_LEVEL_ID) {
                RETAIL_PRICING_BY_SKU = Nutils.getPriceMap(RETAIL_PRICE_LEVEL_ID);
            }
            var COPAY_PRICING_BY_SKU = {};
            if (COPAY_PRICE_LEVEL_ID) {
                COPAY_PRICING_BY_SKU = Nutils.getPriceMap(COPAY_PRICE_LEVEL_ID);
            }
            var PRODUCT_LINES_BY_SKU = Nutils.getProductLineMap();

            var dropship_sales_order_data = {};
            var sales_order_data = {
                order_number: external_order_data.order_number,
                location: SO_LOCATION,
                customer_id: CUSTOMER_ID,
                custbody_a1wms_dnloadtowms: DEFAULT_DOWNLOAD_TO_A1,
                order_status: NETSUITE_SALES_ORDER_STATUS,
                custbody_external_order_source: external_order_data.order_source,
                order_group: ORDER_GROUP,
                external_marketplace_name: MARKETPLACE_NAME,
                automatically_charge_for_shipping: AUTOMATICALLY_CHARGE_FOR_SHIPPING,
                free_shipping_minimum: FREE_SHIPPING_MINIMUM,
                shipping_cost: DEFAULT_SHIPPING_COST,
                custbody_bol_comments_1: DISPATCHER_NOTES_1,
                custbody_bol_comments_2: DISPATCHER_NOTES_2,
                shipping_address: {},
                items: [],
                discounts: {},
            };

            // Whether to override default NS customer billing with BC billing
            if (USE_NS_CUSTOMER_DEFAULT_BILLING !== true) {
                sales_order_data.billing_address = external_order_data.shipping_address;
            }

            // Get shipping address from URL
            if (external_order_data && external_order_data.shipping_address) {
                var shipping_address = external_order_data.shipping_address;
                sales_order_data.shipping_address = {
                    attention: shipping_address.attention,
                    addressee: shipping_address.addressee,
                    address1: shipping_address.address1,
                    address2: shipping_address.address2,
                    city: shipping_address.city,
                    state: shipping_address.state,
                    postal_code: shipping_address.postal_code,
                    country: shipping_address.country,
                    phone: shipping_address.phone,
                };
                if (shipping_address.company !== undefined && shipping_address.company !== '' && shipping_address.company !== null) {
                    sales_order_data.shipping_address.attention = sales_order_data.shipping_address.addressee;
                    sales_order_data.shipping_address.addressee = shipping_address.company;
                }
            }

            var order_products = external_order_data.items;
            var add_tape_quantity = 0;
            for (var j = 0; j < order_products.length; j++) {
                var order_product = order_products[j];
                var sku = order_product.sku;
                var original_sku = sku;
                if (SKU_SUBSTITUTION_MAP && SKU_SUBSTITUTION_MAP[sku]) {
                    sku = SKU_SUBSTITUTION_MAP[sku];
                }
                var sales_order_data_item = {
                    sku: sku,
                    quantity: order_product.quantity,
                };
                if (OVERRIDE_PRICE_LEVEL_ID) {
                    sales_order_data.price_level = OVERRIDE_PRICE_LEVEL_ID;
                } else {
                    if (parseFloat(SALES_ORDER_TEMPLATE_VERSION) > 1) {
                        sales_order_data_item.price = RETAIL_PRICING_BY_SKU[sku];
                    } else {
                        sales_order_data_item.price = order_product.price;
                    }
                }
                if (SKUS_NEEDING_TAPE.indexOf(sku) >= 0) {
                    add_tape_quantity += order_product.quantity;
                }
                sales_order_data.items.push(sales_order_data_item);
                var order_product_index = sales_order_data.items.length - 1;
                var sale_price_line_item_index;
            }
            if (add_tape_quantity > 0) {
                sales_order_data.items.push({
                    sku: TAPE_SKU,
                    quantity: add_tape_quantity,
                    price: 0
                });
            }
            sales_order_data.items.push({
                sku: 'ICF Miscellaneous Fee',
                quantity: 1,
                price: RETAIL_PRICING_BY_SKU['ICF Miscellaneous Fee'],
            });
            return { sales_order_data: sales_order_data, dropship_sales_order_data: dropship_sales_order_data };
        }

        function handlePost(request) {
            Nlog.audit({
                title: 'handlePost',
                details: request
            });
            var external_order_data = request;
            var results = [];
            if (external_order_data.order_format === 'BigCommerce') {
                var response = formatBigCommerceOrderData(external_order_data);
                var sales_order_data = response.sales_order_data;
                var dropship_sales_order_data = response.dropship_sales_order_data;
            } else if (external_order_data.order_format === 'Mirakl') {
                var response = formatMiraklOrderData(external_order_data);
                var sales_order_data = response.sales_order_data;
                var dropship_sales_order_data = response.dropship_sales_order_data;
            } else if (external_order_data.order_format === 'ICF-VHEC') {
                var response = formatICFVHECOrderData(external_order_data);
                var sales_order_data = response.sales_order_data;
                var dropship_sales_order_data = response.dropship_sales_order_data;
            }
            Nlog.debug({
                title: 'sales_order_data',
                details: sales_order_data
            });
            Nlog.debug({
                title: 'dropship_sales_order_data',
                details: dropship_sales_order_data
            });
            if (sales_order_data && sales_order_data.items && sales_order_data.items.length > 0) {
                results.push(Nutils.createSalesOrder(sales_order_data));
            }
            if (dropship_sales_order_data && dropship_sales_order_data.items && dropship_sales_order_data.items.length > 0) {
                results.push(Nutils.createSalesOrder(dropship_sales_order_data));
            }
            return results;
        }

        function handleGet(request) {
            Nlog.audit({
                title: 'handleGet',
                details: request,
            });
            var sales_orders = Nutils.getSalesOrders(CUSTOMER_ID, request.order_number, true);
            return sales_orders;
        }

        return {
            get: handleGet,
            post: handlePost
        }
    }
);