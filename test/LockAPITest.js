contract('LockAPI', function(accounts) {

	it("should register a new device", function() {
    var lockContract = LockAPI.deployed();

    	return lockContract.Register("0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b","Home Smart Lock","Model BF85-TS01","Front Door Lock", true)
           .then(function(result){
           		console.log("here" + result);
           		assert.equal(result==true);
           });       

		return lockContract.Register("0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f","Home Smart Lock","Model BF85-TS02","Back Door Lock", true)
           .then(function(result){
           		assert.equal(result==true);
           });
    
 		return lockContract.Register("0x913feb633f74299453d651f2d27ce08335b91862","Home Smart Lock","Model BF85-TS03","Garage Door Lock", false)
           .then(function(result){
           		assert.equal(result==true);
           });
    
    });  


	it("should grant access rights", function() {
		var tokenContract = TokenIssuer.deployed();

		return tokenContract.Grant("0x8d7e5dd6bf11fc95f74d6d322e31065bd1b17af4","0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b",0,0)
           .then(function(result){
           		assert.equal(result!=0x0);
        });

        return tokenContract.Grant("0x8d7e5dd6bf11fc95f74d6d322e31065bd1b17af4","0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f",0,0)
           .then(function(result){
           		assert.equal(result!=0x0);
        });   

		return tokenContract.Grant("0xbe2a72105fa44cc9d9826a4e6e33fccc1fc8ac26","0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b",0,0)
           .then(function(result){
           		assert.equal(result!=0x0);
        });           

	});

});
