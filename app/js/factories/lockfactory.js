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


	var lockContract = LockAPI.deployed();
	var accessContract = TokenIssuer.deployed();

	///////////////////////////////////////////////////////////////////////////
	// Function Pointer Register
	// Locks the Specified Resource by posting a trnsaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource  : address of the resource to lock
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

	var transfer = function(account, resource, newOwner, callback){
		lockContract.Transfer(resource.address, newOwner, {from:account})
		.then(function(result){
			callback(result);
		})
		.catch(function(e){
			console.log(e);
		});
	};

	var getRegisteredForAccount = function(account, callback){

		var dataItems=[];
		accessContract.GetTokensFor(account)
		.then(function(result){
			for(i=0; i<result.length; i++){
				dataItems.push({address:result[i]});
				return lockContract.lockAttrs(result[i])
			}
		})
		.then(function(device){
			index=0
			if(device){
				dataItems[index].model = web3.toAscii(device[0]);
				dataItems[index].description = web3.toAscii(device[1]);
				dataItems[index].isLocked=device[2];
			}
			callback(dataItems);
		})
		.catch(function(e){
			console.log(e);
		});	

		//accessList = accessContract.GetTokensFor(account);
		//for(i=0; i < accessList.length; i++){
		//	var lockContract = LockAPI.deployed();
		//	lockContract.lockAttrs(accessList[i]);
		//}
		//callback(accessList);

		//accessContract.GetTokensFor(account)
		//.then(function(result){
		//	callback(result);
		//})
		//.catch(function(e){
		//	console.log(e);
		//});

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
