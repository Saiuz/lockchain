///////////////////////////////////////////////////////////////////////////////
// Register Controller
// Controller To Manage Enrollment of a new device
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("RegisterController", ["$scope", "$routeParams","$location", "LockFactory", "AccountFactory", "PolicyFactory", function($scope,$routeParams,$location,LockFactory,AccountFactory,PolicyFactory){

	console.log("Entered RegisterController");
	$scope.accounts = AccountFactory.getAccounts();
	$scope.defaultAccount = AccountFactory.getDefaultAccount();
	$scope.selectedAccount=AccountFactory.getSelectedAccount();
	$scope.device={};
	$scope.device.permissions=[];
	if($routeParams.resource){
		$scope.editMode=true;
		initialisefromData($routeParams.resource);
	}
	else{
		$scope.editMode=false;
		initialisefromEmpty();
	} 
	
	///////////////////////////////////////////////////////////////////////////
	// Function InitialiseFromEmpty
	///////////////////////////////////////////////////////////////////////////
	// Set Up The Initial View For The Page. Create Empty Data Structures
	// Populated With Sensible Defaults
	///////////////////////////////////////////////////////////////////////////
	function initialisefromEmpty(){

		$scope.device.address=AccountFactory.getNextDeviceAddress();
		$scope.device.title="";
		$scope.device.model="";
		$scope.device.description="";
		$scope.device.isLocked=true;

		for(i=0; i < $scope.accounts.length; i++){
			var grantFor = ($scope.accounts[i]==$scope.selectedAccount)
			var permission = {name:$scope.accounts[i],startDate:"",endDate:"", grant:grantFor};
			$scope.device.permissions[i] = permission;					
		}

	}

	///////////////////////////////////////////////////////////////////////////
	// Function Initialise
	///////////////////////////////////////////////////////////////////////////
	// Set Up The Initial View For The Page. Create Empty Data Structures
	// Populated With Sensible Defaults
	///////////////////////////////////////////////////////////////////////////
	function initialisefromData(resource){

		
		LockFactory.getResource(resource, function(result){
			$scope.$apply(function(){
				$scope.device.address=resource;
				$scope.device.title=result.title;
				$scope.device.model=result.model;
				$scope.device.description=result.description;
				$scope.device.isLocked=result.isLocked;
			});
		});

		PolicyFactory.getPolicy(resource, function(result){
			
			for(i=0; i < $scope.accounts.length; i++){
				permission = {name:$scope.accounts[i],startDate:0,endDate:0, grant:false};
				for(j=0; j < result.length; j++){
					if(result[j].issuedTo == $scope.accounts[i]){
						permission = {name:result[j].issuedTo,startDate:result[j].startDate,endDate:result[j].endDate, grant:true};
						break;
					}

				}
				$scope.$apply(function(){
					$scope.device.permissions[i] = permission;	
				});
			}
		});
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

	///////////////////////////////////////////////////////////////////////////
	// Function Register
	///////////////////////////////////////////////////////////////////////////
	// Registers and new devices and sets the requested permissions on the 
	// Device as requested. Lock Factorry Register Returns a Blockchain
	// Transaction Id. SetPolicy returns an array of transaction Ids
	///////////////////////////////////////////////////////////////////////////
	$scope.setPolicy = function(){

		LockFactory.register($scope.selectedAccount,$scope.device,function(result){
			console.log(result);
			PolicyFactory.setPolicy($scope.selectedAccount,$scope.device,function(result){
				console.log(result);
			}).then(function(){
				$scope.$apply(function(){
					$location.path("/");
				});
			});

		});
	}

	///////////////////////////////////////////////////////////////////////////
	// Function GrantToUser
	///////////////////////////////////////////////////////////////////////////
	// Update the Model When The User Chooses to Gtant Permissions
	///////////////////////////////////////////////////////////////////////////
	$scope.grantToUser = function (index){
		$scope.device.permissions[index].grant=!$scope.device.permissions[index].grant;
	}	
	

}]);