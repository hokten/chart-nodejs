/*
 * Module dependencies
 */
var async = require('async');
var express = require('express')
	, stylus = require('stylus')
	, nib = require('nib');
var mysql      = require('mysql');
var mongoose = require('mongoose');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '66666666',
	database : 'chart'
});
var moment = require('moment');
var app = express();

function compile(str, path) {
	return stylus(str)
	.set('filename', path)
	.use(nib());
}

// Mongodb model schemes
mongoose.connect('mongodb://localhost/test');
var Schema = mongoose.Schema; 
var user = new Schema({
	user_id : String,
	event_id : String,
	gender : String,
	birthday : Date, 
	date_created : Date
});

var event = new Schema({
	event_id : String,
	event_title : String,
	event_start : Date,
	event_end : Date, 
	date_created : Date
});
var user = mongoose.model('user', user);
var event = mongoose.model('event', event);

function dateArraytoString(dateArray) {
	var dateString="";
	if(dateArray.length>0) {
		dateString=dateString+"[";
		for(i=0; i<dateArray.length; i++) {
			dateString=dateString+"[";
			for(s=0;s<dateArray[i].length; s++) {
				if(s==dateArray[i].length-1) {
					dateString=dateString+"'"+dateArray[i][s]+"']";
				}
				else {
					dateString=dateString+"'"+dateArray[i][s]+"',";
				}
			}
			if(i==dateArray.length-1) {
				dateString=dateString+"]";
			}
			else {
				dateString=dateString+",";
			}
		}
	}
	return dateString;
}








app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
	{ src: __dirname + '/public'
		, compile: compile
}
))
app.use(express.static(__dirname + '/public'))


app.get('/logget', function(req, res){
	var dates = req.param('tarih').split('_');
	var visitdate = {
		vdates:[],
		vcounts:[]
	};
	var visitors = {
		genders : {
			male:0,
			female:0
		},
		ages : {
			ten:0,
			twenty:0,
			thirty:0,
			forty:0,
			fifty:0,
			other:0
		}
	};


	var a=0;
	var k=0;
	var abc="ss";
	var erkek=0;
	var kadin=0;




	async.parallel(
		{
		visits: function(callback){
			for(var i=0; i<dates.length; i++){
				(function(s){
					event.count({'event_start': {
						'$gte':moment(dates[s],'DD-MM-YYYY'),
						'$lt':moment(dates[s],'DD-MM-YYYY').add('days',1)
					}},
					function(err, c){
						visitdate.vdates[s]=dates[s]+'.'+c;
						visitdate.vcounts[s]=c;
						if(k==dates.length-1) {
							callback(null, visitdate);
						}
						k++;
					});
				}(i)); // <-- this is the parameter of the closure
			}

		},
		distbs: function(callback){
			async.waterfall(
				[function(callback) {


				event.find({'event_start': {
					'$gte':moment(dates[0],'DD-MM-YYYY'),
					'$lt':moment(dates[dates.length-1],'DD-MM-YYYY').add('days',1)
				}},'event_id', function (err, docs) {
					callback(null, docs);
				});
			},
			function(arg1, callback){
				for(var m=0; m<arg1.length; m++) {
					(function(t){

						user.find({'event_id': arg1[t].event_id },function (err, docs) {
							console.log(docs[0].birthday)
							var visitor_age = moment().diff(moment(docs[0].birthday),'years');

							if(visitor_age<=10) {
								visitors.ages.ten++;
							}
							else if(visitor_age <= 20) {
								visitors.ages.twenty++;
							}
							else if(visitor_age <= 30) {
								visitors.ages.thirty++
							}
							else if(visitor_age <= 40) {
								visitors.ages.forty++;
							}
							else if(visitor_age <= 50) {
								visitors.ages.fifty++;
							}
							else {
								visitors.ages.other++;
							}


							
							if(docs[0].gender=="male") {
								visitors.genders.male++;
							}
							else {
								visitors.genders.female++;
							}


							if(a==arg1.length-1) {
								callback(null,visitors);
							}
							a++;

						});
					}(m)); // <-- this is the parameter of the closure





				}

			}
			], function (err, result) {
				callback(null,result);

			});
		},
	},
	function(e, r){
	     res.header('Content-Type', 'application/json');
			     res.header('Charset', 'utf-8')  
			     res.send(JSON.stringify(r));  


	});









});


app.get('/', function (req, res) {
	var dates=[];
	var test=true;
	var s=0;
	var currentDate;
	var rows=[];
	// Asenkron sorunu yuzunden async kullanildi
	event.find({},'event_start').sort('event_start').exec(function(error, data){
		async.eachSeries(data, function (prime, callback) {
			rows.push(moment(prime.event_start).format('DD-MM-YYYY'));
			callback(); // Alternatively: callback(new Error());
		}, function (err) {
			if (err) { throw err; }
		});


		// Bu bolumde diziye atilan tarihler haftlara
		// bolunecek sekilde cok boyutlu dizi haline getiriliyor

		var startDate = moment(rows[0],'DD-MM-YYYY');
		var week=[startDate.format('DD-MM-YYYY')];
		var endDate = moment(rows[rows.length-1], "DD-MM-YYYY");

		var h=0;
		var week=[];
		while(test) {
			for(s=0; s<12; s++) {
				if(endDate.isBefore(startDate)) {
					test=false;
					break;
				}
				week.push(startDate.format('DD-MM-YYYY'));
				startDate.add('days',1);
			}
			dates.push(week);
			week=[];
		}
		console.log("Son denem");
		console.log(dates);
		res.render('index', {title : dateArraytoString(dates)});
	});
})

app.listen(2222)
