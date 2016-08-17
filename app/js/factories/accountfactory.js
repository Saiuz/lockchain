///////////////////////////////////////////////////////////////////////////////
// Account Factory
///////////////////////////////////////////////////////////////////////////////
// Factory To Manage User Blockchain Accounts. These are assumed to be running
// Locally on the Node although all calls are asynchronous.
// Follows standrad angular factory pattern returning an object instance
// of the interface 
///////////////////////////////////////////////////////////////////////////////
// LD042 Advanced Web Engineering
// Andrew Hall 2016
///////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").factory("AccountFactory", function(){
	
	var addressList = ["0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b","0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f","0x913feb633f74299453d651f2d27ce08335b91862",
					   "0x4c9426da3ca8278501ef3bcc86d88ed68e08738c","0x6586faa985223b1b76202f2614184140e09e8acb","0xbafd4e2ced0540bc7fbfc743dad8d81f4da6456a",
					   "0x5aa3cd64be338a660cae5dc62d861f57d5955cdb","0x646dc06d8b9bb7b23d287a48f2411267785d5eb2","0xdf0450134ad95a0fff96b35a37d9fea822b4759d",
					   "0x6908c5272c3a992c5cba93bd4b742859870bd553","0xe965a6309960f2e5747ba10b368821d03420f8a1","0x22e5afe91a5fae2ddef40d8f9f0b39ada13b848c",
					   "0x3b2fd3a24a276d172af552c8334b4660ade1bde8","0xbc1ed964cf8f9cfe8251204e10516a5af857cc92","0x430fb3e064bba7c2bfd288d15ea4095b6e77ae4c",
					   "0x83e38f3036789a2907f8e5a5124e16261ef8af3b","0x6c4b5231ddd3e659ad51fe5b2122d91af5bd602f","0x58d106a0ecf1ad604c9e274c346641dd11b55e6d",
					   "0x6ca17de09275644cdd1e818320dbb55b284276e7","0xbddc8fe256dc536163851d0c796ab3641b165223","0x916480bdb0fdda68afb78ca8d2d45fb889eb09c4",
					   "0x98c65b8cb3bf937cecbbf18ab7909f833bfe89fd","0x9eeba83e619589c87424e2d760c57eed3e8343c6","0x88c22b399c936719e1040c3a7498eb2db150489e",
					   "0x16a3bae5683a14b67c764e0cdcfeb3ba9515e9be","0xb509a4d64876b8396846506b2351c81db9118e71","0x0106575091f08684c45a6f91ef1cc9386ef0fa76",
					   "0xe8c426c019633e92ed5098337d85ca0b23bf09cb","0x86979663e818b23fd9367e65b01049a46a700517"]

	var currentIndex = 5;
					   
	///////////////////////////////////////////////////////////////////////////
	// Function getAccounts
	///////////////////////////////////////////////////////////////////////////
	// Gets The Initial Set of Accounts Configured On The Node Using 
	// Account Factory As The Data Source. 
	///////////////////////////////////////////////////////////////////////////
	var getAccounts = function(callback){
		return web3.eth.accounts;
	};

	///////////////////////////////////////////////////////////////////////////
	// Function Initialise
	///////////////////////////////////////////////////////////////////////////
	// Gets The Initial Set of Accounts Configured On The Node Using 
	// Account Factory As The Data Source. Default account is set as
	// The accounts[0] Coinbase
	///////////////////////////////////////////////////////////////////////////
	var getDefaultAccount = function(callback){
		return web3.eth.coinbase;
	};

	///////////////////////////////////////////////////////////////////////////
	// Function getNextDeviceAddress
	///////////////////////////////////////////////////////////////////////////
	// Returns a valid but dummy address for device registration. In 
	// real world we assume that devices will be preregistered and 
	// already have addresses allocated by the manufacturer
	///////////////////////////////////////////////////////////////////////////
	var getNextDeviceAddress = function(){
		return addressList[currentIndex++];
	};

	return{
		getAccounts: getAccounts,
		getDefaultAccount:getDefaultAccount,
		getNextDeviceAddress:getNextDeviceAddress
	};

});
