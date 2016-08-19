var Web3 = require("web3");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  return accept(tx, receipt);
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("TokenIssuer error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("TokenIssuer error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("TokenIssuer contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of TokenIssuer: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to TokenIssuer.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: TokenIssuer not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "GetToken",
        "outputs": [
          {
            "name": "issuedTo",
            "type": "address"
          },
          {
            "name": "issuedFor",
            "type": "address"
          },
          {
            "name": "startDate",
            "type": "uint256"
          },
          {
            "name": "endDate",
            "type": "uint256"
          },
          {
            "name": "access",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "GetTokensForResource",
        "outputs": [
          {
            "name": "result",
            "type": "address[]"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "subject",
            "type": "address"
          }
        ],
        "name": "GetTokensForSubject",
        "outputs": [
          {
            "name": "result",
            "type": "address[]"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "startDate",
            "type": "uint256"
          },
          {
            "name": "endDate",
            "type": "uint256"
          },
          {
            "name": "access",
            "type": "uint8"
          }
        ],
        "name": "Grant",
        "outputs": [
          {
            "name": "result",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "Kill",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "Revoke",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "logService",
            "type": "address"
          }
        ],
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x6060604052604051602080610f418339506080604052516000805433600160a060020a031991821617825560048054909116909217909155610efb90819061004690396000f3606060405236156100565760e060020a600035046367f6c27081146100585780638f5f2b7e146100a0578063a398075914610126578063addb58e1146101ab578063be26733c14610302578063d742611014610321575b005b610366600435602435600160a060020a03828116600090815260016020908152604080832085851684529091528120549091829182918291829116808214156104185761047f565b61039d60043560408051602081810183526000808352600160a060020a038516815260038252835190849020805480840283018401909552848252929390929183018282801561011a57602002820191906000526020600020905b8154600160a060020a03168152600191909101906020018083116100fb575b50939695505050505050565b61039d60043560408051602081810183526000808352600160a060020a038516815260028252835190849020805480840283018401909552848252929390929183018282801561011a57602002820191906000526020600020908154600160a060020a03168152600191909101906020018083116100fb575b50939695505050505050565b6103e7600435602435604435606435608435600160a060020a03858116600090815260016020908152604080832088851684529091528120549091168082141561048a57868686868660405161029180610c6a8339018086600160a060020a0316815260200185600160a060020a031681526020018481526020018381526020018260ff16815260200195505050505050604051809103906000f090508050806001600050600089600160a060020a03168152602001908152602001600020600050600088600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a03021916908302179055506002600050600088600160a060020a03168152602001908152602001600020600050805480600101828181548183558181151161059d5781836000526020600020918201910161059d91905b8082111561060057600081556001016102ee565b610056600054600160a060020a03908116339091161461062857610002565b610404600435602435600160a060020a03828116600090815260016020908152604080832085851684529091528120549091168180808080858114156106475761063b565b60408051600160a060020a039687168152949095166020850152838501929092526060830152608082015290519081900360a00190f35b60405180806020018281038252838181518152602001915080519060200190602002808383829060006004602084601f0104600f02600301f1509050019250505060405180910390f35b60408051600160a060020a03929092168252519081900360200190f35b604080519115158252519081900360200190f35b80600160a060020a0316637dae7ced6040518160e060020a02815260040180905060a0604051808303816000876161da5a03f115610002575050604080518051602082015192820151606083015160809390930151919a50929850919650945060ff169250505b509295509295909350565b80600160a060020a031663643c4ca28686866040518460e060020a028152600401808481526020018381526020018260ff16815260200193505050506020604051808303816000876161da5a03f115610002575050505b60048054604080517f7b9da27100000000000000000000000000000000000000000000000000000000815260d060020a65506f6c6963790293810193909352600160a060020a038a81166024850152898116604485015233811660648501527f506f6c696379204772616e74656400000000000000000000000000000000000060848501529051911691637b9da2719160a482810192602092919082900301816000876161da5a03f11561000257509198975050505050505050565b50505060009283525060208083209091018054600160a060020a03191689179055600160a060020a0388168252600390526040902080546001810180835582818380158290116106045781836000526020600020918201910161060491906102ee565b5090565b5050506000928352506020909120018054600160a060020a031916881790556104e1565b600054600160a060020a0316ff5b600096505b50505050505092915050565b85600160a060020a0316637dae7ced6040518160e060020a02815260040180905060a0604051808303816000876161da5a03f11561000257505060408051805160208201519282015160608301516080909301519199509297509195509350915050600160a060020a038981169086161480156106d5575087600160a060020a031684600160a060020a0316145b156106365785600160a060020a031663be26733c6040518160e060020a0281526004018090506000604051808303816000876161da5a03f11561000257505050600160a060020a038981166000818152600160209081526040808320948d1683529381528382208054600160a060020a0319169055835180820185528281529282526002905291822061081f928c928c929091805b82548210156109bf5784600160a060020a03168383815481101561000257600091825260209091200154600160a060020a03161415610a3a5750805b825460001901811015610a46578254600019016001820111610817578281600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a0316838281548110156100025760009182526020909120018054600160a060020a03191690911790555b6001016107a6565b50610902888a60408051602081810183526000808352600160a060020a038616815260039091529182209091805b8254821015610b175784600160a060020a03168383815481101561000257600091825260209091200154600160a060020a03161415610b8e5750805b825460001901811015610b9a5782546000190160018201116108fa578281600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a0316838281548110156100025760009182526020909120018054600160a060020a03191690911790555b600101610889565b5060408051600480547f120851d400000000000000000000000000000000000000000000000000000000835260d060020a65506f6c6963790291830191909152600160a060020a038c811660248401528b8116604484015233811660648401527f506f6c696379205265766f6b65640000000000000000000000000000000000006084840152925192169163120851d49160a48181019260209290919082900301816000876161da5a03f11561000257506001985061063b915050565b600160a060020a03861660009081526002602090815260409182902080548351818402810184019094528084529091830182828015610a2857602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610a09575b50939750505050505b50505092915050565b6001919091019061076a565b825483906000198101908110156100025760009182526020909120018054600160a060020a0319169055825460001981018085558490828015829011610a9d57600083815260209020610a9d9181019083016102ee565b50505050600160a060020a038616600090815260026020908152604080519281902080548084028501840190925281845291830182828015610b0957602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610aea575b505050505093508350610a31565b600160a060020a038616600090815260036020908152604080519281902080548084028501840190925281845291830182828015610a2857602002820191906000526020600020908154600160a060020a0316815260019190910190602001808311610a09575b50939a9950505050505050505050565b6001919091019061084d565b825483906000198101908110156100025760009182526020909120018054600160a060020a0319169055825460001981018085558490828015829011610bf157600083815260209020610bf19181019083016102ee565b50505050600160a060020a038616600090815260036020908152604080519281902080548084028501840190925281845291830182828015610b0957602002820191906000526020600020908154600160a060020a0316815260019190910190602001808311610aea575b505050505093508350610a3156606060405260405160a08061029183396101006040529051608051915160c05160e0516000805433600160a060020a031991821617825560018054821690971790965560028054909616909417909455600491909155600555426003556006805460ff191690921790915561021890819061007990396000f36060604052361561008d5760e060020a60003504630c8da43c811461008f578063304dd7541461009b5780633296607f146100bf578063516dde43146100c8578063643c4ca2146100d157806377cb858f146100fe5780637addf1ef146101095780637dae7ced1461011b57806388d8c12b146101535780638d1343e014610165578063be26733c1461016e575b005b61018c60065460ff1681565b6100f2600454600090811480156100b3575060055481145b156101a9575060015b90565b61018c60045481565b61018c60055481565b600480359055602435600555426003556006805460ff191660443517905560015b15156060908152602090f35b4260055560016100f2565b610196600154600160a060020a031681565b600254600154600454600554600654600160a060020a0394851660609081529390941660805260a091825260c05260ff90921660e052f35b610196600254600160a060020a031681565b61018c60035481565b61008d60005433600160a060020a0390811691161461020a57610002565b6060908152602090f35b600160a060020a03166060908152602090f35b600454811480156101bc57506005544290115b156101c9575060016100bc565b60045442901080156101dc575060055481145b156101e9575060016100bc565b60045442901080156101fd57506005544290115b156100bc575060016100bc565b600054600160a060020a0316ff",
    "updated_at": 1471626444674,
    "links": {},
    "address": "0x7f5240c06dca8fa22b71ed334ad37a64d5670e8f"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "object") {
      Object.keys(name).forEach(function(n) {
        var a = name[n];
        Contract.link(n, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "TokenIssuer";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.1.2";

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.TokenIssuer = Contract;
  }
})();
