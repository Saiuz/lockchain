/// @title Disposable
/// @author Andrew Hall
/// @notice Contract Management functions to deactivate the contract. 
contract Disposable{
    
    modifier contractOwnerOnly(){if(msg.sender != contractOwner){throw;} _ }
    address contractOwner;
    function Disposable(){contractOwner=msg.sender;}
    function Kill() contractOwnerOnly {selfdestruct(contractOwner);}
}