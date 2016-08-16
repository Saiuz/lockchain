///////////////////////////////////////////////////////////////////////////////
// Account Controller
// Controller To Manage User Blockchain Accounts. These are assumed to be 
// running locally on the Node although all calls are asynchronous
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").controller("AccountController", ["$scope", "AccountFactory", function($scope,AccountFactory){

	console.log("Entered Accountontroller");
	initialise();
	
	///////////////////////////////////////////////////////////////////////////
	// Function Initialise
	///////////////////////////////////////////////////////////////////////////
	// Gets The Initial Set of Accounts Configured On The Node Using 
	// Account Factory As The Data Source. Default account is set as
	// The accounts[0] Coinbase
	///////////////////////////////////////////////////////////////////////////
	function initialise(){
		getAccounts();
		getDefaultAccount();
	}
		
	///////////////////////////////////////////////////////////////////////////
	// Function getAccounts
	///////////////////////////////////////////////////////////////////////////
	// Gets The Initial Set of Accounts Configured On The Node Using 
	// Account Factory As The Data Source. Default account is set as
	// The accounts[0] Coinbase
	///////////////////////////////////////////////////////////////////////////
	function getAccounts(){
		ConfigFactory.getAccounts(function(error, result){
			if(error != null){
				$scope.errorMessage="";
			}
			$scope.accounts = result;
		});
	}

	///////////////////////////////////////////////////////////////////////////
	// Function getDefaultAccount
	///////////////////////////////////////////////////////////////////////////
	// Gets The Initial Set of Accounts Configured On The Node Using 
	// Account Factory As The Data Source. Default account is set as
	// The accounts[0] Coinbase
	///////////////////////////////////////////////////////////////////////////
	function getDefaultAccount(){
		ConfigFactory.getDefaultAccount(function(error,result){
			if(error != null){
				$scope.errorMessage="";
			}
			$scope.defaultAccount = result;
		});
	}

}]);
