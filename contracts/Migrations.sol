/// @title Migrations
/// @author Andrew Hall
/// @notice Deployment Utility Contract
contract Migrations {
  
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _
  }

  /// @notice Migrations Constructor Function
  function Migrations() {
    owner = msg.sender;
  }

  /// @notice setCompleted 
  /// @param completed sets the last completed deployment date
  function setCompleted(uint completed) restricted {
    last_completed_migration = completed;
  }

  /// @notice upgrade keeps a record of the deployment
  /// @param new_address address of the contract
  function upgrade(address new_address) restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
