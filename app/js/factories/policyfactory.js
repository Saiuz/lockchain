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
	// GetPolicy
	///////////////////////////////////////////////////////////////////////////
	// Gets the policy Saved agaisnt a given resource
	// Policy Describes What Each Subject Can Do Against The Resource
	// Returns Array of Policy Objects Via Callback
	///////////////////////////////////////////////////////////////////////////
	var getPolicy = function(resource){

		var promise =
			tokenContract.GetTokensForResource(resource)
			.then(function(result){
				var policyList = []; var promises = [];
				for(i=0; i<result.length;i++){
					policyList.push({subject:result[i]});
					promises.push(tokenContract.GetToken(result[i],resource));
				}
				return Promise.all(promises).then(function(dataList){
					var index = 0;
					dataList.forEach(function(data){
						policyList[index].issuedTo=data[0];
						policyList[index].issuedFor=data[1];
						policyList[index].startDateString="";
						policyList[index].endDateString="";
						policyList[index].startDate=0;
						policyList[index].endDate=0;

						if(data[2] > 0){
							startDate = new Date(data[2]*1000);
							policyList[index].startDate=startDate;
							policyList[index].startDateString=startDate.toString("yyyy-MM-dd");
						}
						if(data[3] > 0){
							endDate = new Date(data[3]*1000);
							policyList[index].endDate=endDate;
							policyList[index].endDateString=endDate.toString("yyyy-MM-dd");
						}
						policyList[index].access=data[4].toString();
						index++;
					});

				})
				.then(function(){
					return policyList;
				})
				.catch(function(error){
					console.log(error);
				});
			});
			return promise;

	};


	///////////////////////////////////////////////////////////////////////////
	// SetPolicy
	///////////////////////////////////////////////////////////////////////////
	// Registers A New Device by calling web3 RPC Interface To Blockchain
	// For Each Item To Create A Permission Create A Promise And Then
	// Execute all promises
	// Callback returns list of transaction identifiers
	///////////////////////////////////////////////////////////////////////////
	var setPolicy = function(account, resource){
		
		var promises=[];
		for(i=0;i < resource.permissions.length; i++){
			var item = resource.permissions[i];
			if(item.grant){
				var startDate = dateToUnixTimestamp(item.startDate);
				var endDate = dateToUnixTimestamp(item.endDate);
				var access  = item.access;
				promises.push(tokenContract.Grant(item.name, resource.address, startDate, endDate, access, {from:account}));
			}
		}

		var promise =
			Promise.all(promises).then(function(txnList){
				return txnList;
			})
			.catch(function(error){
				console.log(error);
			});
		return promise;	
		
	};


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
		getPolicy:getPolicy,
		setPolicy:setPolicy,
		grant:grant,
		revoke:revoke
	};

});
