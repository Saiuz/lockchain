var a = LockAPI.deployed();
var b = TokenIssuer.deployed();

a.Register("0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b","Home Smart Lock","Model BF85-TS01","Front Door Lock", true).then(console.log)
a.Register("0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f","Home Smart Lock","Model BF85-TS02","Back Door Lock", true).then(console.log)
b.Grant("0x8d7e5dd6bf11fc95f74d6d322e31065bd1b17af4","0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b",0,0).then(console.log)
b.Grant("0xbe2a72105fa44cc9d9826a4e6e33fccc1fc8ac26","0x24cb018a9c32c38c7e3fe436f0e5d4951463eb1b",0,0).then(console.log)
b.Grant("0x8d7e5dd6bf11fc95f74d6d322e31065bd1b17af4","0xd0977fabb1528bb75dba57b5acc8b18adf4a9a1f",0,0).then(console.log)

