///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("LockController", ["$scope", "LockFactory", function($scope,LockFactory){

	//////////////////////////////////////////////////////////////////////////
    // Error Messages Type
    //////////////////////////////////////////////////////////////////////////
    var ErrorMessages = {
        ErrorRegistrationMessage 	: "Error Registering Device",
		ErrorUnRegistrationMessage 	: "Error UnRegistering Device",
		ErrorLockingMessage 		: "Error Locking Device",
		ErrorUnlockingMessage 		: "Error Unlocking Device"
    };

	console.log("Entered LockController");
	$scope.household = initialise();

	function initialise(){
		
		var locations = [];
		locations.push({Id:1, Location:"Front Gate", Description:"Front Gate Lock 0x123456789", Locked:false});
		locations.push({Id:2, Location:"Garage", Description:"Garage Lock 0x123456789", Locked:true});
		locations.push({Id:3, Location:"Front Door", Description:"Front Door Lock 0x123456789", Locked:true});
		locations.push({Id:4, Location:"Bank Door", Description:"Back Lock 0x123456789", Locked:true});
		return locations;
	}

	$scope.register = function(account, address, locked){
		LockFactory.register("0xafa002c51b139fa0b97d2eb37cffa5ed65b5422d","0x23c064bdced55a096bc6d60d4f8e802eaa25e3f4",function(response){
			if(response){
				console.log("TXN = " + response)			
			}
			else{
				$scope.errorMessage=ErrorMessages.ErrorRegistrationMessage;
			}
		})
	}
	

	$scope.lock = function(id){
		$scope.household[id].Locked = true;
		console.log("Change Lock State On " + $scope.household[id].Location + " to " + $scope.household[id].Locked);
	};

	$scope.unlock = function(id){
		$scope.household[id].Locked = false;
		console.log("Change Lock State On " + $scope.household[id].Location + " to " + $scope.household[id].Locked);
	};

	$scope.toggle = function(id){
		$scope.household[id].Locked = !$scope.household[id].Locked;
		console.log("Change Lock State On " + $scope.household[id].Location + " to " + $scope.household[id].Locked);
	};

}]);
