///////////////////////////////////////////////////////////////////////////////
// Policy Factory
// Registers permissions for a resource on the Blockchain
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").factory("PolicyFactory", function(){
	
	var tokenContract = TokenIssuer.deployed();

	var setPolicyA = function(account, resource, callback){

		for(i=0;i < resource.permissions.length; i++){
			var item = resource.permissions[i];
			
			if(item.grant){
				var startDate = 0; var endDate = 0;
				if(item.startDate != 0){
					startDate = (item.startDate.getTime()/1000).toFixed(0);
				}
				if(item.endDate != 0){
					endDate = (item.endDate.getTime()/1000).toFixed(0);
				}
				tokenContract.Grant(item.name, resource.address, startDate, endDate,{from:account});
			}
		}
		callback(true);
	};

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
						policyList[index].startDate=Date(data[2]);
						policyList[index].endDate=Date(data[3]);
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

	/*var getPolicy = function(resource, callback){

		var policyList = [];
		var promises = [];
		tokenContract.GetTokensForResource(resource)
		.then(function(result){

			for(i=0; i<result.length;i++){
				policyList.push({subject:result[i]});
				promises.push(tokenContract.GetToken(result[i],resource));
			}
			return Promise.all(promises).then(function(dataList){
				var index = 0;
				dataList.forEach(function(data){
					policyList[index].issuedTo=data[0];
					policyList[index].issuedFor=data[1];
					policyList[index].startDate=Date(data[2]);
					policyList[index].endDate=Date(data[3]);
					index++;
				});

			})
			.then(function(){
				callback(policyList);
			})
			.catch(function(error){
				console.log(error);
			});

		});

	};*/



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
				var startDate = 0; var endDate = 0;
				if(item.startDate != 0){
					startDate = (item.startDate.getTime()/1000).toFixed(0);
				}
				if(item.endDate != 0){
					endDate = (item.endDate.getTime()/1000).toFixed(0);
				}
				promises.push(tokenContract.Grant(item.name, resource.address, startDate, endDate,{from:account}));
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
	/*var setPolicy = function(account, resource, callback){
		
		promises=[];

		for(i=0;i < resource.permissions.length; i++){
			var item = resource.permissions[i];
			
			if(item.grant){
				var startDate = 0; var endDate = 0;
				if(item.startDate != 0){
					startDate = (item.startDate.getTime()/1000).toFixed(0);
				}
				if(item.endDate != 0){
					endDate = (item.endDate.getTime()/1000).toFixed(0);
				}
				promises.push(tokenContract.Grant(item.name, resource.address, startDate, endDate,{from:account}));
			}
		}

		return Promise.all(promises).then(function(txnList){
			callback(txnList);
		})
		.catch(function(error){
			console.log(error);
		});
		
	};*/

	return{
		getPolicy:getPolicy,
		setPolicy:setPolicy
	};

});
