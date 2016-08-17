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
	$scope.selectedAccount = $scope.defaultAccount;
	$scope.household=[];
	getRegisteredForAccount($scope.selectedAccount);
		
	///////////////////////////////////////////////////////////////////////
	// Load Data For Selected Account
	///////////////////////////////////////////////////////////////////////
	function getRegisteredForAccount(account){
		LockFactory.getRegisteredForAccount(account, function(result){
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
		getRegisteredForAccount($scope.selectedAccount);
	}

	///////////////////////////////////////////////////////////////////////
	// Toggle Lock
	// Changes the Lock State From Locked To Unlocked or Vice Versa
	///////////////////////////////////////////////////////////////////////
	$scope.toggleLock = function(index){
		if($scope.household[index].Locked){
			unlock(index); return
		}
		
		lock(index);
	};

	///////////////////////////////////////////////////////////////////////
	// Function Lock
	// Use the Lock Factory To Post the Locking Transaction
	///////////////////////////////////////////////////////////////////////
	function lock(index){
		LockFactory.lock($scope.selectedAccount,$scope.household[index].Id, function(result){
			$scope.$apply(function(){
				$scope.household[index].Locked = true;
				console.log("Change Lock State On " + $scope.household[index].Location + " to " + $scope.household[index].Locked);		
			});
		});
	};

	///////////////////////////////////////////////////////////////////////
	// Function Unlock
	// Use the Lock Factory To Post the Unlocking Transaction
	///////////////////////////////////////////////////////////////////////
	function unlock(index){
		LockFactory.unlock($scope.selectedAccount,$scope.household[index].Id, function(result){
			$scope.$apply(function(){
				$scope.household[index].Locked = false;
				console.log("Change Lock State On " + $scope.household[index].Location + " to " + $scope.household[index].Locked);
			});
		});
	};

	
}]);