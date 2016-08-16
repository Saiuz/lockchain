///////////////////////////////////////////////////////////////////////////////
// Register Controller
// Controller To Manage Enrollment of a new device
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////

angular.module("LockChain").controller("RegisterController", ["$scope", "$routeParams","RegisterFactory", "AccountFactory", "IdentityFactory", function($scope,$routeParams,RegisterFactory,AccountFactory, IdentityFactory){

	console.log("Entered RegisterController");
	$scope.accounts = AccountFactory.getAccounts();
	$scope.defaultAccount = AccountFactory.getDefaultAccount();
	$scope.selectedAccount=$routeParams.accountId;
	initialise();

	function initialise(){
		$scope.attributes = [];
		$scope.attributes.push({name:"Device",value:"0x94f683fe1e5cc9a1b24143b2f8b6b989b017a368",readOnly:true});
		$scope.attributes.push({name:"Owner",value:$scope.selectedAccount,readOnly:true});
		$scope.attributes.push({name:"Description",value:"Smart Lock",readOnly:true});
		$scope.attributes.push({name:"Model",value:"TX14596V2",readOnly:true});
		$scope.attributes.push({name:"Manufacturer",value:"Samsung",readOnly:true});
	}


	//$scope.register = function(){
	//	
	//	RegisterFactory.register($scope.selectedAccount, "0x94f683fe1e5cc9a1b24143b2f8b6b989b017a368" ,true, function(response){
	//		console.log(response);
	//	});
	//}

	$scope.register = function(){

		var keys = []; var values = [];
		for(i=0; i < $scope.attributes.length; i++){
			keys.push($scope.attributes[i].name);
			values.push($scope.attributes[i].value);	
		}

		IdentityFactory.register($scope.selectedAccount,"0x94f683fe1e5cc9a1b24143b2f8b6b989b017a368", keys, values, function(response){
			console.log(response);
		});

		RegisterFactory.register($scope.selectedAccount, "0x94f683fe1e5cc9a1b24143b2f8b6b989b017a368" ,true, function(response){
			console.log(response);
		});

	}	


	$scope.addAttribute= function(){

		for(i=0; i < $scope.attributes.length; i++){
			if($scope.newAttribute.name==$scope.attributes[i].name){
				$scope.attributes[i].value=$scope.newAttribute.value;
				return;
			}
		}

		$scope.attributes.push({name:$scope.newAttribute.name,value:$scope.newAttribute.value,readOnly:true});
		$scope.newAttribute.name="";
		$scope.newAttribute.value="";			
	}
	

}]);