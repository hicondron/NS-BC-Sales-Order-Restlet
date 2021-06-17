define(['N/record', 'N/search', 'N/log'], function (Nrecord, Nsearch, Nlog) {

  function searchForExistingCouponCode(code) {
    var coupon_code_based_search = Nsearch.create({
      type: "transaction",
      filters: [
        ["custbody_external_coupon_code", "is", code],
      ],
      columns: ["entity", "item", "quantity", Nsearch.createColumn({
        name: "class",
        join: "item",
      })],
    });
    return coupon_code_based_search.runPaged().count > 0;
  }

  function getExternalId(sales_order_data) {
    return [sales_order_data.location, sales_order_data.customer_id, sales_order_data.order_number.toString()].join('-');
  };

  function getLegacyExternalId(sales_order_data) {
    return [sales_order_data.customer_id, sales_order_data.order_number.toString()].join('-#');
  };

  function getItemIDFromSKU(sku, search_filter) {
    if (sku == undefined) {
      throw 'MissingSkuError: ' + sku + search_filter;
      return false;
    }
    var item_sku_id_map = {};
    var filters = [];
    filters.push(['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Assembly', 'Kit', 'OthCharge']);
    if (search_filter !== undefined) {
      filters.push('AND');
      filters.push(search_filter);
    }
    var item_search = Nsearch.create({
      type: 'item',
      filters: filters,
      columns:
        [
          'itemid',
          'internalid',
        ]
    });
    var search_results = item_search.run();
    var page_size = 1000;
    var length = item_search.runPaged().count;
    for (var i = 0; i < length; i += page_size) {
      var paged_search_results = search_results.getRange(i, Math.min(length, i + page_size));
      for (var j = 0; j < paged_search_results.length; j++) {
        var result = paged_search_results[j];
        item_sku_id_map[result.getValue('itemid').trim().toUpperCase()] = result.getValue('internalid');
      }
    }
    return item_sku_id_map[sku.toUpperCase()];
  }

  function getPriceMap(price_level) {
    var item_price_map = {};
    var item_search = Nsearch.create({
      type: "item",
      filters:
        [
          ["pricing.pricelevel", "anyof", price_level],
        ],
      columns:
        [
          "itemid",
          Nsearch.createColumn({
            name: "unitprice",
            join: "pricing"
          })
        ]
    });
    var search_results = item_search.run();
    var page_size = 1000;
    var length = item_search.runPaged().count;
    for (var i = 0; i < length; i += page_size) {
      var paged_search_results = search_results.getRange(i, Math.min(length, i + page_size));
      for (var j = 0; j < paged_search_results.length; j++) {
        var result = paged_search_results[j];
        var price = parseFloat(result.getValue({ name: 'unitprice', join: 'pricing' }));
        if (!isNaN(price)) {
          item_price_map[result.getValue('itemid')] = price;
        }
      }
    }
    return item_price_map;
  }
  function getProductLineMap() {
    var item_product_line_map = {};
    var item_search = Nsearch.create({
      type: 'item',
      filters:
        [
          ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Assembly', 'Kit', 'OthCharge'],
        ],
      columns:
        [
          'itemid',
          'class',
        ]
    });
    var search_results = item_search.run();
    var page_size = 1000;
    var length = item_search.runPaged().count;
    for (var i = 0; i < length; i += page_size) {
      var paged_search_results = search_results.getRange(i, Math.min(i + page_size, length));
      for (var j = 0; j < paged_search_results.length; j++) {
        var result = paged_search_results[j];
        item_product_line_map[result.getValue('itemid').trim()] = result.getValue('class');
      }
    }
    return item_product_line_map;
  }
  function getProductLineFromSKU(sku) {
    var item_product_line_map = {};
    var item_search = Nsearch.create({
      type: 'item',
      filters:
        [
          ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Assembly', 'Kit', 'OthCharge'],
        ],
      columns:
        [
          'itemid',
          'class',
        ]
    });
    var search_results = item_search.run();
    var page_size = 1000;
    var length = item_search.runPaged().count;
    for (var i = 0; i < length; i += page_size) {
      var paged_search_results = search_results.getRange(i, Math.min(i + page_size, length));
      for (var j = 0; j < paged_search_results.length; j++) {
        var result = paged_search_results[j];
        item_product_line_map[result.getValue('itemid').trim()] = result.getValue('class');
      }
    }
    return item_product_line_map[sku];
  }

  function getNSAddressFromBCAddress(bc_address) {

    var ns_address = {
      attention: null,
      addressee: [bc_address.first_name, bc_address.last_name].join(' '),
      address1: bc_address.street_1,
      address2: bc_address.street_2,
      city: bc_address.city,
      state: bc_address.state,
      zip: bc_address.zip,
      country: bc_address.country_iso2,
      phone: bc_address.phone,
      email: bc_address.email,

    };
    if (bc_address.company && ns_address.addressee) {
      ns_address.attention = ns_address.addressee;
      ns_address.addressee = bc_address.company;
    }
    return ns_address;
  }

  function getNSAddressFromMiraklAddress(mirakl_address) {
    var ns_address = {
      attention: null,
      addressee: [mirakl_address.firstname, mirakl_address.lastname].join(' '),
      address1: mirakl_address.street_1,
      address2: mirakl_address.street_2,
      city: mirakl_address.city,
      state: mirakl_address.state,
      zip: mirakl_address.zip_code,
      country: mirakl_address.country_iso_code,
      phone: mirakl_address.phone,
    };
    if (mirakl_address.company && ns_address.addressee) {
      ns_address.attention = ns_address.addressee;
      ns_address.addressee = mirakl_address.company;
    }
    return ns_address;
  }


  function getSalesOrders(customer_id, order_number) {
    Nlog.debug({
      title: 'getSalesOrders',
      details: {
        customer_id: customer_id,
        order_number: order_number
      }
    });
    var sales_orders = [];
    Nsearch.create({
      type: "customer",
      filters:
        [
          ["internalid", "anyof", customer_id],
          "AND",
          ["transaction.otherrefnum", "equalto", order_number],
          "AND",
          ["transaction.mainline", "is", "T"],
          "AND",
          ["transaction.type", "anyof", "SalesOrd"]
        ],
      columns:
        [
          "internalid",
          Nsearch.createColumn({
            name: "internalid",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "location",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "externalid",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "trandate",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "tranid",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "otherrefnum",
            join: "transaction"
          }),
          Nsearch.createColumn({
            name: "statusref",
            join: "transaction"
          })
        ]
    }).run().each(function (result) {
      sales_orders.push({
        customer_id: result.id,
        id: result.getValue({ join: 'transaction', name: 'internalid' }),
        location: result.getValue({ join: 'transaction', name: 'location' }),
        order_date: result.getValue({ join: 'transaction', name: 'trandate' }),
        document_number: result.getValue({ join: 'transaction', name: 'tranid' }),
        po_number: result.getValue({ join: 'transaction', name: 'otherrefnum' }),
        status: result.getValue({ join: 'transaction', name: 'statusref' }),
        fulfillments: getItemFulfillments(result.getValue({ join: 'transaction', name: 'internalid' })),
      });
      return true;
    });
    return sales_orders;
  }

  function getSalesOrderData(external_id, location) {
    // Check for existing sales order
    var sales_order;
    var carrier_column = Nsearch.createColumn({
      name: 'custbody_actual_ship_method',
      join: 'fulfillingTransaction'
    });
    var filters = [
      ['externalid', 'anyof', external_id],
    ];
    if (location !== undefined) {
      filters.push([
        'location', 'anyof', location
      ]);
    }
    Nsearch.create({
      type: 'salesorder',
      filters: filters,
      columns:
        [
          'internalid',
          'externalid',
          'tranid',
          'otherrefnum',
          'status',
          'trandate',
          'trackingnumbers',
          'fulfillingtransaction',
          carrier_column,
        ]
    }).run().each(function (result) {
      sales_order = {
        id: result.id,
        order_date: result.getValue('trandate'),
        document_number: result.getValue('tranid'),
        po_number: result.getValue('otherrefnum'),
        status: result.getValue('status'),
      };
      return true;
    });
    return sales_order;
  }

  function getItemFulfillments(sales_order_id) {
    var fulfillments = [];
    Nsearch.create({
      type: 'transaction',
      filters:
        [
          ["createdfrom", "anyof", sales_order_id],
          "AND",
          ["recordtype", "is", "itemfulfillment"],
          "AND",
          ["mainline", "is", "T"],
        ],
      columns:
        [
          'internalid',
          'tranid',
          'trandate',
          'serialnumbers',
          'custbody_actual_ship_method'
        ]
    }).run().each(function (result) {
      var item_fulfillment_record = Nrecord.load({
        type: 'itemfulfillment',
        id: result.getValue('internalid'),
      });
      var fulfillment = {
        id: result.getValue('internalid'),
        document_number: result.getValue('tranid'),
        date: result.getValue('trandate'),
        tracking_numbers: [],
        items: [],
        carrier: '',
      };
      if (item_fulfillment_record.getValue('custbody_actual_ship_method')) {
        fulfillment.carrier = item_fulfillment_record.getValue('custbody_actual_ship_method');
      }
      for (var i = 0; i < item_fulfillment_record.getLineCount('package'); i++) {
        fulfillment.tracking_numbers.push(item_fulfillment_record.getSublistValue('package', 'packagetrackingnumber', i));
      }
      for (var i = 0; i < item_fulfillment_record.getLineCount('item'); i++) {
        var order_product_id = item_fulfillment_record.getSublistValue('item', 'custcol_external_order_product_id', i);
        if (order_product_id && order_product_id.length > 0) {
          var item_object = {
            sku: item_fulfillment_record.getSublistValue('item', 'itemname', i),
            quantity: item_fulfillment_record.getSublistValue('item', 'quantity', i),
            order_product_id: order_product_id,
            custcol_is_demand_response: item_fulfillment_record.getSublistValue('item', 'custcol_is_demand_response', i),
          };
          // Get Serial Numbers from either native column or custom column for scan-at-pick inventory
          var legacy_serialnumbers = item_fulfillment_record.getSublistValue('item', 'serialnumbers', i);
          var serialnumberstext = item_fulfillment_record.getSublistValue('item', 'custcol_fulfillment_serial_numbers', i);
          if (legacy_serialnumbers && legacy_serialnumbers.length) {
            item_object.serialnumbers = legacy_serialnumbers;
          }
          if (serialnumberstext && serialnumberstext.length) {
            item_object.serialnumbers = serialnumberstext.split(/\n|\<br\>|, |,| /gi);
          }
          fulfillment.items.push(item_object);
        }
      }
      fulfillments.push(fulfillment);
      return true;
    });
    return fulfillments;
  }

  function createSalesOrder(sales_order_data) {

    /*
     * sales_order_data fields: (! = required)
     * 
     *  customer_id!
     *  order_number!
     *  items!
     *  shipping_address!
     *    country!
     *    postal_code!
     *    city!
     *    state!
     *    attention
     *    addressee!
     *    address1!
     *    address2
     *    address_phone
     *    email 
     */


    var state_abbreviation_map = {
      "Alabama": "AL",
      "Alaska": "AK",
      "Arizona": "AZ",
      "Arkansas": "AR",
      "Armed Forces Americas": "AA",
      "Armed Forces Europe": "AE",
      "Armed Forces Pacific": "AP",
      "California": "CA",
      "Colorado": "CO",
      "Connecticut": "CT",
      "Delaware": "DE",
      "District of Columbia": "DC",
      "Florida": "FL",
      "Georgia": "GA",
      "Hawaii": "HI",
      "Idaho": "ID",
      "Illinois": "IL",
      "Indiana": "IN",
      "Iowa": "IA",
      "Kansas": "KS",
      "Kentucky": "KY",
      "Louisiana": "LA",
      "Maine": "ME",
      "Maryland": "MD",
      "Massachusetts": "MA",
      "Michigan": "MI",
      "Minnesota": "MN",
      "Mississippi": "MS",
      "Missouri": "MO",
      "Montana": "MT",
      "Nebraska": "NE",
      "Nevada": "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      "Ohio": "OH",
      "Oklahoma": "OK",
      "Oregon": "OR",
      "Pennsylvania": "PA",
      "Puerto Rico": "PR",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      "Tennessee": "TN",
      "Texas": "TX",
      "Utah": "UT",
      "Vermont": "VT",
      "Virginia": "VA",
      "Washington": "WA",
      "West Virginia": "WV",
      "Wisconsin": "WI",
      "Wyoming": "WY"
    };

    // Check for sales_order_data
    if (sales_order_data === undefined) {
      throw 'Missing sales_order_data';
    }

    // Set defaults
    var DEFAULT_SO_ORDER_QUEUE = 1; // SO ORDER QUEUE: Ready
    var DEFAULT_ORDER_PRIORITY = 1; // ORDER PRIORITY: 3-Standard
    var DEFAULT_ORDER_GROUP = 1; // A1 ORDER GROUP: Bulk
    var DEFAULT_LOCATION = 1; // LOCATION: Charleston
    var DEFAULT_FOB = 2; // FOB: AMC Delivered
    var FIXED_SHIPPING_COST_FOB = 7; // Fixed Quoted Freight FOB
    var DEFAULT_PHONE_NUMBER = '999-999-9999';

    // Define required fields
    var required_fields = ['customer_id', 'order_number', 'items', 'shipping_address'];
    var required_shipping_fields = ['country', 'postal_code', 'city', 'state', 'addressee', 'address1'];

    // Check for required fields
    for (var i = 0; i < required_fields.length; i++) {
      var field = required_fields[i];
      if (sales_order_data[field] === undefined) {
        Nlog.error({
          title: 'Missing required field',
          details: field,
        })
        throw 'Missing required field';
      }
    }

    // Check for required shipping fields
    for (var i = 0; i < required_shipping_fields.length; i++) {
      var field = required_shipping_fields[i];
      if (sales_order_data['shipping_address'][field] === undefined) {
        Nlog.error({
          title: 'Missing required shipping field',
          details: {
            field: field,
            data: sales_order_data['shipping_address'],
          }
        });
        throw 'Missing required shipping field';
      }
    }

    var external_id = getExternalId(sales_order_data);
    var existing_order = getSalesOrderData(external_id);

    if (existing_order === undefined) {
      external_id = getLegacyExternalId(sales_order_data);
      existing_order = getSalesOrderData(external_id);
    }

    if (existing_order) {
      // Append data to response
      existing_order.order_number = sales_order_data.order_number;
      existing_order.existing = true;
      existing_order.message = 'A Sales Order already exists at: ' + external_id;
      // Append fulfillments to response
      existing_order.fulfillments = getItemFulfillments(existing_order.id);
      return existing_order;
    }

    // Create sales order record
    var sales_order = Nrecord.create({
      type: Nrecord.Type.SALES_ORDER,
      defaultValues: {
        entity: sales_order_data.customer_id,
      },
      isDynamic: true,
    });

    // Assign external ID
    sales_order_data.externalid = getExternalId(sales_order_data);
    // Assign PO Number
    if (sales_order_data.otherrefnum === undefined) {
      sales_order_data.otherrefnum = sales_order_data.order_number; // getExternalId(sales_order_data);
    }

    // Set required fields.
    if (sales_order_data.items === undefined || sales_order_data.items.length < 1) {
      Nlog.error({
        title: 'Missing item data',
        details: sales_order_data
      })
      throw 'Missing item data';
    }
    var required_fields = {
      externalid: sales_order_data.externalid,
      custbody_customer: sales_order_data.customer_id,
      custbody1: sales_order_data.so_order_queue || DEFAULT_SO_ORDER_QUEUE,
      custbody_priority: sales_order_data.priority || DEFAULT_ORDER_PRIORITY,
      custbody_order_group: sales_order_data.order_group || DEFAULT_ORDER_GROUP,
      custbody_fob: sales_order_data.fob || DEFAULT_FOB,
      location: sales_order_data.location || DEFAULT_LOCATION,
      //            po_value: sales_order_data.po_number,
    };
    for (var field in required_fields) {
      if (required_fields[field] !== undefined) {
        sales_order.setValue({
          fieldId: field,
          value: required_fields[field]
        });
      } else {
        Nlog.error({
          title: 'Error - missing required field',
          details: {
            field: field,
          }
        })
        throw 'Missing required field: ' + field;
      }
    }
    var optional_fields = {
      orderstatus: sales_order_data.order_status,
      custbody_bol_comments_1: sales_order_data.custbody_bol_comments_1,
      custbody_bol_comments_2: sales_order_data.custbody_bol_comments_2,
      custbody_a1wms_dnloadtowms: sales_order_data.custbody_a1wms_dnloadtowms,
      custbody_external_marketplace_name: sales_order_data.external_marketplace_name,
      custbody_is_residential: sales_order_data.is_residential,
      custbody_external_coupon_code: sales_order_data.external_coupon_code,
      custbody_created_by_script_id: sales_order_data.custbody_created_by_script_id,
      otherrefnum: sales_order_data.otherrefnum,
      custbody_external_order_json: sales_order_data.custbody_external_order_json,
      custbody_external_account_id: sales_order_data.custbody_external_account_id,
      custbody_external_customer_email: sales_order_data.custbody_external_customer_email,
      custbody_external_order_source: sales_order_data.order_source,
    }
    for (var field in optional_fields) {
      if (optional_fields[field] !== undefined) {
        sales_order.setValue({
          fieldId: field,
          value: optional_fields[field]
        });
      }
    }
    var custom_fields = sales_order_data.custom_fields;
    for (var field in custom_fields) {
      if (custom_fields[field] !== undefined) {
        salesOrder.setValue({
          fieldId: field,
          value: custom_fields[field],
        });
      }
    }

    var errors = [];

    try {
      // Commit inventory items to sales order.
      function commitNewItem(sales_order, item) {
        sales_order.selectNewLine('item');

        // Assign internal ID and product line
        if (item.internalid === undefined) {
          item.internalid = getItemIDFromSKU(item.sku);
        }
        if (item.product_line === undefined) {
          item.product_line = getProductLineFromSKU(item.sku);
        }

        // Check for required fields
        var required_fields = ['internalid', 'quantity', 'product_line'];
        for (var i = 0; i < required_fields.length; i++) {
          var field = required_fields[i];
          if (item[field] === undefined) {
            Nlog.error({
              title: 'Missing item required field',
              details: {
                required_fields: required_fields,
                item: item,
                field: field,
              }
            })
            throw 'Missing item required field';
          }
        }

        // Set item id
        sales_order.setCurrentSublistValue('item', 'item', item.internalid);
        // Set quantity
        sales_order.setCurrentSublistValue('item', 'quantity', item.quantity);
        // Set customer
        sales_order.setCurrentSublistValue('item', 'custbody_customer', sales_order_data.customer_id);
        // Set quantity multiplier
        if (item.quantity_multiplier !== undefined) {
          sales_order.setCurrentSublistValue('item', 'custcol_mpc_quantity_multiplier', item.quantity_multiplier);
        }
        // External SKU
        if (item.external_sku !== undefined) {
          sales_order.setCurrentSublistValue('item', 'custcol_external_sku', item.external_sku);
        }
        // Set Product Line
        sales_order.setCurrentSublistValue('item', 'class', item.product_line);
        // Optional properties
        // Set Customer Part Number if applicable
        if (item.hasOwnProperty('customer_part_number_id')) {
          sales_order.setCurrentSublistValue('item', 'custcol_scm_customerpartnumber', item.customer_part_number_id);
        }
        // Set price level
        if (item.hasOwnProperty('price_level')) {
          sales_order.setCurrentSublistValue('item', 'price', item.price_level);
        } else {
          sales_order.setCurrentSublistValue('item', 'price', -1);
        }
        if (item.hasOwnProperty('price')) {
          sales_order.setCurrentSublistValue('item', 'rate', item.price);
        }
        if (item.hasOwnProperty('description')) {
          sales_order.setCurrentSublistValue('item', 'description', item.description);
        }
        if (item.hasOwnProperty('is_discount')) {
          sales_order.setCurrentSublistValue('item', 'custcol_is_discount', item.is_discount);
        }
        // If demand response
        if (item.is_demand_response) {
          sales_order.setCurrentSublistValue('item', 'custcol_is_demand_response', item.is_demand_response);
        }
        if (item.hasOwnProperty('buydown_code')) {
          sales_order.setCurrentSublistValue('item', 'custcol2', item.buydown_code);
          sales_order.setCurrentSublistValue('item', 'custcol2_2', item.buydown_code);
        }
        if (item.hasOwnProperty('external_order_product_id')) {
          sales_order.setCurrentSublistValue('item', 'custcol_external_order_product_id', item.external_order_product_id);
        }
        sales_order.commitLine('item');
      }

      // Commit items from sales_order_data to sales_order
      for (var i = 0; i < sales_order_data.items.length; i++) {
        commitNewItem(sales_order, sales_order_data.items[i]);
      }

      // Commit discounts from sales_order_data to sales_order
      for (var discount in sales_order_data.discounts) {
        if (sales_order_data.discounts.hasOwnProperty(discount)) {
          commitNewItem(sales_order, sales_order_data.discounts[discount]);
        }
      }

      // Set address info
      function setAddress(sales_order, address, address_type) {
        var address_phone;
        var address_subrecord_type;
        if (address_type === 'ship') {
          address_subrecord_type = 'shippingaddress';
        } else {
          address_subrecord_type = 'billingaddress';
        }
        if (address.phone) {
          address_phone = address.phone.match(/\d+/g);
        }
        if (address_phone && address_phone.length) {
          address_phone = address_phone.join('').substr(0, 10);
        }
        else {
          address_phone = DEFAULT_PHONE_NUMBER;
        }
        if (address_phone == undefined || address_phone.length < 10) {
          address_phone = DEFAULT_PHONE_NUMBER || '555-555-5555';
        }
        if (state_abbreviation_map[address.state]) {
          address.state = state_abbreviation_map[address.state];
        }
        var address_sub_record = sales_order.getSubrecord({
          fieldId: address_subrecord_type
        });
        address_sub_record.setValue({
          fieldId: 'country',
          value: 'US',
        });
        address_sub_record.setValue({
          fieldId: 'zip',
          value: address.postal_code
        });
        address_sub_record.setValue({
          fieldId: 'city',
          value: address.city
        });
        address_sub_record.setValue({
          fieldId: 'state',
          value: address.state
        });
        address_sub_record.setValue({
          fieldId: 'attention',
          value: address.attention
        });
        address_sub_record.setValue({
          fieldId: 'addressee',
          value: address.addressee
        });
        address_sub_record.setValue({
          fieldId: 'addr1',
          value: address.address1
        });
        address_sub_record.setValue({
          fieldId: 'addr2',
          value: address.address2 || ''
        });
        address_sub_record.setValue({
          fieldId: 'isresidential',
          value: true,
        });
        address_sub_record.setValue({
          fieldId: 'addrphone',
          value: address_phone,
        });
        address_sub_record.setValue({
          fieldId: 'email',
          value: address.email
        });
        sales_order.setValue(address_type + 'address', address_sub_record.getValue('addrtext'));
      }

      // Set shipping address
      if (sales_order_data.shipping_address) {
        sales_order.setValue('shipaddresslist', '');
        setAddress(sales_order, sales_order_data.shipping_address, 'ship');
      }

      // Set billing address
      if (sales_order_data.billing_address) {
        sales_order.setValue('billaddresslist', '');
        setAddress(sales_order, sales_order_data.billing_address, 'bill');
      }

      // Set shipping cost from order total
      if (sales_order_data.automatically_charge_for_shipping && parseFloat(sales_order.getValue('subtotal')) < sales_order_data.free_shipping_minimum) {
        sales_order.setValue('shippingcost', sales_order_data.shipping_cost);
        sales_order.setValue('custbody_fob', FIXED_SHIPPING_COST_FOB);
      } else if (sales_order_data.automatically_charge_for_shipping === false && sales_order_data.shipping_cost !== undefined) {
        sales_order.setValue('shippingcost', sales_order_data.shipping_cost);
        sales_order.setValue('custbody_fob', FIXED_SHIPPING_COST_FOB);
      }
    }
    catch (e) {
      errors.push(e);
      Nlog.error({
        title: 'error',
        details: e
      });
    }

    if (errors.length > 0) {
      return {
        sales_order_id: null,
        order_number: null,
        existing: null,
        error: errors.join(', '),
      };
    } else {
      try {
        var sales_order_id = sales_order.save({
          ignoreMandatoryFields: false,
        });
        Nlog.audit({
          title: 'saved sales order to ' + sales_order_id,
          details: 'https://system.na2.netsuite.com/app/accounting/transactions/salesord.nl?id=' + sales_order_id
        });
        return {
          id: sales_order_id,
          status: sales_order.getValue('orderstatus') === 'A' ? 'pendingApproval' : 'pendingFulfillment',
          order_number: sales_order_data.order_number,
          existing: false,
        };
      }
      catch (e) {
        Nlog.error({
          title: 'Error saving sales order',
          details: e,
        });
        return {
          sales_order_id: null,
          order_number: null,
          existing: null,
          error: e
        };
      }
    }
  }
  return {
    createSalesOrder: createSalesOrder,
    getItemIDFromSKU: getItemIDFromSKU,
    searchForExistingCouponCode: searchForExistingCouponCode,
    getPriceMap: getPriceMap,
    getProductLineMap: getProductLineMap,
    getNSAddressFromBCAddress: getNSAddressFromBCAddress,
    getNSAddressFromMiraklAddress: getNSAddressFromMiraklAddress,
    getExternalId: getExternalId,
    getSalesOrderData: getSalesOrderData,
    getSalesOrders: getSalesOrders,
    getItemFulfillments: getItemFulfillments,
  }
});