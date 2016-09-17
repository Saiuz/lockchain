import "./Disposable.sol";

/// @title LogService
/// @author Andrew Hall
/// @notice Contract providing a common logging capability used by other contracts
contract LogService is Disposable{
	
	event StateChanged(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event AccessDenied(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event AccessGranted(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event Locked(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event Unlocked(bytes32 indexed source, address indexed subject, address indexed resource, bytes32 message);
	event PolicyGranted(bytes32 indexed source, address indexed subject, address indexed resource, address GrantedBy, bytes32 message);
	event PolicyRevoked(bytes32 indexed source, address indexed subject, address indexed resource, address RevokedBy, bytes32 message);
	
	/// @notice LogStateChanged Raises StateChanged Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @param message mto record in the blockchain
    /// @return boolean
	function LogStateChanged(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		StateChanged(source, subject, resource, message);
		result=true;
	}
	
	/// @notice LogAccessDenied Raises AccesDebied Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @return boolean
    function LogAccessDenied(bytes32 source, address subject, address resource) returns (bool result){
		AccessDenied(source, subject, resource, "Access Denied");
		result=true;
	}

    /// @notice LogAccessGranted Raises AccessGranted Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @return boolean
    function LogAccessGranted(bytes32 source, address subject, address resource) returns (bool result){
		AccessGranted(source, subject, resource, "Access Granted");
		result=true;
	}

	/// @notice LogLocked Raises Locked Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @param message mto record in the blockchain
    /// @return boolean
	function LogLocked(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		Locked(source, subject, resource, message);
		result=true;
	}
	
	/// @notice LogUnlocked Raises Unlocked Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @param message mto record in the blockchain
    /// @return boolean
	function LogUnlocked(bytes32 source, address subject, address resource, bytes32 message) returns (bool result){
		Unlocked(source, subject, resource, message);
		result=true;
	}

	/// @notice LogPolicyGranted Raises PolicyGranted Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @param message mto record in the blockchain
    /// @return boolean
	function LogPolicyGranted(bytes32 source, address subject, address resource, address grantedBy, bytes32 message) returns (bool result){
		PolicyGranted(source, subject, resource, grantedBy, message);
		result=true;
	}
	
	/// @notice LogPolicyRevoked Raises PolicyRevoked Event
    /// @param source contract raising event
    /// @param subject of event
    /// @param resource of event
    /// @param message mto record in the blockchain
    /// @return boolean
	function LogPolicyRevoked(bytes32 source, address subject, address resource, address revokedBy, bytes32 message) returns (bool result){
		PolicyRevoked(source, subject, resource, revokedBy, message);
		result=true;
	}

}