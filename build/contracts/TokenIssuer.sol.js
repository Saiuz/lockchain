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
          },
          {
            "name": "required",
            "type": "uint8"
          }
        ],
        "name": "IsAuthorised",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
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
          },
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "HasTokensForResource",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
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
    "unlinked_binary": "0x60606040526040516020806113838339506080604052516000805433600160a060020a03199182161782556004805490911690921790915561133d90819061004690396000f36060604052361561006c5760e060020a600035046334abd2d6811461006e5780635958e7181461009157806367f6c270146100b55780638f5f2b7e146100fe578063a398075914610184578063addb58e114610209578063be26733c14610230578063d742611014610250575b005b6102786004356024356044355b60006000600060006000600061034189896100bf565b6102786004356024355b604080516020810190915260008082529061061c83610105565b61028c6004356024355b600160a060020a038281166000908152600160209081526040808320858516845290915281205490918291829182918291168082141561062957610690565b6102c36004355b60408051602081810183526000808352600160a060020a0385168152600382528390208054845181840281018401909552808552929392909183018282801561017857602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610159575b50939695505050505050565b6102c360043560408051602081810183526000808352600160a060020a038516815260028252835190849020805480840283018401909552848252929390929183018282801561017857602002820191906000526020600020908154600160a060020a0316815260019190910190602001808311610159575b50939695505050505050565b61030d600435602435604435606435608435600060003386600260006107b784848461007b565b61006c600054600160a060020a0390811633919091161461099a57610002565b61027860043560243560006000600060006000600060003388600260006109bd84848461007b565b604080519115158252519081900360200190f35b60408051600160a060020a039687168152949095166020850152838501929092526060830152608082015290519081900360a00190f35b60405180806020018281038252838181518152602001915080519060200190602002808383829060006004602084601f0104600f02600301f1509050019250505060405180910390f35b60408051600160a060020a03929092168252519081900360200190f35b151561035557600195505b50505050509392505050565b9450945094509450945061032a898961009b565b88600160a060020a031685600160a060020a0316141580610388575087600160a060020a031684600160a060020a031614155b1561040157600480546040805160e360020a630e2a609902815260ec60020a620504450293810193909352600160a060020a038c811660248501528b81166044850152905191169163715304c891606482810192602092919082900301816000876161da5a03f115610002575060009750610335915050565b8660ff1681101561048057600480546040805160e360020a630e2a609902815260ec60020a620504450293810193909352600160a060020a038c811660248501528b81166044850152905191169163715304c891606482810192602092919082900301816000876161da5a03f115610002575060009750610335915050565b8260001415801561049057504283115b1561050957600480546040805160e360020a630e2a609902815260ec60020a620504450293810193909352600160a060020a038c811660248501528b81166044850152905191169163715304c891606482810192602092919082900301816000876161da5a03f115610002575060009750610335915050565b8160001415801561051957504282105b1561059257600480546040805160e360020a630e2a609902815260ec60020a620504450293810193909352600160a060020a038c811660248501528b81166044850152905191169163715304c891606482810192602092919082900301816000876161da5a03f115610002575060009750610335915050565b60048054604080517f40960a1500000000000000000000000000000000000000000000000000000000815260ec60020a620504450293810193909352600160a060020a038c811660248501528b8116604485015290519116916340960a1591606482810192602092919082900301816000876161da5a03f115610002575060019750610335915050565b5160009011949350505050565b80600160a060020a0316637dae7ced6040518160e060020a02815260040180905060a0604051808303816000876161da5a03f115610002575050604080518051602082015192820151606083015160809390930151919a50929850919650945060ff169250505b509295509295909350565b84600160a060020a031663643c4ca28a8a8a6040518460e060020a028152600401808481526020018381526020018260ff16815260200193505050506020604051808303816000876161da5a03f115610002575050505b60048054604080517f7b9da27100000000000000000000000000000000000000000000000000000000815260d060020a65506f6c6963790293810193909352600160a060020a038e811660248501528d8116604485015233811660648501527f506f6c696379204772616e74656400000000000000000000000000000000000060848501529051911691637b9da2719160a482810192602092919082900301816000876161da5a03f115610002575095965086955050505050505b5095945050505050565b90508015156107c957505050506107ad565b600160a060020a038b811660009081526001602090815260408083208e85168452909152812054909116955085141561069b578a8a8a8a8a604051610291806110ac8339018086600160a060020a0316815260200185600160a060020a031681526020018481526020018381526020018260ff16815260200195505050505050604051809103906000f09450845084600160005060008d600160a060020a0316815260200190815260200160002060005060008c600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a0302191690830217905550600260005060008c600160a060020a03168152602001908152602001600020600050805480600101828181548183558181151161090f5781836000526020600020918201910161090f91905b8082111561097257600081556001016108fb565b50505060009283525060208083209091018054600160a060020a0319168d179055600160a060020a038c168252600390526040902080546001810180835582818380158290116109765781836000526020600020918201910161097691906108fb565b5090565b5050506000928352506020909120018054600160a060020a0319168c1790556106f2565b600054600160a060020a0316ff5b50600099505050505b50505050505092915050565b90508015156109cf57505050506109b1565b600160005060008e600160a060020a0316815260200190815260200160002060005060008d600160a060020a0316815260200190815260200160002060009054906101000a9004600160a060020a0316995089600160a060020a031660001415610a405760009a50505050506109b1565b89600160a060020a0316637dae7ced6040518160e060020a02815260040180905060a0604051808303816000876161da5a03f115610002575050604080518051602082015192820151606083015160809390930151919d50929b509199509750955050600160a060020a038d8116908a16148015610acf57508b600160a060020a031688600160a060020a0316145b156109a85789600160a060020a031663be26733c6040518160e060020a0281526004018090506000604051808303816000876161da5a03f115610002575050506000600160005060008f600160a060020a0316815260200190815260200160002060005060008e600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a0302191690830217905550610c4a8d8d60408051602081810183526000808352600160a060020a038616815260029091529182209091805b8254821015610e015784600160a060020a03168383815481101561000257600091825260209091200154600160a060020a03161415610e7c5750805b825460001901811015610e88578254600019016001820111610c42578281600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a0316838281548110156100025760009182526020909120018054600160a060020a03191690911790555b600101610bd1565b50610d2d8c8e60408051602081810183526000808352600160a060020a038616815260039091529182209091805b8254821015610f595784600160a060020a03168383815481101561000257600091825260209091200154600160a060020a03161415610fd05750805b825460001901811015610fdc578254600019016001820111610d25578281600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a0316838281548110156100025760009182526020909120018054600160a060020a03191690911790555b600101610cb4565b50600460009054906101000a9004600160a060020a0316600160a060020a031663120851d48e8e336040518460e060020a028152600401808060d060020a65506f6c6963790281526020015060200184600160a060020a0316815260200183600160a060020a0316815260200182600160a060020a03168152602001807f506f6c696379205265766f6b656400000000000000000000000000000000000081526020015060200193505050506020604051808303816000876161da5a03f115610002575060019c506109b195505050505050565b600160a060020a03861660009081526002602090815260409182902080548351818402810184019094528084529091830182828015610e6a57602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610e4b575b50939750505050505b50505092915050565b60019190910190610b95565b825483906000198101908110156100025760009182526020909120018054600160a060020a0319169055825460001981018085558490828015829011610edf57600083815260209020610edf9181019083016108fb565b50505050600160a060020a038616600090815260026020908152604080519281902080548084028501840190925281845291830182828015610f4b57602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610f2c575b505050505093508350610e73565b600160a060020a038616600090815260036020908152604080519281902080548084028501840190925281845291830182828015610e6a57602002820191906000526020600020908154600160a060020a0316815260019190910190602001808311610e4b575b50939a9950505050505050505050565b60019190910190610c78565b825483906000198101908110156100025760009182526020909120018054600160a060020a0319169055825460001981018085558490828015829011611033576000838152602090206110339181019083016108fb565b50505050600160a060020a038616600090815260036020908152604080519281902080548084028501840190925281845291830182828015610f4b57602002820191906000526020600020908154600160a060020a0316815260019190910190602001808311610f2c575b505050505093508350610e7356606060405260405160a08061029183396101006040529051608051915160c05160e0516000805433600160a060020a031991821617825560018054821690971790965560028054909616909417909455600491909155600555426003556006805460ff191690921790915561021890819061007990396000f36060604052361561008d5760e060020a60003504630c8da43c811461008f578063304dd7541461009b5780633296607f146100bf578063516dde43146100c8578063643c4ca2146100d157806377cb858f146100fe5780637addf1ef146101095780637dae7ced1461011b57806388d8c12b146101535780638d1343e014610165578063be26733c1461016e575b005b61018c60065460ff1681565b6100f2600454600090811480156100b3575060055481145b156101a9575060015b90565b61018c60045481565b61018c60055481565b600480359055602435600555426003556006805460ff191660443517905560015b15156060908152602090f35b4260055560016100f2565b610196600154600160a060020a031681565b600254600154600454600554600654600160a060020a0394851660609081529390941660805260a091825260c05260ff90921660e052f35b610196600254600160a060020a031681565b61018c60035481565b61008d60005433600160a060020a0390811691161461020a57610002565b6060908152602090f35b600160a060020a03166060908152602090f35b600454811480156101bc57506005544290115b156101c9575060016100bc565b60045442901080156101dc575060055481145b156101e9575060016100bc565b60045442901080156101fd57506005544290115b156100bc575060016100bc565b600054600160a060020a0316ff",
    "updated_at": 1472067512429,
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
