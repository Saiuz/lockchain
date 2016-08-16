contract Disposable{
    
    modifier contractOwnerOnly(){if(msg.sender != contractOwner){throw;} _ }
    address contractOwner;
    function Disposable(){contractOwner=msg.sender;}
    function Kill() contractOwnerOnly {selfdestruct(contractOwner);}
}