# NodeJS Secure Authentication Implementations
## PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>
 Projects could be run with NodeJS and verified with POSTMAN (Ready POSTMAN collections under "postman" folder).<br>
 
 ## Session-based authentication
 ### Login
 TODO: Add different roles<br>
 TODO: Move to DB<br>
 ### Access protected page with POST
 TODO: Maybe move the verification of session to another function.<br>
 ### Refresh access token with POST
 Done<br>
 ### Logout page with POST
 Done<br>
 
 ## JWT
 ### Login
 TODO: Add different roles<br>
 TODO: Move to DB<br>
 TODO: Think how to make dynamic secrets<br>
 ### Access protected page with POST
 TODO: Maybe move the verification of token to another function.<br>
 ### Refresh access token with POST
 TODO: Decide upon refresh token renewal<br>
 TODO: Current logic to take username from refresh token, probably should be rewritten<br>
 TODO: Maybe store accesstoken id in refreshtoken?<br>
 ### Logout page with POST
 TODO: Create secure logout (secret revocation, adding db with revoked tokens)
