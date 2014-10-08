#Bitcoin Payment Tracker
Track payments made to bitcoin addresses


Currently, the only type of node that this supports is one that is compliant with Coinbase's [Toshi](https://toshi.io/) API, but support for others is planned.


##Installation

###Local Install
0. (Optinal) Set Environmental Variables (PORT... a complete listing coming soon)
1. ```git clone https://github.com/johnhenry/bitcoin-address-subscription.git```
2. ```cd bitcoin-address-subscription```
3. ```npm install```
4. ```npm start```

Default Connection URL : ```http://127.0.0.1:8080```


###Deploy on Heroku
1. Click Here:

 [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/johnhenry/bitcoin-payment-tracker)
2. Follow the Instructions onscreen instructions

Connection URL : ```<your heroku url>```

##Connecting as a Client

###Connect with wscat commandline utility
0. (If you haven't already) ```npm install -g ws```
1. ```wscat -c <Connection URL>```
2. At the prompt, enter the address you would like to follow.
3. Alternatively, enter '*' to follow all payments as they come in or '+' to follow only confirmed payments at every block.

###Connecting with other clients
You can connect to this server with any client that supports the web socket standard. Note: with some clients, you may have to replace "http" in your connection url.
