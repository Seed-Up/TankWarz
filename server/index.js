'use strict';
var ws = require("nodejs-websocket")
var elo = require('elo-rank')();
var redis = require('redis');
var bodyParser = require('body-parser')
var async=require("async");
var express = require('express');
var app = express();
var uuid = require('node-uuid');

var quickGist = require('quick-gist');
var client = redis.createClient(6379, "127.0.0.1");
client.select(3, function() { /* ... */ });

var maxFrame=1000;
var currentFrame=0;
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8000');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'POST');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    next();
});
app.use( bodyParser.json() );


app.post('/newbot', function (req, res) {
    console.log(req.body);
    var name=req.body.name;
    var code=req.body.value;
    var uuidBot=uuid.v4();
    var botDescriptor={
        name:name,
        code: code,
        score:100
    }
    client.hset("botList", uuidBot, JSON.stringify(botDescriptor) , redis.print);
    /*quickGist({
        content: code,
        description: 'This is the ai code for the bot '+ name+' and uuid '+uuidBot+'. Check its performances at www.tankwar.seed-up.orgs', // Optional
        public: true, // Whether the gist should be public or unlisted. Defaults to false (unlisted).
        enterpriseOnly: false, // Prohibit posting to GitHub.com. Defaults to false. Useful if you're posting company secrets.
        fileExtension: 'js' // Optionally force a file extension if you don't want to rely on language-classifier.
    }, function(err, resp, data) {
        console.log(data);
    });*/
});





var width=30;
var height=30;


var score=[];
var server = ws.createServer(function(conn) {
    console.log("New connection")
    conn.sendText( JSON.stringify({status:"high-score", bot:score}))
    conn.on("close", function(code, reason) {
        console.log("Connection closed")
    })
})


function broadcast(server, msg) {
    server.connections.forEach(function(conn) {
        conn.sendText(msg)
    })
}

function compareBot(a, b) {
    if (a.dead && b.dead) {
        return 0;
    } else {
        if (a.dead)
            return 1;
        if (b.dead)
            return -1;
        return a.bullets < b.bullets
    }
}




class Bot {
    constructor(xpos, ypos, bullets, name, value,score,uuid) {
        this.xpos = xpos;
        this.ypos = ypos;
        this.name = name;
        this.history = [];
        this.elo=score;
        this.value=value;
        console.log("bot uuid",uuid);
        this.uuid=uuid;
        this.process=require('child_process').fork('child.js');
        this.process.send({ data: { action: "code", code: value } });
        this.id = Math.random().toString(36).substr(2, 10);;
        this.bullets = bullets;
        this.dead = false;

        this.orientation = "UP";
        this.process.on('message', (obj) => {
            if (this.dead)
                return;
            clearTimeout(this.timeout);
            var data = obj.data;
            if (data.action === "result") {
                this.tickCB(null, data.argument);
            }
            if (data.action === "error") {
                // TODO: Do something with error
                this.dead = true;
                this.tickCB(null, "NOP");
            }
        });
    }

    toJSON() {
        return {
            xpos: this.xpos,
            ypos: this.ypos,
            name: this.name,
            orientation: this.orientation,
            elo: this.elo,
            dead: this.dead,
            bullet: this.bullets
        }
    }


    tick(arg, cb) {
        //console.log("I'm ticking");
        if (this.dead) {
            return cb(null, "NOP");
        }
        this.tickCB = cb;
        this.process.send({ data: { action: "execute", argument:arg } });
        this.timeout = setTimeout(() => {
            this.dead = true;
            this.elo=0;
            this.kill();
            this.tickCB(null, "NOP");
        }, 500);
    }

    remainingBullet() {
        var value = this.bullets;
        this.bullets -= 1;
        return value;
    }

    getX() {
        return this.xpos;
    }

    getY() {
        return this.ypos;
    }

    getOrientation() {
        return this.orientation;
    }

    move(direction, array) {
        this.orientation = direction
        if (direction == "UP") {
            if (array.every((element, index, array) => {
                    return Math.abs(element.xpos - this.xpos) > 1 || Math.abs(element.ypos - this.ypos + 1) > 1 || element.id == this.id;
                })) {
                this.ypos -= 1;
            }
        }
        if (direction == "DOWN") {
            if (array.every((element, index, array) => {
                    return Math.abs(element.xpos - this.xpos) > 1 || Math.abs(element.ypos - this.ypos - 1) > 1 || element.id == this.id;
                })) {
                this.ypos += 1;
            }
        }
        if (direction == "RIGHT") {
            if (array.every((element, index, array) => {
                    return Math.abs(element.xpos - this.xpos - 1) > 1 || Math.abs(element.ypos - this.ypos) > 1 || element.id == this.id;
                })) {
                this.xpos += 1;
            }
        }
        if (direction == "LEFT") {
            if (array.every((element, index, array) => {
                    return Math.abs(element.xpos - this.xpos + 1) > 1 || Math.abs(element.ypos - this.ypos) > 1 || element.id == this.id;
                })) {
                this.xpos -= 1;
            }
        }
    }

