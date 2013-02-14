var express = require('express'),
	io = require('socket.io'),
	mongodb = require('mongodb'),
	Instagram = require('instagram-node-lib'),
	async = require('async'),
	format = require('util').format;


// Create server
var app = express.createServer(express.logger());

// This var is used to fetch recent pictures that will be displayed on /index
var RECENT_PICTURES_TAG = "maestrosmaestros";

app.set('view engine', 'jade');
app.set('view options', {layout: false});
app.set('views', __dirname + '/views');

app.use("/styles", express.static(__dirname + '/styles'));

// Allows neat parsing of POST parameters.
app.use(express.bodyParser());

// Configure socket.io to work with Heroku.
io = io.listen(app);
io.configure(function () {
	// Heroku doesn't support websockets yet. Must use long-polling
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
});

// DB Params
var dbUser = 'sparragus',
	dbPassword = 'sparragus',
	dbPort = 10059,
	dbName = 'app11400957',
	host = format("mongodb://%s:%s@linus.mongohq.com:%d/%s", dbUser, dbPassword, dbPort, dbName);

// Set Instagram keys and global callback url.
Instagram.set('client_id', '1e6e75e94695423285b11b68181bf5e6');
Instagram.set('client_secret', 'c54e930a781844228bc7ec6060e73547');
Instagram.set('callback_url', 'http://sparragus-test.herokuapp.com/callback');

// REAL App credentials
// Instagram.set('client_id', 'cf25f26e869c42c3aa5f91342e9803ed');
// Instagram.set('client_secret', '6b0cde9607be45b2a934e68f4f409965');
// Instagram.set('callback_url', 'http://tc-instagram.herokuapp.com/callback');

app.get('/', function(req, res) {
	var instagrams = {};
	Instagram.tags.recent({
		name: RECENT_PICTURES_TAG,
		complete: function(result, pagination) {
			result.forEach(function(item){
				instagrams[item.id] = item.images.standard_resolution.url;
			});

			res.render("index", {
				instagrams: instagrams
			});
		}
	});
});

app.get('/admin', function(req, res){
	var subscriptions = {};

	console.log("Fetching subscriptions");
	Instagram.subscriptions.list({
		complete: function(result, pagination){
			result.forEach(function(item){
				subscriptions[item.object_id] = item.id;
			});
			console.log(subscriptions);
			res.render('admin', {
				'subscriptions': subscriptions
			});
		}
	});
	console.log("Fetched subscriptions.");
});

app.post('/subscribe', function(req,res){
	var tag = req.body.subscription.tag;
	// Subscribe...
	Instagram.subscriptions.subscribe({
		object: 'tag',
		object_id: tag,
		callback_url: "http://sparragus-test.herokuapp.com/callback/realtime"
	});

	// ...and then return back to the admin panel
	res.redirect("/admin");
});

// Callback for subscriptions. Instragram.js takes care of the handshake. Magic! :O
app.get('/callback/realtime', function(req, res){
  Instagram.subscriptions.handshake(req, res);
});

// Instagram POSTs messages here letting the application know a new picture was posted.
app.post('/callback/realtime', function(req, res){
	var subscription_data = req.body;
	console.log("New pictures are available for: ");

	// For every subscription...
	async.forEach(
		subscription_data,
		function(item){
			// If the subscription has an object_id... (usually the object_id is the tag)
			if(item.object_id){
				var tag = item.object_id;
				// Log it...
				console.log(tag);
				// And then get the most recent picture for that tag...
				Instagram.tags.recent({
					name: tag,
					complete: function(data, pagination){
						// And finally tell the world about it...
						var most_recent_picture_url = data[0].images.standard_resolution.url;
						io.sockets.emit('new_pictures', most_recent_picture_url);
					}
				});
			}
		},
		function(err){

		}
	);
	res.end("ok");
});

app.get('/unsubscribe/:subscriptionID', function(req,res){
	// If no object_id is passed, unsubscribe from everything.
	var subscriptionID = req.params.subscriptionID;
	console.log("SubsID = " + subscriptionID);
	if(subscriptionID) {
		Instagram.subscriptions.unsubscribe({ id: subscriptionID });
	}
	res.redirect('/admin');
});

app.post("/recent", function(req, res){
	// Get tag...
	var tag = req.body.recent.tag;
	// Check if tag was not blank...
	if(tag) {
		RECENT_PICTURES_TAG = tag;
	}
	// ...and then return back to the admin panel
	res.redirect("/admin");
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});