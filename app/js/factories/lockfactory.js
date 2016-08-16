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
	// Locks the Specified Resource by posting a trnsaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource : Resource object to register
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var register = function(account, resource, callback){
		lockContract.Register(resource.address, resource.model, resource.description, resource.isLocked, {from:account})
		.then(function(result){
			callback(result);
		})
		.catch(function(e){
			console.log(e);
		});
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
	var transfer = function(account, resource, newOwner, callback){
		lockContract.Transfer(resource.address, newOwner, {from:account})
		.then(function(result){
			callback(result);
		})
		.catch(function(e){
			console.log(e);
		});
	};

	///////////////////////////////////////////////////////////////////////////
	// Function Export getRegisteredForAccount
	// Returns the resourecs to which the use has some degree of access rights
    // (a) Find teh resource addresses to which the user has rights
    // (b) Load each resource
    // Note due to restrictions in return types in Solidity this must be done
    // Object by object. To make this more efficient we chain promises
    // together and execute asynchronously
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var getRegisteredForAccount = function(account, callback){
		
		var deviceList = [];
		var promises = [];
		accessContract.GetTokensFor(account)
		.then(function(result){
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
				callback(deviceList);
			})
			.catch(function(error){
				console.log(error);
			});
		});
		
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
	var lock = function(account, resource, callback){
		lockContract.Lock(resource, {from:account})
		.then(function(response){
			callback(response);
		})
		.catch(function(e){
			console.log(e);
		});
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
	var unlock = function(account, resource, callback){
		lockContract.Unlock(resource,{from:account})
		.then(function(response){
			callback(response);
		})
		.catch(function(e){
			console.log(e);
		});
	};

	return{
		register:register,
		transfer:transfer,
		getRegisteredForAccount:getRegisteredForAccount,
		lock: lock,
		unlock:unlock
	};

});
