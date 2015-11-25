var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var app = express();
var qs = require('querystring');
var cors = require('cors');
var bodyParser = require('body-parser');

var url = 'mongodb://52.25.49.72:27017/capstone';
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/',function(request,response){
	response.send("Welcome to our capstone project! Copyright by Chao Guo, Hengxin Cui, Lei Xu, Tao Tang and Yixin Wu");	
});



app.post('/user/login',function(request,response){

	
	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;

            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            var post = qs.parse(body);

        });
    }


	var username = request.body['username'];
	username = username.toLowerCase();
	var password = encrypt(request.body['password']);
	
	MongoClient.connect(url,function(err,db){
		if(!err){
			console.log("We are connected");
		}
		var collection = db.collection('user');
		collection.find({username:username}).toArray(function(err,data){
			if(data.length==0)
			{
				response.status(404).send({"Message":"Username not exists"});
				db.close();
			}
			else
			{
				if(password == data[0]["password"])
				{

					response.status(200).send({username:data[0]["username"]});
					db.close();
				}
				else
				{
					response.status(401).send({"Message":"Password is not correct"});
					db.close();

				}
			}
		});
	});
	
	
});

app.get('/user/profile',function(request,response){
	var username = request.query.username;
	username = username.toLowerCase();

	MongoClient.connect(url,function(err,db){
		if(!err){
			console.log("We are connected");
		}
		var collection = db.collection('user');
		collection.find({username:username},{_id:0,password:0}).toArray(function(err,data){
			response.status(200).send(data);
			db.close();
		});
	});

});

app.post('/user/profile',function(request,response){

	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            var post = qs.parse(body);
        });
    }


	var username = request.body['username'];
	username = username.toLowerCase();
	var firstname = request.body['firstname'];
	var lastname = request.body['lastname'];
	var gender = request.body['gender'];
	var age = request.body['age'];

	MongoClient.connect(url,function(err,db){
		if(!err){
			console.log("We are connected");
		}

		var collection = db.collection('user');
		collection.find({username:username}).toArray(function(err,data){
			collection.update({username:username},{
				username:username,password:data[0]["password"],
				firstname:firstname,lastname:lastname,date:data[0]["date"],
				gender:gender,age:age
			});

			response.status(200).send({"Message":"Profile update success"});
			db.close();
		})
	});

});


app.post('/user/resetPassword',function(request,response){


	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;

            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            var post = qs.parse(body);

        });
    }

	var username = request.body['username'];
	username = username.toLowerCase();
	var oldPassword = encrypt(request.body['oldPassword']);
	var newPassword = encrypt(request.body['newPassword']);

	MongoClient.connect(url,function(err,db){
		if(!err){
			console.log("We are connected");
		}
		var collection = db.collection('user');
		collection.find({username:username}).toArray(function(err,data){
			if(oldPassword == data[0]["password"])
			{
				collection.update({username:username},{username:username,password:newPassword,
					firstname:data[0]["firstname"],lastname:data[0]["lastname"],date:data[0]["date"],
					gender:data[0]["gender"],age:data[0]["age"]
				});
				response.status(200).send({"Message":"Password has been updated"});
				db.close();

			}
			else
			{
				response.status(401).send({"Message":"Old password is not correct"});
				db.close();
			}
		})
	})
});


app.post('/user/register',function(request,response){

	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;

            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            var post = qs.parse(body);

        });
    }



	var username = request.body['username'];
	username = username.toLowerCase();
	var password = encrypt(request.body['password']);
	var email = request.body['email'];
	var toDate = new Date();

	MongoClient.connect(url, function(err, db) {
		if(!err){
			console.log("We are connected");
		}
		var collection = db.collection('user');
		collection.find({username:username}).toArray(function(err,data){
			if(data.length!=0)
			{
				response.status(201).send({"Message":"Username exists!"});
				db.close();
			}
			else
			{
				collection.insert({username:username,password:password,email:email,firstname:"",lastname:"",
					gender:"",age:"",date:toDate});
					response.status(200).send({"username":username});
					db.close();
			}
		})
	});
});

