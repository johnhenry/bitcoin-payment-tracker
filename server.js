var OPTIONS = {
    TOSHI   : String(process.env.TOSHI_INSTANCE || "https://bitcoin.toshi.io"),
    TOSHIAPI : String(process.env.TOSHI_API_VERSION || "v0"),
    MAX : Number(process.env.MAX_CONFIRMATIONS || 6),
    INTERVAL : Number(process.env.INTERVAL || 1000 * 5),
    PORT : String(process.env.port || process.env.PORT || process.env.VCAP_APP_PORT || 8080)
}
var WebSocket = require('ws');
var q = require('q');
var http = require('https');
var ws = new (require('ws')).Server({port: (OPTIONS.PORT)},function(){console.log("Running on port " + OPTIONS.PORT + ".")});
var sockets = {};

ws.on('connection', function (webSocket) {
  webSocket.send("\nEnter single address:\n*: all payments\n+: confirmed payments");
  webSocket.on('message', function(message) {
      if(true){
          if(!sockets[message]){
              sockets[message] = [webSocket];
              webSocket.send("\nSubscribed to "+message+".\n Resend to unsubscribe.");
          }else{
              var index = sockets[message].indexOf(webSocket);
              if(index < 0){
                  sockets[message].push(webSocket);
                  webSocket.send(message + " subscribed.\n Resend to unsubscribe.");
              }else{
                  sockets[message].splice(index, 1);
                  webSocket.send(message + " unsubscribed.");
                  if(!sockets[message].length){
                      delete sockets[message];
                  }
              }
          }
      }else{
          webSocket.send(message + " not valid.")
      }
  })

  webSocket.on('close', function (webSocket) {
      for(i in sockets){
          var index = sockets[i].indexOf(webSocket);
          if(index >= 0){
              sockets[message].splice(index, 1);
              webSocket.send(message + " unsubscribed.");
              if(!sockets[message].length){
                  delete sockets[message];
              }
          }
      }
  })
})

var confirmedOutputs = {};
confirmedOutputs[0] = [];
var queueUnconfirmed = function(outputs){
    outputs = outputs.map(function(item){
        return [item.addresses[0], item.amount]
    })
    confirmedOutputs[0] = confirmedOutputs[0].concat(outputs);
}

var confirmed = function(hash){
    var outputs = [];
    var d = q.defer();
    var url = OPTIONS.TOSHI + "/api/" + OPTIONS.TOSHIAPI + "/blocks/" + hash + "/transactions?limit=10000";
    http.get(url, function(response) {
        response.setEncoding('utf8');
        var body = "";
        response.on('data', function (chunk) {
            body += chunk;
        });
        response.on('end', function(){
            d.resolve(JSON.parse(body));
        })
    }).on('error', function(e) {
        d.reject(e);
    });
    d.promise.then(function(block){
        var max = OPTIONS.MAX;
        var newOutputs = [];
        block.transactions.map(function(item){
            item.outputs.map(function(subItem){
                newOutputs.push([subItem.addresses[0], subItem.amount]);
            })
        });
        while(max > 1){
            confirmedOutputs[max] = confirmedOutputs[max - 1];
            max--;
        }
        confirmedOutputs[1] = newOutputs;
        var i = 1;
        while(i <= max){
            if(confirmedOutputs[i]){
                confirmedOutputs[i].map(function(item){
                    var address = item[0];
                    var currentSockets = (sockets[address] || []).concat(sockets["*"] || []).concat(sockets["+"] || []);
                    currentSockets.map(function(soc){
                        try{
                            soc.send(JSON.stringify({
                                address : address,
                                amount : item[1],
                                confirmations : i
                            }));
                        }catch(e){

                        }
                    })
                })
            }
            i++;
        }
    })
}

var update = function(){
    //Send Unconfirmed Outputs
    if(confirmedOutputs[0].length){
        confirmedOutputs[0].map(function(item){
            var address = item[0];
            var currentSockets = (sockets[address] || []).concat(sockets["*"] || []);
            currentSockets.map(function(soc){
                try{
                    soc.send(JSON.stringify({
                        address : address,
                        amount : item[1],
                        confirmations : 0
                    }))
                }catch(e){

                }
            })
        })
        confirmedOutputs[0] = [];
    }
    setTimeout(update, OPTIONS.INTERVAL)
}
update();

var transactionSocket, blockSocket;
var uStart = function(){
    transactionSocket = new WebSocket(OPTIONS.TOSHI);
    transactionSocket.on('open', function() {
        console.info("Transaction Connection Established!");
        transactionSocket.send('{"subscribe":"transactions"}');
    });
    transactionSocket.on('close', function() {
        console.info("Transaction Socket Closed. Reconnecting...");
        uStart();
    });
    transactionSocket.on('message', function(data, flags) {
        data = JSON.parse(data);
        if(data.subscription === "transactions"){
            queueUnconfirmed(data.data.outputs);
        }
    });
}
uStart();
var cStart = function(){
    blockSocket = new WebSocket(OPTIONS.TOSHI);
    blockSocket.on('open', function() {
        console.info("Block Connection Established!");
        blockSocket.send('{"subscribe":"blocks"}');
    });
    blockSocket.on('close', function() {
        console.info("Block Socket Closed. Reconnecting...");
        cStart();
    });
    blockSocket.on('message', function(data, flags) {
        data = JSON.parse(data);
        if(data.subscription === "blocks"){
            confirmed(data.data.hash);
        }
    });
}
cStart();
