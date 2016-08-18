import "./TokenIssuer.sol";
import "./LogService.sol";
import "./Disposable.sol";


contract PolicyDecisionBase is Disposable{
    
    TokenIssuer public issuer;
    LogService  public logger;
    
    function PolicyDecisionBase(TokenIssuer accessIssuer, LogService logService){
        issuer=accessIssuer;
        logger=logService;
    }
    
    function setIssuer(TokenIssuer accessIssuer) returns (bool result){
        issuer=accessIssuer;
        result = true;
    }
    
    function getIssuer() constant returns (TokenIssuer accessIssuer){
        accessIssuer = issuer;
    }
    
    function setLogger(LogService logService) returns (bool result){
        logger=logService;
        result = true;
    }
    
    function getLogger() constant returns (LogService logService){
        logService = logger;
    }
    
    function IsAuthorised(address subject, address resource) constant returns (bool result){}

}

contract PolicyDecision is PolicyDecisionBase(){
    
    function PolicyDecision(TokenIssuer accessIssuer, LogService logService) PolicyDecisionBase(accessIssuer,logService){}
    
    function IsAuthorised(address subject, address resource) constant returns (bool result){
        
        var (issuedTo, issuedFor, startDate, endDate) = issuer.GetToken(subject,resource);
        if(issuedTo != subject || issuedFor != resource){
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
