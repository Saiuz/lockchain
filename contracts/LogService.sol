import "./Disposable.sol";

contract LogService is Disposable{
	
	event StateChanged(bytes32 indexed source, address indexed resource, address indexed by, bytes32 message);
	event AccessDenied(bytes32 indexed source, address indexed resource, address indexed by, bytes32 message);
	event AccessGranted(bytes32 indexed source, address indexed resource, address indexed by, bytes32 message);
	
	function LogStateChanged(bytes32 source, address resource, address by, bytes32 message) returns (bool result){
		StateChanged(source, resource, by, message);
		result=true;
	}
	
    function LogAccessDenied(bytes32 source, address resource, address by) returns (bool result){
		AccessDenied(source, resource, by, "Access Denied");
		result=true;
	}

    function LogAccessGranted(bytes32 source, address resource, address by) returns (bool result){
		AccessGranted(source, resource, by, "Access Granted");
		result=true;
	}

}