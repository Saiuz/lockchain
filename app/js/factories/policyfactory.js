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

		tokenContract.Grant(resource.permissions[0].name,resource.address,0,0,{from:account})
		.then(function(result){
			console.log(result);
		})
		.catch(function(error){
			console.log(error);
		});
	};

	///////////////////////////////////////////////////////////////////////////
	// SetPolicy
	// Registers A New Device by calling web3 RPC Interface To Blockchain
	// For Each Item To Create A Permission Create A Promise And Then
	// Execute all promises
	// Callback returns list of transaction identifiers
	///////////////////////////////////////////////////////////////////////////
	var setPolicy = function(account, resource, callback){
		
		promises=[];

		for(i=0;i < resource.permissions.length-1; i++){
			var item = resource.permissions[i];
			
			if(item.grant){
				var startDate = 0;
				var endDate = 0;
				if(resource.startDate != 0 && Date.parse(resource.startDate)){
					startDate = (Date.parse(resource.startDate).getTime()/1000).toFixed(0);
				}
				if(resource.endDate != 0 && Date.parse(resource.endDate)){
					endDate = (Date.parse(resource.endDate).getTime()/1000).toFixed(0);
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
		
	};

	return{
		setPolicy: setPolicy
	};

});
