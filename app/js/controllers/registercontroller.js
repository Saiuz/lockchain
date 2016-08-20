///////////////////////////////////////////////////////////////////////////////
// Register Controller
// Controller To Manage Enrollment of a new device
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("RegisterController", ["$scope", "$routeParams","$location", "LockFactory", "AccountFactory", "PolicyFactory", "EventFactory", function($scope,$routeParams,$location,LockFactory,AccountFactory,PolicyFactory,EventFactory){

	console.log("Entered RegisterController");
	$scope.accounts = AccountFactory.getAccounts();
	$scope.defaultAccount = AccountFactory.getDefaultAccount();
	$scope.selectedAccount=AccountFactory.getSelectedAccount();
	if(!$scope.selectedAccount) $scope.selectedAccount=$scope.defaultAccount;
	
	$scope.accessLevels=["None","User","Admin"];

	$scope.device={};
	$scope.device.permissions=[];
	if($routeParams.resource){
		$scope.editMode=true;
		$scope.pageTitle="1. Edit Device Details";
		initialisefromData($routeParams.resource);
	}
	else{
		$scope.editMode=false;
		$scope.pageTitle="1. Add Device Details";
		initialisefromEmpty();
	} 

	var eventWatcher;
	
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
			var grantFor = ($scope.accounts[i]==$scope.selectedAccount);
			var level = ($scope.accounts[i]==$scope.selectedAccount ? 2 : 0);
			var access = $scope.accessLevels[level];
			var permission = {name:$scope.accounts[i],startDate:0, endDate:0,startDateString:"",endDateString:"", access:level, grant:grantFor};
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

		LockFactory.getResource(resource)
			.then(function(device){
				console.log(device);
				var promise = PolicyFactory.getPolicyForResource(resource);
				return promise;
			})
			.then(function(result){
				console.log(result);
				var promises = []; //var policyList = [];
				for(i=0; i<result.length;i++){
					//policyList.push({subject:result[i]});
					promises.push(PolicyFactory.getToken(result[i],resource));
				}
				return Promise.all(promises);
			})
			.then(function(result){
				console.log(result);
				var permissions = []
				for(i=0; i < $scope.accounts.length; i++){
					permission = {name:$scope.accounts[i],startDate:0,endDate:0,startDateString:"",endDateString:"", access: 0, grant:false};
					for(j=0; j < result.length; j++){
						if(result[j].issuedTo == $scope.accounts[i]){
							result[j].grant=true;
							permission=result[j];
							break; 	
						}
					}
					permissions[i] = permission;
				}
				device.permissions=permissions;
				$scope.$apply(function(){
					$scope.device = device;
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
	$scope.register = function(){

		console.log("REGISTER CONTROLLER ABOUT TO SAVE");
		console.log($scope.device);	
		LockFactory.register($scope.selectedAccount,$scope.device)
		.then(function(result){
			console.log(result);
		});		

		if($scope.editMode) return;

		var promises = []; 
		for(i=0; i<$scope.device.permissions.length;i++){		
			if($scope.device.permissions[i].grant){
				promises.push(PolicyFactory.grant($scope.selectedAccount, $scope.device.address, $scope.device.permissions[i]));
			}
		}
		Promise.all(promises)
		.then(function(result){
			console.log(result);
		});

	}
	

	/*$scope.register = function(){

		LockFactory.register($scope.selectedAccount,$scope.device)
		.then(function(result){
			console.log(result);
			PolicyFactory.setPolicy($scope.selectedAccount,$scope.device)
			.then(function(result){
				console.log(result);
			});

		});
	}*/

	///////////////////////////////////////////////////////////////////////////
	// Function Register
	///////////////////////////////////////////////////////////////////////////
	// Registers and new devices and sets the requested permissions on the 
	// Device as requested. Lock Factorry Register Returns a Blockchain
	// Transaction Id. SetPolicy returns an array of transaction Ids
	///////////////////////////////////////////////////////////////////////////
	/*$scope.setPolicy = function(){

		LockFactory.register($scope.selectedAccount,$scope.device)
		.then(function(result){	
			console.log(result);
			PolicyFactory.setPolicy($scope.selectedAccount,$scope.device)
			.then(function(result){
				console.log(result);	
				$scope.$apply(function(){
					$location.path("/");
				});
			});

		});
	}*/

	///////////////////////////////////////////////////////////////////////////
	// Function Grant
	///////////////////////////////////////////////////////////////////////////
	// Grants Rights to the Relevant Resource
	// Parameters
	// Index of Subject To Grant Resource Access To
	///////////////////////////////////////////////////////////////////////////
	$scope.grant = function(index){

		var logServiceContract=LogService.deployed();
		var filterOptions = {fromBlock:"latest",toBlock:"latest"};
		
		///////////////////////////////////////////////////////////////////
		// Clear Up Any Previous Event Watchers
		///////////////////////////////////////////////////////////////////
		if(eventWatcher) EventFactory.stopWatching(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Create a new Event Watchers
		///////////////////////////////////////////////////////////////////
		eventWatcher = logServiceContract.AccessGranted({},filterOptions);
		console.log(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Start Watching for the unlock event
		///////////////////////////////////////////////////////////////////
		EventFactory.startWatching(eventWatcher, function(error,result){
			
			resource = result.args.resource;
			subject = result.args.subject;
			if(subject == $scope.selectedAccount && resource == device.address){
				$scope.$apply(function(){
					$scope.device.permissions[index].grant=!$scope.device.permissions[index].grant;
				});
			}
			EventFactory.stopWatching(eventWatcher);	
		});

		///////////////////////////////////////////////////////////////////
		// Run the Grant
		///////////////////////////////////////////////////////////////////
		PolicyFactory.grant($scope.selectedAccount, $scope.device.address, $scope.device.permissions[index])
		.then(function(result){
			console.log(result);
		})
	}

	///////////////////////////////////////////////////////////////////////////
	// Function Revole
	///////////////////////////////////////////////////////////////////////////
	// Grants Rights to the Relevant Resource
	// Parameters
	// Index of Subject To Grant Resource Access To
	///////////////////////////////////////////////////////////////////////////
	$scope.revoke = function(index){

		
		var logServiceContract=LogService.deployed();
		var filterOptions = {fromBlock:"latest",toBlock:"latest"};
		
		///////////////////////////////////////////////////////////////////
		// Clear Up Any Previous Event Watchers
		///////////////////////////////////////////////////////////////////
		if(eventWatcher) EventFactory.stopWatching(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Create a new Event Watchers
		///////////////////////////////////////////////////////////////////
		eventWatcher = logServiceContract.AccessGranted({},filterOptions);
		console.log(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Start Watching for the unlock event
		///////////////////////////////////////////////////////////////////
		EventFactory.startWatching(eventWatcher, function(error,result){
			
			resource = result.args.resource;
			subject = result.args.subject;
			if(subject == $scope.selectedAccount && resource == device.address){
				$scope.$apply(function(){
					$scope.device.permissions[index].grant=!$scope.device.permissions[index].grant;
					$scope.device.permissions[index].startDate=0;
					$scope.device.permissions[index].endDate=0;
					$scope.device.permissions[index].startDateString="";
					$scope.device.permissions[index].endDateString="";
					$scope.device.permissions[index].access=0;
				});
			}
			EventFactory.stopWatching(eventWatcher);	
		});


		PolicyFactory.revoke($scope.selectedAccount, $scope.device.address, $scope.device.permissions[index])
		.then(function(result){
			console.log(result);
		})
	}


	///////////////////////////////////////////////////////////////////////////
	// Function GrantToUser
	///////////////////////////////////////////////////////////////////////////
	// Update the Model When The User Chooses to Gtant Permissions
	// Issues the gtrant or revole procedure as appropriate
	///////////////////////////////////////////////////////////////////////////
	$scope.grantToUser = function (index){
		//$scope.device.permissions[index].grant=!$scope.device.permissions[index].grant;
		if(!$scope.device.permissions[index].grant){
			$scope.grant(index); return;
		} 
		$scope.revoke(index);
	}	
	

}]);