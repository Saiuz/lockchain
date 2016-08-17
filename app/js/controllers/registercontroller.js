///////////////////////////////////////////////////////////////////////////////
// Register Controller
// Controller To Manage Enrollment of a new device
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////

angular.module("LockChain").controller("RegisterController", ["$scope", "$routeParams","LockFactory", "AccountFactory", "PolicyFactory", function($scope,$routeParams,LockFactory,AccountFactory,PolicyFactory){

	console.log("Entered RegisterController");
	$scope.accounts = AccountFactory.getAccounts();
	$scope.defaultAccount = AccountFactory.getDefaultAccount();
	$scope.selectedAccount=$routeParams.accountId;
	$scope.device={};
	$scope.device.permissions=[];
	initialise();

	///////////////////////////////////////////////////////////////////////////
	// Function Initialise
	///////////////////////////////////////////////////////////////////////////
	// Set Up The Initial View For The Page. Create Empty Data Structures
	// Populated With Sensible Defaults
	///////////////////////////////////////////////////////////////////////////
	function initialise(){
		$scope.device.address="0x4c9426da3ca8278501ef3bcc86d88ed68e08738c";
		$scope.device.title="";
		$scope.device.model="";
		$scope.device.description="";
		$scope.device.isLocked=true;

		for(i=0; i < $scope.accounts.length; i++){
			var grantFor = (scope.accounts[i]==$scope.selectedAccount)
			var permission = {name:$scope.accounts[i],startDate:"",endDate:"", grant:grantFor};
			$scope.device.permissions[i] = permission;					
		}

	}

	///////////////////////////////////////////////////////////////////////////
	// Function Register
	///////////////////////////////////////////////////////////////////////////
	// Registers and new devices and sets the requested permissions on the 
	// Device as requested. Lock Factorry Register Returns a Blockchain
	// Transaction Id. SetPolicy returns an array of transaction Ids
	///////////////////////////////////////////////////////////////////////////
	$scope.register = function(){

		LockFactory.register($scope.selectedAccount,$scope.device,function(result){
			console.log(result);
			PolicyFactory.setPolicy($scope.selectedAccount,$scope.device,function(result){
				console.log(result);
			});

		});
	}	
	

}]);