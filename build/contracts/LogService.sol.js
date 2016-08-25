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
      throw new Error("LogService error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("LogService error: contract binary not set. Can't deploy new instance.");
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

      throw new Error("LogService contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of LogService: " + unlinked_libraries);
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
      throw new Error("Invalid address passed to LogService.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: LogService not deployed or address not set.");
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
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogLocked",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "revokedBy",
            "type": "address"
          },
          {
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogPolicyRevoked",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogUnlocked",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogStateChanged",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "LogAccessGranted",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "LogAccessDenied",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "source",
            "type": "bytes32"
          },
          {
            "name": "subject",
            "type": "address"
          },
          {
            "name": "resource",
            "type": "address"
          },
          {
            "name": "grantedBy",
            "type": "address"
          },
          {
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogPolicyGranted",
        "outputs": [
          {
            "name": "result",
            "type": "bool"
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
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "StateChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "AccessDenied",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "AccessGranted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "Locked",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "Unlocked",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "GrantedBy",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "PolicyGranted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "source",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "name": "subject",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "resource",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "RevokedBy",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "PolicyRevoked",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405260008054600160a060020a0319163317905561036c806100246000396000f36060604052361561006c5760e060020a6000350463011576b9811461006e578063120851d4146100c85780631d5128f91461012e578063310f03d11461018857806340960a15146101e2578063715304c8146102595780637b9da271146102d0578063be26733c14610336575b005b6103546004356024356044356064356060818152600090600160a060020a03848116919086169087907f69392808a8f4890bf99ec5e682a7f04247abdca632512e6fd01f6e9a9f8d96f190602090a4506001949350505050565b610354600435602435604435606435608435600160a060020a0382811660609081526080839052600091858116919087169088907f5258688867a523392dc1a258d8c09d7c32e91367b4c1fd0ffcbd1469bc1280c390604090a450600195945050505050565b6103546004356024356044356064356060818152600090600160a060020a03848116919086169087907ffbc699094d638a32f10b7c847bcccefcecc1b9962860dd3e4705b515b9543d7c90602090a4506001949350505050565b6103546004356024356044356064356060818152600090600160a060020a03848116919086169087907f49383088586f3ecdfe365a47abf025f4599caebbb9dc1f84444bbcb4c8f03fff90602090a4506001949350505050565b6103546004356024356044357f416363657373204772616e7465640000000000000000000000000000000000006060908152600090600160a060020a03838116919085169086907f156794a2ebb71e4d17fe5fc62f7beaca4832122d7ad000fb62481435ffef3f2390602090a45060019392505050565b6103546004356024356044357f4163636573732044656e696564000000000000000000000000000000000000006060908152600090600160a060020a03838116919085169086907ff48843a143fb8a66d79a8afc8303d947d0ad97ffcd414214aedfa176c2f31c3c90602090a45060019392505050565b610354600435602435604435606435608435600160a060020a0382811660609081526080839052600091858116919087169088907fd9a3ad4d314d28eb6f51494988ae6a9c820ef31dbcacd9b76d750cb48600e81290604090a450600195945050505050565b61006c60005433600160a060020a0390811691161461035e57610002565b6060908152602090f35b600054600160a060020a0316ff",
    "updated_at": 1472067512418,
    "links": {},
    "address": "0xfcd44209cef70e9bba9d437c8395a856b84ab997"
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

  Contract.contract_name   = Contract.prototype.contract_name   = "LogService";
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
    window.LogService = Contract;
  }
})();
