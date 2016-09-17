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
      throw new Error("LockAPI error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("LockAPI error: contract binary not set. Can't deploy new instance.");
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

      throw new Error("LockAPI contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of LockAPI: " + unlinked_libraries);
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
      throw new Error("Invalid address passed to LockAPI.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: LockAPI not deployed or address not set.");
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
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "Unlock",
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
            "name": "pdp",
            "type": "address"
          }
        ],
        "name": "setPolicyDecisionPoint",
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
            "name": "",
            "type": "address"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "ownerLock",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "lockAttrs",
        "outputs": [
          {
            "name": "owner",
            "type": "address"
          },
          {
            "name": "title",
            "type": "bytes32"
          },
          {
            "name": "model",
            "type": "bytes32"
          },
          {
            "name": "description",
            "type": "bytes32"
          },
          {
            "name": "isLocked",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "identity",
            "type": "address"
          },
          {
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "Transfer",
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
            "name": "",
            "type": "address"
          }
        ],
        "name": "ownerLockCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "eventLogger",
            "type": "address"
          }
        ],
        "name": "setLogger",
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
            "name": "identity",
            "type": "address"
          },
          {
            "name": "title",
            "type": "bytes32"
          },
          {
            "name": "model",
            "type": "bytes32"
          },
          {
            "name": "description",
            "type": "bytes32"
          },
          {
            "name": "isLocked",
            "type": "bool"
          }
        ],
        "name": "Register",
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
            "name": "",
            "type": "address"
          }
        ],
        "name": "lockOwner",
        "outputs": [
          {
            "name": "",
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
        "inputs": [],
        "name": "getPolicyDecisionPoint",
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
        "inputs": [
          {
            "name": "resource",
            "type": "address"
          }
        ],
        "name": "Lock",
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
        "name": "getLogger",
        "outputs": [
          {
            "name": "result",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "lockAttrsSet",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "pdp",
            "type": "address"
          },
          {
            "name": "logger",
            "type": "address"
          }
        ],
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x6060604081815260008054750100000000000000000000000000000000000000000060a060020a61ffff02199091161760b060020a60ff0219167602000000000000000000000000000000000000000000001760b860020a60ff0219167703000000000000000000000000000000000000000000000017905580610d0f833960a0905251608051818133600060006101000a815481600160a060020a030219169083021790555081600160006101000a815481600160a060020a030219169083021790555080600260006101000a815481600160a060020a030219169083021790555050505050610c1b806100f46000396000f3606060405236156100ae5760e060020a60003504630be7748581146100b0578063197a9b851461014757806328ecc0e314610170578063362006e3146101ac5780634853ae1b146101ee5780635553801c1461029e5780635722e24a146102b6578063896fd677146102d1578063b56d471714610398578063be26733c146103b9578063c02c366f146103d8578063c1b5f12c14610402578063d0b04e3914610498578063f6c38ca6146104a9575b005b61015c600435604080516001546000805460e160020a631a55e96b02845233600160a060020a038181166004870152878116602487015260a860020a90920460ff166044860181905295519295869591948894919387939116916334abd2d691606481810192602092909190829003018187876161da5a03f1156100025750506040515191505080151561050e57505050506105e1565b60018054600160a060020a0319166004351781555b604080519115158252519081900360200190f35b6103e560043560243560066020526000828152604090208054829081101561000257506000908152602090200154600160a060020a0316905081565b6104c4600435600360208190526000918252604090912060048101548154600183015460028401549390940154600160a060020a039190911693929160ff1685565b61015c600435602435600080546001546040805160e160020a631a55e96b02815233600160a060020a038181166004840152888116602484015276010000000000000000000000000000000000000000000090950460ff1660448301819052925186958695869586958695948d949293879316916334abd2d6916064828101926020929190829003018187876161da5a03f115610002575050604051519150508015156106345750505050610629565b6104fc60043560076020526000908152604090205481565b60028054600160a060020a031916600435179055600161015c565b61015c6004356024356044356064356084356040805160a0810182526000808252602082810182905282840182905260608301829052608083018290528351825460015460e160020a631a55e96b02835233600160a060020a0381811660048601528d8116602486015260a860020a90930460ff166044850181905297519597889796889692958f95929488949316926334abd2d692606483810193829003018187876161da5a03f115610002575050604051519150508015156109205750505050610914565b6103e5600435600560205260009081526040902054600160a060020a031681565b6100ae600054600160a060020a039081163390911614610b3357610002565b600154600160a060020a03165b60408051600160a060020a03929092168252519081900360200190f35b61015c600435600080546001546040805160e160020a631a55e96b02815233600160a060020a038181166004840152878116602484015260a860020a90950460ff1660448301819052925186959194889493879391909116916334abd2d691606481810192602092909190829003018187876161da5a03f11561000257505060405151915050801515610b4157505050506105e1565b600254600160a060020a03166103e5565b61015c60043560046020526000908152604090205460ff1681565b60408051600160a060020a03969096168652602086019490945284840192909252606084015215156080830152519081900360a00190f35b60408051918252519081900360200190f35b600160a060020a0387811660008181526003602090815260408083206004818101805460ff1916905560025483517f1d5128f900000000000000000000000000000000000000000000000000000000815260c860020a664c6f636b4150490292810192909252338816602483015260448201969096527f556e6c6f636b6564205375636365737366756c6c79000000000000000000000060648201529151909a509390941693631d5128f993608482810194919283900301908290876161da5a03f1156100025750600197505050505050505b50919050565b50600199505050505b50505050600160a060020a0385811660009081526007602052604080822080546000190190559189168152208054600190810190915595505b505050505092915050565b600560005060008d600160a060020a0316815260200190815260200160002060009054906101000a9004600160a060020a031698508a600560005060008e600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a0302191690830217905550600660005060008c600160a060020a0316815260200190815260200160002060005080548060010182818154818355818115116107045781836000526020600020918201910161070491905b8082111561085a57600081556001016106f0565b5050509190906000526020600020900160008e909190916101000a815481600160a060020a0302191690830217905550508a600360005060008e600160a060020a0316815260200190815260200160002060005060000160006101000a815481600160a060020a0302191690830217905550600660005060008a600160a060020a03168152602001908152602001600020600050975060009650600095505b87548610156105f0578b600160a060020a03168887815481101561000257600091825260209091200154600160a060020a0316141561085e578594505b87546000190185101561086957875460001901600186011161084e578785600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a031688868154811015610002576020600020018054600160a060020a031916909217909155505b600194909401936107e0565b5090565b86156108c0576105f0565b875488906000198101908110156100025760009182526020909120018054600160a060020a031916905587546000198101808a5589908280158290116105e7576000838152602090206105e79181019083016106f0565b600195909501946107a3565b50505050600160a060020a038916600090815260036020819052604090912060018181018b9055600282018a905591810188905560048101805460ff19168817905590945090505b50505095945050505050565b600160a060020a038d1660009081526004602052604090205460ff1696508615156108cc5760a0604051908101604052803381526020018d81526020018c81526020018b81526020018a815260200150955085600360005060008f600160a060020a0316815260200190815260200160002060005060008201518160000160006101000a815481600160a060020a030219169083021790555060208201518160010160005055604082015181600201600050556060820151816003016000505560808201518160040160006101000a81548160ff021916908302179055509050506001600460005060008f600160a060020a0316815260200190815260200160002060006101000a81548160ff0219169083021790555033600560005060008f600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a03021916908302179055506006600050600033600160a060020a031681526020019081526020016000206000508054806001018281815481835581811511610ac257818360005260206000209182019101610ac291906106f0565b5050509190906000526020600020900160008f909190916101000a815481600160a060020a0302191690830217905550506007600050600033600160a060020a0316815260200190815260200160002060008181505480929190600101919050555060019750875050505050610914565b600054600160a060020a0316ff5b600160a060020a0387811660008181526003602090815260408083206004818101805460ff1916600117905560025483517f011576b900000000000000000000000000000000000000000000000000000000815260c860020a664c6f636b4150490292810192909252338816602483015260448201969096527f4c6f636b6564205375636365737366756c6c790000000000000000000000000060648201529151909a50939094169363011576b993608482810194919283900301908290876161da5a03f11561000257506001999850505050505050505056",
    "updated_at": 1474130884083,
    "links": {},
    "address": "0x3382b40f1a42314929f9517b9d1c3aee3872a124"
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

  Contract.contract_name   = Contract.prototype.contract_name   = "LockAPI";
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
    window.LockAPI = Contract;
  }
})();
