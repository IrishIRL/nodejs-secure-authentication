# NodeJS Secure Authentication Implementations
## PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>
 Projects could be run with NodeJS and verified with POSTMAN (Ready POSTMAN collections under "postman" folder).<br>
 
 ## Session-based authentication
 ### Login
 - [X] Move to DB
 - [X] Add hashing of passwords
 - [X] Move sessions to DB
 - [X] Fix the possibility of creating sessionId that already exists (on the creation level).
 ### Access protected page with POST
 - [ ] Maybe move the verification of session to another function.
 - [ ] Get some data from db?
 ### Refresh access token with POST
 - [X] Decide and implement upon where to store sessions
 - [X] Fix session fixation vulnerability
 ### Logout page with POST
 Done<br>
 ### Other
  - [X] WON'T DO: refreshToken DB has expiration dates of tokens, they should be cleared when time comes
  
 ## JWT
 ### Login
 - [x] Add different groups
 - [x] Move to DB
 - [X] Move database variables to .env file 
 - [X] Add hashing of passwords
 - [X] Decide and implement adding password hash to secret
 - [X] Fix the possibility of creating refreshTokenUUID that already exists (on the creation level).
 ### Access protected page
 - [X] Move the verification of token to another function
 ### Refresh access token
 - [X] Decide upon refresh token renewal
 - [X] Current logic to take username from refresh token, probably should be rewritten
 - [X] Final decision: refreshToken is now uuid and saved in DB
 ### Logout page
 - [X] Implement secret revocation
 - [X] Decide and implement upon refresh tokens storaging
 - [X] AccessToken revocation does not verify that the token is correct, possibility for DoS
 - [ ] In case there is only a refresh token, acces token secret is not be revoked. Decide if it is needed to be revoked.
 ### Other
 - [X] Enhance visual part of the code, too many repetative queries.
 - [ ] Further enhance visual part of the code.
 
 - [X] WON'T DO: refreshToken DB has expiration dates of tokens, they should be cleared when time comes
 