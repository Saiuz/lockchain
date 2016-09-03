contract("LockAPI", function(accounts) {

	var owner = accounts[0]; 
  var subject_1 = accounts[1];
  var subject_2 = accounts[2];
  var subject_3 = accounts[3];
  var subject_4 = accounts[4];
  var resources = ["0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b","0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f","0x913feb633f74299453d651f2d27ce08335b91862"];
  var t1 = 1470009600;
  var t2 = 1501545600;

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 1 Register a new device and verify Registration
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should register a new device", function() {

    var lockContract = LockAPI.deployed();
    var policyContract = TokenIssuer.deployed();

    return lockContract.Register(resources[0],"Home Smart Lock","Model BF85-TS01","Front Door Lock", true)
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0]);
    })
    .then(function(result){
        var title = web3.toAscii(result[1]).replace(/\u0000/g, "");
        var model = web3.toAscii(result[2]).replace(/\u0000/g, "");
        var descr = web3.toAscii(result[3]).replace(/\u0000/g, "");   
        assert.equal(result[0],owner,"Incorrect Owner Assigned");
        assert.equal(title,"Home Smart Lock","Incorrect Title Assigned");
        assert.equal(model,"Model BF85-TS01","Incorrect Model Assigned");
        assert.equal(descr,"Front Door Lock","Incorrect Description Assigned");
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
    })
    
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 2 Add A Device Owner With Admin rights
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should add a device owner", function() {
      
      var policyContract = TokenIssuer.deployed();

      return policyContract.Grant(owner, resources[0], 0, 0, 2)
      .then(function(result){
          console.log(result);
          return policyContract.GetTokensForResource.call(resources[0]); 
      })
      .then(function(result){
          assert.equal(result.length,1,"Incorrect Number of Tokens Received");
          return policyContract.GetToken.call(owner,resources[0]);
      })
      .then(function(result){
          console.log(result);
          assert.equal(result[0], owner,"Incorrect Owner Assigned");
          assert.equal(result[1], resources[0],"Incorrect Resource Assigned");
          assert.equal(result[2], 0,"Incorrect Start Date Assigned");
          assert.equal(result[3], 0,"Incorrect End Date Assigned");
          assert.equal(result[4], 2,"Incorrect Access Level Assigned");
      })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 3 Add A Subject With User rights
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should grant a user level permission", function() {
      
      var policyContract = TokenIssuer.deployed();

      return policyContract.Grant(subject_1, resources[0], 0, 0, 1)
      .then(function(result){
          console.log(result);
          return policyContract.GetTokensForResource.call(resources[0]); 
      })
      .then(function(result){
          assert.equal(result.length,2,"Incorrect Number of Tokens Received");
          return policyContract.GetToken.call(subject_1,resources[0]);
      })
      .then(function(result){
          console.log(result);
          assert.equal(result[0], subject_1,"Incorrect Subject Assigned");
          assert.equal(result[1], resources[0],"Incorrect Resource Assigned");
          assert.equal(result[2], 0,"Incorrect Start Date Assigned");
          assert.equal(result[3], 0,"Incorrect End Date Assigned");
          assert.equal(result[4], 1,"Incorrect Access Level Assigned");
      })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 4 Add A Subject With Read Only rights
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should grant a read only level permission", function() {
      
      var policyContract = TokenIssuer.deployed();

      return policyContract.Grant(subject_2, resources[0], 0, 0, 0)
      .then(function(result){
          console.log(result);
          return policyContract.GetTokensForResource.call(resources[0]); 
      })
      .then(function(result){
          assert.equal(result.length,3,"Incorrect Number of Tokens Received");
          return policyContract.GetToken.call(subject_2,resources[0]);
      })
      .then(function(result){
          console.log(result);
          assert.equal(result[0], subject_2,"Incorrect Subject Assigned");
          assert.equal(result[1], resources[0],"Incorrect Resource Assigned");
          assert.equal(result[2], 0,"Incorrect Start Date Assigned");
          assert.equal(result[3], 0,"Incorrect End Date Assigned");
          assert.equal(result[4], 0,"Incorrect Access Level Assigned");
      })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 5 Add A Subject With Time Bound User rights
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should grant a valid time bound user level permission", function() {
      
      var policyContract = TokenIssuer.deployed();

      return policyContract.Grant(subject_3, resources[0],t1, t2, 1)
      .then(function(result){
          console.log(result);
          return policyContract.GetTokensForResource.call(resources[0]); 
      })
      .then(function(result){
          assert.equal(result.length,4,"Incorrect Number of Tokens Received");
          return policyContract.GetToken.call(subject_3,resources[0]);
      })
      .then(function(result){
          console.log(result);
          assert.equal(result[0], subject_3,"Incorrect Subject Assigned");
          assert.equal(result[1], resources[0],"Incorrect Resource Assigned");
          assert.equal(result[2], t1,"Incorrect Start Date Assigned");
          assert.equal(result[3], t2,"Incorrect End Date Assigned");
          assert.equal(result[4], 1,"Incorrect Access Level Assigned");
      })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 6 Add A Subject With Expired User rights
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should grant a expired time bound user level permission", function() {
      
      var policyContract = TokenIssuer.deployed();

      return policyContract.Grant(subject_4, resources[0], 0, t1, 1)
      .then(function(result){
          console.log(result);
          return policyContract.GetTokensForResource.call(resources[0]); 
      })
      .then(function(result){
          assert.equal(result.length,5,"Incorrect Number of Tokens Received");
          return policyContract.GetToken.call(subject_4,resources[0]);
      })
      .then(function(result){
          console.log(result);
          assert.equal(result[0], subject_4,"Incorrect Subject Assigned");
          assert.equal(result[1], resources[0],"Incorrect Resource Assigned");
          assert.equal(result[2], 0,"Incorrect Start Date Assigned");
          assert.equal(result[3], t1,"Incorrect End Date Assigned");
          assert.equal(result[4], 1,"Incorrect Access Level Assigned");
      })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 7 Grant Lock and Unlock Access To Level 2 users
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should allow users with level 2 permissions to lock and unlock", function() {

    var lockContract = LockAPI.deployed();

    return lockContract.lockAttrs.call(resources[0])
    .then(function(result){
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
        return lockContract.Unlock(resources[0]);
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],false,"Failed to Unlock Device");
        return lockContract.Lock(resources[0]);
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Lock Device");
    })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 8 Grant Lock and Unlock Access To Level 1 users
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should allow users with level 1 permissions to lock and unlock", function() {

    var lockContract = LockAPI.deployed();

    return lockContract.lockAttrs.call(resources[0])
    .then(function(result){
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
        return lockContract.Unlock(resources[0],{from:subject_1});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],false,"Failed to Unlock Device");
        return lockContract.Lock(resources[0],{from:subject_1});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Lock Device");
    })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 9 Deny Lock and Unlock Access To Level 2 users
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should deny users with level 0 permissions to lock and unlock", function() {

    var lockContract = LockAPI.deployed();

    return lockContract.lockAttrs.call(resources[0])
    .then(function(result){
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
        return lockContract.Unlock(resources[0],{from:subject_2});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Unlock Device");
        return lockContract.Lock(resources[0],{from:subject_2});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Lock Device");
    })
  
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 10 Allow Lock and Unlock Access To Level 1 users in time period
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should allow users with level 1 permissions to lock and unlock in valid time restriction", function() {

    var lockContract = LockAPI.deployed();

    return lockContract.lockAttrs.call(resources[0])
    .then(function(result){
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
        return lockContract.Unlock(resources[0],{from:subject_3});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],false,"Failed to Unlock Device");
        return lockContract.Lock(resources[0],{from:subject_3});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Lock Device");
    })
  
  });
  

  //////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST 11 Deny Lock and Unlock Access To Level 1 users when access is expired
  //////////////////////////////////////////////////////////////////////////////////////////////////////
  it("should deny users with level 1 permissions to lock and unlock in expired time restriction", function() {

    var lockContract = LockAPI.deployed();

    return lockContract.lockAttrs.call(resources[0])
    .then(function(result){
        assert.equal(result[4],true,"Incorrect Lock Status Assigned");
        return lockContract.Unlock(resources[0],{from:subject_4});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Unlock Device");
        return lockContract.Lock(resources[0],{from:subject_4});
    })
    .then(function(result){
        return lockContract.lockAttrs.call(resources[0])
    })
    .then(function(result){
        assert.equal(result[4],true,"Failed to Lock Device");
    })
  
  });



});
