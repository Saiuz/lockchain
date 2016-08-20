///////////////////////////////////////////////////////////////////////////////
// Home Controller
// Controller To Manage Dashboard Aspects Of The Application On The Home Page
// Depends On Home Factory, Event Factory and Account Factory For Data
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("HomeController", ["$scope", "$rootScope", "AccountFactory","EventFactory", "LockFactory", function($scope,$rootScope,AccountFactory,EventFactory,LockFactory){

	console.log("Entered HomeController");

	///////////////////////////////////////////////////////////////////////
	// Initialisation Code for Home Controller
	///////////////////////////////////////////////////////////////////////
	$scope.accounts = AccountFactory.getAccounts();
	$scope.defaultAccount = AccountFactory.getDefaultAccount();
	$scope.selectedAccount = AccountFactory.getSelectedAccount();

	if(!$scope.selectedAccount){
		AccountFactory.setSelectedAccount($scope.defaultAccount);
		$scope.selectedAccount = $scope.defaultAccount;
	}
	
	$scope.household=[];
	getRegisteredForAccount($scope.selectedAccount);
	var eventWatcher;
		

	///////////////////////////////////////////////////////////////////////
	// Load Data For Selected Account
	///////////////////////////////////////////////////////////////////////
	function getRegisteredForAccount(account){
		LockFactory.getRegisteredForAccount(account)
		.then(function(result){
			$scope.$apply(function(){
				$scope.household=result;
			});
		});
	}
	

	///////////////////////////////////////////////////////////////////////
	// Handle Selected Account Changed Event
	// Reload Data For New Selected Account
	///////////////////////////////////////////////////////////////////////
	$scope.selectedAccountChanged = function(){
		AccountFactory.setSelectedAccount($scope.selectedAccount);
		getRegisteredForAccount($scope.selectedAccount);
	}

	///////////////////////////////////////////////////////////////////////
	// Toggle Lock
	// Changes the Lock State From Locked To Unlocked or Vice Versa
	///////////////////////////////////////////////////////////////////////
	$scope.toggleLock = function(index){
		if($scope.household[index].isLocked){
			unlock(index); return
		}
		
		lock(index);
	};

	///////////////////////////////////////////////////////////////////////
	// Event Broadcast Receiver
	// Notified Page That A Lock Status Update has Been Reecived
	///////////////////////////////////////////////////////////////////////
	$scope.$on("OnStatusChanged", function(event, args) {
		if(args.event != "AccessDenied" && args.event != "AccessGranted"){
			getRegisteredForAccount($scope.selectedAccount);
		}
	});

	///////////////////////////////////////////////////////////////////////
	// Function Lock
	// Use the Lock Factory To Post the Locking Transaction
	///////////////////////////////////////////////////////////////////////
	function lock(index){

		var logServiceContract = LogService.deployed();
		var filterOptions = {fromBlock:"latest",toBlock:"latest"};
		
		///////////////////////////////////////////////////////////////////
		// Clear Up Any Previous Event Watchers
		///////////////////////////////////////////////////////////////////
		if(eventWatcher) EventFactory.stopWatching(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Create a new Event Watchers
		///////////////////////////////////////////////////////////////////
		eventWatcher = logServiceContract.Locked({},filterOptions);
		console.log(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Start Watching for the unlock event
		///////////////////////////////////////////////////////////////////
		EventFactory.startWatching(eventWatcher, function(error,result){
			
			resource = result.args.resource;
			subject = result.args.subject;
			if(subject == $scope.selectedAccount && resource == $scope.household[index].address){
				$scope.$apply(function(){
					$scope.household[index].isLocked = true;
					$scope.household[index].status="";
				});
				console.log("Change Lock State On " + $scope.household[index].title + " to " + $scope.household[index].isLocked);		
			}
			EventFactory.stopWatching(eventWatcher);	
		});

		///////////////////////////////////////////////////////////////////
		// Run the Lock action
		///////////////////////////////////////////////////////////////////
		LockFactory.lock($scope.selectedAccount,$scope.household[index].address)
		.then(function(result){
			$scope.household[index].status = "(Pending Lock)";
			console.log("Change Lock State On " + $scope.household[index].title + " to " + $scope.household[index].isLocked);		
		});
	};

	///////////////////////////////////////////////////////////////////////
	// Function Unlock
	// Use the Lock Factory To Post the Unlocking Transaction
	///////////////////////////////////////////////////////////////////////
	function unlock(index){
		
		var logServiceContract = LogService.deployed();
		var filterOptions = {fromBlock:"latest",toBlock:"latest"};
		
		///////////////////////////////////////////////////////////////////
		// Clear Up Any Previous Event Watchers
		///////////////////////////////////////////////////////////////////
		if(eventWatcher) EventFactory.stopWatching(eventWatcher);

		///////////////////////////////////////////////////////////////////
		// Create a new Event Watchers
		///////////////////////////////////////////////////////////////////
		eventWatcher = logServiceContract.Unlocked({},filterOptions);
		console.log(eventWatcher);
		
		///////////////////////////////////////////////////////////////////
		// Start Watching for the unlock event
		///////////////////////////////////////////////////////////////////
		EventFactory.startWatching(eventWatcher, function(error,result){
			
			resource = result.args.resource;
			subject = result.args.subject;
			if(subject == $scope.selectedAccount && resource == $scope.household[index].address){
				$scope.$apply(function(){
					$scope.household[index].isLocked = false;
					$scope.household[index].status="";
				});
				console.log("Change Lock State On " + $scope.household[index].Location + " to " + $scope.household[index].isLocked);		
			}
			EventFactory.stopWatching(eventWatcher);	
		});

		///////////////////////////////////////////////////////////////////
		// Run the unlock action
		///////////////////////////////////////////////////////////////////
		LockFactory.unlock($scope.selectedAccount,$scope.household[index].address)
		.then(function(result){
			$scope.$apply(function(){
				$scope.household[index].status = "(Pending Unlock)";
			});
			console.log("Change Lock State On " + $scope.household[index].Location + " to " + $scope.household[index].isLocked);		
		});
	};

	
}]);