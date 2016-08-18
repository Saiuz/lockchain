///////////////////////////////////////////////////////////////////////////////
// Event Controller
// Controller To Manage Dashboard Display of Events
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("EventController", ["$scope", "$rootScope","EventFactory", function($scope,$rootScope,EventFactory){

	console.log("Entered EventController");

	///////////////////////////////////////////////////////////////////////
	// Enumerated Status Events
	///////////////////////////////////////////////////////////////////////
	$scope.watchStatus = {
		NotWatching:"NOT WATCHING",
		Watching : "WATCHING FOR EVENTS",
		Received: "Received New Event"
	};

	$scope.eventStatus = $scope.watchStatus.NotWatching;
	$scope.eventLog = getEventLog();
	//$scope.transactionLog = getTransactionLog();
	var eventWatcher;

	///////////////////////////////////////////////////////////////////////
	// Toggle Blockchain Event Trace
	///////////////////////////////////////////////////////////////////////
	$scope.toggleEventTrace = function(){
		if($scope.eventStatus == $scope.watchStatus.NotWatching){
			startEventWatch();
		}
		else{
			stopEventWatch();
		}
	}

	///////////////////////////////////////////////////////////////////////
	// Coversion Utility For Displaying Hex Strings As Text
	///////////////////////////////////////////////////////////////////////
	$scope.toAscii = function(item){
		if(item){return web3.toAscii(item)};
	}

	///////////////////////////////////////////////////////////////////////
	// Get Blockchain Transaction Log
	///////////////////////////////////////////////////////////////////////
	function getTransactionLog(){
		var lockAPIContract = LockAPI.deployed();
		var lastBlock = 0;

		if(web3.eth.getBlock("latest").transactions.length >0 && web3.eth.getBlock("latest").transactions[0].blockNumber > 20){
			lastBlock = web3.eth.getBlock("latest").transactions[0].blockNumber-20;	
		}
		
		var filterOptions  = {address: lockAPIContract.address, fromBlock: lastBlock, toBlock: 'latest'};
		EventFactory.getTransactionLog(filterOptions,function(error,result){
			$scope.transactionLog=result;	
			console.log(result);
		});
		return [];
	}

	///////////////////////////////////////////////////////////////////////
	// Get Blockchain Event Log
	///////////////////////////////////////////////////////////////////////
	function getEventLog(){
		
		var lastBlock = 0;
		if(web3.eth.getBlock("latest").transactions.length >0 && web3.eth.getBlock("latest").transactions[0].blockNumber > 20){
			lastBlock = web3.eth.getBlock("latest").transactions[0].blockNumber-20;	
		}
		
		var filterOptions  = {fromBlock: lastBlock, toBlock: 'latest'};
		console.log(filterOptions);
		
		EventFactory.getEventLog(filterOptions,function(error,result){
			$scope.eventLog = result;
			console.log(result);
		});
		//////////////////////////////////////////////////////
		// Return Immediately So When Results Are Loaded
		// A Scope Change Will Be Triggered On The Model
		//////////////////////////////////////////////////////
		return [];

	}

	///////////////////////////////////////////////////////////////////////
	// Start Blockchain Event Trace
	///////////////////////////////////////////////////////////////////////
	function startEventWatch(){
	
		///////////////////////////////////////////////////////////////////
		// Register A New Event With the Factory 
		///////////////////////////////////////////////////////////////////
		eventWatcher = EventFactory.registerForEvents();
		$scope.eventStatus = $scope.watchStatus.Watching;

		///////////////////////////////////////////////////////////////////
		// Start Watching for Events 
		///////////////////////////////////////////////////////////////////
		EventFactory.startWatching(eventWatcher, function(error, result){
			if(!error){
				$scope.$apply(function(){
					$scope.eventStatus = $scope.watchStatus.Received + " " + result.event;
		        	$scope.event = result;
		        	getEventLog();
		        	//getTransactionLog();
		        });
			}

		});		
	}

	///////////////////////////////////////////////////////////////////////
	// Stop Blockchain Event Trace
	///////////////////////////////////////////////////////////////////////
	function stopEventWatch(){

		EventFactory.stopWatching(eventWatcher);
		$scope.eventStatus = $scope.watchStatus.NotWatching;
		
	}

}]);