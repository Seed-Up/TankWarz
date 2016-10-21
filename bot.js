var TimeOut;


function compareBot(a, b) {
    if (a.dead && b.dead){
        return 0;
    }
    else{
        if (a.dead)
            return 1;
        if (b.dead)
            return -1;
        return a.bullets<b.bullets
    }
    }

    function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

        if (arguments.length === 2) {
            x = y = 0;
            w = ctx.canvas.width;
            h = ctx.canvas.height;
        }

        // default offset is center
        offsetX = typeof offsetX === "number" ? offsetX : 0.5;
        offsetY = typeof offsetY === "number" ? offsetY : 0.5;

        // keep bounds [0.0, 1.0]
        if (offsetX < 0) offsetX = 0;
        if (offsetY < 0) offsetY = 0;
        if (offsetX > 1) offsetX = 1;
        if (offsetY > 1) offsetY = 1;

        var iw = img.width,
            ih = img.height,
            r = Math.min(w / iw, h / ih),
            nw = iw * r,   // new prop. width
            nh = ih * r,   // new prop. height
            cx, cy, cw, ch, ar = 1;

        // decide which gap to fill
        if (nw < w) ar = w / nw;
        if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
        nw *= ar;
        nh *= ar;

        // calc source rectangle
        cw = iw / (nw / w);
        ch = ih / (nh / h);

        cx = (iw - cw) * offsetX;
        cy = (ih - ch) * offsetY;

        // make sure source rectangle is valid
        if (cx < 0) cx = 0;
        if (cy < 0) cy = 0;
        if (cw > iw) cw = iw;
        if (ch > ih) ch = ih;

        // fill image in dest. rectangle
        ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
    }


class Bot {
    constructor(xpos, ypos, bullets,name ,value) {
        this.xpos = xpos;
        this.ypos = ypos;
        this.ypos = ypos;
        this.name=name;
        this.history = [];
        this.id =  Math.random().toString(36).substr(2, 10);;
        this.bullets = bullets;
        this.dead=false;
        var blob = new Blob(["self.onmessage = function(e) { \
                                    var data = e.data;\
                                    "+value+"if (data.action === 'execute') {\
                                                var result = main(data.argument);\
                                                self.postMessage({ action: 'result', result: result });\
                                            }\
                                        };"]);
        this.url=window.URL.createObjectURL(blob)
        this.worker = new Worker(this.url);
        this.orientation="UP";
        var image = [new Image(),new Image(),new Image(),new Image(),new Image(),new Image(),new Image(),new Image(),new Image(),new Image()];
        image[0].src = "./src/tank1/tank-01.png";
        image[1].src = "./src/tank1/tank-02.png";
        image[2].src = "./src/tank1/tank-03.png";
        image[3].src = "./src/tank1/tank-04.png";
        image[4].src = "./src/tank1/tank-05.png";
        image[5].src = "./src/tank1/tankover-01.png";
        image[6].src = "./src/tank1/tankover-02.png";
        image[7].src = "./src/tank1/tankover-03.png";
        image[8].src = "./src/tank1/tankover-04.png";

        this.image=image;
        this.worker.onmessage = e => {
            var data = e.data;

            if (data.action === "result") {
                this.tickCB(null, data.result);
            }
        }
    }

