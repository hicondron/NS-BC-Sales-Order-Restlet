/**
 * @NApiVersion 2.x
 * @NScriptType restlet
 */

define(['N/search', 'N/record', 'N/log', 'N/render', 'N/encode', 'N/email', 'N/runtime'], function (Nsearch, Nrecord, Nlog, Nrender, Nencode, Nemail, Nruntime) {

  var current_script = Nruntime.getCurrentScript();
  var DISPATCHER_NOTES = current_script.getParameter({ name: 'custscript_oar_dispatcher_notes' });
  var PRICE_LEVEL_ID = current_script.getParameter({ name: 'custscript_oar_price_level_id' });

  // Constants
  var DEFAULT_SO_ORDER_QUEUE = 1; // SO ORDER QUEUE: Ready
  var DEFAULT_ORDER_PRIORITY = 1; // ORDER PRIORITY: 3-Standard
  var DEFAULT_ORDER_GROUP = 1; // A1 ORDER GROUP: Bulk
  var DEFAULT_FOB = 2; // FOB: AMC Delivered
  //  var DEFAULT_LOCATION = 1; // LOCATION: Charleston
  var DEFAULT_LOCATION = 2; // LOCATION: E-Commerce
  var DEFAULT_SHIPPING_PHONE = '888-513-3005'; // AMCG Phone # for A1 shipping requirements 
  var FIXED_SHIPPING_COST_FOB = 7; // Fixed Quoted Freight FOB
  var DEFAULT_SHIPPING_COST = 5; // $5 fixed shipping cost
  var FREE_SHIPPING_MINIMUM = 49; // $49 free shipping minimum order

  var INSERT_INTERNAL_ID = 11916;
  var INSERT_SKU = 'DTEONLINEINSERT';
  var SHIPPING_LABEL_INTERNAL_ID = 11917;
  var SHIPPING_LABEL_SKU = 'DTEONLINESTICKER';

  var SHOWERHEAD_PRODUCT_LINE = '2500 Showerheads';
  var PLUMBERS_TAPE_INTERNAL_ID = 5802;
  var PLUMBERS_TAPE_SKU = 'PT060';

  var PI_CLIPS_INTERNAL_ID = '6900';
  var PI_CLIPS_SKU = 'CCLIPS-B';
  var PI_CLIPS_QUANTITY_MULTIPLIER = 6;

  var FULFILLMENT_SKUS_TO_IGNORE = [INSERT_SKU, SHIPPING_LABEL_SKU, PLUMBERS_TAPE_SKU, PI_CLIPS_SKU];

  var ADD_INSERT = false; // Whether to add DTEONLININSERT
  var ADD_LABEL = false; // Whether to add DTEONLINESTICKER
  var ADD_TAPE_TO_SHOWERHEADS = true; // Whether to add PT060 
  var ADD_CLIPS_TO_PI = false; // Whether to add CCLIPS-B

  //var DISPATCHER_NOTES = 'Use DTE Sticker and Insert'; // Move DTEONLINEINSERT and DTEONLINESTICKER line items to dispatcher note instructions

  function itemNeedsTape(sku) {
    var skus = ['N2915BN', 'N2915CH', 'N2915C-V', 'N2915-V', 'N2515CH', 'N9615CH', 'EV3021-CP150-SB', 'EV3041-CP150-SB', 'N2945CH', 'N9415CH', 'N9415CH-HH'];
    return skus.indexOf(sku) >= 0;
  }

  function itemNeedsClips(sku) {
    var skus = ['PI011', 'PI010', 'PI010-2', 'PI011-2'];
    return skus.indexOf(sku) >= 0;
  }

  var SUBSTITUTE_SKUS = {
    'DTEKit1': 'DTEKIT-BASIC',
    'DTEKit2': 'DTEKIT-ADVANCED',
    'SENSI': 'ST55U',
    'L09A1927KENCL-4-PROMO': 'L09A1927KENCL-4PK-PROMO-B',
    'LH06G252700K-4': 'L06G252700K-4',
    'ecobee3-lite-SN': 'ECOBEE3-LITE-SN',
    'L12A193Way27K': 'L12A193WAY27K',
    'Z- RTH9585WF1004/W': 'Z-RTH9585WF1004/W',
    'Echo Show 8': 'ECHO-SHOW 8',
    //'EB-STATE5-01': 'EB-STATE5-01-SN-1',
    'EV1003-CP-SB': 'EV1003CP-SB',
    'RCHT8610WF2005/W': 'RCHT8610WF2006/W',
    'RTH6580WF1001/W': 'Z-RTH6580WF1001/W',
    'RTH9585WF1004/W': 'Z-RTH9585WF1004/W',
  };

  var REVERSE_SUBSTITUTE_SKUS = {
    'ECOBEE-SMART SENSOR': 'EB-RSHM2PK-01',
    'L15A1927KENCL-8PK-B': 'L15A1927KENCL-8',
    'L06G252700K-4': 'LH06G252700K-4'
  };
  for (sku in SUBSTITUTE_SKUS) {
    REVERSE_SUBSTITUTE_SKUS[SUBSTITUTE_SKUS[sku]] = sku;
  }

  var CUSTOMER_ID;

  function getTrackingCompany(input) {
    if (input.match(/fedex|fdx|smartpost/i)) {
      return 'FedEx';
    } else if (input.match(/ups/i)) {
      return 'UPS';
    }
    return input;
  }

  var STATE_ABBREVIATION_MAP = {
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

  function getStateAbbreviation(state) {
    return STATE_ABBREVIATION_MAP[state] ? STATE_ABBREVIATION_MAP[state] : state;
  }

  function getPOValue(order) {
    return [order.customer_id, order.id].join('-');
  }

  return {
    // Respond to GET requests.
    get: function (order) {
      Nlog.audit({ title: 'GET orders' });
      // Initialize orders array
      var orders = [];
      // Get parent id
      var customer_id = order.customer_id;
      if (customer_id === undefined) {
        return {
          error: {
            code: 'customer_id_UNDEFINED'
          }
        }
      }
      // Create a search object for mainline transactions for customers sub of parent
      var transactionSearchObj = Nsearch.create({
        type: "transaction",
        filters: [
          ["mainline", "is", "T"],
          "AND",
          ["entity", "is", customer_id],
          'AND',
          ['trandate', 'after', '01/01/' + (new Date()).getFullYear()]
        ],
        columns: [
          "amount",
          "account",
          "asofdate",
          "billaddress",
          "entity",
          "custbody_ordered_by",
          "custbody_bill_address_list_id",
          "custbody_ship_address_list_id",
          "custbody_ship_to_shipping_notes",
          "trackingnumbers",
          "memo",
          "otherrefnum",
          "postingperiod",
          "statusref",
          "shipaddress",
          "shipcarrier",
          "actualshipdate",
          "shipmethod",
          "shippingcost",
          "tobeemailed",
          "taxtotal",
          "total",
          "tranid",
          "trandate",
          "type",
        ]
      });
      // Run transaction search
      var count = 0;
      var limit = 50;
      var errors = [];
      var locked_orders = [];
      transactionSearchObj.run().each(
        function (result) {
          if (count >= limit) {
            return false;
          }
          // Get id to load sales order record
          var id = result.id;
          // Get id from sales order if this is an item fulfillment
          if (result.getValue('createdfrom') !== undefined && result.getValue('createdfrom') !== null) {
            id = result.getValue('createdfrom');
          }
          var status = result.getValue('status');
          if (status === 'fullyBilled') {
            result.locked = true;
            locked_orders.push({ result: result });
            count++;
            return true;
          }
          // Skip record if id is invalid
          if (id == undefined || id.length < 1) {
            count++;
            errors.push('id is undefined: ' + id);
            return true;
          }
          // Load sales order
          try {
            var sales_order_record = Nrecord.load({
              type: 'salesorder',
              id: id,
            });
          }
          catch (e) {
            Nlog.error({
              title: 'Error loading sales record',
              details: e
            });
            result.locked = true;
            locked_orders.push({ result: result });
            errors.push('error loading sales record: ' + e);
            count++;
            return true;
          }
          // 
          var order = {
            items: {
              byId: {},
              allIds: [],
            },
            result: result,
          };
          var index = 0;
          var current_item_id = true;
          while (current_item_id) {
            current_item_id = sales_order_record.getSublistValue('item', 'item', index);
            if (current_item_id) {
              order.items.allIds.push(current_item_id);
              order.items.byId[current_item_id] = {
                id: current_item_id,
                quantity: sales_order_record.getSublistValue('item', 'quantity', index),
                item_display: sales_order_record.getSublistValue('item', 'item_display', index),
                rate: sales_order_record.getSublistValue('item', 'rate', index),
                sku: sales_order_record.getSublistValue('item', 'custcol_ava_item', index),
                case_quantity: sales_order_record.getSublistValue('item', 'custcol_item_case_qty', index),
                category: sales_order_record.getSublistValue('item', 'class', index),
                customer_part_number: sales_order_record.getSublistValue('item', 'custcol_scm_customerpartnumber_display', index),
                store_display_image: sales_order_record.getSublistValue('item', 'storedisplayimage', index),
              };
            }
            index++;
          }
          orders.push(order);
          count++;
          return true;
        });
      return {
        //        userid: order.userid,
        customer_id: customer_id,
        orders: orders,
        count: count,
        errors: errors,
        locked_orders: locked_orders,
      }
    },
    post: function (order) {
      Nlog.debug({
        title: 'POST /orders',
        details: order
      });

      var customer_id = order.customer_id;
      if (customer_id === undefined) {
        Nlog.error({
          title: 'customer_id UNDEFINED',
          details: order,
        });
        return {
          error: {
            code: 'customer_id_UNDEFINED'
          }
        }
      }

      var country_map = {
        'United States': 'US'
      }

      // Check for existing order
      var existing;
      Nsearch.create({
        type: 'salesorder',
        filters:
          [
            ['type', 'anyof', 'SalesOrd'],
            'AND',
            ['otherrefnum', 'equalto', getPOValue(order)],
            "AND",
            ["taxline", "is", "F"],
            "AND",
            ["shipping", "is", "F"],
            "AND",
            ["mainline", "is", "F"],
            "AND",
            ["fulfillingTransaction", "noneof", "@NONE@"],
          ],
        columns:
          [
            'internalid',
            'otherrefnum',
            'fulfillingTransaction',
            'status',
            Nsearch.createColumn({
              name: "trackingnumbers",
              join: "fulfillingTransaction"
            }),
            "fulfillingtransaction",
            Nsearch.createColumn({
              name: "custbody_actual_ship_method",
              join: "fulfillingTransaction"
            }),
            Nsearch.createColumn({
              name: "item",
              join: "fulfillingTransaction"
            }),
            Nsearch.createColumn({
              name: "quantity",
              join: "fulfillingTransaction"
            }),
          ]
      }).run().each(function (result) {
        if (existing === undefined) {
          existing = {};
        }
        existing.id = result.getValue('internalid');
        existing.status = result.getValue('status');
        existing.order_name = result.getValue('otherrefnum').split('-')[1];
        var fulfillment_id = result.getValue('fulfillingTransaction')
        if (fulfillment_id) {
          if (existing.fulfillments === undefined) {
            existing.fulfillments = {};
          }
          if (existing.fulfillments[fulfillment_id] === undefined) {
            existing.fulfillments[fulfillment_id] = {
              id: fulfillment_id,
              trackingNumbers: result.getValue({
                name: 'trackingnumbers',
                join: 'fulfillingTransaction'
              }),
              trackingCompany: getTrackingCompany(result.getValue({
                name: 'custbody_actual_ship_method',
                join: 'fulfillingTransaction'
              })),
              items: [],
            }
            var good_tracking_numbers = [];
            var split_tracking_numbers = existing.fulfillments[fulfillment_id].trackingNumbers.split('<BR>');
            for (var stn_i = 0; stn_i < split_tracking_numbers.length; stn_i++) {
              var tracking_number_to_consider = split_tracking_numbers[stn_i];
              if (tracking_number_to_consider && !tracking_number_to_consider.match(/^00108/)) {
                good_tracking_numbers.push(tracking_number_to_consider);
              }
            }
            existing.fulfillments[fulfillment_id].trackingNumbers = good_tracking_numbers.join('<BR>');
            if (existing.fulfillments[fulfillment_id].trackingNumbers == undefined || existing.fulfillments[fulfillment_id].trackingNumbers.length < 1) {
              Nemail.send({
                author: 126925,
                recipients: 126925,
                subject: "No Tracking Numbers when fulfilling ICF order For SO ID# " + existing.id,
                body: JSON.stringify([existing, existing.fulfillments[fulfillment_id]], null, 2),
              });

            }
          }
          var fulfillment_sku = result.getText({
            name: "item",
            join: "fulfillingTransaction"
          });
          var fulfillment_quantity = result.getValue({
            name: "quantity",
            join: "fulfillingTransaction"
          });
          if (REVERSE_SUBSTITUTE_SKUS[fulfillment_sku]) {
            fulfillment_sku = REVERSE_SUBSTITUTE_SKUS[fulfillment_sku];
          }
          if (FULFILLMENT_SKUS_TO_IGNORE.indexOf(fulfillment_sku) < 0) {
            existing.fulfillments[fulfillment_id].items.push({
              sku: fulfillment_sku,
              quantity: fulfillment_quantity,
            });
          } else {
            Nlog.debug({
              title: 'Skipping fulfillment item push for this item',
              details: JSON.stringify({
                item: fulfillment_sku,
                FULFILLMENT_SKUS_TO_IGNORE: FULFILLMENT_SKUS_TO_IGNORE,
              })
            })
          }
        }
        return true;
      });

      // Return existing
      if (existing) {
        return {
          existing: existing
        }
      }



      var item_sku_id_map = {};

      var item_search = Nsearch.create({
        type: 'item',
        filters:
          [
            ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Assembly', 'Kit'],
            'AND',
            ['pricing.pricelevel', 'anyof', PRICE_LEVEL_ID],
          ],
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
          item_sku_id_map[result.getValue('itemid').trim()] = result.getValue('internalid');
        }
      }

      var item_product_line_map = {};
      var all_item_search = Nsearch.create({
        type: 'item',
        filters:
          [
            //            ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Assembly', 'Kit'],
          ],
        columns:
          [
            'itemid',
            'class',
          ]
      });

      var search_results = all_item_search.run();
      var page_size = 1000;
      var length = all_item_search.runPaged().count;
      for (var i = 0; i < length - page_size; i += page_size) {
        var paged_search_results = search_results.getRange(i, i + page_size);
        for (var j = 0; j < paged_search_results.length; j++) {
          var result = paged_search_results[j];
          item_product_line_map[result.getValue('itemid').trim()] = result.getValue('class');
        }
      }

      // Search for existing sales order
      var transactionSearchObj = Nsearch.create({
        type: "transaction",
        filters: [
          ["mainline", "is", "T"],
          "AND",
          ["type", "is", "SalesOrd"],
          "AND",
          ["otherrefnum", "equalto", getPOValue(order)]
        ],
      });

      // Check if sales order already exists by external id
      if (transactionSearchObj.runPaged().count > 0) {
        Nlog.error({
          title: 'Sales Order already exists with otherrefnum: ' + getPOValue(order),
          details: order,
        });
        return false;
      }

      // Create sales order object with customer_id from POST body.
      var sales_order = Nrecord.create({
        type: Nrecord.Type.SALES_ORDER,
        isDynamic: true,
        defaultValues: {
          entity: order.customer_id,
        }
      });

      // Set required fields.
      var required_fields = {
        custbody1: DEFAULT_SO_ORDER_QUEUE,
        custbody_priority: DEFAULT_ORDER_PRIORITY,
        custbody_order_group: DEFAULT_ORDER_GROUP,
        custbody_fob: order.fob || DEFAULT_FOB,
        location: order.location || DEFAULT_LOCATION,
        externalid: getPOValue(order),
        orderstatus: 'B',
        custbody_a1wms_dnloadtowms: false,
      };

      for (var field in required_fields) {
        sales_order.setValue({
          fieldId: field,
          value: required_fields[field]
        });
      }

      // Set info fields
      var info_fields_map = {
        purchase_order_number: 'otherrefnum',
        memo: 'memo',
        customer_comments: 'custbody_cust_comments'
      }

      for (var field in info_fields_map) {
        sales_order.setValue({
          fieldId: info_fields_map[field],
          value: order[field],
        });
      }

      if (DISPATCHER_NOTES) {
        sales_order.setValue({
          fieldId: 'custbody_bol_comments_1',
          value: DISPATCHER_NOTES,
        });
      }

      //       if(order.ship_combine){
      //         sales_order.setValue({
      //           fieldId: 'custbody_ship_combine',
      //           value: true,
      //         });
      //         sales_order.setValue({
      //           fieldId: 'custbody_ship_combine_no',
      //           value: order.ship_combine_number
      //         });
      //       }      

      // Commit inventory items to sales order.
      function commitNewItem(item) {
        sales_order.selectNewLine('item');
        // Set item id
        sales_order.setCurrentSublistValue('item', 'item', item.internalid);
        // Set quantity
        sales_order.setCurrentSublistValue('item', 'quantity', item.quantity);
        // Set customer
        sales_order.setCurrentSublistValue('item', 'custbody_customer', order.customer_id);
        // Set Product Line
        sales_order.setCurrentSublistValue('item', 'class', item.product_line);
        // Commit line
        sales_order.commitLine('item');
      }

      // Add built-in items
      if (ADD_INSERT) {
        commitNewItem({
          internalid: INSERT_INTERNAL_ID,
          quantity: 1,
          custbody_customer: order.customer_id,
          product_line: item_product_line_map[INSERT_SKU],
        });
      }

      if (ADD_LABEL) {
        commitNewItem({
          internalid: SHIPPING_LABEL_INTERNAL_ID,
          quantity: 1,
          custbody_customer: order.customer_id,
          product_line: item_product_line_map[SHIPPING_LABEL_SKU],
        });
      }

      // Commit lines
      var added_tape = false;
      for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        var sku = item.sku;
        if (SUBSTITUTE_SKUS[item.sku]) {
          sku = SUBSTITUTE_SKUS[item.sku];
        }
        if (item_sku_id_map[sku]) {
          // Set internal ID from SKU
          item.internalid = item_sku_id_map[sku];
          // Set Product Line
          item.product_line = item_product_line_map[sku];
          //  Add tape for showerheads
          if (!added_tape && ADD_TAPE_TO_SHOWERHEADS && itemNeedsTape(sku)) {
            commitNewItem({
              internalid: PLUMBERS_TAPE_INTERNAL_ID,
              quantity: 1,
              custbody_customer: order.customer_id,
              product_line: item_product_line_map[PLUMBERS_TAPE_SKU],
            });
            added_tape = true;
          }
          if (ADD_CLIPS_TO_PI && itemNeedsClips(sku)) {
            commitNewItem({
              internalid: PI_CLIPS_INTERNAL_ID,
              quantity: PI_CLIPS_QUANTITY_MULTIPLIER * item.quantity,
              custbody_customer: order.customer_id,
              product_line: item_product_line_map[PI_CLIPS_SKU],
            });
          }
          // Commit item
          commitNewItem(item);
        } else {
          Nlog.error({
            title: 'Rejecting Order, Invalid SKU',
            details: {
              item: item,
              order: order,
            }
          });
          throw 'InvalidSKUError: ' + item.sku + ' --> ' + JSON.stringify(order);
        }
      }

      // Set shipping address info
      function setCustomShippingAddress(sales_order, address) {
        var shipping_address = sales_order.getSubrecord({
          fieldId: 'shippingaddress',
        });
        shipping_address.setValue({
          fieldId: 'country',
          value: country_map[address.country] || address.country
        });
        shipping_address.setValue({
          fieldId: 'zip',
          value: (address.zip || '').toString().split('-')[0]
        });
        shipping_address.setValue({
          fieldId: 'city',
          value: address.city
        });
        shipping_address.setValue({
          fieldId: 'state',
          value: getStateAbbreviation(address.state)
        });
        shipping_address.setValue({
          fieldId: 'attention',
          value: address.attention
        });
        shipping_address.setValue({
          fieldId: 'addressee',
          value: address.addressee
        });
        shipping_address.setValue({
          fieldId: 'addrphone',
          value: (address.addrphone ? address.addrphone.match(/\d+/g).join('').substr(0, 10) : DEFAULT_SHIPPING_PHONE)
        });
        shipping_address.setValue({
          fieldId: 'addr1',
          value: address.addr1
        });
        shipping_address.setValue({
          fieldId: 'addr2',
          value: address.addr2 || ''
        });
        shipping_address.setValue({
          fieldId: 'email',
          value: address.email
        });
        shipping_address.setValue({
          fieldId: 'isresidential',
          value: true,
        });
        sales_order.setValue('shipaddress', shipping_address.getValue('addrtext'));
      }

      // Set shipping and billing addresses
      if (order.shipping_address) {
        sales_order.setValue('shipaddresslist', '');
        setCustomShippingAddress(sales_order, order.shipping_address);
      }

      // Set shipping cost from order total
      if (parseFloat(sales_order.getValue('total')) < FREE_SHIPPING_MINIMUM) {
        sales_order.setValue('shippingcost', DEFAULT_SHIPPING_COST);
        sales_order.setValue('custbody_fob', FIXED_SHIPPING_COST_FOB); // Set FOB to fixed shipping cost
      }

      var body = "<h1>New Sales Order Entered into NetSuite</h1>";
      body += '<h2>Customer: <a href="https://system.na2.netsuite.com/app/common/entity/custjob.nl?id=' + order.customer_id + '">' + (order.parent_company_name || order.customer_id) + '</a></h2>';

      // Save sales order
      if (true || order.save) {
        try {
          var sales_order_id = sales_order.save({
            ignoreMandatoryFields: false,
          });
          Nlog.debug({
            title: 'Saved sales order to ' + sales_order_id,
            details: JSON.stringify(order),
          });
          body += '<a href="https://system.na2.netsuite.com/app/accounting/transactions/transaction.nl?id=' + sales_order_id + '">#' + sales_order_id + '</a>';
        } catch (e) {
          Nlog.error({
            title: 'Error saving sales order',
            details: e
          })
          body += "Error ordering: " + JSON.stringify(e);
        }
      } else {
        body += '<p>Transaction not saved.</p>';
      }

      body += "<h2>Order Data</h2><pre>" + JSON.stringify(order, null, 2) + "</pre>";


      //      Nemail.send({
      //        author: 126925,
      //        recipients: 126925,
      //        subject: "New Sales Order Notification",
      //        body: body,
      //      });


      return {
        success: sales_order,
      }
    }
  };
});