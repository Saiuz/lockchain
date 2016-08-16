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
          }
        ],
        "name": "GetTokensFor",
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
        "inputs": [],
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x606060405260008054600160a060020a03191633179055610989806100246000396000f3606060405260e060020a60003504632eebfd89811461004757806331b86dae146100cd57806367f6c27014610216578063be26733c1461025c578063d74261101461027a575b005b6102be60043560408051602081810183526000808352600160a060020a03851681526002825283519084902080548084028301840190955284825292939092918301828280156100c157602002820191906000526020600020905b8154600160a060020a03168152600191909101906020018083116100a2575b50939695505050505050565b610308600435602435604435606435600160a060020a03848116600090815260016020908152604080832087851684529091528120549091168082141561036b57858585856040516101e9806107a08339018085600160a060020a0316815260200184600160a060020a03168152602001838152602001828152602001945050505050604051809103906000f090508050806001600050600088600160a060020a03168152602001908152602001600020600050600087600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a03021916908302179055506002600050600087600160a060020a0316815260200190815260200160002060005080548060010182818154818355818115116103c0578183600052602060002091820191016103c091905b808211156103e45760008155600101610202565b610325600435602435600160a060020a0382811660009081526001602090815260408083208585168452909152812054909182918291829116808214156103e857610444565b61004560005433600160a060020a0390811691161461044e57610002565b610357600435602435600160a060020a0382811660009081526001602090815260408083208585168452909152812054909116818080808481141561046c57610461565b60405180806020018281038252838181518152602001915080519060200190602002808383829060006004602084601f0104600f02600301f1509050019250505060405180910390f35b60408051600160a060020a03929092168252519081900360200190f35b60408051600160a060020a03958616815293909416602084015282840191909152606082015290519081900360800190f35b604080519115158252519081900360200190f35b80600160a060020a0316638ecf343d85856040518360e060020a02815260040180838152602001828152602001925050506020604051808303816000876161da5a03f115610002575050505b95945050505050565b5050506000928352506020909120018054600160a060020a031916861790556103b7565b5090565b80600160a060020a0316637dae7ced6040518160e060020a0281526004018090506080604051808303816000876161da5a03f1156100025750506040805180516020820151928201516060929092015190985091965094509250505b5092959194509250565b600054600160a060020a0316ff5b600095505b505050505092915050565b84600160a060020a0316637dae7ced6040518160e060020a0281526004018090506080604051808303816000876161da5a03f115610002575050604080518051602082015192820151606092909201519097509195509350915050600160a060020a038881169085161480156104f3575086600160a060020a031683600160a060020a0316145b1561045c5784600160a060020a031663be26733c6040518160e060020a0281526004018090506000604051808303816000876161da5a03f11561000257505050600160a060020a038881166000818152600160209081526040808320948c1683529381528382208054600160a060020a0319169055835180820185528281529282526002905291822061063d928b928b929091805b82548210156106475784600160a060020a03168383815481101561000257600091825260209091200154600160a060020a031614156106c25750805b8254600019018110156106ce578254600019016001820111610635578281600101815481101561000257906000526020600020900160009054906101000a9004600160a060020a0316838281548110156100025760009182526020909120018054600160a060020a03191690911790555b6001016105c4565b5060019550610461565b600160a060020a038616600090815260026020908152604091829020805483518184028101840190945280845290918301828280156106b057602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610691575b50939750505050505b50505092915050565b60019190910190610588565b825483906000198101908110156100025760009182526020909120018054600160a060020a031916905582546000198101808555849082801582901161072557600083815260209020610725918101908301610202565b50505050600160a060020a0386166000908152600260209081526040918290208054835181840281018401909452808452909183018282801561079257602002820191906000526020600020905b8154600160a060020a0316815260019190910190602001808311610773575b5050505050935083506106b95660606040526040516080806101e9833960e06040529051905160a05160c0516000805433600160a060020a0319918216178255600180548216909517909455600280549094169094179092556004556005554260035561018590819061006490396000f3606060405236156100825760e060020a60003504632f13b60c81146100845780633296607f14610090578063516dde431461009957806377cb858f146100a25780637addf1ef146100c55780637dae7ced146100d757806388d8c12b1461010a5780638d1343e01461011c5780638ecf343d14610125578063be26733c1461013c575b005b6100b960065460ff1681565b61015a60045481565b61015a60055481565b426005556006805460ff19166001179081905560ff165b15156060908152602090f35b610164600154600160a060020a031681565b600254600154600454600554600160a060020a039384169392909216916060938452608092835260a09190915260c05290f35b610164600254600160a060020a031681565b61015a60035481565b6004803590556024356005554260035560016100b9565b61008260005433600160a060020a0390811691161461017757610002565b6060908152602090f35b600160a060020a03166060908152602090f35b600054600160a060020a0316ff",
    "updated_at": 1471383803457,
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
