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
	// Function Pointer Register
	// Locks the Specified Resource by posting a trnsaction on the blockchain
	///////////////////////////////////////////////////////////////////////////
	// Parameters
	// account 	: sender account
	// resource  : address of the resource to lock
	// callback : function to execute when done
	///////////////////////////////////////////////////////////////////////////
	var register = function(account, resource, callback){
		var contract = LockAPI.deployed();
		contract.Register(resource.address, resource.model, resource.description, resource.isLocked, {from:account})
		.then(function(result){
			callback(result);
		})
		.catch(function(e){
			console.log(e);
		});
	};

	var transfer = function(account, resource, newOwner, callback){
		var contract = LockAPI.deployed();
		contract.Transfer(resource.address, newOwner, {from:account})
		.then(function(result){
			callback(result);
		})
		.catch(function(e){
			console.log(e);
		});
	};

	var getRegistered = function(){

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
		var contract = LockAPI.deployed();
		contract.Lock(resource, {from:account})
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
		var contract = LockAPI.deployed();
		contract.Unlock(resource,{from:account})
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
		getRegistered:getRegistered,
		lock: lock,
		unlock:unlock
	};

});
