angular.module("LockChain").controller("TraceController", ["$scope", function($scope){

	$scope.output="No output";

	logContract = LogService.deployed();

	var event = logContract.allEvents({},{fromBlock: 0, toBlock: "latest"},function(error,result){
		console.log(result);
		$scope.output=result;
	});

	$scope.trace = function(){
	
		logContract.TestTrace($scope.message).then(function(result){
			console.log(result);
		});
	}

	$scope.stop = function(){
	
		event.stopWatching();
	}	

}]);