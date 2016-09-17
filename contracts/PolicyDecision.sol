import "./TokenIssuer.sol";
import "./LogService.sol";
import "./Disposable.sol";

/// @title PolicyDecisionBase
/// @author Andrew Hall
/// @notice Base Policiy Decision Point Contract
contract PolicyDecisionBase is Disposable{
    
    TokenIssuer public issuer;
    LogService  public logger;
    
    /// @notice PolicyDecisionBase Constructor Function
    /// @param accessIssuer address of token issuer contract
    /// @param logService address of LogService Contract
    function PolicyDecisionBase(TokenIssuer accessIssuer, LogService logService){
        issuer=accessIssuer;
        logger=logService;
    }
    
    /// @notice setIssuer Sets the address of the Token Issuer contract
    /// @param accessIssuer address of token issuer contract
    /// @return boolean
    function setIssuer(TokenIssuer accessIssuer) returns (bool result){
        issuer=accessIssuer;
        result = true;
    }
    
    /// @notice getIssuer returns address of the TokenIssuer contract
    /// @return TokenIssuer
    function getIssuer() constant returns (TokenIssuer accessIssuer){
        accessIssuer = issuer;
    }
    
    /// @notice setLogger Sets the address of the LogService contract
    /// @param logService address of LogService contract
    /// @return boolean
    function setLogger(LogService logService) returns (bool result){
        logger=logService;
        result = true;
    }
    
    /// @notice getLogger returns address of the LogService contract
    /// @return LogService
    function getLogger() constant returns (LogService logService){
        logService = logger;
    }
    
    /// @notice IsAuthorised abstract function
    /// @param subject subject requesting access
    /// @param resource on which access is requested
    /// @param required access level required
    /// @return boolean
    function IsAuthorised(address subject, address resource, uint8 required) constant returns (bool result){}

}

/// @title PolicyDecisionBase
/// @author Andrew Hall
/// @notice Policy Decision Point Contract
contract PolicyDecision is PolicyDecisionBase(){
    
    /// @notice PolicyDecision constructor 
    /// @param accessIssuer 
    /// @param logService 
    function PolicyDecision(TokenIssuer accessIssuer, LogService logService) PolicyDecisionBase(accessIssuer,logService){}
    
    /// @notice IsAuthorised abstract function
    /// @param subject subject requesting access
    /// @param resource on which access is requested
    /// @param required access level required
    /// @return boolean
    function IsAuthorised(address subject, address resource, uint8 required) constant returns (bool result){
        
        if(!issuer.HasTokensForResource(subject,resource)){
            result=true;
            return;
        }
        
        var (issuedTo, issuedFor, startDate, endDate, access) = issuer.GetToken(subject,resource);
        
        if(issuedTo != subject || issuedFor != resource){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(access < required){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(startDate != 0 && startDate > now){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(endDate != 0 && endDate < now){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        logger.LogAccessGranted("PDP",subject,resource);
        return true;
    }
}
