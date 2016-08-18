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
	$scope.eventLog = getEventLog({});
	var eventWatcher;

	///////////////////////////////////////////////////////////////////////
	// Toggle Blockchain Event Trace
	// Starts Watching for Events or stops Watching for Events
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
	// Decodes Bytes32 Responses (Called By Front End)
	///////////////////////////////////////////////////////////////////////
	$scope.toAscii = function(item){
		if(item){return web3.toAscii(item)};
	}

	///////////////////////////////////////////////////////////////////////
	// Get Blockchain Transaction Log
	// Returns The Blockchain Transaction Log (Not The Contract Event Log)
	// Based On the filter provided
	///////////////////////////////////////////////////////////////////////
	function getTransactionLog(filterOptions){
		var lockAPIContract = LockAPI.deployed();
		var lastBlock = 0;
		var firstBlock = 0;

		if(web3.eth.getBlock("latest").transactions.length >0 && web3.eth.getBlock("latest").transactions[0].blockNumber > 20){
			firstBlock = web3.eth.getBlock("latest").transactions[0].blockNumber-20;	
		}
		
		filterOptions  = {address: lockAPIContract.address, fromBlock: firstBlock, toBlock: "latest"};
		EventFactory.getTransactionLog(filterOptions,function(error,result){
			$scope.$apply(function(){
				$scope.transactionLog=result;
			});	
		});
		return [];
	}

	///////////////////////////////////////////////////////////////////////
	// Get Blockchain Event Log
	// Returns The BlockChain Contract Event Log Collected By The Log
	// service, Filtered By The Filter Options
	///////////////////////////////////////////////////////////////////////
	function getEventLog(filterOptions){
		
		var lastBlock = 0; var firstBlock = 0;

		if(web3.eth.getBlock("latest").transactions.length >0 && web3.eth.getBlock("latest").transactions[0].blockNumber > 20){
			firstBlock = web3.eth.getBlock("latest").transactions[0].blockNumber-20;	
		}
		
		filterOptions  = {fromBlock: firstBlock, toBlock: "latest"};
		
		EventFactory.getEventLog(filterOptions,function(error,result){
			$scope.$apply(function(){
				$scope.eventLog = result;
				console.log("Retreived Contract Events");			
				console.log(result);
			});
		});
		
		//////////////////////////////////////////////////////
		// Return Immediately So When Results Are Loaded
		// A Scope Change Will Be Triggered On The Model
		//////////////////////////////////////////////////////
		return [];

	}

	///////////////////////////////////////////////////////////////////////
	// Start Blockchain Event Trace
	// Start A Watcher Function On The Log Service
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
					console.log("Received Event Notification");
					$scope.eventStatus = $scope.watchStatus.Received + " " + result.event;
		        	$scope.event = result;
		        	getEventLog({});
		        });
			}
			else{
				console.log("Received Event Notification Error");
				console.log(error)
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