///////////////////////////////////////////////////////////////////////////////
// Lock Factory
///////////////////////////////////////////////////////////////////////////////
// Manages the Lock API Smart Contract Calling the Locked and Unlocked
// Functions of the contract
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").factory("LockFactory", function(){

	///////////////////////////////////////////////////////////////////////////
	// Factory Contract Deployments 
	///////////////////////////////////////////////////////////////////////////
	var lockContract = LockAPI.deployed();
	var accessContract = TokenIssuer.deployed();

	///////////////////////////////////////////////////////////////////////////
	// Function Export Register
	// Locks the Specified Resource by posting a transaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource : Resource object to register
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var register = function(account, resource){
		var promise = lockContract.Register(resource.address, resource.title, resource.model, resource.description, resource.isLocked, {from:account})
		.then(function(result){
			return result;
		})
		.catch(function(e){
			console.log(e);
		});
		return promise;
	};

	///////////////////////////////////////////////////////////////////////////
	// Function Export Transfer
	// Transfers ownership of a previously registered resource
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource : Resource object to transfer
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var transfer = function(account, resource, newOwner){
		var promise = 
			lockContract.Transfer(resource.address, newOwner, {from:account})
			.then(function(result){
				return result;
			})
			.catch(function(error){
				console.log(error);
			});
			return promise;
	};


	///////////////////////////////////////////////////////////////////////////
	// Function Export getRegisteredForAccount
	// Returns the resourecs to which the use has some degree of access rights
    // (a) Find teh resource addresses to which the user has rights
    // (b) Load each resource
    // Note due to restrictions in return types in Solidity this must be done
    // Object by object. To make this more efficient we chain promises
    // together and execute asynchronously
    // See https://www.sitepoint.com/deeper-dive-javascript-promises/
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var getRegisteredForAccount = function(account, callback){
		
		var promise = 
			accessContract.GetTokensForSubject(account)
			.then(function(result){
				var deviceList = [];
				var promises = [];
				for(i=0; i<result.length;i++){
					deviceList.push({address:result[i]});
					promises.push(lockContract.lockAttrs(result[i]));
				}
				return Promise.all(promises).then(function(dataList){
					var index = 0;
					dataList.forEach(function(data){
						deviceList[index].title=web3.toAscii(data[0]);
						deviceList[index].model=web3.toAscii(data[1]);
						deviceList[index].description=web3.toAscii(data[2]);
						deviceList[index].isLocked=data[3];
						index++;
					});

				})
				.then(function(){
					return deviceList;
				})
				.catch(function(error){
					console.log(error);
				});
			});
		return promise;	
		
	};
	
	///////////////////////////////////////////////////////////////////////////
	// Function Export getResource
	// Returns a previously created device at a specified adddess
    ///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: resource account to retrieve
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var getResource = function(resource){
		var promise = 
			lockContract.lockAttrs(resource)
		    .then(function(data){
		       	device={};
				device.address=resource;
				device.title=web3.toAscii(data[0]);
				device.model=web3.toAscii(data[1]);
				device.description=web3.toAscii(data[2]);
				device.isLocked=data[3];
				return device;
		    }); 
		return promise;       
	};

	///////////////////////////////////////////////////////////////////////////
	// Function Pointer Lock
	// Locks the Specified Resource by posting a trnsaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource  : address of the resource to lock
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var lock = function(account, resource){
		var promise = 
			lockContract.Lock(resource, {from:account})
			.then(function(response){
				return response;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;	
	};

	///////////////////////////////////////////////////////////////////////////
	// Function Pointer Unlock
	// UnLocks the Specified Resource by posting transaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource  : address of the resource to lock
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var unlock = function(account, resource){
		var promise =
			lockContract.Unlock(resource,{from:account})
			.then(function(response){
				return response;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;	
	};

	return{
		register:register,
		transfer:transfer,
		getRegisteredForAccount:getRegisteredForAccount,
		getResource:getResource,
		lock: lock,
		unlock:unlock
	};

});