    setPos(x, y) {
        this.xpos = x;
        this.ypos = y;
    }

    getPos() {
        return [this.xpos, this.ypos];
    }

    kill() {
        //https://nodejs.org/api/child_process.html#child_process_child_kill_signal
        this.process.kill();
        //window.URL.revokeObjectURL(this.url);
    }

}

class Bullet {
    constructor(xpos, ypos, direction, id) {
        this.xpos = xpos;
        this.ypos = ypos;
        this.direction = direction;
        this.id = id
    }
    getPos() {
        return [this.xpos, this.ypos];
    }

    tick() {
        if (this.direction == 'UP' && this.ypos > 0) {
            this.ypos -= 1;
            return true;
        } else if (this.direction == 'DOWN' && this.ypos < height) {
            this.ypos += 1;
            return true;
        } else if (this.direction == 'RIGHT' && this.xpos < width) {
            this.xpos += 1;
            return true;
        } else if (this.direction == 'LEFT' && this.xpos > 0) {
            this.xpos -= 1;
            return true;
        } else {
            return false;
        }
    }
}




//RUN GAME


function initGame(bulletNum) {
    score=[];
    currentFrame=0;
    client.hgetall("botList", function (err, obj) {
        Object.keys(obj).forEach(function(key,index) {
            var element=JSON.parse(obj[key]);
            var object={
                name:(element).name,
                elo:(element).score
            }
            score.push(object)
        });
        score.sort(function(a,b) {return (a.elo < b.elo) ? 1 : ((b.elo < a.elo) ? -1 : 0);} );
        client.hkeys("botList", function (err, replies) {
        var arr = []
        while(arr.length < 8){
            var randomnumber=Math.ceil(Math.random()*replies.length)-1
            var found=false;
            for(var i=0;i<arr.length;i++){
    	           if(arr[i]==replies[randomnumber]){
                       found=true;break}
               }
               if(!found){
                   arr[arr.length]=replies[randomnumber];
               }
         }
         console.log("selected")
        async.map(arr, function(index, cb) {
            client.hget("botList",index,cb)
        }, function(err, array) {
            console.log("return",array);
            var game= [array.map((v, index) => new Bot((Math.floor(Math.random() * width)), (Math.floor(Math.random() * height)), bulletNum, JSON.parse(v).name, JSON.parse(v).code,JSON.parse(v).score,(arr[index]))), []];
            broadcast(server, JSON.stringify({status:"high-score", bot:score}))
            setTimeout(function() {
                runTick(game[0], game[1]);
            }, 1000 );
            });
        });
    });
}

