/*
 * Module dependencies
 */
var async = require('async');
var express = require('express'), stylus = require('stylus'), nib = require('nib');
var moment = require('moment');
var app = express();

function compile(str, path) {
	return stylus(str)
	.set('filename', path)
	.use(nib());
}

var Db = require('mongodb').Db,
Connection = require('mongodb').Connection,
Server = require('mongodb').Server;



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
app.set('view engine', 'ejs')
app.use(express.logger('dev'))
app.use(stylus.middleware(
	{ src: __dirname + '/public'
		, compile: compile
}
))
app.use(express.static(__dirname + '/public'))


app.get('/logget', function(req, res){
	// Dates range from select box.
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


		// For line chart datas
		// For each day, calculating visits count
		visits: function(callback)
		{
			for(var i=0; i<dates.length; i++){
				(function(s){
					var db = new Db('test', new Server("localhost",27017, {}, {w: 1}), {safe:true});
					db.open(function(err, db) {
						db.collection('events', function(err, collection) {
							collection.find({'event_start': {$gte:moment(dates[s],'DD-MM-YYYY').toDate(),$lt:moment(dates[s],'DD-MM-YYYY').add('days',1).toDate()	}},function(err, cursor){
								cursor.count(function(err, count){
									visitdate.vdates[s]=dates[s]+'.'+count;
									visitdate.vcounts[s]=count;
									if(k==dates.length-1) {
										db.close();
										callback(null, visitdate);
									}
									k++;
								});
							});
						});
					});
				}(i)); // <-- this is the parameter of the closure
			}

		},
		distbs:	function(callback)	{
			async.waterfall(
				[
					/* ###############################
					waterfall first function
					#################################*/
					function(callback)
					{
						// Selecting all records from "events" collection where  beetween start date and end date
						var db = new Db('test', new Server("localhost",27017, {}, {w: 1}), {safe:true});
					   	db.open(function(err, db) {
							db.collection('events', function(err, collection) {
								collection.find({'event_start': {
									$gte:moment(dates[0],'DD-MM-YYYY').toDate(),$lt:moment(dates[dates.length-1],'DD-MM-YYYY').add('days',1).toDate() }}).toArray(function(err, result) 
									{
										// "result" pass paramater "arg1" of next function.
										db.close();
										callback(null,result);
									});
							});
						});
					},
					// second waterfall first function
					function(arg1, callback)
					{
						for(var m=0; m<arg1.length; m++)
						{
							(function(t) {
								var db = new Db('test', new Server("localhost",27017, {}, {w: 1}), {safe:true});
								db.open(function(err, db) {
									db.collection('users', function(err, collection) {
										collection.find({'event_id': arg1[t].event_id}).toArray(function (err, result) {
											var visitor_age = moment().diff(moment(result[0].birthday),'years');
											if(visitor_age<=10) {
												visitors.ages.ten++;
											}
											else if(visitor_age <= 20) {
												visitors.ages.twenty++;
											}
											else if(visitor_age <= 30) {
												visitors.ages.thirty++;
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
											if(result[0].gender=="male") {
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
									});
								});
							}(m)); // <-- this is the parameter of the closure 
						}
					}],
					function (err, result) {
						callback(null,result);
					});
		}
	}, function(e, r){
		res.header('Content-Type', 'application/json');
		res.header('Charset', 'utf-8')  
		res.send(JSON.stringify(r));  
	});
});


// Route firstly open page. 
app.get('/', function (req, res) {
	var dates=[];
	var test=true;
	var s=0;
	var currentDate;
	var rows=[];


	var db = new Db('test', new Server("localhost",27017, {}, {w: 1}), {safe:true});
	db.open(function(err, db) {
		db.collection('events', function(err, collection) {
			collection.find({},{'sort':'event_start'}).toArray(function (err, result) {
				async.eachSeries(result, function (prime, callback) {
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
				db.close();
				res.render('index', {title : dateArraytoString(dates)});
			});
		});
	});
});

app.listen(2222)
