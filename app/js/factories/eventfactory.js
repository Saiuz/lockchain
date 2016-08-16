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

	///////////////////////////////////////////////////////////////////////////
	// Event Registration
	// Provides a Hook for client code to register an event
	// Returns the event instance
	///////////////////////////////////////////////////////////////////////////
	var registerForEvents = function(filterOptions){

		//var lockAPIContract = LockAPI.deployed();
		//var eventWatcher = lockAPIContract.StateChanged({},filterOptions);
		var logServiceContract = LogService.deployed();
		var eventWatcher = logServiceContract.StateChanged({},filterOptions);
		console.log(eventWatcher);
		return eventWatcher;	
	};

	///////////////////////////////////////////////////////////////////////////
	// Event Start Watching
	// Start Watching the Event, registers a callback to return the event
	// Results so these may then be boiund to a controller
	///////////////////////////////////////////////////////////////////////////
	var startWatching =function(eventWatcher, callback){
		eventWatcher.watch(function(error, result){
  			console.log(result);
  			callback(error,result);
    	});
	};

	///////////////////////////////////////////////////////////////////////////
	// Event Stop Watching
	// Stop Watching the Event, Disables the event on the chain 
	///////////////////////////////////////////////////////////////////////////
	var stopWatching=function(eventWatcher){
		eventWatcher.stopWatching();
	};

	///////////////////////////////////////////////////////////////////////////
	// Get Blockchain Transaction Log
	// Stop Watching the Event, Disables the event on the chain 
	///////////////////////////////////////////////////////////////////////////
	var getTransactionLog = function(filterOptions, callback){
		var lockAPIContract = LockAPI.deployed();
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
	//var getEventLog=function(eventWatcher, callback){
	//	eventWatcher.get(function(error,result){
	//		callback(error,result);	
	//	});	
	//};
	//var getEventLog=function(eventWatcher){
	//	return eventWatcher.get();
	//};
	//var getEventLog=function(filterOptions, callback){
	//	var lockAPIContract = LockAPI.deployed();
	//	var filter = lockAPIContract.allEvents(filterOptions);
	//	console.log(filter);
	//	var filterResults = filter.get(function(error,result){
	//		callback(error,result);	
	//	});	
	//};

	var getEventLog=function(filterOptions, callback){
		var logServiceContract = LogService.deployed();
		var filter = logServiceContract.allEvents(filterOptions);
		console.log(filter);
		var filterResults = filter.get(function(error,result){
			callback(error,result);	
		});	
	};

	//var getEventLog = function(filterOptions,callback){
	//	var filter = web3.eth.filter(filterOptions)
	//	var filterResults = filter.get(function(error,result){
	//		callback(error,result)
	//	});
	//	
	//}

	return{
		registerForEvents: registerForEvents,
		startWatching:startWatching,
		stopWatching:stopWatching,
		getTransactionLog:getTransactionLog,
		getEventLog:getEventLog

	};
});