app.get('/user/overview',function(request,response){
	var username = request.query.username;
	var sensor = request.query.sensor;
	username = username.toLowerCase();
	sensor = sensor.toLowerCase();
	if(sensor == "motionrecord"){
		MongoClient.connect(url,function(err,db){
			if(!err){
				console.log("We are connected");
			}

			function createObject(propName, propValue){
				this[propName] = propValue;
			  }
		    var soundQuery = new createObject(sensor,{$exists:true});
		    soundQuery.username=username;

			var collection = db.collection('motiondatas');
			var uniqueDate = new Array();

			collection.find(soundQuery,{_id:0,time:0}).toArray(function(err,data){
				if(data.length==0)
				{
					response.status(404).send({"Message":"No data!"});
					db.close();
				}
				else
				{
					var date = new Array();
					for(i=0;i<data.length;i++){
						date.push(data[i]['date'])
					}

					uniqueDate = date.filter(function(elem, pos) {
					    return date.indexOf(elem) == pos;
					});

					response.status(200).send(uniqueDate);
					db.close();
				}			
			});	
		});
	}
	else{
		MongoClient.connect(url,function(err,db){
			if(!err){
				console.log("We are connected");
			}

			function createObject(propName, propValue){
				this[propName] = propValue;
			  }
		    var soundQuery = new createObject(sensor,{$exists:true});
		    soundQuery.username=username;

			var collection = db.collection('sensor');
			var uniqueDate = new Array();

			collection.find(soundQuery,{_id:0,time:0}).toArray(function(err,data){
				if(data.length==0)
				{
					response.status(404).send({"Message":"No data!"});
					db.close();
				}
				else
				{
					var date = new Array();
					for(i=0;i<data.length;i++){
						date.push(data[i]['date'])
					}

					uniqueDate = date.filter(function(elem, pos) {
					    return date.indexOf(elem) == pos;
					});

					response.status(200).send(uniqueDate);
					db.close();
				}			
			});
		});
	}
});


app.get('/user/sensorData',function(request,response){
	var username = request.query.username;
	username = username.toLowerCase();
	var sensor = request.query.sensor;						
	if(sensor == "motionrecord"){
		MongoClient.connect(url, function(err, db) {			
			  if(!err) {
				console.log("We are connected");
			  }
			  
			  function createObject(propName, propValue){
				this[propName] = propValue;
			  }
			  var queryObject = new createObject(sensor,{$exists:true});
			  queryObject.username=username;
			  
			  var collection = db.collection('motiondatas');
			  collection.find(queryObject).sort({_id:1}).toArray(function(err,docs){
				  	if(docs.length==0)
				  	{
				  		response.status(204).send("No data");
				  		db.close();

				  	}
				  	else
				  	{
				  		/*console.log(typeof docs[0].time);
				  		docs.sort(function(a,b){
				  			return a.time - b.time
				  		});
				  		console.log(docs);
				  		*/
				  		response.status(200).send(docs);
					    db.close();
				  	}
				  
			 });
  		});	
	}
	else{
		MongoClient.connect(url, function(err, db) {			
			  if(!err) {
				console.log("We are connected");
			  }
			  
			  function createObject(propName, propValue){
				this[propName] = propValue;
			  }
			  var queryObject = new createObject(sensor,{$exists:true});
			  queryObject.username=username;
			  
			  var collection = db.collection('sensor');
			  collection.find(queryObject).toArray(function(err,docs){
				  	if(docs.length==0)
				  	{

				  		response.status(204).send("No data");
				  		db.close();

				  	}
				  	else
				  	{
				  		/*
				  		console.log(docs);
				  		docs.sort(function(a,b){
				  			return a.time - b.time
				  		});
				  		console.log(docs);
				  		*/
				  		response.status(200).send(docs);
					    db.close();
				  	}
				  
			 });
  		});	
	}
});

app.listen(3000,function(){
        console.log('Listening on port 3000');
});
