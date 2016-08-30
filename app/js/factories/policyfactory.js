///////////////////////////////////////////////////////////////////////////////
// Policy Factory
// Registers permissions for a resource on the Blockchain
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").factory("PolicyFactory", function(){
	
	var tokenContract = TokenIssuer.deployed();

	///////////////////////////////////////////////////////////////////////////
	// GetPolicyForResource
	///////////////////////////////////////////////////////////////////////////
	// Returns List of Policy Tokens For A Resource
	// These Can Then Be retreived Indivisually as Required
	// Returns Promise
	///////////////////////////////////////////////////////////////////////////
	var getPolicyForResource = function(resource){
		var promise =
			tokenContract.GetTokensForResource(resource)
			.then(function(result){
				return result;
			});

		return promise;
	}


	///////////////////////////////////////////////////////////////////////////
	// Grant
	///////////////////////////////////////////////////////////////////////////
	// Grants Rights To A Resource 
	// Issues An Event When Complete So The UI Can Monitor What Is Happening
	// It is not Possible to return data from blockchain transactions
	// only calls
	///////////////////////////////////////////////////////////////////////////
	// Returns Promise
	///////////////////////////////////////////////////////////////////////////
	var grant = function(account, resource, permission){

		var subject = permission.name;
		var startDate = dateToUnixTimestamp(permission.startDate);
		var endDate = dateToUnixTimestamp(permission.endDate);
		var access  = permission.access;

		var promise =
			tokenContract.Grant(subject,resource,startDate,endDate, access,{from:account})
			.then(function(result){
				return result;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;	
	}

	///////////////////////////////////////////////////////////////////////////
	// Revoke
	///////////////////////////////////////////////////////////////////////////
	// Revokes Rights From A Resource 
	// Issues An Event When Complete So The UI Can Monitor What Is Happening
	// It is not Possible to return data from blockchain transactions
	// only calls
	///////////////////////////////////////////////////////////////////////////
	// Returns Promise
	///////////////////////////////////////////////////////////////////////////
	var revoke = function(account, resource, permission){

		var subject = permission.name;

		var promise =
			tokenContract.Revoke(subject,resource,{from:account})
			.then(function(result){
				return result;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;	
		
	}

	///////////////////////////////////////////////////////////////////////////
	// getToken
	///////////////////////////////////////////////////////////////////////////
	// Retreives and Access Policy For The Given Resource and Account
	// Formats the Data To Fit The Needs Of The UI for dates and big Numbers
	///////////////////////////////////////////////////////////////////////////
	// Returns Promise
	///////////////////////////////////////////////////////////////////////////
	var getToken = function(account, resource){
		var promise =
			tokenContract.GetToken(account,resource,{from:account})
			.then(function(data){
				var token={name:account,startDate:0,endDate:0,startDateString:"",endDateString:""};
				token.issuedTo = data[0];
				token.issuedFor= data[1];
				if(data[2] > 0){
					startDate = new Date(data[2]*1000);
					token.startDate=startDate;
					token.startDateString=startDate.toString("yyyy-MM-dd");
				}
				if(data[3] > 0){
					endDate = new Date(data[3]*1000);
					token.endDate=endDate;
					token.endDateString=endDate.toString("yyyy-MM-dd");
				}
				token.access=parseInt(data[4].toString());
				return token;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;
	}

	///////////////////////////////////////////////////////////////////////////
	// dateToUnixTimestamp
	///////////////////////////////////////////////////////////////////////////
	// Helper Routine To Convert Date Types To Unix Timestamps for
	// Storage On The Blockchain
	///////////////////////////////////////////////////////////////////////////
	// Returns Promise
	///////////////////////////////////////////////////////////////////////////
	function dateToUnixTimestamp(dateToConvert){

		var newDate = (dateToConvert== null ? 0 : dateToConvert);
		if(newDate != 0){
			newDate = (dateToConvert.getTime()/1000).toFixed(0);
		}
		return newDate;

	}

	return{
		grant:grant,
		revoke:revoke,
		getPolicyForResource:getPolicyForResource,
		getToken:getToken
	};

});
