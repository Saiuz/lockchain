
///////////////////////////////////////////////////////////////////////////////////////////
// Angular Module Declaration For the application
///////////////////////////////////////////////////////////////////////////////////////////
// Dependencies
// NgRoute to support client side navigational routing 
///////////////////////////////////////////////////////////////////////////////////////////
angular.module("LockChain", ["ngRoute"]);

///////////////////////////////////////////////////////////////////////////////////////////
// Client Side Routing Configuration of Route Provider
// Identifies the controller and template for each route
// Sets Home as the Unconfigured default Route
///////////////////////////////////////////////////////////////////////////////////////////
angular.module("LockChain").config(["$routeProvider", function($routeProvider) {

    console.log("Route Provider");
    $routeProvider.
      when("/", {
        templateUrl : "home.html",
        controller  : "HomeController"
      }).
      when("/register/", {
        templateUrl : "register.html",
        controller  : "RegisterController"
      }).     
      when("/register/:resource", {
        templateUrl : "register.html",
        controller  : "RegisterController"
      }).  
      when("/access", {
        templateUrl : "access.html",
        controller  : "HomeController"
      }).
      when("/trace", {
        templateUrl : "trace.html",
        controller  : "TraceController"
      }).        
      otherwise({
        redirectTo: "/"
      });

}]);
