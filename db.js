var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["users"];
var db = require("mongojs").connect(databaseUrl, collections);

console.log('succeed!!');

db.users.find({name:"Jack"},function(err, users) {
  if( err || !users) console.log("No female users found");
  else 
    users.forEach( function(user) {
    console.log(user.name);
    } );
});