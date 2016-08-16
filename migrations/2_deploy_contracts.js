module.exports = function(deployer) {

  	deployer.deploy(Disposable);
  	console.log(Disposable.address);
  	deployer.deploy(AccessToken);
  	console.log(AccessToken.address);


  	deployer.deploy(LogService).then(function(){
  		return deployer.deploy(TokenIssuer);
  	}).then(function(){
  		return deployer.deploy(PolicyDecision, TokenIssuer.address, LogService.address);
  	}).then(function(){
  		return deployer.deploy(LockAPI, PolicyDecision.address);		
  	});
  	

};