function moveMissile(bulletArray) {
    var returnArray = []
    bulletArray.forEach(
        function(element) {
            if (element.tick()) {
                returnArray.push(element)
            }
        }
    )
    return returnArray
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function missileCollison(bulletArray, botArray) {
    var returnBotArray = botArray.slice();
    var returnBulletArray = bulletArray.slice();
    for (var a = 0; a < bulletArray.length; a++) {
        for (var b = 0; b < botArray.length; b++) {
            if (arraysEqual(bulletArray[a].getPos(), botArray[b].getPos()) && bulletArray[a].id != botArray[b].id) {
                returnBotArray[b].dead = true;
                returnBotArray[b].kill();
                returnBulletArray.splice(a, 1);
            }
        }
    }
    return [returnBotArray, returnBulletArray]
}

function constructArgs(element, botArrayUpdated, bulletArrayUpdated) {
    var args = {
        Missiles: [],
        Ennemies: [],
        Data: {
            BULLETS: element.bullets,
            X: element.xpos,
            Y: element.ypos,
            HISTORY: element.history

        }
    }
    bulletArrayUpdated.forEach(
        function(bullet) {
            if (bullet.id != element.id) {
                args.Missiles.push({
                    X: bullet.xpos,
                    Y: bullet.ypos,
                    DIR: bullet.direction
                });
            }
        }
    )
    botArrayUpdated.forEach(
        function(bot) {
            if (bot.id != element.id) {
                args.Ennemies.push({
                    X: bot.xpos,
                    Y: bot.ypos,
                    HISTORY: bot.history,
                    DEAD: bot.dead
                });
            }
        });

    return args;
}

function runTick(botArray, bulletArray) {
    //console.log("Ticking")
    //DO IT multiple time for speed
    var bulletArrayUpdated, botArrayUpdated, positionArray;

    if (bulletArray.length > 0) {
        bulletArrayUpdated = moveMissile(bulletArray)
        var data = missileCollison(bulletArrayUpdated, botArray)
        bulletArrayUpdated = data[1];
        botArrayUpdated = data[0];

    } else {
        bulletArrayUpdated = bulletArray;
        botArrayUpdated = botArray;
    }



    positionArray = []
    botArrayUpdated.forEach(
        function(element) {
            positionArray.push();
        }
    )

    async.map(botArrayUpdated, function(v, cb) {

        v.tick(constructArgs(v, botArrayUpdated, bulletArrayUpdated), cb);
    }, function(err, arr) {
        //console.log(arr)

        //passer à travaers arr et updated si authorisé!
        for (var i = 0; i < arr.length; i++) {
            if (botArrayUpdated[i].dead == false) {
                botArrayUpdated[i].history.unshift(arr[i])
                var length = botArrayUpdated[i].history.length;

                botArrayUpdated[i].history.splice(10, length - 10);
                if (arr[i] == "SHOOT") {
                    if (botArrayUpdated[i].bullets >0) {
                        botArrayUpdated[i].bullets-=1;
                        bulletArrayUpdated.push(new Bullet(botArrayUpdated[i].getX(), botArrayUpdated[i].getY(), botArrayUpdated[i].getOrientation(), botArrayUpdated[i].id))
                    }
                }
                if (arr[i] == "DOWN") {
                    if (botArrayUpdated[i].ypos < height - 1) {
                        botArrayUpdated[i].move(arr[i], botArrayUpdated)
                    }
                }
                if (arr[i] == "UP") {
                    if (botArrayUpdated[i].ypos > 0) {
                        botArrayUpdated[i].move(arr[i], botArrayUpdated)
                    }
                }
                if (arr[i] == "RIGHT") {
                    if (botArrayUpdated[i].xpos < width - 1) {
                        botArrayUpdated[i].move(arr[i], botArrayUpdated)
                    }
                }
                if (arr[i] == "LEFT") {
                    if (botArrayUpdated[i].xpos > 0) {
                        botArrayUpdated[i].move(arr[i], botArrayUpdated)
                    }
                }
            }
        }
        data = missileCollison(bulletArrayUpdated, botArrayUpdated)
        bulletArrayUpdated = data[1];
        botArrayUpdated = data[0];
        bulletArrayUpdated = moveMissile(bulletArrayUpdated)
        data = missileCollison(bulletArrayUpdated, botArrayUpdated)
        bulletArrayUpdated = data[1];
        botArrayUpdated = data[0];

        var BulletsLeft = 0;
        var ContestantLeft = 0;
        botArrayUpdated.sort(compareBot)
        botArrayUpdated.forEach(
            function(element) {
                if(!element.dead){
                    BulletsLeft+=element.bullets
                    ContestantLeft+=1;
                }
            }
        )
        //console.log(botArrayUpdated);
        currentFrame+=1;
        broadcast(server, JSON.stringify({status:"ongoing", botArray: botArrayUpdated.map(v => v.toJSON()), bulletArray: bulletArrayUpdated }));
        if (BulletsLeft > 0 && ContestantLeft > 1 && currentFrame<maxFrame) {
             setTimeout(function() {
                runTick(botArrayUpdated, bulletArrayUpdated);
            }, 1000 / 15);

        }else{
            console.log("game over");
            broadcast(server, JSON.stringify({status:"over"}));
            if(botArrayUpdated[0].bullets!=botArrayUpdated[1].bullets){
                var winnerElo=botArrayUpdated[0].elo;
                var loserElo=Math.max.apply(Math,botArrayUpdated.slice(1).map(function(o){return o.elo;}))
                var maxElo=Math.max.apply(Math,botArrayUpdated.map(function(o){return o.elo;}))


                botArrayUpdated[0].elo=elo.updateRating(elo.getExpected(winnerElo, loserElo), 1, winnerElo);
                var botDescriptor={
                    name:botArrayUpdated[0].name,
                    code: botArrayUpdated[0].value,
                    score:botArrayUpdated[0].elo
                }
                client.hset("botList", botArrayUpdated[0].uuid, JSON.stringify(botDescriptor) , redis.print);
                for (var i=1;i<8;i++){
                botArrayUpdated[i].elo=parseInt((elo.updateRating(elo.getExpected(botArrayUpdated[i].elo, maxElo), 0, botArrayUpdated[i].elo)-botArrayUpdated[i].elo)/7.0)+botArrayUpdated[i].elo;
                var botDescriptor={
                    name:botArrayUpdated[i].name,
                    code: botArrayUpdated[i].value,
                    score:botArrayUpdated[i].elo
                }
                client.hset("botList", botArrayUpdated[i].uuid, JSON.stringify(botDescriptor) , redis.print);
                }
                score.push({name:botArrayUpdated[0].name,score:botArrayUpdated[0].bullets})
            }
            initGame( 100);
        }
    })


}

var x = `function main(arg){
    console.log(arg);
    action=["LEFT","RIGHT","UP","DOWN","SHOOT"];
    var result=action[Math.floor(Math.random() *5)];
    return result;
}`

//TEST


client.on('connect', function() {
    app.listen(3000, function () {
      console.log('Example app listening on port 3000!');

    });
    server.listen(8002);
    initGame( 100);
});