    draw(over,ctx,caseScale){
        var inc=0;
        if(over==true){
            inc=5;
        }
        if(this.dead==false){
            if(this.orientation=="UP"){
            ctx.drawImage(this.image[0+inc], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
            }
            if(this.orientation=="DOWN"){
            ctx.drawImage(this.image[2+inc], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
            }
            if(this.orientation=="RIGHT"){
            ctx.drawImage(this.image[3+inc], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
            }
            if(this.orientation=="LEFT"){
            ctx.drawImage(this.image[1+inc], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
            }
        }else{
            ctx.drawImage(this.image[4], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
        }
    }

    tick(arg,cb) {
        this.tickCB = cb;
        this.worker.postMessage({ action: "execute", argument:arg });
    }

    remainingBullet() {
        var value=this.bullets;
        this.bullets-=1;
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

    move (direction,array)  {
        this.orientation=direction
        if(direction=="UP"){
            if(array.every((element, index, array) => {
                return Math.abs(element.xpos-this.xpos)>1 ||    Math.abs(element.ypos-this.ypos+1)>1|| element.id==this.id;
            })){
            this.ypos-=1;
        }
        }
        if(direction=="DOWN"){
            if(array.every((element, index, array) => {
                return  Math.abs(element.xpos-this.xpos)>1 ||    Math.abs(element.ypos-this.ypos-1)>1 || element.id==this.id;
            })){
            this.ypos+=1;
        }
        }
        if(direction=="RIGHT"){
            if(array.every((element, index, array) => {
                return  Math.abs(element.xpos-this.xpos-1)>1 ||    Math.abs(element.ypos-this.ypos)>1|| element.id==this.id;
            })){
            this.xpos+=1;
        }
        }
        if(direction=="LEFT"){
            if(array.every((element, index, array) => {
                return  Math.abs(element.xpos-this.xpos+1)>1 ||    Math.abs(element.ypos-this.ypos)>1|| element.id==this.id;
            })){
            this.xpos-=1;
        }
        }
    }

    setPos(x,y) {
        this.xpos=x;
        this.ypos=y;
    }

    getPos() {
        return [this.xpos,this.ypos];
    }

    kill(){
        window.URL.revokeObjectURL(this.url);
    }

}

class Bullet {
    constructor(xpos, ypos, direction,id) {
        this.xpos = xpos;
        this.ypos = ypos;
        this.direction = direction;
        this.id=id
        var image = [new Image(),new Image(),new Image(),new Image()];
        image[0].src = "./src/rocket/rock1.png";
        image[1].src = "./src/rocket/rock2.png";
        image[2].src = "./src/rocket/rock3.png";
        image[3].src = "./src/rocket/rock4.png";
        this.image=image;
    }

    draw(ctx,caseScale){
        if(this.direction=="UP"){
        ctx.drawImage(this.image[0], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
        }
        if(this.direction=="DOWN"){
        ctx.drawImage(this.image[1], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
        }
        if(this.direction=="RIGHT"){
        ctx.drawImage(this.image[3], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale, 2*caseScale, 2*caseScale);
        }
        if(this.direction=="LEFT"){
        ctx.drawImage(this.image[2], this.xpos*caseScale-caseScale, this.ypos*caseScale-caseScale,2* caseScale,2* caseScale);
        }
    }


    getPos() {
        return [this.xpos,this.ypos];
    }

    tick() {
        if(this.direction=='UP' && this.ypos>0){
            this.ypos -=1;
            return true;
        }else if (this.direction=='DOWN' && this.ypos<height){
            this.ypos +=1;
            return true;
        }else if (this.direction=='RIGHT' && this.xpos<width){
            this.xpos +=1;
            return true;
        }else if (this.direction=='LEFT'  && this.xpos>0){
            this.xpos -=1;
            return true;
        }else{
            return false;
        }
    }
}




//RUN GAME


function initGame(width, height, bulletNum, candidates,name){
    return [candidates.map((v , index )=> new Bot((Math.floor(Math.random() *width)),(Math.floor(Math.random() *height)),bulletNum,name[index],v)), []];
    /*botArray=[]
    candidates.forEach(
        function(element) {
            botArray.push(new Bot((Math.floor(Math.random() *width)),(Math.floor(Math.random() *height)),bulletNum,element))
        }
    )
    return [botArray,[]]*/
}

function moveMissile(bulletArray){
    returnArray=[]
    bulletArray.forEach(
        function(element) {
            if(element.tick()){
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

function missileCollison(bulletArray,botArray){
    returnBotArray=botArray.slice();
    returnBulletArray=bulletArray.slice();
    for (a = 0; a < bulletArray.length; a++) {
    for (b = 0; b < botArray.length; b++) {
        if ( arraysEqual(bulletArray[a].getPos(), botArray[b].getPos()) && bulletArray[a].id!=botArray[b].id )  {
            returnBotArray[b].dead=true;
            returnBulletArray.splice(a, 1);
        }
    }
    }
    return [returnBotArray,returnBulletArray]
}

function constructArgs(element,botArrayUpdated,bulletArrayUpdated){
    var args={
        Missiles:[],
        Ennemies:[],
        Data:{
            BULLETS: element.bullets,
            X:element.xpos,
            Y:element.ypos,
            HISTORY:element.history

        }
        }
    bulletArrayUpdated.forEach(
        function(bullet) {
            if(bullet.id!=element.id){
                args.Missiles.push({X: bullet.xpos,Y:bullet.ypos,DIR:bullet.direction });
            }
            }
    )
    botArrayUpdated.forEach(
        function(bot) {
            if(bot.id!=element.id){
            args.Ennemies.push({X: bot.xpos,Y: bot.ypos,HISTORY: bot.history,DEAD:bot.dead
            });
        }
        });

    return args;
}

function runTick(botArray,bulletArray,scoreBoard,overName,ctx,background,caseScale){
    //DO IT multiple time for speed


    if(bulletArray.length>0){
        bulletArrayUpdated=moveMissile(bulletArray)
        data=missileCollison(bulletArrayUpdated,botArray)
        bulletArrayUpdated=data[1];
        botArrayUpdated=data[0];

    }else{
        bulletArrayUpdated=bulletArray;
        botArrayUpdated=botArray;
    }



    positionArray=[]
    botArrayUpdated.forEach(
        function(element) {
            positionArray.push();
        }
    )

    async.map(botArrayUpdated, function(v, cb) {

        v.tick(constructArgs(v,botArrayUpdated,bulletArrayUpdated), cb);
    }, function(err, arr) {
        //passer à travaers arr et updated si authorisé!
        for (var i = 0; i < arr.length; i++) {
            if(botArrayUpdated[i].dead==false){
                botArrayUpdated[i].history.unshift(arr[i])
                var length=botArrayUpdated[i].history.length;

                botArrayUpdated[i].history.splice(10,length-10);
                if(arr[i]=="SHOOT"){
                    if(botArrayUpdated[i].remainingBullet()>0){
                        bulletArrayUpdated.push(new Bullet(botArrayUpdated[i].getX(),botArrayUpdated[i].getY(),botArrayUpdated[i].getOrientation(),botArrayUpdated[i].id))
                    }
                }
                if(arr[i]=="DOWN"){
                    if(botArrayUpdated[i].ypos<height-1){
                        botArrayUpdated[i].move(arr[i],botArrayUpdated)
                    }
                }
                if(arr[i]=="UP"){
                    if(botArrayUpdated[i].ypos>0){
                        botArrayUpdated[i].move(arr[i],botArrayUpdated)
                    }
                }
                if(arr[i]=="RIGHT"){
                    if(botArrayUpdated[i].xpos<width-1){
                        botArrayUpdated[i].move(arr[i],botArrayUpdated)
                    }
                }
                if(arr[i]=="LEFT"){
                    if(botArrayUpdated[i].xpos>0){
                        botArrayUpdated[i].move(arr[i],botArrayUpdated)
                    }
                }
            }
        }
        data=missileCollison(bulletArrayUpdated,botArrayUpdated)
        bulletArrayUpdated=data[1];
        botArrayUpdated=data[0];
        bulletArrayUpdated=moveMissile(bulletArrayUpdated)
        data=missileCollison(bulletArrayUpdated,botArrayUpdated)
        bulletArrayUpdated=data[1];
        botArrayUpdated=data[0];

        drawImageProp(ctx,background, 0, 0, width*caseScale, height*caseScale);
        var BulletsLeft=0;
        var ContestantLeft=0;
        var returnHTMl=""
        botArrayUpdated.sort(compareBot)
        botArrayUpdated.forEach(
            function(element) {


                if(element.name==overName){
                element.draw(true,ctx,caseScale);}
                else{
                element.draw(false,ctx,caseScale);
                }
                if(!element.dead){
                    BulletsLeft+=element.bullets
                    ContestantLeft+=1;
                    returnHTMl+="<tr><td> "+element.name+ "</td><td align='center'> "+element.bullets +"</tr>"
                }else{
                returnHTMl+="<tr><td> "+element.name+ "</td><td align='center'> Dead </tr>"
            }
            }
        )
        document.getElementById(scoreBoard).innerHTML=
        "<table>\
            <thead>\
                <tr>\
                    <th>Name</th>\
                    <th align='center'>Score</th>\
                </tr>\
            </thead>\
            <tbody >"+returnHTMl+"</tbody>\
        </table>";

        bulletArrayUpdated.forEach(
            function(element) {

                element.draw(ctx,caseScale);

            }
        )
        compareBot

        if(BulletsLeft>0 && ContestantLeft>1){
        TimeOut=setTimeout(function() {
            requestAnimationFrame(runTick.bind(null, botArrayUpdated, bulletArrayUpdated,scoreBoard,overName,ctx,background,caseScale));
        }, 1000 / 9);

        }
    })


}


//TEST


function startGame(zone,codeArray,nameArray,score){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");


    var background = new Image();
    background.src = "./src/back.png";
    DrawZone=document.getElementById(zone)
    DrawZone.style.display="block";
    scoreZone=document.getElementById(score)
    scoreZone.style.display="block";
    DrawZone.removeChild(DrawZone.firstChild);
    DrawZone.appendChild(canvas);
    var rect = canvas.parentNode.getBoundingClientRect();
    canvas.width =rect.width
    canvas.height = rect.height
    caseScale=20;
    width=canvas.width/caseScale;
    height=canvas.height/caseScale;
    clearTimeout(TimeOut);
    game=initGame(width, height, 100, codeArray,nameArray)
    runTick(game[0],game[1],score,nameArray[0],ctx,background,caseScale);
}
