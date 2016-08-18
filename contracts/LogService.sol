import "./Disposable.sol";

contract LogService is Disposable{
	
	event StateChanged(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event AccessDenied(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event AccessGranted(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event Locked(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event Unlocked(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	
	function LogStateChanged(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		StateChanged(source, subject, resource, message);
		result=true;
	}
	
    function LogAccessDenied(bytes32 source, address subject, address resource) returns (bool result){
		AccessDenied(source, subject, resource, "Access Denied");
		result=true;
	}

    function LogAccessGranted(bytes32 source, address subject, address resource) returns (bool result){
		AccessGranted(source, subject, resource, "Access Granted");
		result=true;
	}

	function LogLocked(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		Locked(source, subject, resource, message);
		result=true;
	}
	
	function LogUnlocked(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		Unlocked(source, subject, resource, message);
		result=true;
	}

}