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
Instagram.set('client_id', '1e6e75e94695423285b11b68181bf5e6');
Instagram.set('client_secret', 'c54e930a781844228bc7ec6060e73547');
Instagram.set('callback_url', 'http://sparragus-test.herokuapp.com/callback');

// REAL App credentials
// Instagram.set('client_id', 'cf25f26e869c42c3aa5f91342e9803ed');
// Instagram.set('client_secret', '6b0cde9607be45b2a934e68f4f409965');
// Instagram.set('callback_url', 'http://tc-instagram.herokuapp.com/callback');

var getSubcriptions = function(){
	var subscriptions = {},
		subs;

	console.log("Fetching subscriptions");
	var dummy = Instagram.subscriptions.list({
		complete: function(result, pagination){
			subs = result;
		}
	});
	console.log("Fetched subscriptions.");
	
	if(subs){
		subs.forEach(
			function(item) {
				console.log("fetched sub: " + JSON.stringify(item));
				if(item.object_id){
					subscriptions[item.object_id] = item.id;
				}
			}
		);
	}

	return subscriptions;
};

var getInstagrams = function(tag) {
	var instagrams = [];

	Instagram.tags.recent({
		name: tag,
		complete: function(data, pagination){
			data.forEach(function(instagram){
				instagrams.push(instagram.images.low_resolution.url);
			});
			return instagrams;
		}
	});
};


app.get('/', function(request, response) {
	var subscriptions = getSubcriptions(),
		instagrams = [];

	for (var tag in subcriptions) {
		if (subcriptions.hasOwnProperty(tag)) {
			instagrams.concat(getInstagrams(tag));
		}
	}

	res.render("index", {
		instagrams: instagrams
	});
});

app.get('/admin', function(req, res){
	var subscriptions = getSubcriptions();
	res.render('admin', {
		'subscriptions': subscriptions
	});
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
	res.end("ok");
});

app.get('/unsubscribe/:subscriptionID', function(req,res){
	// If no object_id is passed, unsubscribe from everything.
	var subscriptionID = req.params.subscriptionID;
	if(subscriptionID) {
		Instagram.subscriptions.unsubscribe({ id: subscriptionID });
	}
	res.redirect('/admin');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});