var express = require('express'),
	mongodb = require('mongodb'),
	Instagram = require('instagram-node-lib'),
	format = require('util').format;


// Create server
var app = express.createServer(express.logger());

app.set('view engine', 'jade');
app.set('view options', {layout: false});
app.set('views', __dirname + '/views');
// Allows neat parsing of POST parameters.
app.use(express.bodyParser());

// DB Params
var dbUser = 'sparragus',
	dbPassword = 'sparragus',
	dbPort = 10059,
	dbName = 'app11400957',
	host = format("mongodb://%s:%s@linus.mongohq.com:%d/%s", dbUser, dbPassword, dbPort, dbName);

// Set Instagram keys and global callback url.
// Instagram.set('client_id', '1e6e75e94695423285b11b68181bf5e6');
// Instagram.set('client_secret', 'c54e930a781844228bc7ec6060e73547');
// Instagram.set('callback_url', 'http://sparragus-test.herokuapp.com/callback');

// REAL App credentials
Instagram.set('client_id', 'cf25f26e869c42c3aa5f91342e9803ed');
Instagram.set('client_secret', '6b0cde9607be45b2a934e68f4f409965');
Instagram.set('callback_url', 'http://tc-instagram.herokuapp.com/callback');

app.get('/', function(request, response) {
	res.render("index");
});

app.get('admin', function(req, res){
	Instagram.subscriptions.list({
		complete: function(subs, pagination){
			console.log("Instagram subscriptions:");
			subscriptions = {};
			subs.data.forEach(
				function(item) {
					if(item.object_id){
						subscriptions[item.object_id] = item.id;
					}
				},
				function(err) {

				}
			);
			res.render('admin', {
				'subscriptions': subscriptions
			});
		}
	});
	// res.render('admin', {
	// 	subscriptions: {someTag: "someTagID"}
	// });
});

// Callback for subscriptions. Instragram.js takes care of the handshake. Magic! :O
app.get('/subscribe', function(req, res){
  Instagram.subscriptions.handshake(req, res);
});

// Instagram POSTs messages here letting the application know a new picture was posted.
app.post('/subscribe', function(req, res){
	var subscription_data = req.body;
	console.log("New pictures are available for: ");

	// For every subscription...
	async.forEach(
		subscription_data,
		function(item){
			// If the subscription has an object_id... (usually the object_id is the tag)
			if (item.object_id){
				var tag = item.object_id;
				// Log it...
				console.log(tag);
				// And then get the most recent picture for that tag...
				Instagram.tags.recent({
					name: tag,
					complete: function(data, pagination){
						var _id = data[0].id,
							url = data[0].images.low_resolution.url;

						//Save in the DB
						mongodb.connect(host, function(err, db) {
							if(err) { return console.dir(err); }
							var collection = db.collection('instagrams');
							
							// Prepare the document
							var docs = [{_id: data[0].id,
										url: url,
										tag: tag}];
							
							var exists = collection.findOne({_id:data[0].id});
							
							// If the document does not exist...
							if(!exists) {
								// ...insert it in the DB...
								collection.insert(docs);
								// ...and finally tell the world about it.
								io.sockets.emit('new_pictures', url);
							}
						});
					}
				});
			}
		},
		function(err){

		}
	);
	res.end("ok");
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});