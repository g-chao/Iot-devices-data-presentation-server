var express = require('express');
var router = express.Router();
var cron = require('cron');
var mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;

//create a new collection  ===>  motiondatas   , which is userd to store new motion data.

var cronJob = cron.job("0 11 * * * *", function(){
  var motion_data_model=mongoose.model('motiondata',{
  username:String,
  date: {
    type:String,
  },
  time:{
    type:String,
  },
  motionrecord:{
    type:Number,
  }
});

var url = 'mongodb://52.25.49.72:27017/capstone';

// connect the source data (before processed)
MongoClient.connect(url, function(err, db) {
  if(!err) {
    console.log("We are connected");
  }


  function createObject(propName, propValue){
    this[propName] = propValue;
  }

//time========================start=======================
  var currentDate = new Date();
  var previousDate = currentDate - 86400000;
  function convertDate(inputFormat) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    var d = new Date(inputFormat);
    return [pad(d.getMonth()+1),pad(d.getDate()), d.getFullYear()].join('/');
  }

  var nextday=convertDate(currentDate);
  var thisday=convertDate(previousDate);
  console.log(nextday);
  console.log(thisday);
//time========================end=======================
  var user_collection = db.collection('user');
  var sensor_collection = db.collection('sensor');

  mongoose.connect(url,function(err){
    //search all the usernames
    user_collection.find({},function(err,users){
      users.forEach(function(ele){
        console.log("username", ele.username);

        // execute the two sleep data for nextday and thisday !!!!!!!!!!!! important
        process_nextday_data.call(this,ele.username,nextday);
        process_thisday_data.call(this,ele.username,thisday);
        // !!!!!!!!!!!! important

        function process_nextday_data(username,nextday){
          var queryObject_nextday = new createObject("motionrecord",{$exists:true});
          queryObject_nextday.username=username;
          queryObject_nextday.date=nextday;
          sensor_collection.find(queryObject_nextday).toArray(function(err,docs){
            console.log("next query",queryObject_nextday);
            if(docs.length==0)
            {
              console.log("next day No data");
            }
            else
            {
              var nextday_data = docs.filter(function(element){
                var hour = element.time.split(':')[0];
                return hour < '11';   //will collect time before 11:00
              });
              console.log("the first data of nextday",nextday_data[0]);

              var hourlist = ["01","02","03","04","05","06","07","08","09","10"];
              var dataobj  ={
                username:queryObject_nextday.username,
                date:nextday,
              }

              for(var i =0; i<10;i++) {
                var count = 0;
                var eachhour_data = nextday_data.filter(function(element){
                  var hour = element.time.split(':')[0];
                  return hour == hourlist[i];
                });
                if(eachhour_data.length==0){
                  dataobj.time=hourlist[i];
                  dataobj.motionrecord=0;
                  (new motion_data_model(dataobj)).save();
                }else{
                  var eachhour_data_afterprocess = [];
                  eachhour_data.reduce(function (first, second) {
                    eachhour_data_afterprocess.push(second.motionrecord - first.motionrecord);
                    return second;
                  });
                  var avg_stdDev = standardDeviation(eachhour_data_afterprocess);
                  console.log("next day",avg_stdDev);

                  eachhour_data_afterprocess.forEach(function(element){
                    if(element > avg_stdDev[0] + avg_stdDev[1] || element < avg_stdDev[0] - avg_stdDev[1]){
                      count++
                    };
                  });
                  dataobj.time=hourlist[i];
                  dataobj.motionrecord=count;
                  (new motion_data_model(dataobj)).save();
                }
              };
            };
          });
        }
        function process_thisday_data(username,thisday){
          var queryObject_thisday = new createObject("motionrecord",{$exists:true});
          queryObject_thisday.username=username;
          queryObject_thisday.date=thisday;
          sensor_collection.find(queryObject_thisday).toArray(function(err,docs){
            console.log("this query",queryObject_thisday);
            if(docs.length==0)
            {
              console.log("this day No data");
            }
            else
            {
              var thisday_data = docs.filter(function(element){
                var hour = element.time.split(':')[0];

                return hour > '19';    //will collect time after 20:00
              });
              console.log("the first data of thisday",thisday_data[0]);

              var hourlist = ["20","21","22","23","24"];
              var dataobj  ={
                username:queryObject_thisday.username,
                date:thisday,
              }

              for(var i =0; i<5;i++) {
                var count = 0;
                var eachhour_data = thisday_data.filter(function(element){
                  var hour = element.time.split(':')[0];
                  return hour == hourlist[i];
                });
                if(eachhour_data.length==0){
                  dataobj.time=hourlist[i];
                  dataobj.motionrecord=0;
                  (new motion_data_model(dataobj)).save();
                }else{
                  var eachhour_data_afterprocess = [];
                  eachhour_data.reduce(function (first, second) {
                    eachhour_data_afterprocess.push(second.motionrecord - first.motionrecord);
                    return second;
                  });
                  var avg_stdDev = standardDeviation(eachhour_data_afterprocess);
                  console.log("this day",avg_stdDev);

                  eachhour_data_afterprocess.forEach(function(element){
                    if(element > avg_stdDev[0] + avg_stdDev[1] || element < avg_stdDev[0] - avg_stdDev[1]){
                      count++
                    };
                  });
                  dataobj.time=hourlist[i];
                  dataobj.motionrecord=count;
                  (new motion_data_model(dataobj)).save();
                }
              };
            }
          });
        }
      // all function end here ----------------------------------
      })
    })
  });
});



function standardDeviation(values){
  var avg = average(values);
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return [avg,stdDev];
};

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}



module.exports = router;




 console.info('cron job completed');
}); 

cronJob.start();
