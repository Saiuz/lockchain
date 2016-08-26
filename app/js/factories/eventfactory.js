///////////////////////////////////////////////////////////////////////////////
// Event Factory
///////////////////////////////////////////////////////////////////////////////
// Sets Up, Shutsdown and Monitors The Blockchain for new events using
// Filters supplied by consuming applications
// Basic Filter Approach To History
// var filter = web3.eth.filter({fromBlock: 350000, toBlock: 'latest'});
// filter.get(function(error, result){ console.log(error, result); })
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").factory("EventFactory", function(){

	var lockAPIContract = LockAPI.deployed();
	var logServiceContract = LogService.deployed();
	var eventWatcher;
	
	///////////////////////////////////////////////////////////////////////////
	// Event Registration
	// Provides a Hook for client code to register an event
	// Returns the event instance
	///////////////////////////////////////////////////////////////////////////
	var registerForEvents = function(filterOptions){
		var eventWatcher = logServiceContract.allEvents({},filterOptions);
		return eventWatcher;	
	};

	///////////////////////////////////////////////////////////////////////////
	// Event Start Watching
	// Start Watching the Event, registers a callback to return the event
	// Results so these may then be boiund to a controller
	///////////////////////////////////////////////////////////////////////////
	var startWatching =function(eventWatcher, callback){
		eventWatcher.watch(function(error, result){
  			console.log("Event Watcher Started");
  			callback(error,result);
    	});
	};

	///////////////////////////////////////////////////////////////////////////
	// Event Stop Watching
	// Stop Watching the Event, Disables the event on the chain 
	///////////////////////////////////////////////////////////////////////////
	var stopWatching=function(eventWatcher){
		console.log("Event Watcher Stopped");
		eventWatcher.stopWatching();
	};

	///////////////////////////////////////////////////////////////////////////
	// Get Blockchain Transaction Log
	// Stop Watching the Event, Disables the event on the chain 
	///////////////////////////////////////////////////////////////////////////
	var getTransactionLog = function(filterOptions, callback){

		var filter = web3.eth.filter(filterOptions);
		filter.get(function(error, result){
			callback(error,result);
		});	
	};


	///////////////////////////////////////////////////////////////////////////
	// Get Blockchain Event History
	// Returns the event History based on the filter options
	// Useful when not wishing to start an event
	///////////////////////////////////////////////////////////////////////////
	var getEventLog=function(filterOptions, callback){

		var filter = logServiceContract.allEvents(filterOptions);
		console.log(filter);
		var filterResults = filter.get(function(error,result){
			callback(error,result);	
		});	
	};


	///////////////////////////////////////////////////////////////////////////
	// Get the Block Details
	// For Supplied block Number
	///////////////////////////////////////////////////////////////////////////
	var getBlock = function(blockNumber){
		return web3.eth.getBlock(blockNumber);
	};

	///////////////////////////////////////////////////////////////////////////
	// Get Transaction Receipt
	// For Supplied Transaction Hash
	///////////////////////////////////////////////////////////////////////////
	var getTransaction = function(txnHash){
		return web3.eth.getTransaction(txnHash);
	};

	///////////////////////////////////////////////////////////////////////////
	// Get Transaction Receipt
	// For Supplied Transaction Hash
	///////////////////////////////////////////////////////////////////////////
	var getTransactionReceipt = function(txnHash){
		return web3.eth.getTransactionReceipt(txnHash);
	};

	return{
		registerForEvents: registerForEvents,
		startWatching:startWatching,
		stopWatching:stopWatching,
		getTransactionLog:getTransactionLog,
		getEventLog:getEventLog,
		getBlock:getBlock,
		getTransaction:getTransaction,
		getTransactionReceipt:getTransactionReceipt

	};
});

